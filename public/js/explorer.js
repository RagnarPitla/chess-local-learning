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
      // Contract: name is null only when the position is NOT in book (inBook
      // false). Whenever inBook is true, name is always a real string - every
      // in-book position resolves to at least its first move's ECO name,
      // except the exact starting position (zero moves played, nothing has
      // fixed an opening yet), which is labelled explicitly below instead of
      // left null. A caller can therefore treat `inBook && !name` as
      // impossible rather than needing to special-case ply 0 itself.
      name: opening?.name ?? (sanMoves.length === 0 ? 'Starting Position' : null),
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
 * Ranks a legal move that theory does not name, for when the book runs out
 * and the training set has to be topped up from raw legal moves. Uses the
 * classic "what to look for" calculation order - checks, then captures, then
 * castling - ahead of quiet principled play. The gaps between tiers (1000
 * apart) are far larger than tagPrinciples() can ever add (at most 3 tags),
 * so a quiet move can never accidentally outrank a real tactical one.
 */
function tacticalWeight(move) {
  if (move.san.includes('#')) return 4000
  if (move.san.includes('+')) return 3000
  if (move.captured) return 2000
  if (move.flags.includes('k') || move.flags.includes('q')) return 1000
  return 0
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
      tactical: tacticalWeight(move),
      structureKey: move.after ? pawnStructureKey(move.after) : move.san,
    }
  })
}

/**
 * Per-candidate score, used to rank within one pool (book candidates, or the
 * legal-move top-up pool) - never across both, since the two pools are
 * picked from separately (see pickFromPool). Book candidates are ranked by
 * real popularity (`share`); top-up candidates have no popularity data, so
 * they fall back to tacticalWeight() (checks/captures/castling first) plus a
 * bigger nudge per principle, since there is nothing else to go on.
 */
function scoreCandidate(candidate, level) {
  const isBook = candidate.entry.isBook
  let score = isBook ? candidate.entry.share * 100 : candidate.tactical ?? 0
  score += candidate.principles.length * (isBook ? 6 : 15)
  if (level === 'beginner' && candidate.sharp) score -= 60
  if (level === 'advanced' && candidate.sharp) score += 15
  if (level === 'expert' && candidate.sharp) score += 40
  return score
}

/**
 * Principle tags are bare noun labels, which fit some sentences and not
 * others. "illustrates development" reads fine; "that also development" does
 * not. Rendering them through a noun form and a verb form keeps both
 * sentences grammatical for every tag rather than forcing one to bend.
 */
const PRINCIPLE_NOUNS = {
  'king safety': 'king safety',
  development: 'development',
  centre: 'centre control',
}
const PRINCIPLE_VERBS = {
  'king safety': 'gets the king safe',
  development: 'develops a piece',
  centre: 'fights for the centre',
}

function joinPhrases(list) {
  if (list.length <= 1) return list[0] || ''
  if (list.length === 2) return `${list[0]} and ${list[1]}`
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

const asNouns = (tags) => joinPhrases(tags.map((t) => PRINCIPLE_NOUNS[t] ?? t))
const asVerbs = (tags) => joinPhrases(tags.map((t) => PRINCIPLE_VERBS[t] ?? t))

/** `toppedUp` is true only when the book had SOME candidates but ran out
 * before reaching the requested count - as opposed to the position being
 * out of book from the very first move considered, which keeps its original
 * wording unchanged below. */
function explainWhy(candidate, level, toppedUp = false) {
  if (!candidate.entry.isBook) {
    const reason = candidate.principles.length
      ? `it clearly illustrates ${asNouns(candidate.principles)}`
      : 'it is a reasonable try worth judging on its own merits'
    return toppedUp
      ? `Theory runs out before this move - it is included so you have a full set to train on - but ${reason}, so it is worth thinking through.`
      : `Not in the book from here - your opponent (or you) went off the map - but ${reason}, so it is a good move to think through.`
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
    return `A known alternative that also ${asVerbs(candidate.principles)}, and leads to a different structure worth recognising.`
  }
  return 'A known alternative that leads to a different structure, worth recognising so you are not surprised by it.'
}

/**
 * Ranks and selects up to `target` candidates from ONE pool (either the book
 * candidates, or the legal-move top-up pool - never a mix; trainingVariations
 * calls this once per pool so book material can never be crowded out by a
 * topped-up legal move). `usedStructures` is shared across both calls so the
 * top-up phase still prefers a pawn structure the book phase did not already
 * use. `forceTop` takes the top-ranked candidate unconditionally first (used
 * for the book pool, to guarantee the main line a slot); `forceSharpForExpert`
 * additionally guarantees a sharp/critical pick at expert level when one
 * exists in the pool (book pool only - top-up candidates are never sharp).
 */
function pickFromPool(candidates, target, level, usedStructures, { forceTop = false, forceSharpForExpert = false } = {}) {
  if (!candidates.length || target <= 0) return []

  const ranked = candidates
    .map((c) => ({ ...c, score: scoreCandidate(c, level) }))
    .sort((a, b) => {
      if (forceTop && a.isMain !== b.isMain) return a.isMain ? -1 : 1
      return b.score - a.score
    })

  const chosen = []
  const take = (c) => {
    chosen.push(c)
    usedStructures.add(c.structureKey)
  }

  // Rule: the main line always gets a slot (it sorts first when forced).
  if (forceTop) take(ranked[0])

  // Rule: expert level always gets at least one sharp/critical line, if the
  // pool actually has one, rather than leaving it to chance.
  if (forceSharpForExpert && level === 'expert') {
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
  // beats an empty panel - never show fewer than the pool can support.
  for (const c of ranked) {
    if (chosen.length >= target) break
    if (chosen.includes(c)) continue
    take(c)
  }

  return chosen.slice(0, target)
}

/**
 * The top `count` (clamped to 3..9) variations actually worth training on
 * from this position - a curated shortlist, not just the most popular moves.
 * Always includes the main line; fills remaining slots with structurally
 * distinct alternatives biased by `level` (see DIFFICULTY_PRESETS).
 *
 * Guarantee: this returns exactly `count` entries whenever the position has
 * at least `count` legal moves, regardless of how much (or how little) the
 * book knows here. Book material is always preferred and never crowded out;
 * when the book has fewer than `count` continuations (thin book, or no book
 * at all), the remaining slots are topped up from every other legal move,
 * ranked by tacticalWeight() (checks, then captures, then castling) ahead of
 * quiet principled play - so the panel is never short and never empty. The
 * one honest exception: a position with fewer than `count` legal moves in
 * total (including the rare case of checkmate/stalemate, zero legal moves)
 * returns fewer than `count`, or `[]`, because there is nothing further to
 * offer. Topped-up entries are marked exactly like any other non-book move -
 * `isBook: false` (equivalently `novelty: true`) - so the UI can badge them
 * as beyond named theory with the same field it already uses for novelties.
 *
 * `count` and `level` are independent - pass
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
  const total = book.reduce((sum, e) => sum + e.lineCount, 0)
  const bookCandidates = book.map((entry) => buildBookCandidate(entry, total, sanMoves, legalBySan))

  const usedStructures = new Set()
  const bookChosen = pickFromPool(bookCandidates, target, resolvedLevel, usedStructures, {
    forceTop: true,
    forceSharpForExpert: true,
  })

  const shortfall = target - bookChosen.length
  let toppedUpChosen = []
  if (shortfall > 0) {
    const chosenSans = new Set(bookChosen.map((c) => c.entry.san))
    const remainingLegal = legal.filter((move) => !chosenSans.has(move.san))
    const fallbackCandidates = buildFallbackCandidates(remainingLegal)
    toppedUpChosen = pickFromPool(fallbackCandidates, shortfall, resolvedLevel, usedStructures)
  }

  // toppedUp (for wording only) distinguishes "book had something but ran
  // out" from "this position had no book candidates at all" - both still
  // carry isBook: false, which is the field that actually marks them.
  const toppedUp = bookCandidates.length > 0
  return [
    ...bookChosen.map((c) => ({ ...c.entry, whyThisOne: explainWhy(c, resolvedLevel, false), level: resolvedLevel })),
    ...toppedUpChosen.map((c) => ({ ...c.entry, whyThisOne: explainWhy(c, resolvedLevel, toppedUp), level: resolvedLevel })),
  ]
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
