/**
 * Coverage for import.js: parsing real, messy PGNs and the fetch-adjacent
 * helpers around them. The guiding rule from the product brief is that one
 * bad game in a big export must never corrupt or half-import - it either
 * parses correctly, or it is recorded as a clean per-game error, never a
 * thrown exception and never a partial game silently added to the library.
 *
 *   node --test scripts/
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  parsePgnDatabase,
  detectPlayerColour,
  importSummary,
} from '../public/js/import.js'

/* ------------------------------------------------------- realistic PGNs */

const COMMENTED_WITH_VARIATION = `[Event "Rated Blitz game"]
[Site "https://lichess.org/abc12345"]
[Date "2024.01.15"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[WhiteElo "1850"]
[BlackElo "1790"]
[ECO "C50"]
[Opening "Italian Game"]
[TimeControl "300+3"]

1. e4 $1 {A fine opening move.} e5 2. Nf3 (2. Bc4 {Also playable.} Nc6 3. Qh5 {a trap} g6) Nc6
3. Bc4 Bc5 {The Italian.} 4. c3 Nf6 5. d3 d6 6. O-O O-O 1-0
`

const NO_MOVES_ABORTED = `[Event "Aborted game"]
[Site "?"]
[Date "2024.02.01"]
[White "Carol"]
[Black "Dave"]
[Result "*"]

*
`

const TRUNCATED_UNTERMINATED_COMMENT = `[Event "Truncated game"]
[Site "?"]
[Date "2024.02.02"]
[White "Erin"]
[Black "Frank"]
[Result "*"]

1. e4 e5 2. Nf3 {this comment never closes Nc6 3. Bb5 a6
`

function pgnOf(event, white, black, result, moves) {
  return `[Event "${event}"]\n[Site "?"]\n[Date "2024.01.01"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${result}"]\n\n${moves} ${result}\n`
}

/* --------------------------------------------------- comments/NAGs/RAV */

test('a PGN with comments, a $-NAG and a parenthesised variation parses to the mainline only', () => {
  const { games, errors } = parsePgnDatabase(COMMENTED_WITH_VARIATION)
  assert.equal(errors.length, 0)
  assert.equal(games.length, 1)
  // The mainline is 12 plies; the variation's Bc4/Nc6/Qh5/g6 branch must NOT
  // leak into the recorded move list - that would misrepresent what was
  // actually played and break replay/review.
  assert.deepEqual(games[0].moves, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O'])
  assert.equal(games[0].result, '1-0')
  assert.equal(games[0].eco, 'C50')
  assert.equal(games[0].opening, 'Italian Game')
  assert.equal(games[0].whiteElo, 1850)
  assert.equal(games[0].blackElo, 1790)
})

/* --------------------------------------------------------- no moves */

test('a game with no moves at all (aborted before move one) parses cleanly with an empty move list', () => {
  const { games, errors } = parsePgnDatabase(NO_MOVES_ABORTED)
  assert.equal(errors.length, 0, 'an aborted game is valid PGN, not an error')
  assert.equal(games.length, 1)
  assert.deepEqual(games[0].moves, [])
  assert.equal(games[0].result, '*')
})

/* ------------------------------------------------------------ truncated */

test('a truncated game with an unterminated comment fails cleanly instead of producing a half-game', () => {
  const { games, errors } = parsePgnDatabase(TRUNCATED_UNTERMINATED_COMMENT)
  assert.equal(games.length, 0, 'a broken game must never be added to the games array')
  assert.equal(errors.length, 1)
  assert.equal(errors[0].index, 0)
  assert.match(errors[0].message, /Erin vs Frank/, 'the error should name the game so the user can find it')
  assert.ok(errors[0].message.length > 0)
})

test('parsePgnDatabase never throws on a truncated or malformed game - it always returns, never rejects the caller', () => {
  assert.doesNotThrow(() => parsePgnDatabase(TRUNCATED_UNTERMINATED_COMMENT))
  assert.doesNotThrow(() => parsePgnDatabase('[Event "Half a header'))
  assert.doesNotThrow(() => parsePgnDatabase(''))
  assert.doesNotThrow(() => parsePgnDatabase('not a pgn at all, just prose'))
})

/* --------------------------------------------------- mixed good and bad */

test('one bad game in a multi-game database does not abort the games around it', () => {
  const good1 = pgnOf('Game One', 'Alice', 'Bob', '1-0', '1. e4 e5 2. Nf3 Nc6')
  const good2 = pgnOf('Game Two', 'Erin', 'Frank', '0-1', '1. d4 d5 2. c4 e6')
  const bad = TRUNCATED_UNTERMINATED_COMMENT
  const { games, errors } = parsePgnDatabase([good1, bad, good2].join('\n\n'))

  assert.equal(games.length, 2, 'both good games must still come through')
  assert.equal(errors.length, 1)
  assert.deepEqual(games.map((g) => g.white), ['Alice', 'Erin'])
  // The error must carry the ORIGINAL position in the file (index 1, the
  // middle game), not be renumbered around the games that succeeded - a
  // caller matching errors back to source text by index would otherwise
  // point at the wrong game.
  assert.equal(errors[0].index, 1)
})

test('importSummary reports both the successes and the skipped count for a mixed import', () => {
  const good1 = pgnOf('Game One', 'Alice', 'Bob', '1-0', '1. e4 e5')
  const result = parsePgnDatabase([good1, TRUNCATED_UNTERMINATED_COMMENT].join('\n\n'))
  const text = importSummary({ ...result, source: 'file' })
  assert.match(text, /Imported 1 game/)
  assert.match(text, /1 game could not be read/)
})

/* --------------------------------------------------------- mid-stream cutoff */

test('a file cut off mid-header partway through the second game keeps the first game and cleanly errors the second', () => {
  const good1 = pgnOf('Game One', 'Alice', 'Bob', '1-0', '1. e4 e5 2. Nf3 Nc6')
  const choppedSecondGame = '\n\n[Event "Game Two"]\n[Site "?"]\n[White "Erin"]\n[Black "Fra'
  const { games, errors } = parsePgnDatabase(good1 + choppedSecondGame)
  assert.equal(games.length, 1)
  assert.equal(games[0].white, 'Alice')
  assert.equal(errors.length, 1)
  assert.equal(errors[0].index, 1)
})

/* --------------------------------------------------------- unicode headers */

test('header values with accented / non-ASCII names parse correctly', () => {
  // Escape sequences keep this SOURCE FILE pure ASCII while still producing
  // real Unicode player names at runtime, exactly like a PGN downloaded
  // from a real international tournament would contain.
  const pgn =
    '[Event "Torneo de Ma\u00f1ana"]\n[Site "?"]\n[Date "2024.01.04"]\n' +
    '[White "Jos\u00e9 P\u00e9rez"]\n[Black "M\u00fcller"]\n[Result "1/2-1/2"]\n\n1. e4 e5 1/2-1/2\n'
  const { games, errors } = parsePgnDatabase(pgn)
  assert.equal(errors.length, 0)
  assert.equal(games.length, 1)
  assert.equal(games[0].white, 'Jos\u00e9 P\u00e9rez')
  assert.equal(games[0].black, 'M\u00fcller')
})

/* ------------------------------------------------- KNOWN BUG: escaped quotes */

test('BUG: a header value with a backslash-escaped quote fails instead of parsing, but fails CLEANLY (never a half-game)', () => {
  // PGN's tag-pair grammar allows a quoted string to contain an escaped
  // quote, e.g. [Event "Say \"Hi\" Open"]. chess.js 1.4.0's loadPgn cannot
  // parse this and throws, so the whole (otherwise perfectly valid) game is
  // dropped into errors[] instead of being imported. This is a real,
  // reproducible limitation of the chess.js dependency, not of import.js -
  // import.js's own regex-based quickHeaders() unescapes this correctly,
  // and the try/catch around chess.loadPgn keeps the failure clean (no
  // thrown exception reaches the caller, no half-parsed game is added).
  // Filed as a discovered issue rather than "fixed" here: import.js is not
  // in this agent's ownership, and the task requires either a correct
  // parse OR a clean failure - never a silent half-game - which this is.
  const pgn = '[Event "Say \\"Hi\\" Open"]\n[Site "?"]\n[Date "2024.01.05"]\n' +
    '[White "Grace"]\n[Black "Heidi"]\n[Result "*"]\n\n1. e4 e5 *\n'
  const { games, errors } = parsePgnDatabase(pgn)
  const parsedCorrectly = games.length === 1 && games[0].white === 'Grace' && games[0].black === 'Heidi'
  const failedCleanly = games.length === 0 && errors.length === 1 && typeof errors[0].message === 'string' && errors[0].message.length > 0
  assert.ok(
    parsedCorrectly || failedCleanly,
    'a valid PGN game must either import correctly or fail cleanly - it must never silently vanish or half-import',
  )
  // Today's actual, reproducible behaviour - if this flips to parsedCorrectly
  // once chess.js is upgraded, that is progress; if it starts throwing past
  // parsePgnDatabase's own try/catch, that would be a real regression.
  assert.equal(failedCleanly, true, 'expected the CURRENT known chess.js limitation: clean failure, not a successful parse')
})

/* ---------------------------------------------------------- maxGames */

test('maxGames truncates the database and reports truncated:true', () => {
  const many = Array.from({ length: 5 }, (_, i) => pgnOf(`Game ${i}`, 'Alice', 'Bob', '1-0', '1. e4 e5')).join('\n\n')
  const full = parsePgnDatabase(many)
  assert.equal(full.games.length, 5)
  assert.equal(full.truncated, false)

  const limited = parsePgnDatabase(many, { maxGames: 3 })
  assert.equal(limited.games.length, 3)
  assert.equal(limited.truncated, true)
})

/* ---------------------------------------------------------- field extraction */

test('date, result and elo fields normalise sensibly, including partial/garbage values', () => {
  const pgn =
    '[Event "Meta Game"]\n[Site "https://www.chess.com/game/live/12345"]\n[Date "2024.03.??"]\n' +
    '[White "Ivan"]\n[Black "Judy"]\n[Result "1-0"]\n[WhiteElo "2001"]\n[BlackElo "not-a-number"]\n' +
    '[ECO "B90"]\n[Opening "Najdorf"]\n\n1. e4 c5 2. Nf3 d6 1-0\n'
  const { games } = parsePgnDatabase(pgn)
  assert.equal(games.length, 1)
  const g = games[0]
  assert.equal(g.date, '2024-03-01', 'an unknown day (??) must fall back to day 1, not crash or become null')
  assert.equal(g.whiteElo, 2001)
  assert.equal(g.blackElo, null, 'a non-numeric Elo must normalise to null, not NaN or a string')
  assert.equal(g.eco, 'B90')
  assert.equal(g.opening, 'Najdorf')
  assert.equal(g.url, 'https://www.chess.com/game/live/12345')
  assert.equal(g.source, 'chesscom')
})

test('an invalid Result header normalises to the open-result marker rather than being kept verbatim', () => {
  // The header says something nonsensical, but the movetext still ends on
  // a real, valid termination marker (*) so this isolates "garbage Result
  // header" from "garbage movetext" - only the header field is under test.
  const pgn = '[Event "Game"]\n[Site "?"]\n[Date "2024.01.01"]\n[White "Alice"]\n[Black "Bob"]\n' +
    '[Result "banana"]\n\n1. e4 e5 *\n'
  const { games, errors } = parsePgnDatabase(pgn)
  assert.equal(errors.length, 0)
  assert.equal(games.length, 1)
  assert.equal(games[0].result, '*')
})

/* -------------------------------------------------------------- dedup id */

test('makeGameId is deterministic: parsing the same PGN twice yields the same id', () => {
  const pgn = pgnOf('Repeatable Game', 'Alice', 'Bob', '1-0', '1. e4 e5 2. Nf3 Nc6')
  const a = parsePgnDatabase(pgn)
  const b = parsePgnDatabase(pgn)
  assert.equal(a.games[0].id, b.games[0].id)
  assert.match(a.games[0].id, /^g_[0-9a-f]{16}$/)
})

test('two different games never collide on id', () => {
  const a = parsePgnDatabase(pgnOf('Game A', 'Alice', 'Bob', '1-0', '1. e4 e5'))
  const b = parsePgnDatabase(pgnOf('Game B', 'Carol', 'Dave', '0-1', '1. d4 d5'))
  assert.notEqual(a.games[0].id, b.games[0].id)
})

/* ---------------------------------------------------------- colour/summary */

test('detectPlayerColour matches case-insensitively and returns null for a non-participant or missing game', () => {
  const game = { white: 'Alice', black: 'Bob' }
  assert.equal(detectPlayerColour(game, 'ALICE'), 'w')
  assert.equal(detectPlayerColour(game, 'bob'), 'b')
  assert.equal(detectPlayerColour(game, 'Zed'), null)
  assert.equal(detectPlayerColour(null, 'Alice'), null)
  assert.equal(detectPlayerColour(game, ''), null)
})

test('importSummary describes a clean import with no errors and no truncation', () => {
  const text = importSummary({ games: [{}, {}], errors: [], truncated: false, source: 'lichess', username: 'nakamura' })
  assert.match(text, /Imported 2 games from Lichess \(nakamura\)/)
  assert.doesNotMatch(text, /could not be read/)
  assert.doesNotMatch(text, /Stopped early/)
})

test('importSummary flags truncation distinctly from parse errors', () => {
  const text = importSummary({ games: [{}], errors: [{ index: 0, message: 'x' }], truncated: true, source: 'file' })
  assert.match(text, /1 game could not be read/)
  assert.match(text, /Stopped early/)
})
