/**
 * Coverage for library.js under Node, which has neither `indexedDB` nor
 * `localStorage` as globals (verified directly - see the two typeof
 * assertions below, which double as a canary if a future Node version or
 * test-runner flag ever adds either). library.js is written to degrade to a
 * clean, typed rejection rather than a raw platform exception in exactly
 * this situation (private browsing / an old browser / this test runner),
 * so this is a real contract, not a workaround for a test limitation.
 *
 * Full CRUD (add/list/filter/sort/review/delete/stats/export) needs a real
 * IndexedDB and is covered separately in scripts/smoke.mjs against a real
 * headless-Chrome page.
 *
 *   node --test scripts/
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  LibraryError,
  openLibrary,
  addGames,
  saveReview,
  deleteGame,
  clearLibrary,
  getGame,
  listGames,
  libraryStats,
  exportLibrary,
} from '../public/js/library.js'

test('sanity: this Node environment truly has no indexedDB or localStorage, which is the condition under test', () => {
  assert.equal(typeof indexedDB, 'undefined')
  assert.equal(typeof localStorage, 'undefined')
})

test('LibraryError is a real Error subclass carrying a machine-readable code', () => {
  const err = new LibraryError('boom')
  assert.ok(err instanceof Error)
  assert.ok(err instanceof LibraryError)
  assert.equal(err.name, 'LibraryError')
  assert.equal(err.message, 'boom')
  assert.equal(err.code, 'error', 'code defaults to "error" when not given')

  const coded = new LibraryError('nope', 'unsupported')
  assert.equal(coded.code, 'unsupported')
})

test('openLibrary rejects cleanly with a typed "unsupported" LibraryError, never a raw ReferenceError', async () => {
  await assert.rejects(openLibrary(), (err) => {
    assert.ok(err instanceof LibraryError, `expected a LibraryError, got ${err?.constructor?.name}`)
    assert.equal(err.code, 'unsupported')
    assert.ok(err.message.length > 0)
    return true
  })
})

/**
 * Every one of these opens the database first thing; under Node that open
 * always rejects the same way, so every public read/write must surface the
 * SAME clean LibraryError rather than a bare TypeError from touching
 * indexedDB internals (e.g. "indexedDB is not defined"), which would be
 * exactly the kind of raw crash a saved-games page must never show a user
 * whose browser or privacy mode has storage disabled.
 */
const CALLS = {
  addGames: () => addGames([{ id: 'g1', pgn: '1. e4 e5' }]),
  saveReview: () => saveReview('g1', { acpl: 20 }),
  deleteGame: () => deleteGame('g1'),
  clearLibrary: () => clearLibrary(),
  getGame: () => getGame('g1'),
  listGames: () => listGames(),
  libraryStats: () => libraryStats(),
  exportLibrary: () => exportLibrary(),
}

for (const [name, call] of Object.entries(CALLS)) {
  test(`${name}() rejects with a clean LibraryError (code "unsupported") rather than throwing a raw platform error`, async () => {
    await assert.rejects(call(), (err) => {
      assert.ok(err instanceof LibraryError, `${name} threw ${err?.constructor?.name}, not LibraryError`)
      assert.equal(err.code, 'unsupported')
      return true
    })
  })
}

test('addGames with an empty list still rejects on the same missing-storage guard rather than short-circuiting to a false success', async () => {
  // An empty input must not be treated as "nothing to do, report success" -
  // that would hide from the caller that storage is unavailable at all.
  await assert.rejects(addGames([]), (err) => {
    assert.ok(err instanceof LibraryError)
    return true
  })
})
