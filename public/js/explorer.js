/**
 * The "see all variations" panel: from any position, what can I play, what
 * is it called, where does it lead, and which lines actually matter.
 *
 * openings.js answers "what does the book say happened here" for one exact
 * line. This module answers the bigger question the app was missing:
 * opponents do not play the one line a lesson expects, they play anything
 * legal. So `explore()` always lists every legal move, not just the book
 * ones - book moves get a name, a popularity share and a sample line;
 * everything else is legal but marked `novelty: true` so the trainer can
 * say "they played something outside theory, here is what that means and
 * here is what to think about instead".
 *
 * It also acts as a training buddy: `trainingVariations()` picks a small,
 * difficulty-aware set (3 to 9 lines) worth actually preparing, rather than
 * dumping the whole book on a beginner or starving an expert of the sharp
 * stuff. See DIFFICULTY_PRESETS.
 *
 * Pure logic, no DOM. Runs unchanged under `node --test` and in the browser.
 */
import { Chess } from 'chess.js'
import { lookupOpening, outOfBookPly, variationsFrom, PRINCIPLES } from './openings.js'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const LIVE_TIMEOUT_MS = 2500
const CACHE_LIMIT = 300

/**
 * Difficulty presets for the training panel: how many variations to show and
 * what that level means, so the UI can bind a single selector to this object
 * rather than hard-coding numbers. `variations` is always within 3..9 - see
 * trainingVariations() below, which also clamps whatever count it is given
 * into that same range regardless of the preset.
 */
export const DIFFICULTY_PRESETS = {
  beginner: {
    variations: 3,
    label: 'Beginner',
    description: 'A small set: the main line plus the clearest, calmest alternatives. Sharp theory is avoided.',
  },
  intermediate: {
    variations: 5,
    label: 'Intermediate',
    description: 'The main line plus the well-known alternatives a club player will actually meet.',
  },
  advanced: {
    variations: 7,
    label: 'Advanced',
    description: 'A wider spread across distinct plans and structures, including some sharper tries.',
  },
  expert: {
    variations: 9,
    label: 'Expert',
    description: 'The full competitive picture: the main line, the critical alternatives, and the sharpest theory.',
  },
}

const MIN_TRAINING_VARIATIONS = 3
const MAX_TRAINING_VARIATIONS = 9

function clampVariationCount(count) {
  const n = Number(count)
  if (!Number.isFinite(n)) return DIFFICULTY_PRESETS.intermediate.variations
  return Math.max(MIN_TRAINING_VARIATIONS, Math.min(MAX_TRAINING_VARIATIONS, Math.round(n)))
}

function resolveLevel(level) {
  return Object.prototype.hasOwnProperty.call(DIFFICULTY_PRESETS, level) ? level : 'intermediate'
}

/** Bounded cache for fetchLiveStats, exposed so callers/tests can inspect or clear it. */
export const explorerCache = new Map()

function cacheGet(key) {
  return explorerCache.has(key) ? explorerCache.get(key) : undefined
}

function cacheSet(key, value) {
  if (explorerCache.has(key)) explorerCache.delete(key)
  explorerCache.set(key, value)
  while (explorerCache.size > CACHE_LIMIT) {
    const oldest = explorerCache.keys().next().value
    explorerCache.delete(oldest)
  }
}

/**
 * The synchronous, offline half of explore(): replay `sanMoves` from the
 * start, list every legal move from the resulting position, and attach book
 * metadata to the ones theory knows. This is what lets the UI render
 * instantly; explore() calls this first and enriches it with live data
 * afterwards if asked to.
 */
export function classifyVariations(sanMoves = []) {
  const chess = new Chess()
  for (const san of sanMoves) chess.move(san)

  const fen = chess.fen()
  const opening = lookupOpening(sanMoves)
  const leftBookAt = outOfBookPly(sanMoves)
  const inBook = leftBookAt === null
  const book = inBook ? variationsFrom(sanMoves) : []
  const bookBySan = new Map(book.map((entry) => [entry.san, entry]))

  const legal = chess.moves({ verbose: true })
  const total = book.reduce((sum, entry) => sum + entry.lineCount, 0)

  const moves = legal.map((move) => {
    const known = bookBySan.get(move.san)
    if (known) {
      return {
        san: move.san,
        uci: `${move.from}${move.to}${move.promotion || ''}`,
        eco: known.eco,
        name: known.name,
        lineCount: known.lineCount,
        share: total > 0 ? known.lineCount / total : 0,
        isMain: known.isMain,
        isBook: true,
        novelty: false,
        sampleLine: known.sampleLine,
        stats: null,
      }
    }
    return {
      san: move.san,
      uci: `${move.from}${move.to}${move.promotion || ''}`,
      eco: null,
      name: null,
      lineCount: 0,
      share: 0,
      isMain: false,
      isBook: false,
      novelty: true,
      sampleLine: [move.san],
      stats: null,
    }
  })

  moves.sort((a, b) => {
    if (a.isBook !== b.isBook) return a.isBook ? -1 : 1
    if (b.lineCount !== a.lineCount) return b.lineCount - a.lineCount
    return a.san.localeCompare(b.san)
  })

  return {
    position: {
      fen,
      name: opening?.name ?? null,
      eco: opening?.eco ?? null,
      plans: opening ? { struct: opening.struct, white: opening.white, black: opening.black, breaks: opening.breaks } : null,
      inherited: Boolean(opening?.inherited),
      inBook,
    },
    moves,
    total,
    source: 'eco',
    live: false,
    fetchedAt: null,
  }
}

/**
 * Full result for the explorer panel: the offline classification, optionally
 * enriched with live master/lichess statistics. Accepts either a SAN move
 * list (the normal case - the book is indexed by move sequence so it can
 * follow transpositions correctly) or a bare FEN (useful when the caller only
 * has a position, e.g. a pasted FEN with no known history). A bare non-start
 * FEN cannot be reliably matched against the book because of transpositions,
 * so in that case every legal move is honestly reported as a novelty rather
 * than guessed at.
 *
 * `limit`, when a positive number, bounds how many entries `moves` carries
 * (book-first, highest lineCount first - the same order classifyVariations
 * already sorts into) so the UI can ask for a short list directly instead of
 * slicing the full one itself. `total` is left as the full book population
 * either way, since it is a statistic (used for `share`), not a display list.
 * Omit it, or pass null/0, for the full unbounded list (the default).
 */
export async function explore({ sanMoves = [], fen = null, live = true, signal = null, limit = null } = {}) {
  const usingMoves = sanMoves.length > 0 || fen === null || fen === START_FEN
  const result = usingMoves ? classifyVariations(sanMoves) : classifyFromFen(fen)

  if (!live) return applyLimit(result, limit)

  const stats = await fetchLiveStats(result.position.fen, { signal })
  if (!stats) return applyLimit(result, limit)

  const statsBySan = new Map((stats.moves || []).map((m) => [m.san, m]))
  const moves = result.moves.map((move) => {
    const live = statsBySan.get(move.san)
    return live ? { ...move, stats: live } : move
  })

  return applyLimit({ ...result, moves, source: 'lichess', live: true, fetchedAt: new Date().toISOString() }, limit)
}

function applyLimit(result, limit) {
  const n = Number(limit)
  if (!Number.isFinite(n) || n <= 0) return result
  return { ...result, moves: result.moves.slice(0, Math.floor(n)) }
}

/** Same shape as classifyVariations, for a bare FEN with no known SAN history. */
function classifyFromFen(fen) {
  const chess = new Chess(fen)
  const legal = chess.moves({ verbose: true })
  const moves = legal
    .map((move) => ({
      san: move.san,
      uci: `${move.from}${move.to}${move.promotion || ''}`,
      eco: null,
      name: null,
      lineCount: 0,
      share: 0,
      isMain: false,
      isBook: false,
      novelty: true,
      sampleLine: [move.san],
      stats: null,
    }))
    .sort((a, b) => a.san.localeCompare(b.san))

  return {
    position: { fen: chess.fen(), name: null, eco: null, plans: null, inherited: false, inBook: false },
    moves,
    total: 0,
    source: 'eco',
    live: false,
    fetchedAt: null,
  }
}

/* ======================================================= training buddy
 *
 * trainingVariations() is the "3 to 9 lines actually worth preparing" panel:
 * a short, hand-pickable-feeling shortlist rather than the full book, chosen
 * to be pedagogically useful rather than just the most popular N moves.
 * Entries reuse the same shape as explore()'s `moves[]` (plus `whyThisOne`
 * and `level`) so the UI can render training mode with the same component.
 */

const CENTRE_SQUARES = new Set(['d4', 'd5', 'e4', 'e5'])
const BACK_RANK = { w: '1', b: '8' }

/** Canonical pawn-skeleton signature: two positions with the same pawns on
 * the same squares (regardless of piece placement or move order) count as
 * the same structure, so a training set does not spend two slots on lines
 * that only transpose into each other. */
function pawnStructureKey(fen) {
  const board = fen.split(' ')[0]
  const files = 'abcdefgh'
  const pawns = []
  let rank = 8
  for (const row of board.split('/')) {
    let file = 0
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        file += Number(ch)
        continue
      }
      if (ch === 'P' || ch === 'p') pawns.push(`${ch}${files[file]}${rank}`)
      file++
    }
    rank--
  }
  return pawns.sort().join(',')
}

/** Mechanically-checkable opening principles a single move demonstrates -
 * not a claim about quality, just whether it develops a piece, fights for
 * the centre, or gets the king safe, so beginner mode can lean on them. */
function tagPrinciples(move) {
  const tags = []
  if (move.flags.includes('k') || move.flags.includes('q')) tags.push('king safety')
  if ((move.piece === 'n' || move.piece === 'b') && move.from[1] === BACK_RANK[move.color]) tags.push('development')
  if (CENTRE_SQUARES.has(move.to)) tags.push('centre')
  return tags
}

/**
 * Heuristic only: real sharpness is an engine/search question this module
 * cannot answer without one. Gambits and sacrifices are named as such in
 * ECO because they trade material for initiative, which is a reasonably
 * reliable, transparent proxy - "Attack" is deliberately excluded, since it
 * covers everything from the razor-sharp Marshall Attack to the famously
 * slow King's Indian Attack.
 */
function isSharpName(name) {
  return /gambit|sacrifice/i.test(name || '')
}

function replayFen(sanMoves, extra) {
  try {
    const chess = new Chess()
    for (const san of sanMoves) chess.move(san)
    for (const san of extra) chess.move(san)
    return chess.fen()
  } catch {
    return null
  }
}

function buildBookCandidate(entry, total, sanMoves, legalBySan) {
  const move = legalBySan.get(entry.san)
  const fen = replayFen(sanMoves, entry.sampleLine) // sampleLine continues from the current position
  return {
    entry: {
      san: entry.san,
      uci: move ? `${move.from}${move.to}${move.promotion || ''}` : entry.san,
      eco: entry.eco,
      name: entry.name,
      lineCount: entry.lineCount,
      share: total > 0 ? entry.lineCount / total : 0,
      isMain: entry.isMain,
      isBook: true,
      novelty: false,
      sampleLine: entry.sampleLine,
      stats: null,
    },
    isMain: entry.isMain,
    principles: move ? tagPrinciples(move) : [],
    sharp: isSharpName(entry.name),
    structureKey: fen ? pawnStructureKey(fen) : entry.san,
  }
}

/** Out-of-book fallback: score every legal move purely on structural/principle
 * grounds, since there is no book popularity data to lean on here. This is
 * what guarantees the trainer never shows an empty panel. */
function buildFallbackCandidates(legalMoves) {
  return legalMoves.map((move) => {
    return {
      entry: {
        san: move.san,
        uci: `${move.from}${move.to}${move.promotion || ''}`,
        eco: null,
        name: null,
        lineCount: 0,
        share: 0,
        isMain: false,
        isBook: false,
        novelty: true,
        sampleLine: [move.san],
        stats: null,
      },
      isMain: false,
      principles: tagPrinciples(move),
      sharp: false,
      structureKey: move.after ? pawnStructureKey(move.after) : move.san,
    }
  })
}

function scoreCandidate(candidate, level, inBook) {
  let score = inBook ? candidate.entry.share * 100 : 0
  score += candidate.principles.length * (inBook ? 6 : 15)
  if (level === 'beginner' && candidate.sharp) score -= 60
  if (level === 'advanced' && candidate.sharp) score += 15
  if (level === 'expert' && candidate.sharp) score += 40
  return score
}

function explainWhy(candidate, level, inBook) {
  if (!inBook) {
    const reason = candidate.principles.length
      ? `it clearly illustrates ${candidate.principles.join(' and ')}`
      : 'it is a reasonable try worth judging on its own merits'
    return `Not in the book from here - your opponent (or you) went off the map - but ${reason}, so it is a good move to think through.`
  }
  if (candidate.isMain) {
    return 'The main line: the most common and best-tested continuation from this position.'
  }
  if (level === 'expert' && candidate.sharp) {
    return 'A sharp, critical try - the forcing lines here are worth memorising before it is played on you.'
  }
  if (level === 'beginner' && candidate.principles.length) {
    const which = candidate.principles.includes('king safety')
      ? 'gets the king to safety'
      : candidate.principles.includes('centre')
        ? 'fights for the centre'
        : 'brings a piece into the game'
    return `A calm, principled alternative that clearly ${which} - a solid choice while the ideas are still new.`
  }
  if (candidate.principles.length) {
    return `A known alternative that also ${candidate.principles.join(' and ')}, and leads to a different structure worth recognising.`
  }
  return 'A known alternative that leads to a different structure, worth recognising so you are not surprised by it.'
}

function pickTrainingSet(candidates, target, level, inBook) {
  if (!candidates.length) return []

  const ranked = candidates
    .map((c) => ({ ...c, score: scoreCandidate(c, level, inBook) }))
    .sort((a, b) => {
      if (inBook && a.isMain !== b.isMain) return a.isMain ? -1 : 1
      return b.score - a.score
    })

  const chosen = []
  const usedStructures = new Set()
  const take = (c) => {
    chosen.push(c)
    usedStructures.add(c.structureKey)
  }

  // Rule: the main line always gets a slot (it sorts first whenever inBook).
  if (inBook) take(ranked[0])

  // Rule: expert level always gets at least one sharp/critical line, if the
  // position actually has one, rather than leaving it to chance.
  if (level === 'expert') {
    const sharpPick = ranked.find((c) => c.sharp && !chosen.includes(c))
    if (sharpPick && chosen.length < target) take(sharpPick)
  }

  // Fill the rest with the most instructive, structurally distinct options -
  // two moves that transpose into the same pawn skeleton do not both get a slot.
  for (const c of ranked) {
    if (chosen.length >= target) break
    if (chosen.includes(c) || usedStructures.has(c.structureKey)) continue
    take(c)
  }

  // Backfill: if distinctness left slots open, a repeated structure still
  // beats an empty panel - never show fewer than the position can support.
  for (const c of ranked) {
    if (chosen.length >= target) break
    if (chosen.includes(c)) continue
    take(c)
  }

  return chosen.slice(0, target).map((c) => ({ ...c.entry, whyThisOne: explainWhy(c, level, inBook), level }))
}

/**
 * The top `count` (clamped to 3..9) variations actually worth training on
 * from this position - a curated shortlist, not just the most popular moves.
 * Always includes the main line; fills remaining slots with structurally
 * distinct alternatives biased by `level` (see DIFFICULTY_PRESETS); falls
 * back to scoring every legal move on opening principles when the position
 * is out of book, so this never returns an empty list while any legal move
 * exists. `count` and `level` are independent - pass
 * `count: DIFFICULTY_PRESETS[level].variations` to size the set to match a
 * difficulty selector; the bare default (5) is intermediate's own count.
 */
export function trainingVariations({ sanMoves = [], count = 5, level = 'intermediate' } = {}) {
  const resolvedLevel = resolveLevel(level)
  const target = clampVariationCount(count)

  const chess = new Chess()
  for (const san of sanMoves) chess.move(san)
  const legal = chess.moves({ verbose: true })
  const legalBySan = new Map(legal.map((m) => [m.san, m]))

  const inBook = outOfBookPly(sanMoves) === null
  const book = inBook ? variationsFrom(sanMoves) : []

  if (book.length) {
    const total = book.reduce((sum, e) => sum + e.lineCount, 0)
    const candidates = book.map((entry) => buildBookCandidate(entry, total, sanMoves, legalBySan))
    return pickTrainingSet(candidates, target, resolvedLevel, true)
  }

  // Out of book (or a book dead end with no further named play): fall back
  // to every legal move, scored on principles alone, so the panel is never empty.
  const candidates = buildFallbackCandidates(legal)
  return pickTrainingSet(candidates, target, resolvedLevel, false)
}

/**
 * Optional enrichment from the Lichess opening explorer. Strictly best-effort:
 * time-boxed to ~2.5s, abortable, and guaranteed to resolve (never reject) -
 * a blocked or slow network must never break the offline experience.
 *
 * Documented endpoint shape (unverified in this environment - see below):
 *   GET https://explorer.lichess.ovh/lichess
 *       ?variant=standard&fen=<FEN>&speeds=blitz,rapid,classical&ratings=1600,1800,2000
 *   -> { white, draws, black,
 *        moves: [{ uci, san, white, draws, black, averageRating }],
 *        opening: { eco, name } }
 *
 * CRITICAL: from this development machine, https://explorer.lichess.ovh/lichess
 * and /masters both return HTTP 401 because an upstream network proxy blocks
 * that host - not a real authentication requirement. That means this function
 * could not be exercised against the live API while writing it. The request
 * URL and response parsing follow Lichess's published documentation, coded
 * defensively (every field optional-chained / coerced) so a shape mismatch
 * degrades to a null result instead of throwing. Negative results (blocked,
 * timed out, malformed) are cached so a blocked network costs one attempt per
 * position, not one per move rendered.
 */
export async function fetchLiveStats(fen, { signal = null, db = 'lichess' } = {}) {
  const key = `${db}:${fen}`
  const cached = cacheGet(key)
  if (cached !== undefined) return cached

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS)
  const onExternalAbort = () => controller.abort()
  if (signal) signal.addEventListener('abort', onExternalAbort)

  try {
    const url =
      `https://explorer.lichess.ovh/${encodeURIComponent(db)}` +
      `?variant=standard&fen=${encodeURIComponent(fen)}` +
      `&speeds=blitz,rapid,classical&ratings=1600,1800,2000`

    const response = await fetch(url, { signal: controller.signal })
    if (!response || !response.ok) {
      cacheSet(key, null)
      return null
    }

    const body = await response.json()
    const stats = normaliseLiveStats(body)
    cacheSet(key, stats)
    return stats
  } catch {
    cacheSet(key, null)
    return null
  } finally {
    clearTimeout(timeout)
    if (signal) signal.removeEventListener('abort', onExternalAbort)
  }
}

/** Defensively normalise a Lichess explorer response - every field is optional. */
function normaliseLiveStats(body) {
  if (!body || typeof body !== 'object') return null
  const white = Number(body.white) || 0
  const draws = Number(body.draws) || 0
  const black = Number(body.black) || 0
  const moves = Array.isArray(body.moves)
    ? body.moves.map((m) => ({
        uci: m?.uci ?? null,
        san: m?.san ?? null,
        white: Number(m?.white) || 0,
        draws: Number(m?.draws) || 0,
        black: Number(m?.black) || 0,
        averageRating: Number.isFinite(Number(m?.averageRating)) ? Number(m.averageRating) : null,
      }))
    : []
  return {
    white,
    draws,
    black,
    total: white + draws + black,
    moves,
    opening: body.opening ? { eco: body.opening.eco ?? null, name: body.opening.name ?? null } : null,
  }
}

/**
 * Turn one variation entry into a short teachable sentence: what it is
 * called, how popular it is in theory, and the plan or principle behind it.
 * `context` is expected to look like explore()'s `position` field
 * (fen/name/eco/plans/inherited/inBook); every field is read defensively so a
 * partial or missing context never throws.
 */
export function explainVariation(entry, context = {}) {
  if (!entry) return 'No move to explain.'

  const identity = entry.isBook
    ? `${entry.san} is ${entry.name}${entry.eco ? ` (ECO ${entry.eco})` : ''}.`
    : `${entry.san} is a legal move, but it is not in the book here - your opponent has gone off the map.`

  let popularity = ''
  if (entry.isBook) {
    const pct = Math.round((entry.share ?? 0) * 100)
    if (entry.isMain) popularity = ` It is the main line, played in most games from this position.`
    else if (pct >= 15) popularity = ` It is a well-known alternative, chosen in roughly ${pct}% of games from here.`
    else if (entry.lineCount > 0) popularity = ` It is a sideline, seen in about ${pct}% of games from here.`
  }

  const plans = context?.plans
  const side = context?.fen ? (context.fen.split(' ')[1] === 'w' ? 'white' : 'black') : null
  const planLine = side && plans?.[side]?.length ? plans[side][0] : null

  let guidance
  if (planLine) {
    guidance = ` ${context.inherited ? 'The nearest known plan here' : 'The plan'}: ${planLine}`
  } else {
    const principle = PRINCIPLES[Math.abs(hashString(entry.san)) % PRINCIPLES.length]
    guidance = ` No specific plan is recorded here - fall back on a principle: ${principle.question}`
  }

  return `${identity}${popularity}${guidance}`
}

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
  return hash
}
