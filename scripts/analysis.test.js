/**
 * Unit tests for post-mortem turning-point analysis. These fixtures use legal
 * chess move lists and plausible evaluation curves so the tests measure the
 * teaching decision, not a hand-picked implementation branch.
 *
 *   node --test scripts/
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MOVE_CLASS,
  buildTimeline,
  classifyLoss,
  findTurningPoint,
  positionRecoverability,
  toColourPov,
  winPercent,
} from '../public/js/analysis.js'

function annotatedGame({ moves, cpWhite, playerColour = 'w', best = {} }) {
  const timeline = buildTimeline(moves)
  assert.equal(cpWhite.length, timeline.length, 'fixture must include one eval per position')

  return {
    playerColour,
    timeline,
    moves: timeline.slice(1).map((node, index) => {
      const ply = index + 1
      const beforeWhite = cpWhite[index]
      const afterWhite = cpWhite[index + 1]
      const mover = node.colour
      const evalBefore = toColourPov(beforeWhite, mover)
      const evalAfter = toColourPov(afterWhite, mover)
      const loss = Math.max(0, evalBefore - evalAfter)
      const winBefore = winPercent(evalBefore)
      const winAfter = winPercent(evalAfter)

      return {
        ply,
        moveNumber: node.moveNumber,
        colour: mover,
        san: node.san,
        uci: node.move.from + node.move.to + (node.move.promotion || ''),
        fenBefore: node.fenBefore,
        fenAfter: node.fen,
        evalBefore: Math.round(evalBefore),
        evalAfter: Math.round(evalAfter),
        evalBeforeWhite: Math.round(beforeWhite),
        evalAfterWhite: Math.round(afterWhite),
        loss: Math.round(loss),
        classification: classifyLoss(loss, { winBefore, winAfter }),
        bestMove: best[ply]?.uci ?? null,
        bestSan: best[ply]?.san ?? null,
        bestLine: best[ply]?.line ?? [],
        isPlayer: mover === playerColour,
      }
    }),
  }
}

test('positionRecoverability exposes the shared savable boundary for one position', () => {
  const pawnDown = positionRecoverability(-100)
  const queenDown = positionRecoverability(-900)

  assert.equal(pawnDown.recoverable, true)
  assert.ok(pawnDown.winPercent > pawnDown.savableWinPercent)
  assert.equal(queenDown.recoverable, false)
  assert.ok(queenDown.winPercent < queenDown.savableWinPercent)
})

test('findTurningPoint returns the move before a single catastrophic blunder', () => {
  const annotation = annotatedGame({
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5'],
    cpWhite: [30, 35, 30, 45, 45, 60, 55, -900],
    best: { 7: { uci: 'e1g1', san: 'O-O', line: ['O-O', 'Be7'] } },
  })

  const point = findTurningPoint(annotation)
  assert.equal(point.status, 'found')
  assert.equal(point.kind, 'single-blunder')
  assert.equal(point.ply, 7)
  assert.equal(point.playedMove.san, 'Ng5')
  assert.equal(point.bestSan, 'O-O')
  assert.equal(point.retryFen, annotation.moves[6].fenBefore)
  assert.ok(point.winBefore >= point.boundary.savableWinPercent)
  assert.ok(point.winAfter < point.boundary.savableWinPercent)
  assert.match(point.explanation, /Retry from the position before it/)
})

test('findTurningPoint rewinds a slow decline to where the final slide began', () => {
  const annotation = annotatedGame({
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Bd3', 'c5', 'Nf3'],
    cpWhite: [20, 25, 20, 15, 10, -130, -120, -220, -210, -350, -340, -420, -410, -500],
    best: { 5: { uci: 'g1f3', san: 'Nf3', line: ['Nf3', 'Be7'] } },
  })

  const point = findTurningPoint(annotation)
  assert.equal(point.status, 'found')
  assert.equal(point.kind, 'slow-decline')
  assert.equal(point.ply, 5)
  assert.equal(point.playedMove.san, 'Nc3')
  assert.equal(point.bestSan, 'Nf3')
  assert.equal(point.slide.endPly, 13)
  assert.deepEqual(point.slide.moves.map((move) => move.san), ['Nc3', 'Bg5', 'e3', 'Bd3', 'Nf3'])
  assert.match(point.explanation, /gradual slide/)
})

test('findTurningPoint still finds a fork in a game the student was never winning', () => {
  const annotation = annotatedGame({
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3'],
    cpWhite: [-60, -70, -80, -100, -110, -150, -155, -250, -240, -900],
    best: { 9: { uci: 'f1e2', san: 'Be2' } },
  })

  const point = findTurningPoint(annotation)
  assert.equal(point.status, 'found')
  assert.equal(point.context.wasNeverWinning, true)
  assert.equal(point.ply, 9)
  assert.equal(point.playedMove.san, 'Nc3')
  assert.equal(point.bestSan, 'Be2')
})

test('findTurningPoint reports no point of no return when the final position is still savable', () => {
  const annotation = annotatedGame({
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    cpWhite: [20, 30, 15, -40, -35, -120],
  })

  const point = findTurningPoint(annotation)
  assert.equal(point.status, 'not-lost')
  assert.equal(point.kind, null)
  assert.equal(point.ply, null)
  assert.match(point.explanation, /still savable/)
})

test('findTurningPoint handles a game decided immediately', () => {
  const annotation = annotatedGame({
    moves: ['f3', 'e5', 'g4', 'Qh4#'],
    cpWhite: [0, -80, -30, -900, -10000],
    best: { 3: { uci: 'g2g3', san: 'g3' } },
  })

  const point = findTurningPoint(annotation)
  assert.equal(point.status, 'found')
  assert.equal(point.kind, 'single-blunder')
  assert.equal(point.ply, 3)
  assert.equal(point.playedMove.san, 'g4')
  assert.equal(point.bestSan, 'g3')
})

test('findTurningPoint handles empty, malformed and playerless annotations honestly', () => {
  assert.equal(findTurningPoint(null).status, 'invalid')
  assert.equal(findTurningPoint({}).status, 'invalid')
  assert.equal(findTurningPoint({ moves: [] }).status, 'no-player-moves')
  assert.equal(findTurningPoint({
    moves: [{ isPlayer: false, colour: 'b', evalBeforeWhite: 0, evalAfterWhite: -100, san: 'e5' }],
  }).status, 'no-player-moves')
})

test('findTurningPoint reports never-savable when no retry fork exists', () => {
  const annotation = annotatedGame({
    moves: ['e4', 'c5', 'Nf3'],
    cpWhite: [-700, -720, -710, -760],
  })

  const point = findTurningPoint(annotation)
  assert.equal(point.status, 'never-savable')
  assert.equal(point.ply, null)
  assert.ok(point.context.finalWinPercent < point.boundary.savableWinPercent)
})

test('findTurningPoint chooses the last fork after a recovery, not the first blunder', () => {
  const annotation = annotatedGame({
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5'],
    cpWhite: [30, 40, 35, -700, 10, 20, 25, -650],
    best: {
      3: { uci: 'f1c4', san: 'Bc4' },
      7: { uci: 'e1g1', san: 'O-O' },
    },
  })

  const point = findTurningPoint(annotation)
  assert.equal(point.status, 'found')
  assert.equal(point.kind, 'single-blunder')
  assert.equal(point.ply, 7)
  assert.equal(point.playedMove.san, 'Ng5')
  assert.equal(point.bestSan, 'O-O')
  assert.notEqual(point.ply, 3)
})

test('fixture sanity check: the catastrophic branch really classifies as a blunder', () => {
  const annotation = annotatedGame({
    moves: ['e4', 'e5', 'Nf3'],
    cpWhite: [0, 20, 10, -900],
  })
  assert.equal(annotation.moves[2].classification, MOVE_CLASS.blunder)
})
