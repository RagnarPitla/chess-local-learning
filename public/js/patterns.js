/**
 * Pattern detection: turns "you lost 340 centipawns" into "you left a knight
 * hanging because your queen was overloaded".
 *
 * Everything here is pure board logic on top of chess.js so it can be unit
 * tested in Node. No engine, no DOM, no network.
 */
import { Chess } from 'chess.js'

export const PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 }
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

/**
 * Every pattern the trainer can recognise, with the coaching metadata used by
 * the weakness profile and the lesson generator.
 */
export const PATTERN_LIBRARY = {
  'hanging-piece': {
    label: 'Left a piece hanging',
    why: 'A piece was attacked more times than it was defended, so it could simply be taken.',
    drill: 'Before every move, list every one of your pieces the opponent attacks and count defenders.',
  },
  'missed-material': {
    label: 'Missed free material',
    why: 'A capture or double attack was available that wins material by force.',
    drill: 'Scan all checks, captures and threats for both sides before choosing a move.',
  },
  'allowed-fork': {
    label: 'Allowed a fork',
    why: 'The move let an enemy piece attack two valuable targets at once.',
    drill: 'After picking a move, ask: does this put two of my pieces on the same knight or queen geometry?',
  },
  'missed-fork': {
    label: 'Missed a fork',
    why: 'A double attack was available that wins material.',
    drill: 'Look for enemy pieces sharing a knight jump, a rank, a file or a diagonal.',
  },
  'allowed-pin': {
    label: 'Allowed a pin or skewer',
    why: 'A piece ended up on a line with a more valuable piece behind it.',
    drill: 'Avoid lining your king and queen up with enemy sliders on open lines.',
  },
  'missed-pin': {
    label: 'Missed a pin or skewer',
    why: 'The opponent had two pieces on one line and the pinning move was available.',
    drill: 'Check every open file, rank and diagonal your rooks and bishops can reach.',
  },
  'back-rank': {
    label: 'Back rank weakness',
    why: 'The king had no escape square, making back rank tactics available.',
    drill: 'Make luft with a rook pawn once the queens and rooks are still on.',
  },
  'king-safety': {
    label: 'King safety neglected',
    why: 'The king was left exposed: shield pawns gone, an open file pointing at it, or still in the centre.',
    drill: 'Count the attackers near your king before starting play on the other wing.',
  },
  'uncastled': {
    label: 'King left in the centre',
    why: 'Castling was delayed while the position opened up.',
    drill: 'In open positions, castle by move 10 unless there is a concrete reason not to.',
  },
  'overloaded-defender': {
    label: 'Overloaded defender',
    why: 'One piece was the only defender of two things at once, so it could not do both jobs.',
    drill: 'Mark every piece that defends more than one thing and treat it as a target.',
  },
  'trapped-piece': {
    label: 'Piece with no squares',
    why: 'A piece had almost no safe squares and could be hunted down.',
    drill: 'Before advancing a piece, count its retreat squares.',
  },
  'bad-bishop': {
    label: 'Bad bishop',
    why: 'Your own pawns sat on the same colour as your bishop, so it had nothing to bite on.',
    drill: 'Put pawns on the opposite colour to your remaining bishop, or trade the bishop off.',
  },
  iqp: {
    label: 'Isolated queen pawn play',
    why: 'The isolated d-pawn gives activity and outposts but becomes a long-term target once pieces come off.',
    drill: 'With an IQP, keep pieces on and play for d4-d5 or attack. Against it, trade pieces and blockade.',
  },
  'doubled-pawns': {
    label: 'Doubled pawns mishandled',
    why: 'Doubled pawns cannot defend each other and create a hole on the file next to them.',
    drill: 'Only accept doubled pawns when you get the half-open file or bishop pair in return.',
  },
  'isolated-pawn': {
    label: 'Isolated pawn created',
    why: 'A pawn with no friendly pawns on adjacent files must be defended by pieces forever.',
    drill: 'Before a capture, ask what it does to your pawn islands.',
  },
  'passed-pawn': {
    label: 'Passed pawn handling',
    why: 'Passed pawns decide endgames. Blockade the opponent, push your own.',
    drill: 'In endgames, identify every passed pawn for both sides before choosing a plan.',
  },
  'undeveloped': {
    label: 'Pieces left undeveloped',
    why: 'Minor pieces stayed on the back rank while the game opened up.',
    drill: 'Develop every minor piece before moving a piece twice in the opening.',
  },
  'moved-piece-twice': {
    label: 'Moved the same piece twice',
    why: 'Spending tempi on one piece in the opening leaves the rest of the army at home.',
    drill: 'In the first ten moves, only move a piece twice to win material or stop a real threat.',
  },
  'early-queen': {
    label: 'Queen out too early',
    why: 'The queen gets chased by developing moves, so the opponent develops with tempo.',
    drill: 'Bring the queen out after the minor pieces, not before.',
  },
  'centre-neglect': {
    label: 'Centre conceded',
    why: 'The opponent was allowed to occupy or control the centre unopposed.',
    drill: 'Challenge a big pawn centre with a pawn break rather than passive play.',
  },
  'endgame-technique': {
    label: 'Endgame technique',
    why: 'Endgames punish imprecision: king activity, opposition and pawn races decide the result.',
    drill: 'In endgames, activate the king first and calculate pawn races to the end.',
  },
  'threw-away-win': {
    label: 'Let a winning position slip',
    why: 'A won position was converted into an unclear or worse one, usually by rushing.',
    drill: 'When winning, take the simplest line and trade pieces, not pawns.',
  },
  'panic-out-of-book': {
    label: 'Lost the thread out of theory',
    why: 'The mistake came shortly after the opponent left known theory, where memorised moves stop helping.',
    drill: 'When the opponent deviates, stop and run the four principles: centre, development, king safety, structure.',
  },
}

/* ----------------------------------------------------------- board helpers */

export function otherColour(c) {
  return c === 'w' ? 'b' : 'w'
}

/** All squares occupied by a colour. */
export function squaresOf(chess, colour) {
  const out = []
  for (const row of chess.board()) {
    for (const cell of row) if (cell && cell.color === colour) out.push({ square: cell.square, type: cell.type })
  }
  return out
}

function attackerValues(chess, square, colour) {
  return chess
    .attackers(square, colour)
    .map((sq) => {
      const p = chess.get(sq)
      return p ? PIECE_VALUE[p.type] : 0
    })
    .filter(Boolean)
    .sort((a, b) => a - b)
}

/**
 * Static exchange evaluation: material the given side wins by starting a
 * capture sequence on `square`. Negamax with the option to stand pat, which
 * naturally models "don't recapture into a loss". X-rays are ignored.
 */
export function see(chess, square, bySide) {
  const target = chess.get(square)
  if (!target) return 0
  const lists = { w: attackerValues(chess, square, 'w'), b: attackerValues(chess, square, 'b') }
  return seeSwap(PIECE_VALUE[target.type], lists, bySide)
}

function seeSwap(occupantValue, lists, side) {
  const list = lists[side]
  if (!list.length) return 0
  const attacker = list[0]
  const next = { w: side === 'w' ? list.slice(1) : lists.w, b: side === 'b' ? list.slice(1) : lists.b }
  return Math.max(0, occupantValue - seeSwap(attacker, next, otherColour(side)))
}

/** Pieces of `colour` that the opponent can profitably win right now. */
export function hangingPieces(chess, colour) {
  const out = []
  for (const { square, type } of squaresOf(chess, colour)) {
    if (type === 'k') continue
    const gain = see(chess, square, otherColour(colour))
    if (gain > 0) out.push({ square, type, gain })
  }
  return out.sort((a, b) => b.gain - a.gain)
}

/** Targets a piece on `square` attacks that are worth winning. */
function valuableTargets(chess, square) {
  const piece = chess.get(square)
  if (!piece) return []
  const enemy = otherColour(piece.color)
  const out = []
  for (const { square: sq, type } of squaresOf(chess, enemy)) {
    if (!chess.attackers(sq, piece.color).includes(square)) continue
    if (type === 'k') {
      out.push({ square: sq, type, value: PIECE_VALUE.k })
      continue
    }
    const defended = chess.attackers(sq, enemy).length > 0
    if (PIECE_VALUE[type] > PIECE_VALUE[piece.type] || !defended) {
      out.push({ square: sq, type, value: PIECE_VALUE[type] })
    }
  }
  return out
}

/** Does the piece that just landed on `square` hit two or more real targets? */
export function isFork(chess, square) {
  const targets = valuableTargets(chess, square)
  return targets.length >= 2 ? targets : null
}

const RAYS = {
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
}

function toCoord(square) {
  return [FILES.indexOf(square[0]), Number(square[1]) - 1]
}

function toSquare(f, r) {
  return f >= 0 && f < 8 && r >= 0 && r < 8 ? `${FILES[f]}${r + 1}` : null
}

/**
 * Pins and skewers created by `colour`'s sliders: exactly one enemy piece on a
 * ray, with another enemy piece behind it.
 */
export function findPinsAndSkewers(chess, colour) {
  const found = []
  for (const { square, type } of squaresOf(chess, colour)) {
    const dirs = RAYS[type]
    if (!dirs) continue
    const [f0, r0] = toCoord(square)
    for (const [df, dr] of dirs) {
      let first = null
      for (let step = 1; step < 8; step++) {
        const sq = toSquare(f0 + df * step, r0 + dr * step)
        if (!sq) break
        const piece = chess.get(sq)
        if (!piece) continue
        if (piece.color === colour) break
        if (!first) {
          first = { square: sq, ...piece }
          continue
        }
        const front = PIECE_VALUE[first.type]
        const back = PIECE_VALUE[piece.type]
        if (back > front) found.push({ by: square, front: first.square, behind: sq, kind: 'pin', gain: front })
        else if (front > back && back >= PIECE_VALUE.n) {
          found.push({ by: square, front: first.square, behind: sq, kind: 'skewer', gain: back })
        }
        break
      }
    }
  }
  return found
}

/** Defenders that are the sole defender of two or more attacked pieces. */
export function overloadedDefenders(chess, colour) {
  const duties = new Map()
  for (const { square, type } of squaresOf(chess, colour)) {
    if (type === 'k') continue
    if (!chess.attackers(square, otherColour(colour)).length) continue
    const defenders = chess.attackers(square, colour)
    if (defenders.length !== 1) continue
    const key = defenders[0]
    if (!duties.has(key)) duties.set(key, [])
    duties.get(key).push(square)
  }
  return [...duties.entries()].filter(([, jobs]) => jobs.length >= 2).map(([square, jobs]) => ({ square, jobs }))
}

/* --------------------------------------------------------- pawn structure */

export function pawnStructure(chess, colour) {
  const pawns = squaresOf(chess, colour).filter((p) => p.type === 'p').map((p) => p.square)
  const enemyPawns = squaresOf(chess, otherColour(colour)).filter((p) => p.type === 'p').map((p) => p.square)
  const byFile = new Map()
  for (const sq of pawns) {
    const f = FILES.indexOf(sq[0])
    if (!byFile.has(f)) byFile.set(f, [])
    byFile.get(f).push(Number(sq[1]))
  }
  const enemyByFile = new Map()
  for (const sq of enemyPawns) {
    const f = FILES.indexOf(sq[0])
    if (!enemyByFile.has(f)) enemyByFile.set(f, [])
    enemyByFile.get(f).push(Number(sq[1]))
  }

  const doubled = []
  const isolated = []
  const passed = []
  for (const [f, ranks] of byFile) {
    if (ranks.length > 1) doubled.push(FILES[f])
    const hasNeighbour = byFile.has(f - 1) || byFile.has(f + 1)
    if (!hasNeighbour) isolated.push(FILES[f])
    for (const r of ranks) {
      const ahead = (list, rank) => (colour === 'w' ? list.some((x) => x > rank) : list.some((x) => x < rank))
      const blocked =
        ahead(enemyByFile.get(f) || [], r) ||
        ahead(enemyByFile.get(f - 1) || [], r) ||
        ahead(enemyByFile.get(f + 1) || [], r)
      if (!blocked) passed.push(`${FILES[f]}${r}`)
    }
  }

  const occupiedFiles = [...byFile.keys()].sort((a, b) => a - b)
  let islands = 0
  for (let i = 0; i < occupiedFiles.length; i++) {
    if (i === 0 || occupiedFiles[i] !== occupiedFiles[i - 1] + 1) islands++
  }

  const dRanks = byFile.get(3) || []
  const isIqp =
    dRanks.length === 1 && !byFile.has(2) && !byFile.has(4) && !(enemyByFile.get(3) || []).length

  return { pawns, doubled, isolated, passed, islands, iqp: isIqp }
}

/** Bishops whose own pawns sit on their colour complex. */
export function badBishops(chess, colour) {
  const isLight = (sq) => (FILES.indexOf(sq[0]) + Number(sq[1])) % 2 === 1
  const pawns = squaresOf(chess, colour).filter((p) => p.type === 'p')
  const out = []
  for (const b of squaresOf(chess, colour).filter((p) => p.type === 'b')) {
    const light = isLight(b.square)
    const blockers = pawns.filter((p) => isLight(p.square) === light).length
    if (blockers >= 4) out.push({ square: b.square, blockers, complex: light ? 'light' : 'dark' })
  }
  return out
}

export function kingSafety(chess, colour) {
  const king = squaresOf(chess, colour).find((p) => p.type === 'k')
  if (!king) return { square: null, shield: 0, attackers: 0, backRank: false, inCentre: false }
  const [f, r] = toCoord(king.square)
  const dir = colour === 'w' ? 1 : -1
  let shield = 0
  for (const df of [-1, 0, 1]) {
    const sq = toSquare(f + df, r + dir)
    const p = sq && chess.get(sq)
    if (p && p.type === 'p' && p.color === colour) shield++
  }
  let attackers = 0
  for (const df of [-1, 0, 1]) {
    for (const dr of [-1, 0, 1]) {
      const sq = toSquare(f + df, r + dr)
      if (sq) attackers += chess.attackers(sq, otherColour(colour)).length
    }
  }
  const homeRank = colour === 'w' ? 0 : 7
  const escapes = [-1, 0, 1]
    .map((df) => toSquare(f + df, r + dir))
    .filter((sq) => sq && !chess.get(sq)).length
  return {
    square: king.square,
    shield,
    attackers,
    backRank: r === homeRank && escapes === 0,
    inCentre: f >= 3 && f <= 4 && r === homeRank,
  }
}

/* ------------------------------------------------------------- opening eye */

function openingIssues(historySan, colour) {
  const issues = []
  const mine = historySan.filter((_, i) => (colour === 'w' ? i % 2 === 0 : i % 2 === 1)).slice(0, 12)

  const castled = mine.some((san) => san.startsWith('O-O'))
  const developed = mine.filter((san) => /^[NB]/.test(san)).length
  const queenMoves = mine.filter((san) => /^Q/.test(san)).length
  const firstQueenIdx = mine.findIndex((san) => /^Q/.test(san))

  if (mine.length >= 10 && !castled) issues.push('uncastled')
  if (mine.length >= 8 && developed < 2) issues.push('undeveloped')
  if (firstQueenIdx !== -1 && firstQueenIdx < 3 && developed <= 1) issues.push('early-queen')
  if (queenMoves >= 3 && mine.length <= 10) issues.push('early-queen')
  if (repeatedPieceMoves(historySan, colour) >= 2) issues.push('moved-piece-twice')

  return [...new Set(issues)]
}

/**
 * Count how often the same non-pawn piece moved again during the opening.
 * Piece identity is tracked by following it from square to square.
 */
function repeatedPieceMoves(historySan, colour, plyLimit = 20) {
  const chess = new Chess()
  const movesByPiece = new Map()
  let repeats = 0
  for (const san of historySan.slice(0, plyLimit)) {
    let move
    try {
      move = chess.move(san)
    } catch {
      break
    }
    if (!move) break
    const prior = movesByPiece.get(move.from) || 0
    movesByPiece.delete(move.from)
    const count = prior + 1
    movesByPiece.set(move.to, count)
    const castling = move.flags.includes('k') || move.flags.includes('q')
    if (move.color === colour && move.piece !== 'p' && !castling && count >= 2) repeats++
  }
  return repeats
}

/* ---------------------------------------------------------------- tagging */

/**
 * Tag a single annotated move with the patterns that explain it.
 *
 * @param {object} move       one entry from annotateGame().moves
 * @param {object} ctx        { historySan, outOfBookPly }
 * @returns {Array<{id:string,label:string,severity:number,detail:string}>}
 */
export function tagMove(move, ctx = {}) {
  const tags = []
  const add = (id, severity, detail) => {
    if (!PATTERN_LIBRARY[id]) return
    if (tags.some((t) => t.id === id)) return
    tags.push({ id, label: PATTERN_LIBRARY[id].label, severity, detail })
  }

  const colour = move.colour
  const enemy = otherColour(colour)

  let before
  let after
  try {
    before = new Chess(move.fenBefore)
    after = new Chess(move.fenAfter)
  } catch {
    return tags
  }

  // 1. What the move left loose.
  const hangingAfter = hangingPieces(after, colour)
  const hangingBefore = hangingPieces(before, colour)
  const newlyHanging = hangingAfter.filter((h) => !hangingBefore.some((b) => b.square === h.square && b.gain >= h.gain))
  if (newlyHanging.length) {
    const worst = newlyHanging[0]
    add(
      'hanging-piece',
      Math.min(1, worst.gain / 500),
      `${pieceName(worst.type)} on ${worst.square} can be won for ${Math.round(worst.gain / 100)} pawns of material.`,
    )
  }

  // 2. Tactics the opponent now gets.
  const enemyMoves = after.moves({ verbose: true })
  for (const em of enemyMoves) {
    const probe = new Chess(move.fenAfter)
    probe.move(em)
    const fork = isFork(probe, em.to)
    if (fork && fork.length >= 2) {
      add('allowed-fork', 0.7, `${em.san} forks ${fork.map((t) => `${pieceName(t.type)} on ${t.square}`).join(' and ')}.`)
      break
    }
  }
  const enemyPins = findPinsAndSkewers(after, enemy).filter((p) => p.gain >= PIECE_VALUE.n)
  if (enemyPins.length && !findPinsAndSkewers(before, enemy).some((p) => p.front === enemyPins[0].front)) {
    const pin = enemyPins[0]
    add('allowed-pin', 0.55, `Your ${pieceName(after.get(pin.front)?.type)} on ${pin.front} is ${pin.kind}ed by the piece on ${pin.by}.`)
  }

  // 3. What the engine's move would have done instead.
  if (move.bestMove && move.bestMove !== move.uci) {
    const probe = new Chess(move.fenBefore)
    const played = probe.move({
      from: move.bestMove.slice(0, 2),
      to: move.bestMove.slice(2, 4),
      promotion: move.bestMove.length > 4 ? move.bestMove[4] : undefined,
    })
    if (played) {
      const fork = isFork(probe, played.to)
      if (fork) add('missed-fork', 0.6, `${played.san} would fork ${fork.map((t) => `${pieceName(t.type)} on ${t.square}`).join(' and ')}.`)
      const pins = findPinsAndSkewers(probe, colour).filter((p) => p.gain >= PIECE_VALUE.n)
      if (pins.length) add('missed-pin', 0.5, `${played.san} sets up a ${pins[0].kind} against ${pins[0].behind}.`)
      if (played.captured && see(new Chess(move.fenBefore), played.to, colour) >= 100) {
        add('missed-material', 0.7, `${played.san} wins material immediately.`)
      } else if (move.loss >= 200 && !fork && !pins.length) {
        const loose = hangingPieces(before, enemy)
        if (loose.length) add('missed-material', 0.6, `The ${pieceName(loose[0].type)} on ${loose[0].square} was loose and could be attacked.`)
      }
    }
  }

  // 4. Structural and positional standing features.
  const overloaded = overloadedDefenders(before, colour)
  if (overloaded.length && move.loss >= 100) {
    add('overloaded-defender', 0.5, `The piece on ${overloaded[0].square} was the only defender of ${overloaded[0].jobs.join(' and ')}.`)
  }

  const safety = kingSafety(after, colour)
  if (safety.backRank && move.loss >= 100) add('back-rank', 0.6, `The king on ${safety.square} has no escape square.`)
  if (safety.attackers >= 3 && safety.shield <= 1) {
    add('king-safety', Math.min(1, safety.attackers / 6), `${safety.attackers} enemy attacks land around your king on ${safety.square} with only ${safety.shield} shield pawns.`)
  }

  const structure = pawnStructure(after, colour)
  if (structure.iqp) add('iqp', 0.35, 'You are playing with an isolated d-pawn: activity now, weakness later.')
  const structureBefore = pawnStructure(before, colour)
  if (structure.doubled.length > structureBefore.doubled.length) {
    add('doubled-pawns', 0.3, `The move doubled your pawns on the ${structure.doubled.join(', ')} file.`)
  }
  if (structure.isolated.length > structureBefore.isolated.length) {
    add('isolated-pawn', 0.3, `The move isolated your pawn on the ${structure.isolated.join(', ')} file.`)
  }

  const bad = badBishops(after, colour)
  if (bad.length && move.loss >= 80) {
    add('bad-bishop', 0.35, `Your bishop on ${bad[0].square} is blocked by ${bad[0].blockers} of your own pawns on ${bad[0].complex} squares.`)
  }

  const mobility = pieceMobility(after, colour)
  if (mobility && mobility.moves <= 1 && PIECE_VALUE[mobility.type] >= PIECE_VALUE.n) {
    add('trapped-piece', 0.5, `Your ${pieceName(mobility.type)} on ${mobility.square} has ${mobility.moves} safe square${mobility.moves === 1 ? '' : 's'}.`)
  }

  // 5. Phase and narrative context.
  if (move.phase === 'opening') {
    for (const issue of openingIssues(ctx.historySan || [], colour)) add(issue, 0.4, PATTERN_LIBRARY[issue].why)
    if (centreControl(after, colour) <= centreControl(after, enemy) - 2) {
      add('centre-neglect', 0.35, 'The opponent controls more central squares than you do.')
    }
  }
  if (move.phase === 'endgame' && move.loss >= 100) {
    add('endgame-technique', 0.5, 'The mistake came in the endgame, where precision matters more than ideas.')
  }
  if (move.threwAwayWin) add('threw-away-win', 0.8, `The position went from +${(move.evalBefore / 100).toFixed(1)} to ${(move.evalAfter / 100).toFixed(1)}.`)
  if (structure.passed.length && move.phase === 'endgame') {
    add('passed-pawn', 0.3, `Passed pawns on the board: ${structure.passed.join(', ')}.`)
  }
  if (Number.isFinite(ctx.outOfBookPly) && move.ply >= ctx.outOfBookPly && move.ply <= ctx.outOfBookPly + 6 && move.loss >= 100) {
    add('panic-out-of-book', 0.6, `This came ${move.ply - ctx.outOfBookPly} plies after the opponent left known theory.`)
  }

  return tags.sort((a, b) => b.severity - a.severity)
}

/**
 * Least mobile non-pawn piece of `colour`. The side to move is flipped when
 * needed so mobility can be measured in positions where it is not our turn.
 */
function pieceMobility(position, colour) {
  const chess = position.turn() === colour ? position : withSideToMove(position.fen(), colour)
  if (!chess) return null
  let moves
  try {
    moves = chess.moves({ verbose: true })
  } catch {
    return null
  }
  const counts = new Map()
  for (const m of moves) counts.set(m.from, (counts.get(m.from) || 0) + 1)
  let worst = null
  for (const { square, type } of squaresOf(chess, colour)) {
    if (type === 'p' || type === 'k') continue
    const n = counts.get(square) || 0
    if (!worst || n < worst.moves) worst = { square, type, moves: n }
  }
  return worst
}

/** Rebuild a position with a chosen side to move (validation relaxed). */
export function withSideToMove(fen, colour) {
  const parts = fen.split(' ')
  if (parts[1] === colour) return new Chess(fen)
  parts[1] = colour
  parts[3] = '-'
  try {
    const chess = new Chess()
    chess.load(parts.join(' '), { skipValidation: true })
    // A position where the side not to move is in check is not reachable.
    if (chess.isAttacked(squaresOf(chess, otherColour(colour)).find((p) => p.type === 'k')?.square, colour)) return null
    return chess
  } catch {
    return null
  }
}

function centreControl(chess, colour) {
  return ['d4', 'd5', 'e4', 'e5'].reduce((sum, sq) => sum + chess.attackers(sq, colour).length, 0)
}

export function pieceName(type) {
  return { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[type] || 'piece'
}

/** Roll per-move tags up into a ranked weakness list for one game. */
export function summarisePatterns(taggedMoves) {
  const totals = new Map()
  for (const move of taggedMoves) {
    for (const tag of move.tags || []) {
      const entry = totals.get(tag.id) || { id: tag.id, label: tag.label, count: 0, cost: 0, examples: [] }
      entry.count++
      entry.cost += move.loss || 0
      if (entry.examples.length < 3) {
        entry.examples.push({ ply: move.ply, san: move.san, moveNumber: move.moveNumber, detail: tag.detail, fen: move.fenBefore })
      }
      totals.set(tag.id, entry)
    }
  }
  return [...totals.values()].sort((a, b) => b.cost - a.cost || b.count - a.count)
}
