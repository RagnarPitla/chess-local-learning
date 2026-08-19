/**
 * Coverage for the variation engine (public/js/explorer.js), which was
 * shipping with almost no dedicated tests despite being the product's
 * headline feature: a difficulty-scaled shortlist of 3 to 9 candidate moves
 * from the live position.
 *
 * NOTE: explorer.js is under active repair by another agent while this file
 * is being written (see the header comment on DIFFICULTY_PRESETS in that
 * file - "the fix is in flight" for the case where the book runs thin).
 * These tests assert the CORRECT, documented contract of trainingVariations
 * regardless of whether today's code already satisfies it. Do not weaken an
 * assertion here to match buggy behaviour - see the run report instead.
 *
 *   node --test scripts/
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { Chess } from 'chess.js'

import { DIFFICULTY_PRESETS, trainingVariations, classifyVariations, explainVariation } from '../public/js/explorer.js'
import { outOfBookPly, variationsFrom } from '../public/js/openings.js'

const LEVELS = Object.keys(DIFFICULTY_PRESETS) // beginner, intermediate, advanced, expert
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 }
const SIMPLE_RECAPTURE_LOSS_LIMIT = 1
const CHECK_BLOCK_REGRESSION = ['b4', 'd5', 'a4', 'e5', 'd3', 'Bd6', 'f3', 'Qe7', 'b5', 'a6', 'd4', 'axb5', 'e4', 'c6', 'a5', 'exd4', 'c4', 'Bb4+']

const REGRESSION_LINES = {
  Najdorf: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e5', 'Nb3', 'Be7', 'O-O', 'O-O'],
  Dragon: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6'],
  'Open Sicilian': ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6'],
  'Ruy Lopez': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6'],
  "Queen's Gambit": ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6'],
  "King's Indian": ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5'],
}

/** Legal SAN moves from the position reached after replaying `sanMoves`. */
function legalSans(sanMoves) {
  const chess = new Chess()
  for (const san of sanMoves) chess.move(san)
  return chess.moves()
}

function materialSafety(sanMoves, san) {
  const chess = new Chess()
  for (const move of sanMoves) chess.move(move)
  const played = chess.move(san)
  const gain = PIECE_VALUES[played?.captured] || 0
  const exchange = resolveExchange(chess, played.to, played.color, gain)
  return { materialLoss: Math.max(0, -exchange.score), bestReply: exchange.line[0] ?? null, exchangeLine: exchange.line }
}

function resolveExchange(chess, target, originalColour, delta, depth = 0) {
  if (depth > 16) return { score: delta, line: [] }
  const turn = chess.turn()
  const captures = chess
    .moves({ verbose: true })
    .filter((move) => move.to === target && move.captured)
    .sort((a, b) => (PIECE_VALUES[a.piece] || 0) - (PIECE_VALUES[b.piece] || 0))

  if (!captures.length) return { score: delta, line: [] }
  let best = { score: delta, line: [] }
  for (const move of captures) {
    const next = new Chess(chess.fen())
    next.move(move.san)
    const captureValue = PIECE_VALUES[move.captured] || 0
    const nextDelta = delta + (turn === originalColour ? captureValue : -captureValue)
    const child = resolveExchange(next, target, originalColour, nextDelta, depth + 1)
    const line = [move.san, ...child.line]
    if (turn === originalColour) {
      if (child.score > best.score) best = { score: child.score, line }
    } else if (child.score < best.score) {
      best = { score: child.score, line }
    }
  }
  return best
}

function moduloSan(reason, san) {
  return reason.replaceAll(san, '<SAN>').replace(/^Play <SAN>:/, 'Play <SAN>:')
}

function assertTrainingContract(label, sanMoves, level) {
  const legal = new Set(legalSans(sanMoves))
  const requested = DIFFICULTY_PRESETS[level].variations
  const expected = Math.min(requested, legal.size)
  const context = classifyVariations(sanMoves).position
  const result = trainingVariations({ sanMoves, count: requested, level })
  const sans = result.map((v) => v.san)

  assert.equal(result.length, expected, `${label}/${level}: expected ${expected} candidate moves, got ${result.length}`)
  assert.equal(new Set(sans).size, sans.length, `${label}/${level}: duplicate move offered`)

  const reasons = new Set()
  for (const row of result) {
    assert.ok(legal.has(row.san), `${label}/${level}: "${row.san}" is not legal`)
    const safety = materialSafety(sanMoves, row.san)
    assert.ok(
      safety.materialLoss <= SIMPLE_RECAPTURE_LOSS_LIMIT,
      `${label}/${level}/${row.san}: loses ${safety.materialLoss} after ${safety.bestReply}`,
    )
    const reason = row.whyThisOne || explainVariation(row, context)
    assert.match(reason, /^[A-Z0-9]/, `${label}/${level}/${row.san}: reason must start like a sentence`)
    assert.match(reason, /[.!?]$/, `${label}/${level}/${row.san}: reason must end with punctuation`)
    assert.ok(reason.length >= 60, `${label}/${level}/${row.san}: reason is too thin: ${reason}`)
    assert.ok(reason.includes(row.san), `${label}/${level}/${row.san}: reason should name the move`)
    assert.doesNotMatch(reason, /that also (centre|development|king safety)\b/i, `${label}/${level}/${row.san}: ungrammatical noun/verb mix`)
    assert.doesNotMatch(reason, /No specific plan is recorded here/i, `${label}/${level}/${row.san}: boilerplate explanation leaked`)
    assert.ok(!reasons.has(reason), `${label}/${level}/${row.san}: duplicate boilerplate reason`)
    reasons.add(reason)
  }

  return result
}

/**
 * A spread of positions at different depths, spanning: the start position,
 * a shallow reply, a thin/out-of-book-soon line, a deep well-known book
 * line, a deep book line with fewer named branches, and lines that are
 * fully past the end of the opening book (both shallow-past and deep-past).
 */
const POSITIONS = {
  start: [],
  afterE4: ['e4'],
  // The exact regression reported for the in-flight fix: the book here has
  // only 4 named continuations, well short of 5/7/9.
  thinBookE4d6: ['e4', 'd6'],
  ruyLopezMainLine: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
  najdorfDeepBook: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
  // Leaves the book almost immediately (ply 2) - shallow past-the-book.
  pastBookShallow: ['e4', 'a6', 'a4'],
  // A longer past-the-book line: still legal, still full of choices, but
  // nothing here is a named theoretical continuation any more.
  pastBookDeep: ['e4', 'a6', 'a4', 'a5', 'Nc3', 'Nc6', 'Nf3', 'Nf6', 'g3', 'g6'],
}

test('every difficulty preset is within the documented 3..9 range', () => {
  for (const level of LEVELS) {
    const n = DIFFICULTY_PRESETS[level].variations
    assert.ok(n >= 3 && n <= 9, `${level} preset ${n} is outside 3..9`)
  }
  assert.deepEqual(
    LEVELS.map((l) => DIFFICULTY_PRESETS[l].variations),
    [3, 5, 7, 9],
    'beginner/intermediate/advanced/expert must map to 3/5/7/9 - the UI selector is built on this',
  )
})

for (const [label, sanMoves] of Object.entries(POSITIONS)) {
  test(`trainingVariations returns exactly the requested count at "${label}" for every difficulty`, () => {
    const legal = legalSans(sanMoves)
    for (const level of LEVELS) {
      const count = DIFFICULTY_PRESETS[level].variations // per the task note: pass count explicitly, never rely on level alone
      const result = trainingVariations({ sanMoves, count, level })
      assert.equal(
        result.length,
        count,
        `${label}/${level}: expected exactly ${count} variations (legal moves here: ${legal.length}), got ${result.length}`,
      )
    }
  })

  test(`trainingVariations at "${label}" never invents a move and never repeats one`, () => {
    const legal = new Set(legalSans(sanMoves))
    for (const level of LEVELS) {
      const count = DIFFICULTY_PRESETS[level].variations
      const result = trainingVariations({ sanMoves, count, level })
      const sans = result.map((v) => v.san)
      assert.equal(new Set(sans).size, sans.length, `${label}/${level}: duplicate move offered`)
      for (const san of sans) assert.ok(legal.has(san), `${label}/${level}: "${san}" is not a legal move here`)
    }
  })
}

test('the book-thin regression: 1.e4 d6 must return 5/7/9 at intermediate/advanced/expert, not 4', () => {
  // Written against the documented defect report verbatim, so this test
  // stays meaningful whether it currently passes (fix landed) or fails
  // (fix still in flight) - see the run report for which is true today.
  const book = variationsFrom(['e4', 'd6'])
  assert.ok(book.length < 7, `test assumption broken: expected a thin book here, found ${book.length} continuations`)

  for (const level of ['intermediate', 'advanced', 'expert']) {
    const count = DIFFICULTY_PRESETS[level].variations
    const result = trainingVariations({ sanMoves: ['e4', 'd6'], count, level })
    assert.equal(result.length, count, `1.e4 d6 at ${level}: expected ${count}, got ${result.length}`)
  }
})

test('count and level are independent: a small count at expert and a large count at beginner both size to count', () => {
  // The task's explicit warning: level alone does not size the set. Prove
  // it by mismatching them on purpose.
  const smallAtExpert = trainingVariations({ sanMoves: [], count: 3, level: 'expert' })
  assert.equal(smallAtExpert.length, 3, 'expert level does not force a bigger set than the count asked for')

  const bigAtBeginner = trainingVariations({ sanMoves: [], count: 9, level: 'beginner' })
  assert.equal(bigAtBeginner.length, 9, 'beginner level does not cap the set below the count asked for')
})

test('trainingVariations tops up out-of-book positions from every difficulty, not just book-heavy ones', () => {
  for (const level of LEVELS) {
    const count = DIFFICULTY_PRESETS[level].variations
    const result = trainingVariations({ sanMoves: POSITIONS.pastBookDeep, count, level })
    assert.equal(result.length, count)
    assert.ok(
      result.every((v) => v.isBook === false && v.novelty === true),
      'nothing here is in the book, so every entry must be honestly marked as a novelty',
    )
  }
})

test('trainingVariations returns fewer than the requested count only when the position truly has fewer legal moves', () => {
  // Fool's mate: checkmate on the board, zero legal moves left. This is the
  // one honest exception documented in explorer.js - never an empty panel
  // by silently under-counting a position that still has plenty of moves.
  const mateMoves = ['f3', 'e5', 'g4', 'Qh4#']
  assert.equal(legalSans(mateMoves).length, 0, 'test assumption: this really is checkmate')
  for (const level of LEVELS) {
    const count = DIFFICULTY_PRESETS[level].variations
    const result = trainingVariations({ sanMoves: mateMoves, count, level })
    assert.equal(result.length, 0, `${level}: a mated position has no candidate moves to offer, got ${result.length}`)
  }
})

test('trainingVariations keeps the promised count, legality, uniqueness and explanations through deep opening lines', () => {
  for (const [lineName, moves] of Object.entries(REGRESSION_LINES)) {
    for (let ply = 1; ply <= moves.length; ply++) {
      const sanMoves = moves.slice(0, ply)
      for (const level of LEVELS) {
        assertTrainingContract(`${lineName} ply ${ply} after ${moves[ply - 1]}`, sanMoves, level)
      }
    }
  }
})

test('Najdorf top-up explanations keep the Sicilian identity alive after named continuations run out', () => {
  const sanMoves = REGRESSION_LINES.Najdorf
  assert.equal(variationsFrom(sanMoves).length, 0, 'test assumption: this exact Najdorf line has no named child continuations')
  const rows = assertTrainingContract('Najdorf terminal', sanMoves, 'expert')
  const reasonsModuloSan = new Set()
  for (const row of rows) {
    assert.equal(row.isBook, false, `${row.san}: terminal Najdorf top-ups must be honestly marked non-book`)
    assert.equal(row.novelty, true, `${row.san}: terminal Najdorf top-ups must be honestly marked novelties`)
    assert.match(row.whyThisOne, /Sicilian|Najdorf/i, `${row.san}: explanation should preserve the opening identity`)
    const genericReason = moduloSan(row.whyThisOne, row.san)
    assert.ok(!reasonsModuloSan.has(genericReason), `${row.san}: duplicate explanation after removing SAN`)
    reasonsModuloSan.add(genericReason)
  }
})

test('Najdorf terminal top-ups prefer plan-named moves over arbitrary safe pawn moves', () => {
  const sanMoves = REGRESSION_LINES.Najdorf
  const rows = trainingVariations({ sanMoves, level: 'expert', count: 9 })
  const sans = rows.map((row) => row.san)
  assert.ok(sans.includes('Be3'), `expected Be3 from the Najdorf plan, got ${sans.join(', ')}`)
  assert.ok(sans.indexOf('Be3') < sans.indexOf('a3') || !sans.includes('a3'), `Be3 should outrank arbitrary a3, got ${sans.join(', ')}`)
  assert.ok(sans.indexOf('Be3') < sans.indexOf('a4') || !sans.includes('a4'), `Be3 should outrank arbitrary a4, got ${sans.join(', ')}`)
})

test('check-block regression: exchange evaluation keeps normal blocking moves and preserves counts', () => {
  const legal = legalSans(CHECK_BLOCK_REGRESSION)
  assert.deepEqual(legal, ['Nc3', 'Nd2', 'Bd2', 'Qd2', 'Ke2', 'Kf2'])

  for (const level of LEVELS) {
    const count = DIFFICULTY_PRESETS[level].variations
    const rows = trainingVariations({ sanMoves: CHECK_BLOCK_REGRESSION, level, count })
    assert.equal(rows.length, Math.min(count, legal.length), `${level}: must not starve a check position with six legal moves`)
    const sans = rows.map((row) => row.san)
    if (count >= legal.length) assert.ok(sans.includes('Nc3'), `${level}: expected Nc3 when showing every legal move in ${sans.join(', ')}`)

    const nc3Safety = materialSafety(CHECK_BLOCK_REGRESSION, 'Nc3')
    assert.ok(nc3Safety.materialLoss < PIECE_VALUES.q, `${level}: Nc3 must not be treated like a queen hang, got ${JSON.stringify(nc3Safety)}`)

    const losses = rows.map((row) => materialSafety(CHECK_BLOCK_REGRESSION, row.san).materialLoss)
    for (let i = 1; i < losses.length; i++) {
      assert.ok(
        losses[i - 1] <= losses[i],
        `${level}: materially losing moves must not outrank safer moves; got ${sans.join(', ')} with losses ${losses.join(', ')}`,
      )
    }
    if (sans.includes('Nc3') && sans.includes('Ke2')) {
      assert.ok(sans.indexOf('Ke2') < sans.indexOf('Nc3'), `${level}: safe Ke2 must rank above losing Nc3 in ${sans.join(', ')}`)
    }
  }
})

test('forcing positions do not under-deliver when enough legal moves exist', () => {
  const forcingPositions = [
    CHECK_BLOCK_REGRESSION,
    ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6'],
    ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3'],
    ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4'],
  ]

  for (const sanMoves of forcingPositions) {
    const legal = legalSans(sanMoves)
    for (const level of LEVELS) {
      const count = DIFFICULTY_PRESETS[level].variations
      const rows = trainingVariations({ sanMoves, level, count })
      assert.equal(rows.length, Math.min(count, legal.length), `${sanMoves.join(' ')}/${level}: count contract broke`)
    }
  }
})

test('classifyVariations names the exact starting position instead of leaving it null', () => {
  const result = classifyVariations([])
  assert.equal(result.position.inBook, true)
  assert.equal(result.position.name, 'Starting Position')
})

test('classifyVariations never pairs inBook:true with a null name', () => {
  for (const [label, sanMoves] of Object.entries(POSITIONS)) {
    const result = classifyVariations(sanMoves)
    if (result.position.inBook) {
      assert.notEqual(result.position.name, null, `${label}: inBook position must always carry a name`)
    }
  }
})

test('explainVariation always produces a non-empty sentence, book or not', () => {
  const context = classifyVariations(['e4']).position
  const bookMove = classifyVariations(['e4']).moves.find((m) => m.isBook)
  const novelty = classifyVariations(['e4']).moves.find((m) => !m.isBook) || {
    san: 'a6', uci: 'a7a6', isBook: false, name: null, eco: null, share: 0, isMain: false, lineCount: 0,
  }
  assert.ok(bookMove, 'test assumption: 1.e4 has at least one book reply')
  assert.ok(explainVariation(bookMove, context).length > 0)
  assert.ok(explainVariation(novelty, context).length > 0)
  assert.equal(explainVariation(null), 'No move to explain.')
})
