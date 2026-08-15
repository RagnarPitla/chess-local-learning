/**
 * Puzzles built from the student's own blunders.
 *
 * A generic puzzle set teaches generic patterns. A puzzle taken from the exact
 * position where you went wrong forces you to re-solve your own mistake, which
 * is the whole point of the loop.
 */
import { Chess } from 'chess.js'
import { PATTERN_LIBRARY } from './patterns.js'

const PROMPTS = {
  'hanging-piece': 'Something of yours is loose here. Find the move that keeps everything defended.',
  'missed-material': 'There is material to be won. Find it.',
  'missed-fork': 'A double attack is available. Find it.',
  'missed-pin': 'Two enemy pieces share a line. Exploit it.',
  'allowed-fork': 'Your last move allowed a fork. Find the move that prevents it.',
  'allowed-pin': 'Avoid the pin. Find the healthier move.',
  'back-rank': 'Your back rank is the issue. Find the move that deals with it.',
  'king-safety': 'Your king is the problem. Find the move that fixes it.',
  'overloaded-defender': 'One of your pieces is doing two jobs. Find the move that relieves it.',
  'trapped-piece': 'One of your pieces is running out of squares. Rescue it.',
  'threw-away-win': 'You were winning here. Find the cleanest way to keep it.',
  'endgame-technique': 'Endgame precision. Find the most accurate move.',
  'panic-out-of-book': 'Theory has ended. Find the move that follows the principles.',
  default: 'Find the strongest move.',
}

/**
 * Turn reviewed mistakes into puzzles.
 *
 * Every review should hand back something to practise. Moves losing `minLoss`
 * or more are always included; if a game was clean enough that none qualify,
 * the worst moves above `floorLoss` are used instead so the drill queue is
 * never empty after a review.
 *
 * @param {object}   opts
 * @param {Array}    opts.moves        annotated + tagged moves
 * @param {'w'|'b'}  opts.playerColour
 * @param {string}   opts.gameId
 * @param {number}   [opts.limit]
 * @param {number}   [opts.minLoss]    threshold for a clear mistake
 * @param {number}   [opts.floorLoss]  lowest loss worth drilling at all
 */
export function puzzlesFromGame({ moves, playerColour, gameId, limit = 5, minLoss = 100, floorLoss = 40 }) {
  const playable = moves
    .filter((m) => m.isPlayer && m.bestMove && m.bestSan && m.san !== m.bestSan)
    .sort((a, b) => b.loss - a.loss)

  let candidates = playable.filter((m) => m.loss >= minLoss)
  if (!candidates.length) candidates = playable.filter((m) => m.loss >= floorLoss).slice(0, 3)

  const puzzles = []
  const seen = new Set()
  for (const move of candidates) {
    if (puzzles.length >= limit) break
    if (seen.has(move.fenBefore)) continue
    seen.add(move.fenBefore)

    const tags = (move.tags || []).map((t) => t.id)
    const primary = tags[0] || null
    puzzles.push({
      id: `${gameId}:${move.ply}`,
      gameId,
      fen: move.fenBefore,
      sideToMove: playerColour,
      solution: { uci: move.bestMove, san: move.bestSan, line: move.bestLine || [] },
      played: { uci: move.uci, san: move.san },
      tags,
      primaryTag: primary,
      strict: Boolean(move.onlyMove) || move.loss >= 250,
      loss: move.loss,
      evalBefore: move.evalBefore,
      evalAfter: move.evalAfter,
      phase: move.phase,
      prompt: PROMPTS[primary] || PROMPTS.default,
      source: { moveNumber: move.moveNumber, colour: move.colour, playedSan: move.san },
      createdAt: new Date().toISOString(),
    })
  }
  return puzzles
}

/**
 * Order a puzzle pool by what the student most needs right now: due drills
 * first, then their heaviest weaknesses, then raw cost.
 */
export function buildQueue({ pool, weaknesses = [], due = [], limit = 5 }) {
  const weight = new Map()
  weaknesses.forEach((w, i) => weight.set(w.id, (weaknesses.length - i) * 2))
  due.forEach((d) => weight.set(d.id, (weight.get(d.id) || 0) + 5))

  return [...pool]
    .map((p) => {
      const tagScore = (p.tags || []).reduce((sum, t) => sum + (weight.get(t) || 0), 0)
      return { ...p, priority: tagScore * 100 + p.loss }
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
}

/**
 * Grade an attempt. `answerEvalCp` (optional, from the engine, in the solver's
 * point of view) lets a different-but-equally-good move count as correct.
 */
export function gradeAnswer(puzzle, uci, { answerEvalCp = null, bestEvalCp = null, tolerance = 40 } = {}) {
  if (!uci) return { correct: false, verdict: 'no-answer', message: 'No move played.' }

  const chess = new Chess(puzzle.fen)
  let san = null
  try {
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    san = move?.san ?? null
  } catch {
    return { correct: false, verdict: 'illegal', message: 'That move is not legal here.' }
  }

  if (uci === puzzle.solution.uci) {
    return { correct: true, verdict: 'best', san, message: `${san} is the move.` }
  }

  if (answerEvalCp !== null && bestEvalCp !== null) {
    const drop = bestEvalCp - answerEvalCp
    if (drop <= tolerance) {
      return {
        correct: true,
        verdict: 'equivalent',
        san,
        message: `${san} is just as good as ${puzzle.solution.san} (within ${Math.round(drop)} centipawns).`,
      }
    }
    return {
      correct: false,
      verdict: 'worse',
      san,
      drop: Math.round(drop),
      message: `${san} gives up ${(drop / 100).toFixed(1)} pawns compared with ${puzzle.solution.san}.`,
    }
  }

  return {
    correct: false,
    verdict: 'different',
    san,
    message: `The engine prefers ${puzzle.solution.san}.`,
  }
}

/** Human-readable framing for a puzzle card. */
export function puzzleContext(puzzle) {
  const meta = puzzle.primaryTag ? PATTERN_LIBRARY[puzzle.primaryTag] : null
  return {
    heading: meta ? meta.label : 'Critical moment',
    prompt: puzzle.prompt,
    why: meta?.why ?? null,
    drill: meta?.drill ?? null,
    origin: `From your game, move ${puzzle.source.moveNumber}: you played ${puzzle.played.san} and it cost ${(puzzle.loss / 100).toFixed(1)} pawns.`,
  }
}

/**
 * Optional extra practice from the public Lichess puzzle API, filtered by the
 * theme that matches a weakness. Fails soft when offline.
 */
const THEME_MAP = {
  'hanging-piece': 'hangingPiece',
  'missed-fork': 'fork',
  'allowed-fork': 'fork',
  'missed-pin': 'pin',
  'allowed-pin': 'pin',
  'back-rank': 'backRankMate',
  'missed-material': 'advantage',
  'endgame-technique': 'endgame',
  'king-safety': 'kingsideAttack',
  'overloaded-defender': 'deflection',
  'trapped-piece': 'trappedPiece',
}

export async function fetchLichessPuzzle(patternId, { signal } = {}) {
  const theme = THEME_MAP[patternId]
  if (!theme) return null
  try {
    const r = await fetch(`https://lichess.org/api/puzzle/next?angle=${encodeURIComponent(theme)}`, {
      headers: { accept: 'application/json' },
      signal,
    })
    if (!r.ok) return null
    const data = await r.json()
    if (!data?.game?.pgn || !data?.puzzle?.solution) return null

    // Lichess gives the game PGN plus the ply where the puzzle starts.
    const chess = new Chess()
    const sans = data.game.pgn.split(' ')
    const initialPly = data.puzzle.initialPly
    for (let i = 0; i <= initialPly && i < sans.length; i++) chess.move(sans[i])

    return {
      id: `lichess:${data.puzzle.id}`,
      external: true,
      fen: chess.fen(),
      sideToMove: chess.turn(),
      solution: { uci: data.puzzle.solution[0], san: null, line: data.puzzle.solution },
      tags: [patternId],
      primaryTag: patternId,
      strict: true,
      loss: 0,
      rating: data.puzzle.rating,
      prompt: PROMPTS[patternId] || PROMPTS.default,
      source: { moveNumber: Math.ceil((initialPly + 1) / 2), lichessId: data.puzzle.id },
      played: { uci: null, san: null },
    }
  } catch {
    return null
  }
}
