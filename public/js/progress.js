/**
 * Progress and mastery tracking: turns raw drill/lesson/game events into an
 * honest answer to "am I actually getting better, and at what?"
 *
 * Three kinds of evidence feed this module:
 *   - the weakness profile from profile.js (mistakes seen in real games,
 *     drill accuracy, Leitner spacing) - read here, never mutated;
 *   - lesson/position completion events recorded straight into this
 *     module's own state via recordLessonEvent;
 *   - calendar-day study evidence used for streaks and a simple XP curve.
 *
 * Everything above the "DOM" marker is pure logic: no fs, no top-level
 * fetch, no DOM, so it runs unchanged under `node --test` and in the
 * browser. Persistence is localStorage, versioned so the shape can change
 * later without losing a returning user's data.
 *
 * "lessons" arguments accepted below are treated defensively: this module
 * does not own the lesson content shape (that lives in lessons.js), so a
 * small adapter layer reads whichever of a few plausible field names is
 * present (id/lessonId, trackId/track, positions/items/drills/steps) and
 * degrades gracefully - never throws - when a shape is unexpected.
 */
import { PATTERN_LIBRARY } from './patterns.js'
import { normaliseProfile, rankWeaknesses, dueDrills, LEITNER_INTERVALS_DAYS } from './profile.js'
import { lessonById } from './lessons.js'

export const PROGRESS_VERSION = 1
const DAY_MS = 86400000
const STORAGE_KEY = 'chess-local-learning.progress.v1'

/** Vocabulary for xpFor/addXp event.type - see the formulas below. */
export const XP_EVENTS = {
  LESSON_POSITION: 'lesson-position',
  DRILL: 'drill',
  GAME_REVIEWED: 'game-reviewed',
  LESSON_COMPLETED: 'lesson-completed',
}

export const MASTERY_LEVELS = ['unseen', 'weak', 'improving', 'solid', 'mastered']
export const LESSON_MASTERY_LEVELS = ['unseen', 'started', 'practicing', 'mastered']

/** Minimum combined observations (mistakes seen in games + drill attempts)
 * before masteryFor will claim anything better than "weak". Below this a
 * pattern is always reported as weak, regardless of how the raw numbers
 * look, so a lucky single drill never gets called "mastered". */
export const MASTERY_MIN_OBSERVATIONS = 4

/* ---------------------------------------------------------------- state */

export function createProgressState() {
  const now = new Date().toISOString()
  return {
    version: PROGRESS_VERSION,
    createdAt: now,
    updatedAt: now,
    xp: 0,
    xpEvents: [],
    lessons: {},
    studyDays: [],
  }
}

/** Repair anything missing, corrupt or from a future/older shape. Never throws. */
export function normaliseProgress(raw) {
  const base = createProgressState()
  if (!raw || typeof raw !== 'object') return base

  const lessons = {}
  if (raw.lessons && typeof raw.lessons === 'object') {
    for (const [lessonId, rec] of Object.entries(raw.lessons)) {
      if (!rec || typeof rec !== 'object') continue
      const positions = {}
      if (rec.positions && typeof rec.positions === 'object') {
        for (const [posId, pos] of Object.entries(rec.positions)) {
          if (!pos || typeof pos !== 'object') continue
          positions[posId] = {
            attempts: Number.isFinite(pos.attempts) ? Math.max(0, pos.attempts) : 0,
            correct: Number.isFinite(pos.correct) ? Math.max(0, pos.correct) : 0,
            lastCorrect: !!pos.lastCorrect,
            firstSeen: typeof pos.firstSeen === 'string' ? pos.firstSeen : base.createdAt,
            lastSeen: typeof pos.lastSeen === 'string' ? pos.lastSeen : base.createdAt,
          }
        }
      }
      lessons[lessonId] = {
        positions,
        firstSeen: typeof rec.firstSeen === 'string' ? rec.firstSeen : base.createdAt,
        lastSeen: typeof rec.lastSeen === 'string' ? rec.lastSeen : base.createdAt,
      }
    }
  }

  const studyDays = Array.isArray(raw.studyDays)
    ? [...new Set(raw.studyDays.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort()
    : []

  const xpEvents = Array.isArray(raw.xpEvents)
    ? raw.xpEvents
        .filter((e) => e && typeof e === 'object' && typeof e.type === 'string' && Number.isFinite(e.amount))
        .slice(0, 200)
    : []

  return {
    version: PROGRESS_VERSION,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : base.createdAt,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt,
    xp: Number.isFinite(raw.xp) ? Math.max(0, raw.xp) : 0,
    xpEvents,
    lessons,
    studyDays,
  }
}

/* ------------------------------------------------------------- persistence */

export function loadProgress() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (!raw) return createProgressState()
    return normaliseProgress(JSON.parse(raw))
  } catch {
    return createProgressState()
  }
}

/** Returns true on success, false if storage was unavailable or over quota. */
export function saveProgress(state) {
  try {
    if (!globalThis.localStorage) return false
    const safe = normaliseProgress(state)
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
    return true
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ dates */

function safeDate(at) {
  if (at instanceof Date && !Number.isNaN(at.getTime())) return at
  if (typeof at === 'string' || typeof at === 'number') {
    const d = new Date(at)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

/** LOCAL calendar day, not UTC - the point of a streak is "did you practise
 * today where you live", not "did you practise before midnight UTC". */
function localDayKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Add whole calendar days to a day-key via the Y/M/D components (not raw
 * milliseconds), so this stays correct across DST transitions. */
function addDaysKey(key, delta) {
  const d = parseDayKey(key)
  d.setDate(d.getDate() + delta)
  return localDayKey(d)
}

function isNextDay(prevKey, nextKey) {
  return addDaysKey(prevKey, 1) === nextKey
}

/* ----------------------------------------------------------- lesson events */

export function recordLessonEvent(state, { lessonId, positionId, correct, at } = {}) {
  let next = normaliseProgress(state)
  if (!lessonId) return next
  const when = safeDate(at)
  const nowIso = when.toISOString()

  // Resolve positionId against the lesson's real positions so the writer
  // and every reader (rollupLessons, lessonStatus) always agree on the
  // key used: an exact canonical match (see lessonPositionIds - the fen,
  // for the shipped curriculum) or a plain array index both normalise to
  // the SAME key. A positionId that matches neither is rejected - loudly,
  // via console.warn - rather than silently stored somewhere no reader
  // will ever count towards progress.
  let posKey = '_lesson'
  if (positionId !== undefined && positionId !== null && positionId !== '') {
    let lesson = null
    try {
      lesson = lessonById(lessonId)
    } catch {
      lesson = null
    }
    const resolved = resolvePositionKey(lesson, positionId)
    if (resolved.checked && !resolved.ok) {
      const count = lessonPositionIds(lesson)?.length ?? 0
      console.warn(
        `recordLessonEvent: positionId ${JSON.stringify(positionId)} is not a real position in lesson "${lessonId}" ` +
          `(it has ${count} position${count === 1 ? '' : 's'}) and is not a valid index into it - ignoring this event ` +
          'instead of recording progress that curriculumProgress/trackProgress could never count. Pass the position ' +
          'canonical id (its fen for the shipped curriculum) or its array index instead.'
      )
      return next
    }
    posKey = resolved.key
  }

  const lessons = { ...next.lessons }
  const existingLesson = lessons[lessonId]
  const lesson = existingLesson
    ? { positions: { ...existingLesson.positions }, firstSeen: existingLesson.firstSeen, lastSeen: existingLesson.lastSeen }
    : { positions: {}, firstSeen: nowIso, lastSeen: nowIso }

  const existingPos = lesson.positions[posKey]
  const pos = existingPos
    ? { ...existingPos }
    : { attempts: 0, correct: 0, lastCorrect: false, firstSeen: nowIso, lastSeen: nowIso }
  pos.attempts += 1
  if (correct) pos.correct += 1
  pos.lastCorrect = !!correct
  pos.lastSeen = nowIso
  lesson.positions[posKey] = pos
  lesson.lastSeen = nowIso
  lessons[lessonId] = lesson

  next = { ...next, lessons, updatedAt: nowIso }
  next = addXp(next, { type: XP_EVENTS.LESSON_POSITION, correct: !!correct, at: when })
  return next
}

/** Per-lesson status. When lessonId resolves to a real lesson (lessons.js),
 * this defers to rollupLessons so the total/correct/pct/completed here are
 * computed by the exact same code path as trackProgress/curriculumProgress
 * - they can never disagree for a lesson that exists in the curriculum.
 * For an id lessons.js does not know (e.g. a synthetic/test lesson), this
 * falls back to the raw recorded positions alone, same as before. */
export function lessonStatus(state, lessonId) {
  const p = normaliseProgress(state)
  if (!lessonId) {
    return { started: false, completed: false, correct: 0, total: 0, pct: 0, mastery: 'unseen', lastSeen: null }
  }

  let lesson = null
  try {
    lesson = lessonById(lessonId)
  } catch {
    lesson = null
  }
  if (lesson) {
    const item = rollupLessons(state, [lesson]).lessons[0]
    if (!item) return { started: false, completed: false, correct: 0, total: 0, pct: 0, mastery: 'unseen', lastSeen: null }
    return { started: item.started, completed: item.completed, correct: item.correct, total: item.total, pct: item.pct, mastery: lessonMasteryOf(item), lastSeen: item.lastSeen }
  }

  const rec = p.lessons[lessonId]
  if (!rec) {
    return { started: false, completed: false, correct: 0, total: 0, pct: 0, mastery: 'unseen', lastSeen: null }
  }
  const positions = Object.values(rec.positions || {})
  const total = positions.length
  const correct = positions.filter((pos) => pos.lastCorrect).length
  const pct = total ? Math.round((correct / total) * 100) : 0
  const started = total > 0
  const completed = started && correct === total
  return { started, completed, correct, total, pct, mastery: lessonMasteryOf({ started, completed, pct }), lastSeen: rec.lastSeen || null }
}

/** Single shared rule for the started/practicing/mastered/unseen label so
 * lessonStatus's two branches (and nothing else) can ever disagree on it. */
function lessonMasteryOf({ started, completed, pct }) {
  if (!started) return 'unseen'
  if (completed) return 'mastered'
  if (pct >= 50) return 'practicing'
  return 'started'
}

/* --------------------------------------------------------- lesson adapter */
/* Defensive readers for lesson objects whose exact shape comes from
 * lessons.js (owned by another agent) and is not guaranteed here. */

function getLessonId(lesson) {
  if (typeof lesson === 'string' || typeof lesson === 'number') return String(lesson)
  if (!lesson || typeof lesson !== 'object') return null
  const id = lesson.id ?? lesson.lessonId ?? lesson.slug ?? lesson.key
  return id === undefined || id === null ? null : String(id)
}

function getLessonTitle(lesson) {
  if (typeof lesson === 'string' || typeof lesson === 'number') return String(lesson)
  if (!lesson || typeof lesson !== 'object') return null
  return lesson.title ?? lesson.name ?? lesson.label ?? getLessonId(lesson)
}

function getLessonTrackId(lesson) {
  if (!lesson || typeof lesson !== 'object') return null
  const t = lesson.trackId ?? lesson.track ?? lesson.trackKey ?? lesson.category
  return t === undefined || t === null ? null : String(t)
}

function lessonPositionsArray(lesson) {
  if (!lesson || typeof lesson !== 'object') return null
  const arr = lesson.positions ?? lesson.items ?? lesson.drills ?? lesson.steps ?? lesson.exercises ?? lesson.fens
  return Array.isArray(arr) ? arr : null
}

function lessonPositionIds(lesson) {
  const arr = lessonPositionsArray(lesson)
  if (!arr) return null
  return arr.map((pos, i) => {
    if (typeof pos === 'string' || typeof pos === 'number') return String(pos)
    return String(pos?.id ?? pos?.positionId ?? pos?.fen ?? i)
  })
}

function lessonPositionCount(lesson) {
  const arr = lessonPositionsArray(lesson)
  if (arr) return Math.max(1, arr.length)
  const n = Number(lesson?.positionCount ?? lesson?.stepCount)
  return Number.isFinite(n) && n > 0 ? n : 1
}

/** The one rule for turning whatever positionId a caller passes into the
 * canonical key rollupLessons (and therefore trackProgress/curriculumProgress)
 * will actually count: an exact match against lessonPositionIds, or a plain
 * array index into that same list. `checked:false` means the lesson's real
 * positions could not be determined at all (unknown lessonId, or a lesson
 * with no discoverable positions array) - there is nothing to validate
 * against, so the raw id is accepted as-is, same as before this existed.
 * `checked:true, ok:false` means the lesson IS known and positionId matches
 * none of its real positions - the caller must not be allowed to store that
 * silently, since nothing would ever count it. */
function resolvePositionKey(lesson, rawPositionId) {
  const canonical = lessonPositionIds(lesson)
  const raw = String(rawPositionId)
  if (!canonical || !canonical.length) return { key: raw, ok: true, checked: false }
  if (canonical.includes(raw)) return { key: raw, ok: true, checked: true }
  const idx = Number(raw)
  if (Number.isInteger(idx) && idx >= 0 && idx < canonical.length) return { key: canonical[idx], ok: true, checked: true }
  return { key: raw, ok: false, checked: true }
}

function findLessonForPattern(lessons, patternId) {
  if (!Array.isArray(lessons) || !patternId) return null
  for (const lesson of lessons) {
    if (!lesson || typeof lesson !== 'object') continue
    if (lesson.patternId === patternId) return lesson
    if (lesson.pattern === patternId) return lesson
    if (Array.isArray(lesson.patternIds) && lesson.patternIds.includes(patternId)) return lesson
    if (Array.isArray(lesson.patterns) && lesson.patterns.includes(patternId)) return lesson
    if (getLessonId(lesson) === patternId) return lesson
  }
  return null
}

/** Aggregate an already-decided list of lessons against recorded state.
 * Shared by trackProgress (which filters first) and curriculumProgress
 * (which partitions first) so totals never get double-counted. */
function rollupLessons(state, lessons) {
  const p = normaliseProgress(state)
  const list = Array.isArray(lessons) ? lessons : []
  let lessonsTotal = 0
  let lessonsCompleted = 0
  let positionsTotal = 0
  let positionsCorrect = 0
  const items = []

  for (const lesson of list) {
    const lessonId = getLessonId(lesson)
    if (!lessonId) continue
    lessonsTotal += 1

    const canonicalIds = lessonPositionIds(lesson)
    const total = canonicalIds ? Math.max(1, canonicalIds.length) : lessonPositionCount(lesson)
    const rec = p.lessons[lessonId]

    let correct = 0
    let attempted = 0
    let lastSeen = null
    if (rec) {
      lastSeen = rec.lastSeen || null
      if (canonicalIds && canonicalIds.length) {
        for (const posId of canonicalIds) {
          const pos = rec.positions[posId]
          if (pos) {
            attempted += 1
            if (pos.lastCorrect) correct += 1
          }
        }
      } else {
        const all = Object.values(rec.positions || {})
        attempted = all.length
        correct = all.filter((pos) => pos.lastCorrect).length
      }
    }
    correct = Math.min(correct, total)
    const completed = attempted > 0 && correct >= total
    positionsTotal += total
    positionsCorrect += correct
    if (completed) lessonsCompleted += 1

    items.push({
      lessonId,
      title: getLessonTitle(lesson),
      trackId: getLessonTrackId(lesson),
      total,
      correct,
      pct: total ? Math.round((correct / total) * 100) : 0,
      completed,
      started: attempted > 0,
      lastSeen,
    })
  }

  return {
    lessonsTotal,
    lessonsCompleted,
    positionsTotal,
    positionsCorrect,
    pct: positionsTotal ? Math.round((positionsCorrect / positionsTotal) * 100) : 0,
    lessons: items,
  }
}

/** Rollup for a whole curriculum track. `lessons` may be the full curriculum
 * (this filters to trackId) or an already-filtered list for that track. */
export function trackProgress(state, trackId, lessons) {
  const list = Array.isArray(lessons) ? lessons : []
  const subset = list.filter((lesson) => {
    const t = getLessonTrackId(lesson)
    return t === null || t === trackId
  })
  return { trackId: trackId ?? null, ...rollupLessons(state, subset) }
}

/** Overall curriculum rollup, partitioned by track so byTrack lessonsTotal
 * always sums back to the overall lessonsTotal (no double-counting). */
export function curriculumProgress(state, lessons) {
  const list = Array.isArray(lessons) ? lessons : []
  const overall = rollupLessons(state, list)

  const partitions = new Map()
  for (const lesson of list) {
    const key = getLessonTrackId(lesson) ?? 'general'
    if (!partitions.has(key)) partitions.set(key, [])
    partitions.get(key).push(lesson)
  }
  const byTrack = {}
  for (const [key, subset] of partitions) {
    byTrack[key] = { trackId: key, ...rollupLessons(state, subset) }
  }

  return {
    lessonsCompleted: overall.lessonsCompleted,
    lessonsTotal: overall.lessonsTotal,
    positionsCorrect: overall.positionsCorrect,
    positionsTotal: overall.positionsTotal,
    pct: overall.pct,
    byTrack,
  }
}

function findNextIncompleteLesson(state, lessons) {
  if (!Array.isArray(lessons) || !lessons.length) return null
  const ordered = [...lessons].sort((a, b) => {
    const ao = Number(a?.order ?? a?.index ?? 0)
    const bo = Number(b?.order ?? b?.index ?? 0)
    return ao - bo
  })
  for (const lesson of ordered) {
    const lessonId = getLessonId(lesson)
    if (!lessonId) continue
    const rollup = rollupLessons(state, [lesson])
    if (!rollup.lessonsCompleted) return lesson
  }
  return null
}

/* ------------------------------------------------------------- streaks */

export function recordStudyDay(state, at) {
  const next = normaliseProgress(state)
  const when = safeDate(at)
  const key = localDayKey(when)
  if (next.studyDays.includes(key)) return next
  return { ...next, studyDays: [...next.studyDays, key].sort(), updatedAt: when.toISOString() }
}

export function streak(state) {
  const p = normaliseProgress(state)
  const days = [...p.studyDays].sort()
  if (!days.length) {
    return { current: 0, longest: 0, lastActiveDay: null, activeDaysLast30: 0, todayDone: false }
  }

  let longest = 1
  let run = 1
  for (let i = 1; i < days.length; i++) {
    run = isNextDay(days[i - 1], days[i]) ? run + 1 : 1
    longest = Math.max(longest, run)
  }

  const daySet = new Set(days)
  const todayKey = localDayKey(new Date())
  const todayDone = daySet.has(todayKey)
  let cursor = todayDone ? todayKey : addDaysKey(todayKey, -1)
  let current = 0
  while (daySet.has(cursor)) {
    current += 1
    cursor = addDaysKey(cursor, -1)
  }

  const cutoff = addDaysKey(todayKey, -29)
  const activeDaysLast30 = days.filter((d) => d >= cutoff && d <= todayKey).length

  return { current, longest, lastActiveDay: days[days.length - 1], activeDaysLast30, todayDone }
}

/* ------------------------------------------------------------------- XP */

/** base = XP just for attempting (evidence of work happened at all);
 * bonus = extra XP when the attempt was correct. Winning is never rewarded
 * on its own - only the act of reviewing / drilling / practising is. */
const XP_TABLE = {
  [XP_EVENTS.LESSON_POSITION]: { base: 4, bonus: 4 },
  [XP_EVENTS.DRILL]: { base: 5, bonus: 5 },
  [XP_EVENTS.GAME_REVIEWED]: { base: 20, bonus: 0 },
  [XP_EVENTS.LESSON_COMPLETED]: { base: 15, bonus: 0 },
}

export function xpFor(event) {
  if (!event || typeof event !== 'object') return 0
  const rule = XP_TABLE[event.type]
  if (!rule) return 0
  return rule.base + (event.correct ? rule.bonus : 0)
}

/** Applies xpFor(event) to state and, whenever XP was actually earned,
 * also records a study day - any XP-worthy action is by definition real
 * evidence of practice, so streaks and XP always agree with each other. */
export function addXp(state, event) {
  let next = normaliseProgress(state)
  const amount = xpFor(event)
  if (amount <= 0) return next
  const when = safeDate(event?.at)
  next = {
    ...next,
    xp: next.xp + amount,
    xpEvents: [{ type: event.type, amount, correct: !!event.correct, at: when.toISOString() }, ...next.xpEvents].slice(0, 200),
    updatedAt: when.toISOString(),
  }
  return recordStudyDay(next, when)
}

const XP_LEVEL_FACTOR = 100 // total XP needed for level L is FACTOR * (L-1)^2 - a plain quadratic curve

export function level(state) {
  const p = normaliseProgress(state)
  const xp = Math.max(0, p.xp || 0)
  const xpForLevel = (l) => XP_LEVEL_FACTOR * (l - 1) ** 2
  const current = Math.max(1, Math.floor(Math.sqrt(xp / XP_LEVEL_FACTOR)) + 1)
  const floorXp = xpForLevel(current)
  const nextFloorXp = xpForLevel(current + 1)
  const xpIntoLevel = xp - floorXp
  const xpForNextLevel = nextFloorXp - floorXp
  return {
    level: current,
    xp,
    xpIntoLevel,
    xpForNextLevel,
    pctToNextLevel: xpForNextLevel > 0 ? Math.round((xpIntoLevel / xpForNextLevel) * 100) : 100,
  }
}

/* ------------------------------------------------------------- mastery */

/** Evidence-based mastery of one pattern, blending: how often it still
 * shows up as a mistake in recent games, drill success rate, and Leitner
 * box (a proxy for durable, spaced-out correctness rather than a single
 * lucky rep). Never claims more than "weak" below MASTERY_MIN_OBSERVATIONS. */
export function masteryFor(state, profile, patternId) {
  const prof = normaliseProfile(profile)
  const meta = PATTERN_LIBRARY[patternId]
  const label = meta?.label || String(patternId)
  const entry = prof.patterns ? prof.patterns[patternId] : null

  if (!entry) {
    return {
      patternId,
      label,
      level: 'unseen',
      score: 0,
      evidence: `"${label}" has not shown up in a reviewed game or a drill yet - no evidence either way.`,
    }
  }

  const attempts = entry.attempts || 0
  const correct = Math.min(entry.correct || 0, attempts)
  const count = entry.count || 0
  const games = entry.games || 0
  const boxMax = LEITNER_INTERVALS_DAYS.length
  const box = Math.max(1, Math.min(boxMax, entry.box || 1))
  const drillAccuracy = attempts > 0 ? correct / attempts : null
  const boxScore = boxMax > 1 ? (box - 1) / (boxMax - 1) : 0

  const lastSeenMs = entry.lastSeen ? new Date(entry.lastSeen).getTime() : null
  const daysSinceSeen = lastSeenMs && !Number.isNaN(lastSeenMs) ? Math.max(0, (Date.now() - lastSeenMs) / DAY_MS) : null
  const recencyRelief = daysSinceSeen === null ? 0.5 : Math.min(1, daysSinceSeen / 30)

  const history = prof.history || []
  const half = Math.min(10, Math.ceil(history.length / 2))
  const recentGames = history.slice(0, half)
  const priorGames = history.slice(half, half * 2)
  const recentHits = recentGames.filter((g) => g.topPattern === patternId).length
  const priorHits = priorGames.filter((g) => g.topPattern === patternId).length
  const recentRate = recentGames.length ? recentHits / recentGames.length : null
  const gameTrendRelief = recentRate === null ? 0.5 : 1 - recentRate

  const observations = attempts + count
  const enoughData = observations >= MASTERY_MIN_OBSERVATIONS

  const rawScore = 0.35 * (drillAccuracy ?? 0.3) + 0.25 * boxScore + 0.2 * recencyRelief + 0.2 * gameTrendRelief
  const score = Number(Math.max(0, Math.min(1, rawScore)).toFixed(2))

  let lvl
  if (!enoughData) lvl = 'weak'
  else if (score >= 0.85) lvl = 'mastered'
  else if (score >= 0.65) lvl = 'solid'
  else if (score >= 0.4) lvl = 'improving'
  else lvl = 'weak'

  const parts = []
  if (!enoughData) {
    parts.push(
      `Only ${observations} observation${observations === 1 ? '' : 's'} so far for "${label}" (${count} mistake${count === 1 ? '' : 's'} in games, ${attempts} drill attempt${attempts === 1 ? '' : 's'}) - too few to call this more than weak.`
    )
  } else {
    const seenPart = daysSinceSeen !== null ? `, last seen ${Math.round(daysSinceSeen)} day${Math.round(daysSinceSeen) === 1 ? '' : 's'} ago` : ', never seen in a game (drills only)'
    parts.push(`"${label}" has cost you ${count} time${count === 1 ? '' : 's'} across ${games} game${games === 1 ? '' : 's'}${seenPart}.`)
    if (drillAccuracy !== null) {
      parts.push(`Drill accuracy is ${Math.round(drillAccuracy * 100)}% (${correct}/${attempts}) at Leitner box ${box} of ${boxMax}.`)
    }
    if (recentGames.length && priorGames.length) {
      parts.push(`It was your top mistake in ${recentHits} of your last ${recentGames.length} games versus ${priorHits} of the ${priorGames.length} before that.`)
    }
  }

  return { patternId, label, level: lvl, score, evidence: parts.join(' ') }
}

/* --------------------------------------------------------- improvement */

function buildTrendSummary({ direction, confidence, deltas, recent, prior }) {
  if (confidence === 'none') {
    return `Only ${recent.games} game${recent.games === 1 ? '' : 's'} recorded so far - there is nothing earlier to compare against yet, so no trend can be claimed.`
  }
  const bits = []
  if (deltas.acpl !== null) bits.push(`average loss per move is ${recent.acpl} (was ${prior.acpl})`)
  if (deltas.accuracy !== null) bits.push(`accuracy is ${recent.accuracy}% (was ${prior.accuracy}%)`)
  if (deltas.blunderRate !== null) bits.push(`blunders per game are ${recent.blunderRate} (was ${prior.blunderRate})`)
  const factsPart = bits.length
    ? `Over your last ${recent.games} games versus the ${prior.games} before that, ${bits.join(', ')}.`
    : 'Not enough comparable data yet.'
  const dirWord = direction === 'improving' ? 'That is a genuine improvement' : direction === 'declining' ? 'That is trending the wrong way' : 'That is essentially flat'
  const confWord =
    confidence === 'high'
      ? ''
      : confidence === 'medium'
        ? ' though with a moderate sample size, treat this as a likely trend rather than a certainty'
        : ' but with so few games this is a low-confidence read - keep playing to be sure'
  return `${factsPart} ${dirWord}${confWord}.`
}

/** Compares the last `window` games to the `window` before that, on
 * accuracy, average centipawn loss and blunder rate. Confidence is honest
 * about small samples: "none" with nothing to compare, "low"/"medium" for
 * thin samples, "high" only once both sides are fully populated. */
export function improvementTrend(state, profile, { window = 10 } = {}) {
  const prof = normaliseProfile(profile)
  const history = prof.history || []
  const w = Math.max(1, Math.floor(window) || 10)
  const recentGames = history.slice(0, w)
  const priorGames = history.slice(w, w * 2)

  const meanOf = (list, key) => {
    const vals = list.map((g) => g[key]).filter((v) => typeof v === 'number')
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const blunderRateOf = (list) => (list.length ? list.reduce((a, g) => a + (g.blunders || 0), 0) / list.length : null)

  const recent = {
    games: recentGames.length,
    acpl: roundOrNull(meanOf(recentGames, 'acpl'), 0),
    accuracy: roundOrNull(meanOf(recentGames, 'accuracy'), 1),
    blunderRate: roundOrNull(blunderRateOf(recentGames), 2),
  }
  const prior = {
    games: priorGames.length,
    acpl: roundOrNull(meanOf(priorGames, 'acpl'), 0),
    accuracy: roundOrNull(meanOf(priorGames, 'accuracy'), 1),
    blunderRate: roundOrNull(blunderRateOf(priorGames), 2),
  }

  const deltas = {
    acpl: recent.acpl !== null && prior.acpl !== null ? Number((recent.acpl - prior.acpl).toFixed(1)) : null,
    accuracy: recent.accuracy !== null && prior.accuracy !== null ? Number((recent.accuracy - prior.accuracy).toFixed(1)) : null,
    blunderRate: recent.blunderRate !== null && prior.blunderRate !== null ? Number((recent.blunderRate - prior.blunderRate).toFixed(2)) : null,
  }

  const signals = []
  if (deltas.acpl) signals.push(deltas.acpl < 0 ? 1 : -1)
  if (deltas.accuracy) signals.push(deltas.accuracy > 0 ? 1 : -1)
  if (deltas.blunderRate) signals.push(deltas.blunderRate < 0 ? 1 : -1)
  const signalSum = signals.reduce((a, b) => a + b, 0)
  let direction
  if (prior.games === 0) direction = 'insufficient-data'
  else if (!signals.length) direction = 'flat'
  else direction = signalSum > 0 ? 'improving' : signalSum < 0 ? 'declining' : 'flat'

  const smallestSide = Math.min(recent.games, prior.games)
  let confidence
  if (prior.games === 0) confidence = 'none'
  else if (smallestSide < 3) confidence = 'low'
  else if (smallestSide < w) confidence = 'medium'
  else confidence = 'high'

  const series = history
    .slice(0, w * 2)
    .map((g) => ({ playedAt: g.playedAt, acpl: g.acpl, accuracy: g.accuracy, blunders: g.blunders }))
    .reverse()

  return {
    window: w,
    gamesConsidered: recent.games + prior.games,
    recent,
    prior,
    deltas,
    direction,
    confidence,
    series,
    summary: buildTrendSummary({ direction, confidence, deltas, recent, prior }),
  }
}

function roundOrNull(v, digits) {
  return v === null ? null : Number(v.toFixed(digits))
}

/* ---------------------------------------------------------- next action */

/** One clear recommendation: a due drill beats an untargeted lesson beats
 * "keep playing", but with zero evidence at all the only honest advice is
 * to play or import a first game. */
export function nextBestAction(state, profile, lessons) {
  const prof = normaliseProfile(profile)
  const list = Array.isArray(lessons) ? lessons : []
  const hasGameEvidence = prof.gamesPlayed > 0 || Object.keys(prof.patterns || {}).length > 0

  if (!hasGameEvidence) {
    const lessonNote = list.length
      ? ` There ${list.length === 1 ? 'is' : 'are'} also ${list.length} lesson${list.length === 1 ? '' : 's'} ready whenever you want structured practice instead.`
      : ''
    return {
      type: 'play-game',
      title: 'Play or import your first game',
      reason: `You have not recorded a game yet, so there is no evidence yet of what to work on. Play a game here or import one and run a review to start building your weakness profile.${lessonNote}`,
      patternId: null,
      lessonId: null,
      trackId: null,
    }
  }

  const dueTop = dueDrills(prof, { limit: 1 })[0]
  if (dueTop) {
    const label = dueTop.label || PATTERN_LIBRARY[dueTop.id]?.label || dueTop.id
    const overdueDays = dueTop.due ? Math.max(0, Math.round((Date.now() - new Date(dueTop.due).getTime()) / DAY_MS)) : null
    const accuracyPart = dueTop.attempts ? ` Your drill accuracy on it so far is ${Math.round((dueTop.correct / dueTop.attempts) * 100)}% (${dueTop.correct}/${dueTop.attempts}).` : ''
    return {
      type: 'drill',
      title: `Drill: ${label}`,
      reason: `"${label}" is due for spaced review${overdueDays ? ` (${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue)` : ''} - it has cost you ${dueTop.count} time${dueTop.count === 1 ? '' : 's'} across ${dueTop.games} game${dueTop.games === 1 ? '' : 's'}.${accuracyPart}`,
      patternId: dueTop.id,
      lessonId: null,
      trackId: null,
    }
  }

  const topWeak = rankWeaknesses(prof, { limit: 1 })[0]
  if (topWeak) {
    const lesson = findLessonForPattern(list, topWeak.id)
    if (lesson) {
      const title = getLessonTitle(lesson)
      return {
        type: 'lesson',
        title: `Lesson: ${title}`,
        reason: `Your top recorded weakness is "${topWeak.label}" (${topWeak.count}x across ${topWeak.games} games${topWeak.accuracy !== null ? `, drill accuracy ${topWeak.accuracy}%` : ''}). Nothing is due for drill right now, so take the "${title}" lesson to work on it directly.`,
        patternId: topWeak.id,
        lessonId: getLessonId(lesson),
        trackId: getLessonTrackId(lesson),
      }
    }
  }

  const nextLesson = findNextIncompleteLesson(state, list)
  if (nextLesson) {
    const curriculum = curriculumProgress(state, list)
    const title = getLessonTitle(nextLesson)
    return {
      type: 'lesson',
      title: `Continue: ${title}`,
      reason: `You have completed ${curriculum.lessonsCompleted} of ${curriculum.lessonsTotal} lessons. Nothing is due for drill right now, so continue with "${title}".`,
      patternId: null,
      lessonId: getLessonId(nextLesson),
      trackId: getLessonTrackId(nextLesson),
    }
  }

  if (topWeak) {
    return {
      type: 'drill',
      title: `Review: ${topWeak.label}`,
      reason: `Nothing is due right now, but "${topWeak.label}" is still your top recorded weakness (${topWeak.count}x across ${topWeak.games} games). Play another game or revisit it for extra practice.`,
      patternId: topWeak.id,
      lessonId: null,
      trackId: null,
    }
  }

  return {
    type: 'play-game',
    title: 'Play another game',
    reason: 'Nice work - no drills are due and no active weaknesses are tracked right now. Play or import another game to keep generating evidence.',
    patternId: null,
    lessonId: null,
    trackId: null,
  }
}

/* -------------------------------------------------------------- summary */

/** Everything the dashboard needs from state+profile alone. Curriculum
 * data and nextBestAction need a `lessons` list too, so the dashboard
 * fetches those separately with whatever lessons it has on hand. */
export function progressSummary(state, profile) {
  const prof = normaliseProfile(profile)
  const s = streak(state)
  const lvl = level(state)
  const trend = improvementTrend(state, prof, {})
  const mastery = Object.keys(PATTERN_LIBRARY).map((id) => masteryFor(state, prof, id))
  const weaknesses = rankWeaknesses(prof, { limit: 6 })
  const due = dueDrills(prof, { limit: 5 })
  const hasEvidence = prof.gamesPlayed > 0 || Object.keys(prof.patterns || {}).length > 0
  return { streak: s, level: lvl, trend, mastery, weaknesses, due, gamesPlayed: prof.gamesPlayed, hasEvidence }
}

/* ------------------------------------------------------------ import/export */

export function exportProgress(state) {
  const safe = normaliseProgress(state)
  return JSON.stringify({ kind: 'chess-local-learning.progress', version: PROGRESS_VERSION, exportedAt: new Date().toISOString(), data: safe }, null, 2)
}

/** Never trusts the file: always returns {ok, error, state} rather than
 * throwing, so a bad upload cannot crash the app. */
export function importProgress(json) {
  try {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'This does not look like a progress file.', state: null }
    }
    if (parsed.kind && parsed.kind !== 'chess-local-learning.progress') {
      return { ok: false, error: 'This file is not a Chess Local Learning progress export.', state: null }
    }
    const payload = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed
    return { ok: true, error: null, state: normaliseProgress(payload) }
  } catch (err) {
    return { ok: false, error: `Could not read that file: ${err?.message || 'invalid JSON'}.`, state: null }
  }
}

/* ================================================================= DOM === */
/* Everything below builds and mounts UI. No pure logic above this line
 * depends on anything below it. */

const SVG_NS = 'http://www.w3.org/2000/svg'

const LEVEL_COLOUR = {
  unseen: 'var(--muted)',
  weak: 'var(--bad)',
  improving: 'var(--warn)',
  solid: 'var(--accent)',
  mastered: 'var(--good)',
}
const LEVEL_LABEL = {
  unseen: 'Unseen',
  weak: 'Weak',
  improving: 'Improving',
  solid: 'Solid',
  mastered: 'Mastered',
}

function h(tag, opts = {}) {
  const node = document.createElement(tag)
  if (opts.className) node.className = opts.className
  if (opts.text !== undefined && opts.text !== null) node.textContent = String(opts.text)
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v)
  if (opts.style) Object.assign(node.style, opts.style)
  if (opts.onClick) node.addEventListener('click', opts.onClick)
  return node
}

function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v))
  return node
}

function append(parent, children) {
  for (const child of children) if (child) parent.appendChild(child)
  return parent
}

function buildStat(label, value, tone) {
  const stat = h('div', { className: `stat${tone ? ` ${tone}` : ''}` })
  return append(stat, [h('div', { className: 'v', text: value }), h('div', { className: 'k', text: label })])
}

function actionButtonLabel(type) {
  if (type === 'drill') return 'Go drill it'
  if (type === 'lesson') return 'Open the lesson'
  return 'Play now'
}

function buildHero(action, onAction) {
  const card = h('div', { className: 'card pgr-hero' })
  const btn = h('button', {
    className: 'primary wide',
    text: actionButtonLabel(action.type),
    onClick: () => onAction?.({ type: action.type, patternId: action.patternId, lessonId: action.lessonId, trackId: action.trackId }),
  })
  return append(card, [
    h('h2', { text: 'Do this next' }),
    h('h3', { className: 'pgr-hero-title', text: action.title }),
    h('p', { className: 'pgr-hero-reason', text: action.reason }),
    btn,
  ])
}

function buildSummaryRow(streakInfo, levelInfo) {
  const row = h('div', { className: 'stats pgr-summary-row' })
  return append(row, [
    buildStat('Streak', `${streakInfo.current}d`, streakInfo.current > 0 ? 'good' : ''),
    buildStat('Best streak', `${streakInfo.longest}d`, ''),
    buildStat('Active/30d', streakInfo.activeDaysLast30, ''),
    buildStat('Level', levelInfo.level, ''),
    buildStat('XP', levelInfo.xp, ''),
  ])
}

function buildChart(series, key, label, stroke) {
  const wrap = h('div', { className: 'pgr-chart', style: { flex: '1 1 220px', minWidth: '220px' } })
  wrap.appendChild(h('div', { className: 'muted small', text: label }))
  const values = series.map((s) => s[key]).filter((v) => typeof v === 'number')
  if (values.length < 2) {
    wrap.appendChild(h('p', { className: 'muted small', text: 'Not enough reviewed games yet to chart this.' }))
    return wrap
  }
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = Math.max(1, max - min)
  const step = 300 / (values.length - 1)
  const toXY = (v, i) => [i * step, 56 - ((v - min) / span) * 52]
  const points = values.map((v, i) => toXY(v, i).map((n) => n.toFixed(1)).join(',')).join(' ')
  const [lastX, lastY] = toXY(values[values.length - 1], values.length - 1)

  // .spark polyline/.spark circle in styles.css set stroke/fill via a class
  // selector, which beats plain SVG presentation attributes in the cascade.
  // Use inline style (not the stroke/fill attributes) so the per-chart
  // good/bad colour actually wins over that stylesheet default.
  const chart = svg('svg', { viewBox: '0 0 300 60', class: 'spark', preserveAspectRatio: 'none', role: 'img', 'aria-label': label })
  chart.appendChild(svg('polyline', { points, style: `stroke:${stroke};fill:none` }))
  chart.appendChild(svg('circle', { cx: lastX.toFixed(1), cy: lastY.toFixed(1), r: '3', style: `fill:${stroke}` }))
  wrap.appendChild(chart)
  wrap.appendChild(h('div', { className: 'muted small', text: `Latest: ${values[values.length - 1]}` }))
  return wrap
}

function buildTrendSection(trend) {
  const card = h('div', { className: 'card pgr-trend' })
  const charts = h('div', { className: 'row' })
  append(charts, [
    buildChart(trend.series, 'accuracy', 'Accuracy, oldest to newest', 'var(--good)'),
    buildChart(trend.series, 'acpl', 'Average loss per move (cp), oldest to newest', 'var(--bad)'),
  ])
  return append(card, [h('h2', { text: 'Are you improving?' }), h('p', { className: 'small', text: trend.summary }), charts])
}

function buildMasteryGrid(masteryList) {
  const grid = h('div', { className: 'pgr-mastery-grid' })
  for (const m of masteryList) {
    const tile = h('div', {
      className: 'pgr-mastery-tile',
      attrs: { 'data-level': m.level },
      style: { borderLeft: `3px solid ${LEVEL_COLOUR[m.level]}` },
    })
    append(tile, [
      h('div', { className: 'pgr-mastery-label', text: m.label }),
      h('div', { className: 'pgr-mastery-level small', text: LEVEL_LABEL[m.level], style: { color: LEVEL_COLOUR[m.level] } }),
      h('p', { className: 'muted small pgr-mastery-evidence', text: m.evidence }),
    ])
    grid.appendChild(tile)
  }
  return grid
}

function buildTrackRow(track) {
  const row = h('div', { className: 'pgr-track-row' })
  const header = h('div', { className: 'pgr-track-header' })
  append(header, [
    h('span', { className: 'pgr-track-name', text: track.trackId }),
    h('span', { className: 'muted small', text: `${track.lessonsCompleted}/${track.lessonsTotal} lessons - ${track.pct}%` }),
  ])
  const bar = h('div', { className: 'progress' })
  bar.appendChild(h('div', { className: 'progress-fill', style: { width: `${Math.min(100, track.pct)}%` } }))
  return append(row, [header, bar])
}

function buildCurriculumSection(curriculum, hasLessons) {
  const card = h('div', { className: 'card pgr-tracks' })
  card.appendChild(h('h2', { text: 'Curriculum' }))
  if (!hasLessons) {
    card.appendChild(h('p', { className: 'muted small', text: 'The lesson curriculum has not loaded yet.' }))
    return card
  }
  const overall = h('p', { className: 'small', text: `${curriculum.lessonsCompleted} of ${curriculum.lessonsTotal} lessons completed (${curriculum.positionsCorrect}/${curriculum.positionsTotal} positions, ${curriculum.pct}%).` })
  card.appendChild(overall)
  const tracks = Object.values(curriculum.byTrack).sort((a, b) => String(a.trackId).localeCompare(String(b.trackId)))
  for (const track of tracks) card.appendChild(buildTrackRow(track))
  return card
}

function buildDueSection(due, onAction) {
  const card = h('div', { className: 'card pgr-due' })
  card.appendChild(h('h2', { text: 'Drills due today' }))
  if (!due.length) {
    card.appendChild(h('p', { className: 'muted small', text: 'Nothing due right now - nicely caught up.' }))
    return card
  }
  const list = h('ul', { className: 'mistakes pgr-due-list' })
  for (const item of due) {
    const label = item.label || PATTERN_LIBRARY[item.id]?.label || item.id
    const li = h('li', { className: 'pgr-due-item', onClick: () => onAction?.({ type: 'drill', patternId: item.id }) })
    append(li, [
      h('span', { className: 'dot mistake' }),
      h('span', { text: label }),
      h('span', { className: 'loss', text: `${item.count}x / ${item.games}g` }),
    ])
    list.appendChild(li)
  }
  card.appendChild(list)
  return card
}

function buildEmptyState(action, onAction) {
  const card = h('div', { className: 'card pgr-empty' })
  append(card, [
    h('h2', { text: 'Nothing to show yet' }),
    h('p', { text: 'This dashboard fills up with your real accuracy trend and pattern mastery once you have a reviewed game or two. Play a game against the built-in opponent, or import one of your own games, and run a review.' }),
    h('button', { className: 'primary wide', text: 'Play or import a game', onClick: () => onAction?.({ type: action.type, patternId: action.patternId, lessonId: action.lessonId, trackId: action.trackId }) }),
  ])
  return card
}

/**
 * Self-mounting progress dashboard.
 *
 * @param {HTMLElement} container
 * @param {object} opts
 * @param {object} opts.profile   the weakness profile from profile.js
 * @param {Array}  [opts.lessons] the curriculum lesson list from lessons.js (any shape - see the adapter above)
 * @param {(action: object) => void} [opts.onAction] called with {type, patternId, lessonId, trackId} when the user picks something to do
 * @returns {{ refresh: () => void, destroy: () => void } | null}
 */
export function mountProgress(container, { profile, lessons, onAction } = {}) {
  if (!container || typeof container.appendChild !== 'function') return null
  const list = Array.isArray(lessons) ? lessons : []

  function render() {
    const state = loadProgress()
    const summary = progressSummary(state, profile)
    const curriculum = curriculumProgress(state, list)
    const action = nextBestAction(state, profile, list)

    const root = h('div', { className: 'pgr-dashboard' })
    root.appendChild(buildHero(action, onAction))
    root.appendChild(buildSummaryRow(summary.streak, summary.level))

    if (summary.hasEvidence) {
      root.appendChild(buildTrendSection(summary.trend))
      const masteryCard = h('div', { className: 'card pgr-mastery' })
      masteryCard.appendChild(h('h2', { text: 'Pattern mastery' }))
      masteryCard.appendChild(buildMasteryGrid(summary.mastery))
      root.appendChild(masteryCard)
    } else {
      root.appendChild(buildEmptyState(action, onAction))
    }

    root.appendChild(buildCurriculumSection(curriculum, list.length > 0))
    root.appendChild(buildDueSection(summary.due, onAction))

    container.replaceChildren(root)
  }

  render()
  return { refresh: render, destroy: () => container.replaceChildren() }
}
