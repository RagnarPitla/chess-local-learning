/**
 * Unit tests for live coaching voice. This is pure logic: no DOM, no fetch,
 * no engine process.
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  positionRecoverability,
  winPercent,
} from '../public/js/analysis.js'

import {
  LIVE_COACH_BOUNDARIES,
  LIVE_COACH_REGISTERS,
  liveCoachAdvice,
  liveCoachRegister,
  offlineCoach,
  shouldSpeakLiveCoach,
} from '../public/js/coach.js'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const OPEN_FILE_FEN = 'rnbqkbnr/ppp2ppp/8/8/8/8/PPP2PPP/RNBQKBNR w KQkq - 0 1'
const BLACK_QUEEN_MISSING_FEN = 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

test('live coach register sweeps from winning to completely lost', () => {
  const expected = new Map([
    [-1200, LIVE_COACH_REGISTERS.learning],
    [LIVE_COACH_BOUNDARIES.beyondSavingCp - 1, LIVE_COACH_REGISTERS.learning],
    [LIVE_COACH_BOUNDARIES.beyondSavingCp, LIVE_COACH_REGISTERS.learning],
    [LIVE_COACH_BOUNDARIES.beyondSavingCp + 1, LIVE_COACH_REGISTERS.fighting],
    [-61, LIVE_COACH_REGISTERS.fighting],
    [LIVE_COACH_BOUNDARIES.equalFloorCp, LIVE_COACH_REGISTERS.converting],
    [-59, LIVE_COACH_REGISTERS.converting],
    [0, LIVE_COACH_REGISTERS.converting],
    [300, LIVE_COACH_REGISTERS.converting],
    [1200, LIVE_COACH_REGISTERS.converting],
  ])

  for (const [cp, register] of expected) {
    assert.equal(liveCoachRegister(cp), register, `${cp}cp should be ${register}`)
  }
})

test('live coach reuses the analysis savable boundary', () => {
  assert.equal(LIVE_COACH_BOUNDARIES.savableWinPercent, 15)
  assert.ok(winPercent(LIVE_COACH_BOUNDARIES.beyondSavingCp) < LIVE_COACH_BOUNDARIES.savableWinPercent)
  assert.equal(positionRecoverability(LIVE_COACH_BOUNDARIES.beyondSavingCp).recoverable, false)
  assert.equal(positionRecoverability(LIVE_COACH_BOUNDARIES.beyondSavingCp + 1).recoverable, true)
})

test('mate scores choose the live coach register from the actual evaluation', () => {
  assert.equal(liveCoachRegister(900, { mate: -3 }), LIVE_COACH_REGISTERS.learning)
  assert.equal(liveCoachRegister(-900, { mate: 2 }), LIVE_COACH_REGISTERS.converting)
})

test('beyond-saving advice never claims the student can still win', () => {
  const advice = liveCoachAdvice({
    evalCp: LIVE_COACH_BOUNDARIES.beyondSavingCp,
    fen: START_FEN,
    force: true,
    bestSan: 'Nf3',
  })

  assert.equal(advice.register, LIVE_COACH_REGISTERS.learning)
  assert.doesNotMatch(advice.text, /\b(can still win|still winning|not decided|play for the full point|winning chances)\b/i)
  assert.match(advice.text, /\b(gone|training rep|retry|reset)\b/i)
})

test('equal advice does not claim there is a win to convert', () => {
  const advice = liveCoachAdvice({
    evalCp: 0,
    fen: START_FEN,
    force: true,
  })

  assert.equal(advice.register, LIVE_COACH_REGISTERS.converting)
  assert.match(advice.text, /\bbalanced\b/i)
  assert.doesNotMatch(advice.text, /\b(play for the full point|conversion plan|can still win|winning chances|won position)\b/i)
  assert.match(advice.text, /\b(create a small edge|not force a win|better piece|pawn break)\b/i)
})

test('winning advice still gives conversion guidance', () => {
  const advice = liveCoachAdvice({
    evalCp: LIVE_COACH_BOUNDARIES.winningFloorCp,
    fen: BLACK_QUEEN_MISSING_FEN,
    force: true,
  })

  assert.equal(advice.register, LIVE_COACH_REGISTERS.converting)
  assert.match(advice.text, /\b(play for the full point|Conversion plan)\b/)
})

test('live coach output is pure ASCII', () => {
  const samples = [
    liveCoachAdvice({ evalCp: 220, fen: BLACK_QUEEN_MISSING_FEN, force: true, bestSan: 'Qe2', bestLine: ['Qe2', 'Be7'] }).text,
    liveCoachAdvice({ evalCp: 0, fen: START_FEN, force: true }).text,
    liveCoachAdvice({ evalCp: -350, fen: OPEN_FILE_FEN, force: true, candidates: [{ san: 'Rd1', cp: -310 }] }).text,
    liveCoachAdvice({ evalCp: -1000, fen: START_FEN, force: true }).text,
    offlineCoach('live', { evalCp: 80, fen: START_FEN, force: true }),
  ]

  for (const text of samples) {
    assert.doesNotMatch(text, /[^\x00-\x7F]/, text)
  }
})

test('live coach is not identical boilerplate across different positions', () => {
  const materialAdvice = liveCoachAdvice({
    evalCp: 250,
    fen: BLACK_QUEEN_MISSING_FEN,
    force: true,
  }).text
  const fileAdvice = liveCoachAdvice({
    evalCp: 250,
    fen: OPEN_FILE_FEN,
    force: true,
  }).text

  assert.notEqual(materialAdvice, fileAdvice)
  assert.match(materialAdvice, /queen|material/i)
  assert.match(fileAdvice, /file|central control|center/i)
})

test('live coach only speaks when the position is worth interrupting for', () => {
  assert.equal(
    shouldSpeakLiveCoach({
      register: LIVE_COACH_REGISTERS.converting,
      previousRegister: LIVE_COACH_REGISTERS.converting,
      evalCp: 40,
      previousEvalCp: 35,
      ply: 5,
    }),
    false,
  )
  assert.equal(
    shouldSpeakLiveCoach({
      register: LIVE_COACH_REGISTERS.fighting,
      previousRegister: LIVE_COACH_REGISTERS.converting,
      evalCp: -120,
      previousEvalCp: 20,
      ply: 5,
    }),
    true,
  )
  assert.equal(
    shouldSpeakLiveCoach({
      register: LIVE_COACH_REGISTERS.fighting,
      previousRegister: LIVE_COACH_REGISTERS.fighting,
      evalCp: -250,
      previousEvalCp: -80,
      ply: 5,
    }),
    true,
  )
})
