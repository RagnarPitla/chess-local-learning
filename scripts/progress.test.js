/**
 * Coverage for progress.js: XP, streaks, mastery, lesson completion and the
 * export/import round trip a "back up my progress" button relies on.
 *
 * NOTE: progress.js is under active repair by another agent while this file
 * is being written. The known bug: recordLessonEvent used to accept
 * position ids that its own readers (rollupLessons, via lessonStatus /
 * trackProgress / curriculumProgress) could never match, so an event would
 * "record" and then silently never count anywhere a student could see it.
 * These tests assert the CORRECT contract - every reader must agree on the
 * same recorded state - regardless of whether today's code already
 * satisfies it. See the run report for which is true right now.
 *
 *   node --test scripts/
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { LESSONS } from '../public/data/lessons-data.js'
import { allLessons, lessonById } from '../public/js/lessons.js'
import {
  createProgressState,
  normaliseProgress,
  recordLessonEvent,
  lessonStatus,
  trackProgress,
  curriculumProgress,
  recordStudyDay,
  streak,
  xpFor,
  addXp,
  level,
  masteryFor,
  exportProgress,
  importProgress,
  PROGRESS_VERSION,
  XP_EVENTS,
  MASTERY_MIN_OBSERVATIONS,
} from '../public/js/progress.js'
import { PATTERN_LIBRARY } from '../public/js/patterns.js'
import { emptyProfile, recordGame, recordDrill } from '../public/js/profile.js'

/* -------------------------------------------------------- export/import */

test('exportProgress then importProgress round-trips xp, lessons and study days', () => {
  const lesson = LESSONS.find((l) => l.positions.length >= 2)
  let state = createProgressState()
  state = recordLessonEvent(state, { lessonId: lesson.id, positionId: lesson.positions[0].fen, correct: true })
  state = recordLessonEvent(state, { lessonId: lesson.id, positionId: lesson.positions[1].fen, correct: false })
  state = addXp(state, { type: XP_EVENTS.GAME_REVIEWED, at: new Date('2024-03-01T12:00:00Z') })
  state = recordStudyDay(state, new Date('2024-03-02T09:00:00Z'))

  const json = exportProgress(state)
  assert.equal(typeof json, 'string')
  const parsedEnvelope = JSON.parse(json)
  assert.equal(parsedEnvelope.kind, 'chess-local-learning.progress')
  assert.equal(parsedEnvelope.version, PROGRESS_VERSION)

  const imported = importProgress(json)
  assert.equal(imported.ok, true)
  assert.equal(imported.error, null)
  assert.equal(imported.state.xp, state.xp)
  assert.deepEqual(imported.state.studyDays, state.studyDays)
  assert.deepEqual(imported.state.lessons, state.lessons)
  assert.deepEqual(imported.state.xpEvents, state.xpEvents)
})

test('importProgress rejects a file from a different export kind, and garbage, without throwing', () => {
  const wrongKind = importProgress(JSON.stringify({ kind: 'some-other-app.export', data: {} }))
  assert.equal(wrongKind.ok, false)
  assert.ok(wrongKind.error.length > 0)
  assert.equal(wrongKind.state, null)

  const notJson = importProgress('{ this is not json')
  assert.equal(notJson.ok, false)
  assert.ok(notJson.error.length > 0)

  const notAnObject = importProgress(JSON.stringify('just a string'))
  assert.equal(notAnObject.ok, false)
})

test('importProgress also accepts a raw state object with no export envelope', () => {
  const state = addXp(createProgressState(), { type: XP_EVENTS.DRILL, correct: true })
  const imported = importProgress(JSON.stringify(state))
  assert.equal(imported.ok, true)
  assert.equal(imported.state.xp, state.xp)
})

/* ------------------------------------------------------- normalisation */

test('normaliseProgress hands back a fresh valid state for null, garbage or wrong types', () => {
  for (const bad of [null, undefined, 'nonsense', 42, [], true]) {
    const p = normaliseProgress(bad)
    assert.equal(p.version, PROGRESS_VERSION)
    assert.equal(p.xp, 0)
    assert.deepEqual(p.lessons, {})
    assert.deepEqual(p.studyDays, [])
    assert.deepEqual(p.xpEvents, [])
  }
})

test('normaliseProgress preserves an old/partial stored shape instead of dropping real user data', () => {
  // Simulates a returning user whose stored blob predates a field this
  // version of the app now expects (no xpEvents, no lessons at all yet).
  const oldShape = { xp: 240, studyDays: ['2024-01-01', '2024-01-03'] }
  const p = normaliseProgress(oldShape)
  assert.equal(p.xp, 240, 'existing XP must survive normalisation')
  assert.deepEqual(p.studyDays, ['2024-01-01', '2024-01-03'], 'existing streak history must survive normalisation')
  assert.deepEqual(p.lessons, {}, 'a missing field is filled in, not left undefined')
  assert.deepEqual(p.xpEvents, [])
})

test('normaliseProgress preserves a fully-formed lessons record', () => {
  const raw = {
    xp: 50,
    lessons: {
      'fund-centre-control': {
        firstSeen: '2024-01-01T00:00:00.000Z',
        lastSeen: '2024-01-05T00:00:00.000Z',
        positions: {
          somefen: { attempts: 3, correct: 2, lastCorrect: true, firstSeen: '2024-01-01T00:00:00.000Z', lastSeen: '2024-01-05T00:00:00.000Z' },
        },
      },
    },
  }
  const p = normaliseProgress(raw)
  assert.equal(p.lessons['fund-centre-control'].positions.somefen.attempts, 3)
  assert.equal(p.lessons['fund-centre-control'].positions.somefen.correct, 2)
  assert.equal(p.lessons['fund-centre-control'].positions.somefen.lastCorrect, true)
})

test('normaliseProgress repairs corrupt nested records without throwing away the rest of the state', () => {
  const raw = {
    xp: 10,
    lessons: {
      good: { positions: { p1: { attempts: 1, correct: 1, lastCorrect: true } } },
      bad: { positions: { p1: 'not an object' } }, // malformed position record
      alsoBad: 'not an object at all', // malformed lesson record
    },
    xpEvents: [
      { type: 'drill', amount: 5, correct: true, at: '2024-01-01T00:00:00.000Z' },
      { type: 'missing-amount' }, // malformed - no amount
      'not an object', // malformed entirely
    ],
    studyDays: ['2024-01-01', 'not-a-date', '2024-01-01'], // duplicate + garbage
  }
  const p = normaliseProgress(raw)
  assert.equal(p.xp, 10)
  assert.equal(p.lessons.good.positions.p1.attempts, 1)
  assert.deepEqual(p.lessons.bad.positions, {}, 'a malformed position record is dropped, not kept as garbage')
  assert.equal(p.lessons.alsoBad, undefined, 'a malformed lesson record is dropped entirely')
  assert.equal(p.xpEvents.length, 1, 'only the well-formed xp event survives')
  assert.deepEqual(p.studyDays, ['2024-01-01'], 'garbage day-keys are dropped and duplicates collapse')
})

/* ------------------------------------------------ reader agreement */

test('lessonStatus, trackProgress and curriculumProgress agree on a partially completed real lesson', () => {
  const lesson = LESSONS.find((l) => l.positions.length >= 2)
  let state = createProgressState()
  state = recordLessonEvent(state, { lessonId: lesson.id, positionId: lesson.positions[0].fen, correct: true })
  state = recordLessonEvent(state, { lessonId: lesson.id, positionId: lesson.positions[1].fen, correct: false })

  const status = lessonStatus(state, lesson.id)
  const track = trackProgress(state, lesson.track, allLessons())
  const curriculum = curriculumProgress(state, allLessons())
  const fromTrack = track.lessons.find((l) => l.lessonId === lesson.id)
  const fromCurriculum = curriculum.byTrack[lesson.track].lessons.find((l) => l.lessonId === lesson.id)

  assert.ok(fromTrack, 'trackProgress must report this lesson')
  assert.ok(fromCurriculum, 'curriculumProgress must report this lesson')
  assert.equal(status.total, lesson.positions.length)
  for (const other of [fromTrack, fromCurriculum]) {
    assert.equal(status.correct, other.correct, 'correct count must agree across readers')
    assert.equal(status.total, other.total, 'total count must agree across readers')
    assert.equal(status.completed, other.completed, 'completed flag must agree across readers')
    assert.equal(status.pct, other.pct, 'percentage must agree across readers')
  }
  assert.equal(status.correct, 1)
  assert.equal(status.completed, false)
})

test('lessonStatus, trackProgress and curriculumProgress agree once a real lesson is fully completed', () => {
  const lesson = LESSONS.find((l) => l.positions.length >= 2)
  let state = createProgressState()
  for (const pos of lesson.positions) {
    state = recordLessonEvent(state, { lessonId: lesson.id, positionId: pos.fen, correct: true })
  }

  const status = lessonStatus(state, lesson.id)
  const curriculum = curriculumProgress(state, allLessons())
  const fromCurriculum = curriculum.byTrack[lesson.track].lessons.find((l) => l.lessonId === lesson.id)

  assert.equal(status.completed, true)
  assert.equal(status.correct, lesson.positions.length)
  assert.equal(status.pct, 100)
  assert.equal(fromCurriculum.completed, true)
  assert.equal(fromCurriculum.correct, lesson.positions.length)
  assert.equal(curriculum.lessonsCompleted, 1)
})

test('recording by array index resolves to the same key as recording by fen, so both readers agree', () => {
  const lesson = LESSONS.find((l) => l.positions.length >= 2)
  let byFen = createProgressState()
  byFen = recordLessonEvent(byFen, { lessonId: lesson.id, positionId: lesson.positions[0].fen, correct: true })

  let byIndex = createProgressState()
  byIndex = recordLessonEvent(byIndex, { lessonId: lesson.id, positionId: 0, correct: true })

  // lastSeen is stamped at call time, so the two writes disagree by a
  // millisecond whenever they straddle a tick. Comparing it would make this
  // test fail at random, which is worse than not testing it: a scheduled job
  // that goes red for no reason teaches you to ignore it. Compare the
  // resolution behaviour this test is actually about, then check lastSeen
  // for the property that matters - that both writes recorded one at all.
  const fen = lessonStatus(byFen, lesson.id)
  const index = lessonStatus(byIndex, lesson.id)

  const { lastSeen: fenSeen, ...fenRest } = fen
  const { lastSeen: indexSeen, ...indexRest } = index
  assert.deepEqual(fenRest, indexRest)

  assert.ok(Number.isFinite(Date.parse(fenSeen)), 'recording by fen should stamp a valid lastSeen')
  assert.ok(Number.isFinite(Date.parse(indexSeen)), 'recording by index should stamp a valid lastSeen')
  assert.ok(Math.abs(Date.parse(fenSeen) - Date.parse(indexSeen)) < 5000, 'both writes happened in this test run')
})

test('a positionId that matches neither the fen nor an index for a real lesson never silently counts', () => {
  const lesson = lessonById('fund-centre-control')
  let state = createProgressState()
  state = recordLessonEvent(state, { lessonId: lesson.id, positionId: 'not-a-real-position-id', correct: true })

  const status = lessonStatus(state, lesson.id)
  // Whatever recordLessonEvent chooses to do with a positionId it cannot
  // resolve, the readers must never disagree about it: either the event
  // was rejected (started stays false) or it was recorded under a key the
  // readers can also see (started becomes true AND correct/total reflect
  // it). The one outcome this must never produce is "looks recorded
  // somewhere, counts nowhere" - so pin down both directions explicitly.
  if (!status.started) {
    assert.equal(status.correct, 0)
  } else {
    assert.ok(status.correct >= 1, 'if the write counted as started, a reader must be able to see the correct answer too')
  }
})

test('recordLessonEvent with an unknown lessonId is tracked and read back consistently by its own fallback path', () => {
  let state = createProgressState()
  state = recordLessonEvent(state, { lessonId: 'a-lesson-that-is-not-in-the-curriculum', positionId: 'p1', correct: true })
  const status = lessonStatus(state, 'a-lesson-that-is-not-in-the-curriculum')
  assert.equal(status.started, true)
  assert.equal(status.correct, 1)
  assert.equal(status.total, 1)
  assert.equal(status.completed, true)
})

/* --------------------------------------------------------------------- xp */

test('xpFor pays a base amount for attempting and a bonus only when correct', () => {
  assert.equal(xpFor({ type: XP_EVENTS.LESSON_POSITION, correct: false }), 4)
  assert.equal(xpFor({ type: XP_EVENTS.LESSON_POSITION, correct: true }), 8)
  assert.equal(xpFor({ type: XP_EVENTS.DRILL, correct: true }), 10)
  assert.equal(xpFor({ type: XP_EVENTS.GAME_REVIEWED }), 20, 'reviewing a game pays a flat amount, correctness is not applicable')
  assert.equal(xpFor({ type: 'not-a-real-event-type' }), 0)
  assert.equal(xpFor(null), 0)
})

test('addXp increases xp by exactly xpFor and also logs a study day for today', () => {
  const before = createProgressState()
  const after = addXp(before, { type: XP_EVENTS.DRILL, correct: true })
  assert.equal(after.xp, before.xp + xpFor({ type: XP_EVENTS.DRILL, correct: true }))
  assert.equal(streak(after).todayDone, true, 'earning XP is evidence of practice and must count toward the streak')
})

test('addXp is a no-op for an event worth zero xp', () => {
  const before = createProgressState()
  const after = addXp(before, { type: 'unknown' })
  assert.equal(after.xp, before.xp)
  assert.deepEqual(after.xpEvents, before.xpEvents)
})

test('level climbs with xp and never reports a level below 1 or a negative progress bar', () => {
  const fresh = level(createProgressState())
  assert.equal(fresh.level, 1)
  assert.ok(fresh.pctToNextLevel >= 0 && fresh.pctToNextLevel <= 100)

  let state = createProgressState()
  for (let i = 0; i < 50; i++) state = addXp(state, { type: XP_EVENTS.GAME_REVIEWED })
  const later = level(state)
  assert.ok(later.level > fresh.level, '1000xp of game reviews must raise the level')
  assert.ok(later.xpIntoLevel >= 0)
})

/* ---------------------------------------------------------------- streak */

test('streak counts a run of consecutive local days and resets on a gap', () => {
  let state = createProgressState()
  for (const day of ['2024-01-01', '2024-01-02', '2024-01-03']) {
    state = recordStudyDay(state, new Date(`${day}T12:00:00`))
  }
  const s = streak(state)
  assert.equal(s.longest, 3)
  assert.equal(s.lastActiveDay, '2024-01-03')

  const withGap = recordStudyDay(state, new Date('2024-01-06T12:00:00'))
  assert.equal(streak(withGap).longest, 3, 'a gap must not retroactively extend the earlier run')
})

test('streak on a state with no study days ever recorded is honestly zero, not throwing', () => {
  const s = streak(createProgressState())
  assert.deepEqual(s, { current: 0, longest: 0, lastActiveDay: null, activeDaysLast30: 0, todayDone: false })
})

/* -------------------------------------------------------------- mastery */

test('masteryFor reports unseen for a pattern absent from the profile', () => {
  const patternId = Object.keys(PATTERN_LIBRARY)[0]
  const m = masteryFor(createProgressState(), emptyProfile(), patternId)
  assert.equal(m.level, 'unseen')
  assert.equal(m.score, 0)
})

test('masteryFor never claims better than weak below the minimum observation count', () => {
  // A single lucky correct drill must not be reported as mastery.
  let profile = emptyProfile()
  profile = recordGame(profile, {
    patternSummary: [{ id: 'hanging-piece', label: 'Left a piece hanging', count: 1, cost: 300, examples: [] }],
    summary: { accuracy: 90, acpl: 20, counts: {} },
    playerColour: 'w',
  })
  profile = recordDrill(profile, 'hanging-piece', true)
  const observations = (profile.patterns['hanging-piece'].attempts || 0) + (profile.patterns['hanging-piece'].count || 0)
  assert.ok(observations < MASTERY_MIN_OBSERVATIONS, 'test assumption: still below the minimum observation floor')

  const m = masteryFor(createProgressState(), profile, 'hanging-piece')
  assert.equal(m.level, 'weak', 'too little evidence to call it anything better than weak')
})

/* --------------------------------------------------------------- summary */

test('trackProgress and curriculumProgress never double count a lesson across tracks', () => {
  const lessons = allLessons()
  const curriculum = curriculumProgress(createProgressState(), lessons)
  const sumAcrossTracks = Object.values(curriculum.byTrack).reduce((sum, t) => sum + t.lessonsTotal, 0)
  assert.equal(sumAcrossTracks, curriculum.lessonsTotal)
  assert.equal(curriculum.lessonsTotal, lessons.length)
})
