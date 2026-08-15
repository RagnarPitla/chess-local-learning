/**
 * Data integrity for the curriculum: 46 lessons, 74 positions, shipped as
 * static data in public/data/lessons-data.js and read by public/js/lessons.js.
 * This imports the REAL shipped data - not a synthetic fixture - because the
 * whole point is to catch a bad lesson before it reaches production, the
 * same way an earlier one-off verify-fens script did during authoring.
 *
 *   node --test scripts/
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { Chess } from 'chess.js'

import { LESSONS } from '../public/data/lessons-data.js'
import { PATTERN_LIBRARY } from '../public/js/patterns.js'
import { emptyProfile, recordGame } from '../public/js/profile.js'
import {
  TRACKS,
  allLessons,
  lessonById,
  lessonsForTrack,
  lessonsForPattern,
  lessonsForOpening,
  recommendLessons,
  lessonProgress,
  nextPosition,
  curriculumStats,
} from '../public/js/lessons.js'

const TRACK_IDS = new Set(TRACKS.map((t) => t.id))
const LEVELS = new Set(['beginner', 'intermediate', 'advanced'])
const CATALOGUE_IDS = new Set(Object.keys(PATTERN_LIBRARY))

// Patterns the curriculum intentionally does not devote a lesson to: they
// describe a habit ("threw away a winning position"), not a motif with its
// own drill - see the comment on recommendLessons in lessons.js. Any id NOT
// in this list must be reachable from at least one lesson; if this list
// ever needs to grow, that is a deliberate curriculum decision, not a
// silent gap, so it is spelled out here rather than inferred.
const PATTERNS_WITHOUT_A_DEDICATED_LESSON = new Set(['threw-away-win'])

/* ----------------------------------------------------- every FEN loads */

test('every lesson position FEN is loadable by chess.js', () => {
  const bad = []
  for (const lesson of LESSONS) {
    for (const [i, pos] of lesson.positions.entries()) {
      try {
        // eslint-disable-next-line no-new
        new Chess(pos.fen)
      } catch (err) {
        bad.push(`${lesson.id}[${i}]: ${err.message}`)
      }
    }
  }
  assert.deepEqual(bad, [], `unloadable FEN(s):\n${bad.join('\n')}`)
})

test('every position sideToMove field agrees with the side to move encoded in its own FEN', () => {
  const mismatched = []
  for (const lesson of LESSONS) {
    for (const [i, pos] of lesson.positions.entries()) {
      const fenSide = pos.fen.split(' ')[1]
      if (fenSide !== pos.sideToMove) {
        mismatched.push(`${lesson.id}[${i}]: fen says "${fenSide}", sideToMove field says "${pos.sideToMove}"`)
      }
    }
  }
  assert.deepEqual(mismatched, [], `sideToMove disagrees with the FEN:\n${mismatched.join('\n')}`)
})

test('every position answer is a legal move from its own FEN', () => {
  // app.js plays this move directly with chess.move(position.answer) to draw
  // the reveal arrow - an illegal answer would throw in production.
  const illegal = []
  for (const lesson of LESSONS) {
    for (const [i, pos] of lesson.positions.entries()) {
      const chess = new Chess(pos.fen)
      let played = null
      try {
        played = chess.move(pos.answer)
      } catch {
        played = null
      }
      if (!played) illegal.push(`${lesson.id}[${i}]: "${pos.answer}" is not legal from ${pos.fen}`)
    }
  }
  assert.deepEqual(illegal, [], `illegal answer move(s):\n${illegal.join('\n')}`)
})

/* --------------------------------------------------------- shape checks */

test('every lesson carries every field the UI reads', () => {
  const problems = []
  for (const lesson of LESSONS) {
    if (typeof lesson.id !== 'string' || !lesson.id) problems.push(`${lesson.id}: missing id`)
    if (!TRACK_IDS.has(lesson.track)) problems.push(`${lesson.id}: unknown track "${lesson.track}"`)
    if (typeof lesson.title !== 'string' || !lesson.title.trim()) problems.push(`${lesson.id}: missing title`)
    if (!LEVELS.has(lesson.level)) problems.push(`${lesson.id}: unknown level "${lesson.level}"`)
    if (typeof lesson.summary !== 'string' || !lesson.summary.trim()) problems.push(`${lesson.id}: missing summary`)
    if (!Array.isArray(lesson.ideas) || lesson.ideas.length === 0) problems.push(`${lesson.id}: missing ideas`)
    if (!Array.isArray(lesson.pitfalls) || lesson.pitfalls.length === 0) problems.push(`${lesson.id}: missing pitfalls`)
    if (!Array.isArray(lesson.patterns)) problems.push(`${lesson.id}: patterns must be an array (can be empty)`)
    if (!Array.isArray(lesson.openings)) problems.push(`${lesson.id}: openings must be an array (can be empty)`)
    if (!Array.isArray(lesson.nextIds)) problems.push(`${lesson.id}: nextIds must be an array (can be empty)`)
    if (!Array.isArray(lesson.positions) || lesson.positions.length === 0) problems.push(`${lesson.id}: needs at least one position`)
    for (const [i, pos] of (lesson.positions || []).entries()) {
      for (const field of ['fen', 'sideToMove', 'prompt', 'answer', 'explanation']) {
        if (typeof pos[field] !== 'string' || !pos[field].trim()) problems.push(`${lesson.id}[${i}]: missing ${field}`)
      }
    }
  }
  assert.deepEqual(problems, [], `lesson(s) missing UI fields:\n${problems.join('\n')}`)
})

test('every lesson id is unique', () => {
  const ids = LESSONS.map((l) => l.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate lesson id(s) in the shipped curriculum')
})

test('every nextIds entry points at a real lesson', () => {
  const ids = new Set(LESSONS.map((l) => l.id))
  const dangling = []
  for (const lesson of LESSONS) {
    for (const nid of lesson.nextIds) {
      if (!ids.has(nid)) dangling.push(`${lesson.id} -> "${nid}"`)
    }
  }
  assert.deepEqual(dangling, [], `nextIds pointing at a lesson that does not exist:\n${dangling.join('\n')}`)
})

/* ------------------------------------------------------- pattern ids */

test('every pattern id a lesson references exists in the pattern catalogue', () => {
  // The exact silent-breakage case flagged in the task: a lesson pointing at
  // a pattern id that has since been renamed or removed from patterns.js.
  const missing = []
  for (const lesson of LESSONS) {
    for (const patternId of lesson.patterns) {
      if (!CATALOGUE_IDS.has(patternId)) missing.push(`${lesson.id} -> "${patternId}"`)
    }
  }
  assert.deepEqual(missing, [], `lesson pattern id(s) not in PATTERN_LIBRARY:\n${missing.join('\n')}`)
})

test('every pattern in the catalogue is reachable from a lesson, except the documented exceptions', () => {
  // The other direction: a catalogue pattern with zero lessons behind it
  // would make recommendLessons() identify a weakness and then have
  // nothing to recommend for it. Some patterns are legitimately meta
  // ("threw away a win") rather than a teachable motif - those are the only
  // ones allowed to be orphaned, and only exactly those.
  const referenced = new Set()
  for (const lesson of LESSONS) for (const p of lesson.patterns) referenced.add(p)
  const orphaned = [...CATALOGUE_IDS].filter((id) => !referenced.has(id)).sort()
  assert.deepEqual(
    orphaned,
    [...PATTERNS_WITHOUT_A_DEDICATED_LESSON].sort(),
    'a catalogue pattern lost its last lesson (or the exception list is stale)',
  )
})

/* --------------------------------------------------------- pure functions */

test('allLessons returns a fresh, freely reorderable copy each time', () => {
  const a = allLessons()
  a.sort(() => 1) // mutate freely
  const b = allLessons()
  assert.equal(b.length, LESSONS.length)
  assert.equal(b[0].id, LESSONS[0].id, 'the shared LESSONS array itself must not have been mutated')
})

test('lessonById finds a real lesson and returns undefined for a fake one', () => {
  assert.equal(lessonById(LESSONS[0].id).id, LESSONS[0].id)
  assert.equal(lessonById('does-not-exist'), undefined)
})

test('lessonsForTrack partitions the whole curriculum with no lesson left out or double counted', () => {
  let total = 0
  for (const track of TRACKS) {
    const inTrack = lessonsForTrack(track.id)
    assert.ok(inTrack.every((l) => l.track === track.id), `lessonsForTrack("${track.id}") returned a lesson from another track`)
    total += inTrack.length
  }
  assert.equal(total, LESSONS.length, 'every lesson must belong to exactly one of the five tracks')
  assert.deepEqual(lessonsForTrack('not-a-real-track'), [])
})

test('lessonsForPattern only returns lessons that actually declare that pattern', () => {
  const hits = lessonsForPattern('hanging-piece')
  assert.ok(hits.length > 0, 'expected at least one hanging-piece lesson in the shipped curriculum')
  assert.ok(hits.every((l) => l.patterns.includes('hanging-piece')))
  assert.deepEqual(lessonsForPattern(null), [])
  assert.deepEqual(lessonsForPattern('not-a-real-pattern'), [])
})

test('lessonsForOpening only returns lessons that actually name that opening', () => {
  const hits = lessonsForOpening('Italian Game')
  assert.ok(hits.length > 0, 'expected at least one Italian Game lesson in the shipped curriculum')
  assert.ok(hits.every((l) => l.openings.includes('Italian Game')))
  assert.deepEqual(lessonsForOpening('Not A Real Opening'), [])
})

test('curriculumStats agrees with the shipped data it is summarising', () => {
  const stats = curriculumStats()
  assert.equal(stats.lessons, LESSONS.length)
  assert.equal(stats.tracks, TRACKS.length)
  const positions = LESSONS.reduce((sum, l) => sum + l.positions.length, 0)
  assert.equal(stats.positions, positions)
  // The task's stated baseline for the shipped curriculum. A drop below
  // this is a regression (content silently lost); growth is fine.
  assert.ok(stats.lessons >= 46, `expected at least 46 lessons, found ${stats.lessons}`)
  assert.ok(stats.positions >= 74, `expected at least 74 positions, found ${stats.positions}`)
  const sumByLevel = Object.values(stats.byLevel).reduce((a, b) => a + b, 0)
  assert.equal(sumByLevel, stats.lessons, 'byLevel counts must add back up to the lesson total')
})

test('recommendLessons falls back to the fundamentals path on a fresh profile', () => {
  const recs = recommendLessons(emptyProfile(), { limit: 5 })
  assert.equal(recs.length, 5)
  assert.ok(recs.every((r) => r.lesson && r.lesson.id && r.reason.length > 0))
  assert.ok(recs.every((r) => r.lesson.track === 'fundamentals'), 'a cold start should recommend fundamentals first')
})

test('recommendLessons prioritises lessons for the profile\'s own worst pattern', () => {
  let profile = emptyProfile()
  profile = recordGame(profile, {
    patternSummary: [{ id: 'hanging-piece', label: 'Left a piece hanging', count: 5, cost: 1200, examples: [] }],
    summary: { accuracy: 55, acpl: 150, counts: { blunder: 3 } },
    playerColour: 'w',
  })
  const recs = recommendLessons(profile, { limit: 5 })
  assert.ok(recs.length > 0)
  assert.ok(
    recs[0].lesson.patterns.includes('hanging-piece'),
    `expected the top recommendation to target the profile's worst pattern, got "${recs[0].lesson.id}"`,
  )
  assert.match(recs[0].reason, /hanging/i)
})

test('lessonProgress and nextPosition agree on the same per-lesson state', () => {
  const lesson = LESSONS.find((l) => l.positions.length > 1)
  assert.ok(lesson, 'need a multi-position lesson in the shipped curriculum for this test to mean anything')

  const empty = lessonProgress(lesson, {})
  assert.deepEqual(empty, { seen: 0, correct: 0, total: lesson.positions.length, pct: 0 })
  assert.deepEqual(nextPosition(lesson, {}), { index: 0, position: lesson.positions[0] })

  const state = { 0: { seen: true, correct: true } }
  const partial = lessonProgress(lesson, state)
  assert.equal(partial.seen, 1)
  assert.equal(partial.correct, 1)
  assert.equal(nextPosition(lesson, state).index, 1, 'the next unseen position must be the first one not marked seen')

  const finished = {}
  lesson.positions.forEach((_, i) => { finished[i] = { seen: true, correct: true } })
  assert.equal(lessonProgress(lesson, finished).pct, 100)
  assert.equal(nextPosition(lesson, finished), null, 'once every position is seen there is nothing left to hand back')
})
