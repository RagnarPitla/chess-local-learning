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

/** Legal SAN moves from the position reached after replaying `sanMoves`. */
function legalSans(sanMoves) {
  const chess = new Chess()
  for (const san of sanMoves) chess.move(san)
  return chess.moves()
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
