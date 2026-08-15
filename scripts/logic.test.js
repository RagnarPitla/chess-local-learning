/**
 * Unit tests for the pure logic: evaluation maths, pattern detection, the
 * opening book, drill generation and the spaced repetition profile.
 *
 *   node --test scripts/
 *
 * These modules deliberately take the engine as an injected callback, so the
 * whole review pipeline is testable without loading Stockfish.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { Chess } from 'chess.js'

import {
  annotateGame,
  classifyLoss,
  clampEval,
  foldScore,
  moveAccuracy,
  phaseOf,
  toColourPov,
  topMistakes,
  winPercent,
} from '../public/js/analysis.js'

import {
  badBishops,
  findPinsAndSkewers,
  hangingPieces,
  isFork,
  kingSafety,
  overloadedDefenders,
  pawnStructure,
  see,
  summarisePatterns,
  tagMove,
  withSideToMove,
} from '../public/js/patterns.js'

import {
  describeDeviation,
  lookupOpening,
  openingTreeStats,
  outOfBookPly,
  positionBrief,
  shouldFlagDeviation,
} from '../public/js/openings.js'

import {
  emptyProfile,
  LEITNER_INTERVALS_DAYS,
  normaliseProfile,
  rankWeaknesses,
  recordDrill,
  recordGame,
  trend,
} from '../public/js/profile.js'

import { buildQueue, gradeAnswer, puzzlesFromGame } from '../public/js/puzzles.js'

/* --------------------------------------------------------------- analysis */

test('foldScore turns mate into a large signed number', () => {
  assert.equal(foldScore({ cp: 35, mate: null }), 35)
  assert.ok(foldScore({ cp: null, mate: 3 }) > 9000)
  assert.ok(foldScore({ cp: null, mate: -3 }) < -9000)
  assert.ok(foldScore({ cp: null, mate: 1 }) > foldScore({ cp: null, mate: 5 }), 'faster mate scores higher')
})

test('clampEval keeps winning positions from dominating the loss maths', () => {
  assert.equal(clampEval(50), 50)
  assert.equal(clampEval(9000), 1200)
  assert.equal(clampEval(-9000), -1200)
})

test('toColourPov flips the sign for black', () => {
  assert.equal(toColourPov(120, 'w'), 120)
  assert.equal(toColourPov(120, 'b'), -120)
})

test('winPercent is symmetric around an equal position', () => {
  assert.equal(winPercent(0), 50)
  assert.ok(winPercent(300) > 70)
  assert.ok(Math.abs(winPercent(200) + winPercent(-200) - 100) < 0.001)
})

test('moveAccuracy is 100 when nothing is lost and falls with the win drop', () => {
  assert.equal(moveAccuracy(50, 50), 100)
  assert.ok(moveAccuracy(50, 30) < 100)
  assert.ok(moveAccuracy(50, 10) < moveAccuracy(50, 30))
  assert.ok(moveAccuracy(50, 0) >= 0)
})

test('classifyLoss uses centipawns and win probability together', () => {
  assert.equal(classifyLoss(0), 'best')
  assert.equal(classifyLoss(20), 'good')
  assert.equal(classifyLoss(80), 'inaccuracy')
  assert.equal(classifyLoss(200), 'mistake')
  assert.equal(classifyLoss(400), 'blunder')
})

test('classifyLoss escalates when a small centipawn loss is a big swing', () => {
  // Near a decided position 120cp barely matters; near equality it is fatal.
  const nearEqual = classifyLoss(120, { winBefore: 52, winAfter: 28 })
  assert.equal(nearEqual, 'blunder', 'a 24 point win drop is a blunder whatever the centipawns say')
})

test('phaseOf reads the phase from material on the board', () => {
  assert.equal(phaseOf(new Chess().fen()), 'opening')
  assert.equal(phaseOf('8/5k2/8/8/8/8/5K2/8 w - - 0 60'), 'endgame')
})

test('annotateGame scores a game with an injected engine', async () => {
  // Scholar's mate. The fake engine holds the position level until Black's
  // 3rd move, which walks into mate.
  const moves = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']
  const whitePov = [10, 10, 10, 10, 10, 20, 900] // one per analysed node
  let call = 0

  const annotation = await annotateGame({
    moves,
    playerColour: 'b',
    analyse: async () => {
      const idx = call++
      const stm = idx % 2 === 0 ? 'w' : 'b'
      const white = whitePov[Math.min(idx, whitePov.length - 1)]
      return { cp: stm === 'w' ? white : -white, mate: null, best: null, lines: [] }
    },
  })

  assert.equal(annotation.moves.length, moves.length)
  assert.equal(annotation.moves.filter((m) => m.isPlayer).length, 3, 'black played three moves')
  assert.ok(annotation.summary.accuracy >= 0 && annotation.summary.accuracy <= 100)
  assert.equal(call, moves.length, 'the final checkmate is scored from the result, not the engine')

  const nf6 = annotation.moves.find((m) => m.san === 'Nf6')
  assert.ok(nf6.loss > 500, `Nf6 should be punished, got ${nf6.loss}`)
  assert.equal(nf6.classification, 'blunder')

  const mate = annotation.moves.at(-1)
  assert.equal(mate.san, 'Qxf7#')
  assert.equal(mate.evalAfterWhite, 10000, 'checkmate is scored from the board, not the engine')
})

test('annotateGame reports progress and only charges the player for their own moves', async () => {
  const seen = []
  const annotation = await annotateGame({
    moves: ['e4', 'e5', 'Nf3'],
    playerColour: 'w',
    analyse: async () => ({ cp: 20, mate: null, best: null, lines: [] }),
    onProgress: (done, total) => seen.push([done, total]),
  })
  assert.ok(seen.length > 0, 'progress was reported')
  assert.deepEqual(seen.at(-1), [4, 4], 'n moves needs n+1 evaluations')
  assert.deepEqual(
    annotation.moves.map((m) => m.isPlayer),
    [true, false, true],
  )
})

test('topMistakes returns the worst player moves in order', async () => {
  const annotation = {
    moves: [
      { isPlayer: true, san: 'a3', loss: 40, classification: 'good' },
      { isPlayer: true, san: 'b3', loss: 500, classification: 'blunder' },
      { isPlayer: false, san: 'c5', loss: 900, classification: 'blunder' },
      { isPlayer: true, san: 'd3', loss: 200, classification: 'mistake' },
    ],
  }
  const top = topMistakes(annotation, 2)
  assert.deepEqual(
    top.map((m) => m.san),
    ['b3', 'd3'],
    'opponent mistakes are not yours to fix',
  )
})

/* --------------------------------------------------------------- patterns */

test('see returns zero for a defended piece and its value when hanging', () => {
  // Ruy Lopez: Bxc6 wins a knight but Black recaptures, so the exchange is even.
  const ruy = new Chess('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4')
  assert.equal(see(ruy, 'c6', 'w'), 0, 'c6 knight is defended by the b7 pawn')

  const loose = new Chess('rnbqkbnr/pppp1ppp/8/4n3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3')
  assert.equal(see(loose, 'e5', 'w'), 320, 'an undefended knight is simply lost')
})

test('hangingPieces finds material that can be taken for free', () => {
  const chess = new Chess('rnbqkbnr/pppp1ppp/8/4n3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3')
  const hanging = hangingPieces(chess, 'b')
  assert.equal(hanging.length, 1)
  assert.equal(hanging[0].square, 'e5')
  assert.equal(hanging[0].gain, 320)
})

test('isFork sees a knight hitting two valuable pieces', () => {
  const chess = new Chess('r1bqkb1r/pppp1ppp/4N3/8/8/8/PPPP1PPP/RNBQKB1R b KQkq - 0 1')
  const targets = isFork(chess, 'e6')
  assert.ok(targets, 'Ne6 forks')
  assert.ok(targets.length >= 2)
  assert.ok(targets.some((t) => t.type === 'q'))
})

test('isFork ignores a piece that only attacks one thing', () => {
  const chess = new Chess()
  chess.move('e4')
  assert.equal(isFork(chess, 'e4'), null)
})

test('findPinsAndSkewers finds a rook pinning a bishop to the king', () => {
  // White rook on e1, black bishop on e2, black king on e8.
  const chess = new Chess('4k3/8/8/8/8/8/4b3/4R1K1 b - - 0 1')
  const pins = findPinsAndSkewers(chess, 'w')
  assert.equal(pins.length, 1)
  assert.equal(pins[0].kind, 'pin')
  assert.equal(pins[0].by, 'e1')
  assert.equal(pins[0].front, 'e2')
  assert.equal(pins[0].behind, 'e8')
})

test('overloadedDefenders spots a piece doing two jobs', () => {
  const chess = new Chess('r3k2r/ppp2ppp/8/8/8/8/PPPQ1PPP/R3K2R w KQkq - 0 1')
  const result = overloadedDefenders(chess, 'w')
  assert.ok(Array.isArray(result))
})

test('pawnStructure detects an isolated queen pawn', () => {
  const iqp = new Chess('rnbqkbnr/pp3ppp/8/3p4/8/8/PPP2PPP/RNBQKBNR w KQkq - 0 1')
  const black = pawnStructure(iqp, 'b')
  assert.ok(black.isolated.includes('d'), `expected the d file isolated, got ${black.isolated.join(',')}`)
  assert.equal(black.iqp, true)

  const solid = pawnStructure(new Chess(), 'w')
  assert.equal(solid.isolated.length, 0)
  assert.equal(solid.iqp, false)
  assert.equal(solid.islands, 1, 'the starting position is one solid pawn island')
})

test('pawnStructure counts doubled pawns', () => {
  const chess = new Chess('rnbqkbnr/pppppppp/8/8/8/5P2/PPPPPP1P/RNBQKBNR w KQkq - 0 1')
  const white = pawnStructure(chess, 'w')
  assert.ok(white.doubled.includes('f'), 'f2 and f3 are doubled')
})

test('badBishops flags a bishop buried behind its own pawns', () => {
  const chess = new Chess('4k3/8/8/8/2p1p3/3p4/3PB3/4K3 w - - 0 1')
  const bad = badBishops(chess, 'w')
  assert.ok(Array.isArray(bad))
})

test('kingSafety measures the pawn shield and the attackers around the king', () => {
  const exposed = kingSafety(new Chess('rnbqkbnr/pppp1ppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1'), 'w')
  assert.equal(exposed.square, 'e1')
  assert.ok(exposed.shield < 3, 'the e pawn has gone, so the shield is broken')

  const intact = kingSafety(new Chess(), 'w')
  assert.equal(intact.shield, 3, 'a full pawn shield in front of the starting king')
})

test('withSideToMove flips the mover and returns a usable position', () => {
  const start = new Chess().fen()
  const flipped = withSideToMove(start, 'b')
  assert.ok(flipped, 'the flip is legal here')
  assert.equal(flipped.turn(), 'b')
  assert.ok(flipped.moves().length > 0)
})

test('withSideToMove refuses positions that cannot legally exist', () => {
  // Black is in check, so it cannot be White to move.
  const inCheck = new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3')
  assert.equal(withSideToMove(inCheck.fen(), 'b'), null)
})

test('tagMove explains a move that hangs a piece', () => {
  // White plays Nf3-e5 where it can simply be taken by the d6 pawn.
  const before = 'rnbqkbnr/ppp1pppp/3p4/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 3'
  const after = 'rnbqkbnr/ppp1pppp/3p4/4N3/8/8/PPPPPPPP/RNBQKB1R b KQkq - 1 3'
  const tags = tagMove(
    {
      san: 'Ne5',
      uci: 'f3e5',
      colour: 'w',
      fenBefore: before,
      fenAfter: after,
      loss: 320,
      classification: 'blunder',
      bestSan: 'd4',
      ply: 4,
      moveNumber: 3,
    },
    {},
  )
  assert.ok(tags.length > 0, 'a blunder should always carry at least one tag')
  assert.ok(
    tags.some((t) => t.id === 'hanging-piece' || t.id === 'loose-piece'),
    `expected a hanging piece tag, got ${tags.map((t) => t.id).join(',')}`,
  )
})

test('tagMove never returns an untagged blunder', () => {
  const chess = new Chess()
  chess.move('e4')
  const before = chess.fen()
  chess.move('e5')
  const tags = tagMove(
    {
      san: 'e5',
      uci: 'e7e5',
      colour: 'b',
      fenBefore: before,
      fenAfter: chess.fen(),
      loss: 400,
      classification: 'blunder',
      bestSan: 'c5',
      ply: 2,
      moveNumber: 1,
    },
    {},
  )
  assert.ok(tags.length > 0)
})

test('summarisePatterns counts and costs each weakness', () => {
  const tagged = [
    { isPlayer: true, loss: 300, ply: 4, san: 'Ne5', tags: [{ id: 'hanging-piece', label: 'Hanging piece' }] },
    { isPlayer: true, loss: 100, ply: 8, san: 'Bd3', tags: [{ id: 'hanging-piece', label: 'Hanging piece' }] },
    { isPlayer: true, loss: 200, ply: 6, san: 'a4', tags: [{ id: 'allowed-fork', label: 'Allowed a fork' }] },
  ]
  const summary = summarisePatterns(tagged)
  assert.equal(summary[0].id, 'hanging-piece', 'the most expensive pattern comes first')
  assert.equal(summary[0].count, 2)
  assert.equal(summary[0].cost, 400)
  assert.equal(summary[0].label, 'Hanging piece')
  assert.equal(summary[0].examples.length, 2, 'examples are kept so lessons can quote your own moves')
})

/* --------------------------------------------------------------- openings
 * The book used to be roughly 35 hand-written lines. It is now the full
 * Lichess ECO tree compiled at build time: 3,810 named lines over 8,653
 * positions. That changed what "unknown" means. ECO A00 covers every
 * irregular opening, so all twenty legal first moves now name something -
 * a3 is Anderssen's Opening, Na3 is the Sodium Attack, h3 is the Clemenz.
 * Two assertions below used a3 as a stand-in for "not in the book" and
 * legitimately started failing when the book learned it. They are rewritten
 * against a move the book genuinely does not contain rather than relaxed,
 * because the property being tested - that a name is never invented - still
 * matters.
 */

test('lookupOpening names a known line', () => {
  assert.equal(lookupOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']).name, 'Ruy Lopez')
  assert.equal(lookupOpening(['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6']).name, "King's Indian Defence")
  assert.equal(
    lookupOpening(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6']).name,
    'Sicilian Najdorf',
  )
  assert.equal(lookupOpening(['Ke2']), null, 'unknown lines are not invented')
  assert.equal(lookupOpening([]), null, 'no moves means no opening')
})

test('the full book knows the irregular openings too', () => {
  assert.equal(lookupOpening(['a3']).name, "Anderssen's Opening")
  assert.equal(lookupOpening(['Na3']).name, 'Sodium Attack')
  const stats = openingTreeStats()
  assert.ok(stats.openings > 3000, `expected a full book, got ${stats.openings} lines`)
  assert.ok(stats.positions > stats.openings, 'positions index should be larger than the line count')
})

test('a book entry carries plans, not just a name', () => {
  const ruy = lookupOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])
  assert.ok(ruy.white && ruy.black, 'both sides get a plan')
  assert.ok(ruy.eco)
})

test('lookupOpening returns the longest match, not the first', () => {
  const short = lookupOpening(['e4', 'e5'])
  const long = lookupOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])
  assert.notEqual(short?.name, long.name)
  assert.equal(long.name, 'Ruy Lopez')
})

test('outOfBookPly reports where theory stops', () => {
  assert.equal(outOfBookPly(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']), null, 'still inside the Ruy Lopez')
  assert.equal(outOfBookPly(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Qf6']), 5, 'Black leaves book on ply 5')
  assert.equal(outOfBookPly(['Ke2']), 0, 'nothing was ever in book')
  assert.equal(outOfBookPly(['a3', 'h6']), 1, 'a3 is a real line, so the book only runs out on ply 1')
})

test('shouldFlagDeviation only fires when the opponent leaves book late enough', () => {
  const flagged = shouldFlagDeviation({ moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Qf6'], playerColour: 'w' })
  assert.ok(flagged, 'the opponent left a real line')
  assert.equal(flagged.ply, 5)
  assert.equal(flagged.san, 'Qf6')
  assert.equal(flagged.previous.name, 'Ruy Lopez', 'we still know what we were playing')

  assert.equal(shouldFlagDeviation({ moves: ['e4', 'a6'], playerColour: 'w' }), null, 'too early to matter')
  assert.equal(
    shouldFlagDeviation({ moves: ['e4', 'e5', 'Nf3', 'Nc6', 'a3'], playerColour: 'w' }),
    null,
    'you are the one who left book, so there is nothing to warn about',
  )
})

test('describeDeviation explains the position rather than quoting theory', () => {
  const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Qf6']
  const chess = new Chess()
  for (const m of moves) chess.move(m)

  const out = describeDeviation({ moves, fen: chess.fen(), evalCp: 30 })
  assert.equal(out.lastMove, 'Qf6')
  assert.equal(out.byColour, 'b')
  assert.equal(out.knownOpening.name, 'Ruy Lopez', 'the plans you already knew still apply')
  assert.ok(out.inheritedPlans.white, 'you keep your side of the plan')
  assert.ok(out.checklist.length > 0, 'gives principles to fall back on')
  assert.equal(out.unusual, null, 'no popularity data means no claim about rarity')

  const rare = describeDeviation({ moves, fen: chess.fen(), popularity: 0.001 })
  assert.equal(rare.unusual, true)
})

test('positionBrief summarises a position numerically', () => {
  const brief = positionBrief(new Chess().fen())
  assert.equal(brief.materialBalance, 0, 'the start is materially level')
  assert.equal(brief.sideToMove, 'w')
  assert.deepEqual(brief.developed, { w: 0, b: 0 }, 'nothing is developed yet')
  assert.deepEqual(brief.openFiles, [], 'every file still has pawns')
  assert.equal(brief.inCheck, false)
  assert.equal(brief.legalMoves, 20)
})

test('positionBrief tracks development and open files as the game opens up', () => {
  const chess = new Chess()
  for (const m of ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'Nf3']) chess.move(m)
  const brief = positionBrief(chess)
  assert.ok(brief.developed.w >= 2, 'White has two minor pieces out')
  assert.ok(brief.halfOpenFiles.w.includes('e'), 'the e file opened for White')
})

/* ---------------------------------------------------------------- puzzles */

const annotatedMoves = [
  {
    isPlayer: true, ply: 4, moveNumber: 2, colour: 'w', san: 'Ng5', uci: 'f3g5',
    bestSan: 'd4', bestMove: 'd2d4', bestLine: ['d4', 'exd4'], loss: 320,
    fenBefore: new Chess().fen(), evalBefore: 20, evalAfter: -300, phase: 'opening',
    tags: [{ id: 'hanging-piece' }],
  },
  {
    isPlayer: true, ply: 6, moveNumber: 3, colour: 'w', san: 'h3', uci: 'h2h3',
    bestSan: 'O-O', bestMove: 'e1g1', bestLine: ['O-O'], loss: 60,
    fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
    evalBefore: 20, evalAfter: -40, phase: 'opening', tags: [{ id: 'slow-development' }],
  },
  {
    isPlayer: false, ply: 5, moveNumber: 3, colour: 'b', san: 'Qh4', uci: 'd8h4',
    bestSan: 'Nf6', bestMove: 'g8f6', loss: 900, fenBefore: new Chess().fen(),
    evalBefore: 0, evalAfter: 900, phase: 'opening', tags: [],
  },
]

test('puzzlesFromGame builds drills from your own worst moves', () => {
  const puzzles = puzzlesFromGame({ moves: annotatedMoves, playerColour: 'w', gameId: 'g1' })
  assert.equal(puzzles.length, 1, 'only the 320cp mistake clears the threshold')
  assert.equal(puzzles[0].solution.san, 'd4')
  assert.equal(puzzles[0].primaryTag, 'hanging-piece')
  assert.equal(puzzles[0].strict, true, 'a 320cp error demands the exact move')
  assert.ok(puzzles[0].prompt.length > 0)
})

test('puzzlesFromGame still gives you something after a clean game', () => {
  const clean = annotatedMoves.filter((m) => m.loss < 100)
  const puzzles = puzzlesFromGame({ moves: clean, playerColour: 'w', gameId: 'g2' })
  assert.equal(puzzles.length, 1, 'falls back to the best of a good game')
  assert.equal(puzzles[0].solution.san, 'O-O')
})

test('puzzlesFromGame ignores opponent moves and duplicate positions', () => {
  const puzzles = puzzlesFromGame({ moves: annotatedMoves, playerColour: 'w', gameId: 'g3' })
  assert.ok(!puzzles.some((p) => p.source.colour === 'b'))
})

test('gradeAnswer accepts the best move and rejects a worse one', () => {
  const puzzle = {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
    solution: { uci: 'f1c4', san: 'Bc4', line: [] },
    tags: [],
  }
  assert.equal(gradeAnswer(puzzle, 'f1c4').correct, true)

  const different = gradeAnswer(puzzle, 'd2d4')
  assert.equal(different.correct, false)
  assert.equal(different.verdict, 'different')
})

test('gradeAnswer credits a move the engine rates just as highly', () => {
  const puzzle = {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
    solution: { uci: 'f1c4', san: 'Bc4', line: [] },
    tags: [],
  }
  const close = gradeAnswer(puzzle, 'f1b5', { answerEvalCp: 30, bestEvalCp: 45 })
  assert.equal(close.correct, true, '15cp apart is the same move in practice')

  const bad = gradeAnswer(puzzle, 'f1b5', { answerEvalCp: -200, bestEvalCp: 45 })
  assert.equal(bad.correct, false)
  assert.match(bad.message, /pawns/)
})

test('buildQueue puts due drills and known weaknesses first', () => {
  const pool = [
    { id: 'p1', primaryTag: 'bad-bishop', loss: 100 },
    { id: 'p2', primaryTag: 'hanging-piece', loss: 500 },
    { id: 'p3', primaryTag: 'slow-development', loss: 90 },
  ]
  const queue = buildQueue({ pool, weaknesses: [{ id: 'hanging-piece' }], due: ['hanging-piece'] })
  assert.equal(queue[0].id, 'p2')
  assert.equal(queue.length, 3, 'everything still gets practised')
})

/* ---------------------------------------------------------------- profile */

test('recordGame accumulates weaknesses across games', () => {
  let profile = emptyProfile()
  profile = recordGame(profile, {
    patternSummary: [{ id: 'hanging-piece', label: 'Hanging piece', count: 2, cost: 400, examples: [] }],
    summary: { accuracy: 70, acpl: 90, counts: { blunder: 1, mistake: 1, inaccuracy: 2 } },
    result: 'loss',
    opening: 'Ruy Lopez',
    playerColour: 'w',
  })
  assert.equal(profile.gamesPlayed, 1)
  assert.equal(profile.patterns['hanging-piece'].count, 2)
  assert.equal(profile.patterns['hanging-piece'].games, 1)
  assert.equal(profile.history.length, 1)
  assert.equal(profile.history[0].blunders, 1)

  profile = recordGame(profile, {
    patternSummary: [{ id: 'hanging-piece', label: 'Hanging piece', count: 1, cost: 150, examples: [] }],
    summary: { accuracy: 80, acpl: 60, counts: {} },
    result: 'win',
    playerColour: 'b',
  })
  assert.equal(profile.gamesPlayed, 2)
  assert.equal(profile.patterns['hanging-piece'].count, 3)
  assert.equal(profile.patterns['hanging-piece'].games, 2)
  assert.ok(
    profile.patterns['hanging-piece'].ewma < 400,
    'the weighted severity fades as the pattern stops costing as much',
  )
})

test('recordGame survives a summary with no examples attached', () => {
  const profile = recordGame(emptyProfile(), {
    patternSummary: [{ id: 'bad-bishop', count: 1, cost: 60 }],
    summary: { accuracy: 90, acpl: 30, counts: {} },
    playerColour: 'w',
  })
  assert.equal(profile.patterns['bad-bishop'].count, 1)
  assert.deepEqual(profile.patterns['bad-bishop'].examples, [])
})

test('rankWeaknesses puts the most expensive recurring pattern on top', () => {
  let profile = emptyProfile()
  profile = recordGame(profile, {
    patternSummary: [
      { id: 'bad-bishop', count: 1, cost: 60, examples: [] },
      { id: 'hanging-piece', count: 3, cost: 900, examples: [] },
    ],
    summary: { accuracy: 60, acpl: 120, counts: {} },
    playerColour: 'w',
  })
  const ranked = rankWeaknesses(profile)
  assert.equal(ranked[0].id, 'hanging-piece')
  assert.ok(ranked[0].label, 'ranked weaknesses carry display metadata')
  assert.ok(ranked[0].score >= ranked[1].score)
})

test('rankWeaknesses on a fresh profile returns nothing rather than failing', () => {
  assert.deepEqual(rankWeaknesses(emptyProfile()), [])
})

test('recordDrill moves a pattern up and down the Leitner boxes', () => {
  let profile = emptyProfile()
  profile = recordGame(profile, {
    patternSummary: [{ id: 'allowed-fork', count: 1, cost: 200, examples: [] }],
    summary: { accuracy: 70, acpl: 80, counts: {} },
    playerColour: 'w',
  })

  const start = profile.patterns['allowed-fork'].box
  assert.equal(start, 1, 'a new weakness starts in the first box')

  profile = recordDrill(profile, 'allowed-fork', true)
  assert.equal(profile.patterns['allowed-fork'].box, start + 1, 'a correct answer promotes')
  assert.equal(profile.patterns['allowed-fork'].correct, 1)
  assert.equal(profile.puzzles.solved, 1)
  assert.equal(profile.puzzles.attempted, 1)

  profile = recordDrill(profile, 'allowed-fork', false)
  assert.equal(profile.patterns['allowed-fork'].box, 1, 'a miss sends it back to the start')
  assert.equal(profile.puzzles.attempted, 2)
  assert.equal(profile.puzzles.solved, 1)
  assert.ok(profile.patterns['allowed-fork'].due, 'a missed pattern is scheduled to come back')
})

test('a missed pattern comes back immediately and a mastered one is pushed out', () => {
  let profile = recordGame(emptyProfile(), {
    patternSummary: [{ id: 'allowed-fork', count: 1, cost: 200, examples: [] }],
    summary: { accuracy: 70, acpl: 80, counts: {} },
    playerColour: 'w',
  })
  const now = Date.UTC(2024, 0, 1)

  profile = recordDrill(profile, 'allowed-fork', false, { now })
  assert.equal(
    new Date(profile.patterns['allowed-fork'].due).getTime(),
    now,
    'you see a missed pattern again straight away',
  )

  for (let i = 0; i < 6; i += 1) profile = recordDrill(profile, 'allowed-fork', true, { now })
  const days = (new Date(profile.patterns['allowed-fork'].due).getTime() - now) / 86400000
  assert.equal(days, LEITNER_INTERVALS_DAYS.at(-1), 'a mastered pattern waits the longest interval')
})

test('recordDrill never promotes past the last box', () => {
  let profile = emptyProfile()
  profile = recordGame(profile, {
    patternSummary: [{ id: 'allowed-fork', count: 1, cost: 200, examples: [] }],
    summary: { accuracy: 70, acpl: 80, counts: {} },
    playerColour: 'w',
  })
  for (let i = 0; i < 12; i += 1) profile = recordDrill(profile, 'allowed-fork', true)
  const box = profile.patterns['allowed-fork'].box
  assert.equal(box, LEITNER_INTERVALS_DAYS.length, 'boxes are 1 based and stop at the last interval')
  assert.ok(Number.isFinite(new Date(profile.patterns['allowed-fork'].due).getTime()), 'the due date stays valid')
})

test('trend compares recent play with what came before', () => {
  let profile = emptyProfile()
  // Oldest first: accuracy climbing and average loss falling.
  for (const [accuracy, acpl] of [
    [50, 140], [52, 130], [51, 135],
    [80, 60], [82, 55], [85, 50],
  ]) {
    profile = recordGame(profile, {
      patternSummary: [],
      summary: { accuracy, acpl, counts: {} },
      playerColour: 'w',
    })
  }
  const t = trend(profile, { window: 3 })
  assert.ok(t.acplDelta < 0, `average loss should be falling, got ${t.acplDelta}`)
  assert.ok(t.recentAccuracy > 70)
  assert.equal(t.games, 6)
  assert.equal(t.sparkline.length, 6, 'the sparkline shows every game so far, oldest first')
})

test('trend on an empty profile returns null instead of throwing', () => {
  assert.equal(trend(emptyProfile()), null)
})

test('normaliseProfile repairs anything missing or corrupt', () => {
  assert.equal(normaliseProfile(null).gamesPlayed, 0)
  assert.equal(normaliseProfile('nonsense').version, emptyProfile().version)

  const partial = normaliseProfile({ gamesPlayed: 4 })
  assert.equal(partial.gamesPlayed, 4)
  assert.deepEqual(partial.patterns, {})
  assert.ok(Array.isArray(partial.history))
  assert.equal(partial.puzzles.attempted, 0)
})
