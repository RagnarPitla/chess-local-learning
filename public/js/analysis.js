/**
 * Game annotation maths. Pure logic - no DOM, no engine coupling, so it runs
 * under `node --test` as well as in the browser.
 *
 * The engine is injected as `analyse(fen) -> { cp, mate, best, lines }` where
 * `cp` is centipawns from the side-to-move point of view (raw UCI convention).
 *
 * Evaluation strategy: every position in the game is searched exactly once
 * (N+1 searches for N plies). The engine's evaluation of position i already
 * assumes best play, so the loss for the move played at ply i is simply
 * eval(i) - eval(i+1), both taken from the mover's point of view.
 */
import { Chess } from 'chess.js'

export const MOVE_CLASS = {
  best: 'best',
  good: 'good',
  inaccuracy: 'inaccuracy',
  mistake: 'mistake',
  blunder: 'blunder',
}

export const CLASS_ORDER = ['blunder', 'mistake', 'inaccuracy', 'good', 'best']

/** Evaluations beyond this are treated as "already decided" for loss maths. */
export const EVAL_CLAMP = 1200

export const THRESHOLDS = {
  blunder: 300,
  mistake: 150,
  inaccuracy: 60,
  good: 15,
}

export const TURNING_POINT_DEFAULTS = {
  savableWinPercent: 15,
  winningWinPercent: 50,
  catastrophicWinDrop: 20,
  slideMinWinDrop: 3,
  recoveryBreakWinPercent: 8,
}

/* --------------------------------------------------------------- scoring */

export function clampEval(cp) {
  return Math.max(-EVAL_CLAMP, Math.min(EVAL_CLAMP, cp))
}

/** Convert a raw engine score object to centipawns, mate folded in. */
export function foldScore({ cp, mate }) {
  if (mate !== null && mate !== undefined) return mate > 0 ? 10000 - mate * 10 : -10000 - mate * 10
  return cp ?? 0
}

/** Side-to-move score -> white point of view. */
export function toWhitePov(cp, sideToMove) {
  return sideToMove === 'w' ? cp : -cp
}

/** White point of view -> a given colour's point of view. */
export function toColourPov(cpWhite, colour) {
  return colour === 'w' ? cpWhite : -cpWhite
}

/** Lichess-style win probability (0-100) for a centipawn score. */
export function winPercent(cp) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}

/** Per-move accuracy (0-100) from the win-percentage drop. */
export function moveAccuracy(winBefore, winAfter) {
  const drop = Math.max(0, winBefore - winAfter)
  if (drop === 0) return 100
  const raw = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669
  return Math.max(0, Math.min(100, raw))
}

export function classifyLoss(loss, { winBefore, winAfter } = {}) {
  const winDrop = winBefore !== undefined && winAfter !== undefined ? winBefore - winAfter : null

  // A move that hands over more than a fifth of the win probability is a
  // blunder even when the raw centipawn delta looks tame (endgame conversions).
  if (loss >= THRESHOLDS.blunder || (winDrop !== null && winDrop >= 20)) return MOVE_CLASS.blunder
  if (loss >= THRESHOLDS.mistake || (winDrop !== null && winDrop >= 10)) return MOVE_CLASS.mistake
  if (loss >= THRESHOLDS.inaccuracy) return MOVE_CLASS.inaccuracy
  if (loss >= THRESHOLDS.good) return MOVE_CLASS.good
  return MOVE_CLASS.best
}

export function positionRecoverability(evalCp, options = {}) {
  const savableWinPercent = options.savableWinPercent ?? TURNING_POINT_DEFAULTS.savableWinPercent
  const cp = Number(evalCp)
  const win = Number.isFinite(cp) ? winPercent(cp) : null

  return {
    recoverable: win !== null && win >= savableWinPercent,
    winPercent: win,
    savableWinPercent,
  }
}

/* -------------------------------------------------------------- notation */

export function uciToSan(fen, uci) {
  if (!uci || uci.length < 4) return null
  try {
    const chess = new Chess(fen)
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    })
    return move ? move.san : null
  } catch {
    return null
  }
}

export function pvToSan(fen, pv, max = 6) {
  const out = []
  if (!pv || !pv.length) return out
  try {
    const chess = new Chess(fen)
    for (const uci of pv.slice(0, max)) {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      })
      if (!move) break
      out.push(move.san)
    }
  } catch {
    /* partial line is still useful */
  }
  return out
}

/** Expand a move list into every position the game passed through. */
export function buildTimeline(moves, startFen) {
  const chess = startFen ? new Chess(startFen) : new Chess()
  const timeline = [{ ply: 0, fen: chess.fen(), san: null, move: null, colour: chess.turn() }]
  for (const san of moves) {
    const before = chess.fen()
    const move = chess.move(san)
    if (!move) throw new Error(`illegal move "${san}" at ply ${timeline.length}`)
    timeline.push({
      ply: timeline.length,
      fen: chess.fen(),
      fenBefore: before,
      san: move.san,
      move,
      colour: move.color,
      moveNumber: Math.ceil(timeline.length / 2),
    })
  }
  return timeline
}

export function phaseOf(fen) {
  const board = fen.split(' ')[0]
  const pieces = board.replace(/[^a-zA-Z]/g, '')
  const majors = (board.match(/[qQ]/g) || []).length
  const total = pieces.length
  if (total >= 28 && countMoves(fen) <= 24) return 'opening'
  if (total <= 14 || (majors === 0 && total <= 18)) return 'endgame'
  return 'middlegame'
}

function countMoves(fen) {
  const n = Number(fen.split(' ')[5])
  return Number.isFinite(n) ? n * 2 : 0
}

/* ------------------------------------------------------------- annotation */

/**
 * Annotate a full game.
 *
 * @param {object}   opts
 * @param {string[]} opts.moves        SAN move list
 * @param {string}   [opts.startFen]
 * @param {'w'|'b'}  opts.playerColour
 * @param {Function} opts.analyse      async (fen) => { cp, mate, best, lines }
 * @param {Function} [opts.onProgress] (done, total) => void
 */
export async function annotateGame({ moves, startFen, playerColour = 'w', analyse, onProgress }) {
  const timeline = buildTimeline(moves, startFen)
  const evals = new Array(timeline.length).fill(null)

  for (let i = 0; i < timeline.length; i++) {
    const node = timeline[i]
    const chess = new Chess(node.fen)
    if (chess.isGameOver()) {
      // Terminal node: score it from the result, not the engine.
      const stm = chess.turn()
      const cpWhite = chess.isCheckmate() ? (stm === 'w' ? -10000 : 10000) : 0
      evals[i] = { cpWhite, mate: null, best: null, bestSan: null, pvSan: [], terminal: true }
    } else {
      const raw = await analyse(node.fen)
      const stm = node.fen.split(' ')[1]
      const cpWhite = toWhitePov(foldScore(raw), stm)
      evals[i] = {
        cpWhite,
        mate: raw.mate ?? null,
        best: raw.best ?? null,
        bestSan: raw.best ? uciToSan(node.fen, raw.best) : null,
        pvSan: pvToSan(node.fen, raw.lines?.[0]?.pv || (raw.best ? [raw.best] : [])),
        secondBestCp: raw.lines?.[1] ? toWhitePov(foldScore(raw.lines[1]), stm) : null,
      }
    }
    if (onProgress) onProgress(i + 1, timeline.length)
  }

  const annotated = []
  for (let ply = 1; ply < timeline.length; ply++) {
    const node = timeline[ply]
    const before = evals[ply - 1]
    const after = evals[ply]
    const mover = node.colour

    const evalBefore = toColourPov(clampEval(before.cpWhite), mover)
    const evalAfter = toColourPov(clampEval(after.cpWhite), mover)
    const loss = Math.max(0, evalBefore - evalAfter)

    const winBefore = winPercent(evalBefore)
    const winAfter = winPercent(evalAfter)

    const playedBest = before.best
      ? node.move.from + node.move.to + (node.move.promotion || '') === before.best
      : false

    annotated.push({
      ply,
      moveNumber: node.moveNumber,
      colour: mover,
      san: node.san,
      uci: node.move.from + node.move.to + (node.move.promotion || ''),
      fenBefore: node.fenBefore,
      fenAfter: node.fen,
      evalBefore: Math.round(evalBefore),
      evalAfter: Math.round(evalAfter),
      evalBeforeWhite: Math.round(before.cpWhite),
      evalAfterWhite: Math.round(after.cpWhite),
      loss: Math.round(loss),
      accuracy: Number(moveAccuracy(winBefore, winAfter).toFixed(1)),
      classification: playedBest ? MOVE_CLASS.best : classifyLoss(loss, { winBefore, winAfter }),
      bestMove: before.best,
      bestSan: before.bestSan,
      bestLine: before.pvSan,
      onlyMove: before.secondBestCp !== null && before.secondBestCp !== undefined
        ? Math.abs(toColourPov(clampEval(before.cpWhite), mover) - toColourPov(clampEval(before.secondBestCp), mover)) >= 150
        : false,
      phase: phaseOf(node.fenBefore),
      threwAwayWin: evalBefore >= 200 && evalAfter <= 0,
      lostToLosing: evalBefore > -200 && evalAfter <= -200,
      isPlayer: mover === playerColour,
    })
  }

  const mine = annotated.filter((m) => m.isPlayer)
  const theirs = annotated.filter((m) => !m.isPlayer)

  return {
    moves: annotated,
    timeline,
    playerColour,
    summary: {
      acpl: average(mine.map((m) => m.loss)),
      opponentAcpl: average(theirs.map((m) => m.loss)),
      accuracy: Number(average(mine.map((m) => m.accuracy)).toFixed(1)),
      counts: countBy(mine),
      opponentCounts: countBy(theirs),
      plies: annotated.length,
    },
  }
}

function countBy(list) {
  const counts = { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }
  for (const m of list) counts[m.classification] = (counts[m.classification] || 0) + 1
  return counts
}

function average(nums) {
  if (!nums.length) return 0
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

/** The N costliest player mistakes, worst first. */
export function topMistakes(annotation, n = 3) {
  return annotation.moves
    .filter((m) => m.isPlayer && (m.classification === 'blunder' || m.classification === 'mistake' || m.classification === 'inaccuracy'))
    .sort((a, b) => b.loss - a.loss)
    .slice(0, n)
}

export function findTurningPoint(annotation, options = {}) {
  const opts = { ...TURNING_POINT_DEFAULTS, ...options }
  if (!annotation || !Array.isArray(annotation.moves)) {
    return emptyTurningPoint('invalid', opts, 'No annotated move list was provided.')
  }

  const playerColour = annotation.playerColour || inferPlayerColour(annotation.moves)
  if (!playerColour) {
    return emptyTurningPoint('no-player-moves', opts, 'No student moves were found in the annotation.')
  }

  const playerMoves = annotation.moves
    .filter((move) => move && move.isPlayer)
    .map((move) => describePlayerMove(move, playerColour, opts))
    .filter(Boolean)

  if (!playerMoves.length) {
    return emptyTurningPoint('no-player-moves', opts, 'No student moves were found in the annotation.')
  }

  const finalMove = playerMoves.at(-1)
  const peakWinPercent = Math.max(...playerMoves.flatMap((move) => [move.winBefore, move.winAfter]))
  const wasNeverWinning = peakWinPercent < opts.winningWinPercent

  if (finalMove.winAfter >= opts.savableWinPercent) {
    return {
      ...emptyTurningPoint('not-lost', opts, 'The final evaluated position is still savable, so there is no point of no return to highlight.'),
      context: buildTurningContext(playerColour, finalMove.winAfter, peakWinPercent, wasNeverWinning, playerMoves.length),
    }
  }

  const crossings = playerMoves.filter((move) => move.winBefore >= opts.savableWinPercent && move.winAfter < opts.savableWinPercent)
  if (!crossings.length) {
    return {
      ...emptyTurningPoint('never-savable', opts, 'The student never had a savable position in the analysed move list.'),
      context: buildTurningContext(playerColour, finalMove.winAfter, peakWinPercent, wasNeverWinning, playerMoves.length),
    }
  }

  const crossing = crossings.at(-1)
  const kind = crossing.winDrop >= opts.catastrophicWinDrop || crossing.classification === MOVE_CLASS.blunder
    ? 'single-blunder'
    : 'slow-decline'
  const start = kind === 'single-blunder' ? crossing : findSlideStart(playerMoves, crossing, opts)
  const slideMoves = playerMoves
    .filter((move) => move.ply >= start.ply && move.ply <= crossing.ply)
    .map((move) => ({
      ply: move.ply,
      san: move.san,
      winBefore: roundWin(move.winBefore),
      winAfter: roundWin(move.winAfter),
      winDrop: roundWin(move.winDrop),
      classification: move.classification,
    }))

  return {
    status: 'found',
    kind,
    ply: start.ply,
    moveNumber: start.moveNumber ?? null,
    playedMove: {
      san: start.san ?? null,
      uci: start.uci ?? null,
      colour: start.colour ?? playerColour,
    },
    bestMove: start.bestMove ?? null,
    bestSan: start.bestSan ?? null,
    bestLine: Array.isArray(start.bestLine) ? start.bestLine : [],
    retryFen: start.fenBefore ?? null,
    highlightPly: start.ply,
    winBefore: roundWin(start.winBefore),
    winAfter: roundWin(start.winAfter),
    winDrop: roundWin(start.winDrop),
    classification: start.classification ?? null,
    explanation: explainTurningPoint(kind, start, crossing, opts),
    boundary: { savableWinPercent: opts.savableWinPercent },
    slide: {
      startPly: start.ply,
      endPly: crossing.ply,
      moves: slideMoves,
    },
    context: buildTurningContext(playerColour, finalMove.winAfter, peakWinPercent, wasNeverWinning, playerMoves.length),
  }
}

function inferPlayerColour(moves) {
  const playerMove = moves.find((move) => move && move.isPlayer && (move.colour === 'w' || move.colour === 'b'))
  return playerMove?.colour ?? null
}

function emptyTurningPoint(status, opts, explanation) {
  return {
    status,
    kind: null,
    ply: null,
    moveNumber: null,
    playedMove: null,
    bestMove: null,
    bestSan: null,
    bestLine: [],
    retryFen: null,
    highlightPly: null,
    winBefore: null,
    winAfter: null,
    winDrop: null,
    classification: null,
    explanation,
    boundary: { savableWinPercent: opts.savableWinPercent },
    slide: null,
    context: null,
  }
}

function describePlayerMove(move, playerColour, opts) {
  const evalBefore = evalForPlayer(move, 'Before', playerColour)
  const evalAfter = evalForPlayer(move, 'After', playerColour)
  if (!Number.isFinite(evalBefore) || !Number.isFinite(evalAfter)) return null

  const winBefore = positionRecoverability(evalBefore, opts).winPercent
  const winAfter = positionRecoverability(evalAfter, opts).winPercent
  return {
    ...move,
    winBefore,
    winAfter,
    winDrop: Math.max(0, winBefore - winAfter),
  }
}

function evalForPlayer(move, suffix, playerColour) {
  const whiteValue = Number(move[`eval${suffix}White`])
  if (Number.isFinite(whiteValue)) return toColourPov(whiteValue, playerColour)

  const moverValue = Number(move[`eval${suffix}`])
  if (!Number.isFinite(moverValue)) return null
  return move.colour === playerColour ? moverValue : -moverValue
}

function findSlideStart(playerMoves, crossing, opts) {
  let start = crossing
  const crossingIndex = playerMoves.findIndex((move) => move.ply === crossing.ply)
  for (let i = crossingIndex - 1; i >= 0; i--) {
    const previous = playerMoves[i]
    const next = playerMoves[i + 1]
    const meaningfulDrop = previous.winDrop >= opts.slideMinWinDrop ||
      [MOVE_CLASS.inaccuracy, MOVE_CLASS.mistake, MOVE_CLASS.blunder].includes(previous.classification)
    const recovered = next.winBefore - previous.winAfter > opts.recoveryBreakWinPercent
    if (!meaningfulDrop || recovered) break
    start = previous
  }
  return start
}

function explainTurningPoint(kind, start, crossing, opts) {
  if (kind === 'single-blunder') {
    return `The game was still savable before ${start.san || `ply ${start.ply}`}, then that move dropped the student's win chance below ${opts.savableWinPercent}%. Retry from the position before it.`
  }
  return `The loss was a gradual slide: the final decline started with ${start.san || `ply ${start.ply}`} and crossed below ${opts.savableWinPercent}% by ${crossing.san || `ply ${crossing.ply}`}. Retry from the start of that slide.`
}

function buildTurningContext(playerColour, finalWinPercent, peakWinPercent, wasNeverWinning, playerMoveCount) {
  return {
    playerColour,
    finalWinPercent: roundWin(finalWinPercent),
    peakWinPercent: roundWin(peakWinPercent),
    wasNeverWinning,
    playerMoveCount,
  }
}

function roundWin(value) {
  return Number.isFinite(value) ? Number(value.toFixed(1)) : null
}
