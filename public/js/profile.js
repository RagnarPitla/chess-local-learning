/**
 * The personal weakness profile: the part that makes this adaptive rather than
 * just another analysis board.
 *
 * Every tagged mistake feeds a running score per pattern. Ranking blends how
 * expensive a pattern is, how often it appears and how recently it bit you.
 * Drills are scheduled with Leitner boxes so patterns you have fixed stop
 * consuming your practice time.
 */
import { PATTERN_LIBRARY } from './patterns.js'

export const PROFILE_VERSION = 1
export const LEITNER_INTERVALS_DAYS = [0, 1, 3, 7, 21]
const DAY_MS = 86400000

export function emptyProfile() {
  return {
    version: PROFILE_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    gamesPlayed: 0,
    patterns: {},
    history: [],
    puzzles: { attempted: 0, solved: 0 },
  }
}

/**
 * Copy a raw profile into a known-good shape.
 *
 * This returns a defensive copy all the way down to each pattern entry. The
 * record* functions read as pure - they take a profile and return a new one -
 * so a caller is entitled to compute a result and throw it away. With a shallow
 * copy the entries were shared, and a discarded call still leaked its counts
 * into the original while leaving gamesPlayed behind, which quietly inflated
 * the weakness ranking that picks the student's lessons.
 */
export function normaliseProfile(raw) {
  const base = emptyProfile()
  if (!raw || typeof raw !== 'object') return base
  const patterns = {}
  if (raw.patterns && typeof raw.patterns === 'object') {
    for (const [id, entry] of Object.entries(raw.patterns)) {
      if (!entry || typeof entry !== 'object') continue
      patterns[id] = { ...entry, examples: Array.isArray(entry.examples) ? entry.examples.map((ex) => ({ ...ex })) : [] }
    }
  }
  return {
    ...base,
    ...raw,
    patterns,
    history: Array.isArray(raw.history) ? raw.history.map((h) => ({ ...h })) : [],
    puzzles: raw.puzzles && typeof raw.puzzles === 'object' ? { ...base.puzzles, ...raw.puzzles } : base.puzzles,
  }
}

/**
 * Fold one reviewed game into the profile.
 *
 * @param {object} profile
 * @param {object} game     { patternSummary, summary, result, opening, playerColour, playedAt }
 */
export function recordGame(profile, game) {
  const next = normaliseProfile(profile)
  const now = game.playedAt ? new Date(game.playedAt) : new Date()
  next.gamesPlayed += 1
  next.updatedAt = now.toISOString()

  for (const item of game.patternSummary || []) {
    const entry = next.patterns[item.id] || newPatternEntry(item.id, item.label)
    entry.count += item.count
    entry.cost += item.cost
    entry.games += 1
    entry.lastSeen = now.toISOString()
    // Exponentially weighted severity: recent games dominate, old ones fade.
    entry.ewma = entry.ewma === null ? item.cost : entry.ewma * 0.7 + item.cost * 0.3
    entry.examples = [...(item.examples || []).map((ex) => ({ ...ex, playedAt: now.toISOString() })), ...entry.examples].slice(0, 6)
    if (!entry.due) entry.due = now.toISOString()
    next.patterns[item.id] = entry
  }

  next.history.unshift({
    playedAt: now.toISOString(),
    result: game.result || null,
    colour: game.playerColour || null,
    opening: game.opening || null,
    acpl: game.summary?.acpl ?? null,
    accuracy: game.summary?.accuracy ?? null,
    blunders: game.summary?.counts?.blunder ?? 0,
    mistakes: game.summary?.counts?.mistake ?? 0,
    inaccuracies: game.summary?.counts?.inaccuracy ?? 0,
    topPattern: game.patternSummary?.[0]?.id ?? null,
  })
  next.history = next.history.slice(0, 100)

  return next
}

function newPatternEntry(id, label) {
  return {
    id,
    label: label || PATTERN_LIBRARY[id]?.label || id,
    count: 0,
    cost: 0,
    games: 0,
    ewma: null,
    box: 1,
    due: null,
    lastSeen: null,
    lastReviewed: null,
    attempts: 0,
    correct: 0,
    examples: [],
  }
}

/**
 * Rank weaknesses. Cost dominates, then recency, then how stubborn the pattern
 * has proven during drills.
 */
export function rankWeaknesses(profile, { limit = 6, now = Date.now() } = {}) {
  const p = normaliseProfile(profile)
  const entries = Object.values(p.patterns)
  if (!entries.length) return []

  const maxCost = Math.max(...entries.map((e) => e.ewma ?? e.cost ?? 0), 1)
  const maxCount = Math.max(...entries.map((e) => e.count), 1)

  return entries
    .map((entry) => {
      const costScore = (entry.ewma ?? entry.cost) / maxCost
      const freqScore = entry.count / maxCount
      const ageDays = entry.lastSeen ? (now - new Date(entry.lastSeen).getTime()) / DAY_MS : 999
      const recencyScore = Math.exp(-ageDays / 21)
      const resistance = entry.attempts ? 1 - entry.correct / entry.attempts : 0.5
      const score = 0.45 * costScore + 0.2 * freqScore + 0.2 * recencyScore + 0.15 * resistance
      return {
        ...entry,
        meta: PATTERN_LIBRARY[entry.id] || null,
        score: Number(score.toFixed(4)),
        ageDays: Math.round(ageDays),
        accuracy: entry.attempts ? Math.round((entry.correct / entry.attempts) * 100) : null,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Patterns whose drill is due, worst first. */
export function dueDrills(profile, { now = Date.now(), limit = 5 } = {}) {
  const p = normaliseProfile(profile)
  return Object.values(p.patterns)
    .filter((e) => !e.due || new Date(e.due).getTime() <= now)
    .sort((a, b) => (b.ewma ?? b.cost) - (a.ewma ?? a.cost))
    .slice(0, limit)
    .map((e) => ({ ...e, meta: PATTERN_LIBRARY[e.id] || null }))
}

/** Leitner update after a drill attempt. */
export function recordDrill(profile, patternId, correct, { now = Date.now() } = {}) {
  const next = normaliseProfile(profile)
  const entry = next.patterns[patternId] || newPatternEntry(patternId)
  entry.attempts += 1
  if (correct) {
    entry.correct += 1
    entry.box = Math.min(LEITNER_INTERVALS_DAYS.length, entry.box + 1)
  } else {
    entry.box = 1
  }
  entry.lastReviewed = new Date(now).toISOString()
  entry.due = new Date(now + LEITNER_INTERVALS_DAYS[entry.box - 1] * DAY_MS).toISOString()
  next.patterns[patternId] = entry
  next.puzzles = next.puzzles || { attempted: 0, solved: 0 }
  next.puzzles.attempted += 1
  if (correct) next.puzzles.solved += 1
  next.updatedAt = new Date(now).toISOString()
  return next
}

/** Rolling averages so the student can see whether anything is improving. */
export function trend(profile, { window = 5 } = {}) {
  const p = normaliseProfile(profile)
  const games = p.history.slice(0, window * 2)
  if (!games.length) return null
  const recent = games.slice(0, window)
  const previous = games.slice(window, window * 2)
  const mean = (list, key) => {
    const vals = list.map((g) => g[key]).filter((v) => typeof v === 'number')
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const recentAcpl = mean(recent, 'acpl')
  const previousAcpl = mean(previous, 'acpl')
  return {
    games: p.history.length,
    recentAcpl: recentAcpl === null ? null : Math.round(recentAcpl),
    previousAcpl: previousAcpl === null ? null : Math.round(previousAcpl),
    acplDelta: recentAcpl !== null && previousAcpl !== null ? Math.round(recentAcpl - previousAcpl) : null,
    recentAccuracy: mean(recent, 'accuracy') === null ? null : Number(mean(recent, 'accuracy').toFixed(1)),
    blundersPerGame: Number((mean(recent, 'blunders') ?? 0).toFixed(2)),
    sparkline: p.history.slice(0, 20).map((g) => g.acpl ?? 0).reverse(),
  }
}

/** One-line summary the coach prompt can consume. */
export function profileBrief(profile) {
  const ranked = rankWeaknesses(profile, { limit: 3 })
  const t = trend(profile)
  return {
    gamesPlayed: normaliseProfile(profile).gamesPlayed,
    topWeaknesses: ranked.map((r) => ({ id: r.id, label: r.label, games: r.games, count: r.count, drillAccuracy: r.accuracy })),
    recentAcpl: t?.recentAcpl ?? null,
    acplDelta: t?.acplDelta ?? null,
  }
}

/* ------------------------------------------------------------- persistence */

const STORAGE_KEY = 'chess-local-learning.profile.v1'

export const storage = {
  load() {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
      return raw ? normaliseProfile(JSON.parse(raw)) : emptyProfile()
    } catch {
      return emptyProfile()
    }
  },
  save(profile) {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(profile))
    } catch {
      /* private browsing or quota - server copy still applies */
    }
    return profile
  },
  async sync(profile) {
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(profile),
      })
    } catch {
      /* offline is fine, localStorage remains the source of truth */
    }
    return profile
  },
  async loadRemote() {
    try {
      const r = await fetch('/api/profile')
      const json = await r.json()
      return json.profile ? normaliseProfile(json.profile) : null
    } catch {
      return null
    }
  },
}
