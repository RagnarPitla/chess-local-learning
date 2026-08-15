/**
 * The curriculum layer: pure functions over the static lesson data.
 *
 * This module owns nothing stateful. Progress and the weakness profile live
 * elsewhere (profile.js and whatever the UI keeps in memory or storage); this
 * file only reads that state and turns it into rankings, filters and stats.
 */
import { LESSONS } from '../data/lessons-data.js'
import { rankWeaknesses, LEITNER_INTERVALS_DAYS } from './profile.js'

export const TRACKS = [
  { id: 'fundamentals', label: 'Fundamentals', blurb: 'The opening principles that replace memorised lines: centre, development, king safety and what to do when the opponent goes off script.' },
  { id: 'tactics', label: 'Tactics', blurb: 'One lesson per motif so you can spot and use the pattern in any position, not just the diagram you memorised.' },
  { id: 'positional', label: 'Positional play', blurb: 'The pawn structures and piece-quality themes that decide games with no tactics in sight.' },
  { id: 'openings', label: 'Opening families', blurb: 'The big systems taught as plans, not move orders: what you are trying to do, and what you do when they deviate.' },
  { id: 'endgames', label: 'Endgames', blurb: 'The technique that turns an advantage on the board into a full point on the scoresheet.' },
]

const TRACK_IDS = new Set(TRACKS.map((t) => t.id))
const LEVELS = ['beginner', 'intermediate', 'advanced']

/** Every lesson in the curriculum, in a fresh array the caller can freely reorder. */
export function allLessons() {
  return LESSONS.slice()
}

/** A single lesson by its id, or undefined if it does not exist. */
export function lessonById(id) {
  return LESSONS.find((lesson) => lesson.id === id)
}

/** Every lesson in a track, in curriculum order. */
export function lessonsForTrack(trackId) {
  if (!TRACK_IDS.has(trackId)) return []
  return LESSONS.filter((lesson) => lesson.track === trackId)
}

/** Every lesson that addresses a given PATTERN_LIBRARY id. */
export function lessonsForPattern(patternId) {
  if (!patternId) return []
  return LESSONS.filter((lesson) => lesson.patterns.includes(patternId))
}

/** Every lesson relevant to a named opening from the book. */
export function lessonsForOpening(openingName) {
  if (!openingName) return []
  return LESSONS.filter((lesson) => lesson.openings.includes(openingName))
}

/** A lesson is considered mastered once its Leitner box has reached the top interval. */
const MASTERED_BOX = LEITNER_INTERVALS_DAYS.length

function isMastered(entry) {
  return (entry?.box || 1) >= MASTERED_BOX
}

function pluralise(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/**
 * Turn one ranked weakness entry into a sentence citing the student's own evidence.
 *
 * Pattern labels come in two grammatical shapes - verb phrases like
 * "allowed a fork" and noun phrases like "piece with no squares" - so any
 * template that leads with a verb ("you have shown X") reads as broken English
 * for half of them. Naming the pattern in quotes and letting it sit as the
 * subject works for both, and matches how the Progress tab already refers to
 * patterns.
 */
function describeWeakness(entry) {
  const label = (entry.meta?.label || entry.label || entry.id).toLowerCase()
  const clauses = []

  if (entry.games) {
    clauses.push(`"${label}" showed up in ${pluralise(entry.games, 'reviewed game')}`)
  } else if (entry.count) {
    clauses.push(`"${label}" has come up ${pluralise(entry.count, 'time')} in your games`)
  } else {
    clauses.push(`"${label}" is your highest-priority tracked weakness right now`)
  }

  if (typeof entry.accuracy === 'number') {
    clauses.push(`drills on it are only landing ${entry.accuracy}% of the time so far`)
  } else if (Number.isFinite(entry.ageDays) && entry.ageDays < 999) {
    clauses.push(entry.ageDays <= 0 ? 'most recently today' : `most recently ${pluralise(entry.ageDays, 'day')} ago`)
  }

  const sentence = clauses.join(', ') + '.'
  // Capitalise the first letter, not the opening quote mark.
  return sentence.replace(/[a-z]/, (c) => c.toUpperCase())
}

/** A sensible beginner path used whenever there is no usable weakness evidence yet. */
const BEGINNER_PATH_IDS = [
  'fund-centre-control',
  'fund-development',
  'fund-king-safety',
  'fund-piece-twice',
  'fund-queen-early',
  'fund-out-of-book',
  'fund-candidate-moves',
]

/**
 * THE ADAPTIVE BIT. Ranks lessons by the student's own worst patterns.
 *
 * @param {object} profile   The weakness profile from profile.js (raw or normalised;
 *                           rankWeaknesses normalises it internally either way).
 * @param {object} [opts]
 * @param {number} [opts.limit=5]
 * @returns {{lesson: object, reason: string, score: number}[]}
 */
export function recommendLessons(profile, { limit = 5 } = {}) {
  const results = []
  const used = new Set()

  // A generous window on ranked weaknesses: not every pattern maps to a lesson
  // (e.g. "threw-away-win" is a habit, not a motif with its own drill), so we
  // need more raw candidates than the final lesson limit to fill it fairly.
  const ranked = rankWeaknesses(profile, { limit: 20 })

  for (const entry of ranked) {
    if (results.length >= limit) break
    if (isMastered(entry)) continue
    const reason = describeWeakness(entry)
    for (const lesson of lessonsForPattern(entry.id)) {
      if (results.length >= limit) break
      if (used.has(lesson.id)) continue
      used.add(lesson.id)
      results.push({ lesson, reason, score: entry.score })
    }
  }

  if (results.length < limit) {
    const startingFresh = results.length === 0
    for (const id of BEGINNER_PATH_IDS) {
      if (results.length >= limit) break
      if (used.has(id)) continue
      const lesson = lessonById(id)
      if (!lesson) continue
      used.add(id)
      results.push({
        lesson,
        reason: startingFresh
          ? 'No tracked weaknesses yet, so start with the fundamentals every stronger idea is built on.'
          : 'Rounding out the list with a core fundamental while more of your games get reviewed.',
        score: 0,
      })
    }
  }

  return results
}

/**
 * Progress on one lesson from a plain per-lesson state object.
 *
 * The state object is keyed by position index (0-based) with values shaped
 * like { seen, correct }. The caller (UI) owns a map of lessonId -> this
 * object; this function only ever looks at the slice for one lesson.
 */
export function lessonProgress(lesson, state) {
  const total = lesson?.positions?.length || 0
  const s = state && typeof state === 'object' ? state : {}
  let seen = 0
  let correct = 0
  for (let i = 0; i < total; i++) {
    const entry = s[i]
    if (entry?.seen) seen += 1
    if (entry?.correct) correct += 1
  }
  const pct = total ? Math.round((seen / total) * 100) : 0
  return { seen, correct, total, pct }
}

/** The next unseen position in a lesson, or null once every position has been seen. */
export function nextPosition(lesson, state) {
  const positions = lesson?.positions || []
  const s = state && typeof state === 'object' ? state : {}
  for (let i = 0; i < positions.length; i++) {
    if (!s[i]?.seen) return { index: i, position: positions[i] }
  }
  return null
}

/** Whole-curriculum counts for a progress dashboard. */
export function curriculumStats() {
  const byLevel = { beginner: 0, intermediate: 0, advanced: 0 }
  let positions = 0
  for (const lesson of LESSONS) {
    if (LEVELS.includes(lesson.level)) byLevel[lesson.level] += 1
    positions += lesson.positions.length
  }
  return { lessons: LESSONS.length, positions, tracks: TRACKS.length, byLevel }
}
