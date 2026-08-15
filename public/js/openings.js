/**
 * Opening knowledge as *plans*, not move trees.
 *
 * The point of this module is the opposite of memorisation: the book exists
 * only to detect the moment the opponent leaves it, so the trainer can switch
 * the student from recall mode to principle mode.
 */
import { Chess } from 'chess.js'

/**
 * Compact plan book. `moves` is a SAN prefix; the longest matching prefix wins.
 * Each entry describes what both sides are actually trying to do.
 */
export const BOOK = [
  // ---------------------------------------------------------------- 1.e4 e5
  { moves: 'e4 e5', eco: 'C20', name: 'Open Game', struct: 'symmetrical centre',
    white: ['Fight for d4 and f5 with pieces', 'Develop knights before bishops, castle early'],
    black: ['Hold e5 with a knight or the d6/f6 pawn', 'Free the light-squared bishop before locking the centre'],
    breaks: ['d2-d4 for White', 'd7-d5 for Black'] },
  { moves: 'e4 e5 Nf3 Nc6 Bb5', eco: 'C60', name: 'Ruy Lopez', struct: 'Spanish',
    white: ['Build the big centre with c3 and d4', 'Reroute the b1 knight via d2-f1-g3 to attack the kingside'],
    black: ['Kick the bishop with a6 and decide on b5', 'Counter in the centre with d5 or on the queenside with c5'],
    breaks: ['d2-d4', 'f2-f4 after preparation', 'd7-d5 for Black'] },
  { moves: 'e4 e5 Nf3 Nc6 Bc4', eco: 'C50', name: 'Italian Game', struct: 'Italian',
    white: ['Prepare d4 with c3, or play the slow d3 plan with Nbd2-f1-g3', 'Watch the f7 square'],
    black: ['Mirror development, then hit the centre with d5', 'Do not grab pawns while behind in development'],
    breaks: ['c3 and d4', 'd7-d5'] },
  { moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6', eco: 'C55', name: 'Two Knights Defence', struct: 'Italian',
    white: ['Ng5 grabs at f7 but costs time', 'The sound plan is d3 and c3 with slow pressure'],
    black: ['Accept sharp play after d5', 'Use the lead in development if White chases material'],
    breaks: ['d5 for Black', 'd4 for White'] },
  { moves: 'e4 e5 Nf3 Nc6 d4', eco: 'C44', name: 'Scotch Game', struct: 'open centre',
    white: ['Open the centre immediately and develop with tempo', 'Aim pieces at d5 and f5'],
    black: ['Do not let the knight on d4 sit unchallenged', 'Trade into a solid structure and finish development'],
    breaks: ['c3 or Nxc6', 'd5 for Black'] },
  { moves: 'e4 e5 Nf3 Nf6', eco: 'C42', name: 'Petrov Defence', struct: 'symmetrical',
    white: ['Do not rush Nxe5 without calculating Qe7 tricks', 'Play d4 and fight for a small space edge'],
    black: ['Copy carefully, then break the symmetry with d5', 'Trade into equality but keep the bishop pair in mind'],
    breaks: ['d4', 'd5'] },
  { moves: 'e4 e5 f4', eco: 'C30', name: "King's Gambit", struct: 'gambit',
    white: ['Trade the f-pawn for the centre and open the f-file', 'Develop fast, king safety before material'],
    black: ['Either return the pawn for development or hold it with g5 carefully', 'd5 is the principled counter'],
    breaks: ['d4 and Bxf4', 'd5 for Black'] },
  { moves: 'e4 e5 Nc3', eco: 'C25', name: 'Vienna Game', struct: 'flexible',
    white: ['Keep f4 in reserve as a lever', 'Bc4 plus Qf3 or Qg4 can build a quick attack'],
    black: ['Nf6 fights for d5 and is the safest reply', 'Meet f4 with d5, not exf4 immediately'],
    breaks: ['f4', 'd5'] },

  // -------------------------------------------------------------- Sicilians
  { moves: 'e4 c5', eco: 'B20', name: 'Sicilian Defence', struct: 'asymmetric',
    white: ['Open the centre with d4 and use the lead in development for a kingside attack', 'Or clamp with c3 or Nc3 setups'],
    black: ['Trade the c-pawn for a central pawn and play on the c-file', 'The half-open c-file and queenside majority are the long-term assets'],
    breaks: ['d4 for White', 'd5 or b5 for Black'] },
  { moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', eco: 'B90', name: 'Sicilian Najdorf', struct: 'Najdorf',
    white: ['Choose a structure: Be3 English attack with f3, g4; or Bg5 with sharp play', 'Attack on the kingside where you have the space'],
    black: ['a6 stops Nb5 and prepares b5 and e5', 'Counter on the queenside while keeping the d5 square in view'],
    breaks: ['g4 and f4 for White', 'b5, d5 and e5 for Black'] },
  { moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6', eco: 'B70', name: 'Sicilian Dragon', struct: 'Dragon',
    white: ['Castle long, push h4-h5 and trade the g7 bishop', 'Speed matters more than material'],
    black: ['The g7 bishop and the half-open c-file are the attack', 'Rc8 and Na5-c4 come before anything else'],
    breaks: ['h4-h5 for White', 'Rxc3 exchange sacrifices for Black'] },
  { moves: 'e4 c5 Nf3 e6', eco: 'B40', name: 'Sicilian Kan / Taimanov complex', struct: 'small centre',
    white: ['Take space with the Maroczy c4 and d4 bind', 'Restrain the d5 and b5 breaks'],
    black: ['Keep the structure flexible, decide on d6 or d5 late', 'Develop the queenside quickly with a6 and Qc7'],
    breaks: ['c4 bind', 'd5 and b5'] },
  { moves: 'e4 c5 Nc3', eco: 'B23', name: 'Closed Sicilian', struct: 'closed',
    white: ['Play g3, Bg2, f4 and attack on the kingside', 'Do not open the centre - the plan is a slow pawn storm'],
    black: ['Expand on the queenside with b5 and Rb8', 'Meet f4 with e6 and d5 to hit back centrally'],
    breaks: ['f4-f5', 'b5-b4 and d5'] },
  { moves: 'e4 c5 c3', eco: 'B22', name: 'Alapin Sicilian', struct: 'IQP-prone',
    white: ['Build a d4 and e4 centre, accept an isolated d-pawn for activity', 'Use the extra space to attack'],
    black: ['Hit the centre at once with d5 or Nf6', 'Trade pieces to expose any isolated pawn'],
    breaks: ['d4-d5', 'd5 and e6'] },

  // ------------------------------------------------------------ Semi-open
  { moves: 'e4 e6', eco: 'C00', name: 'French Defence', struct: 'French chain',
    white: ['Gain space with e5 and attack the kingside', 'The c8 bishop is the problem piece for Black - keep it locked in'],
    black: ['Undermine the chain with c5 and f6', 'Solve the light-squared bishop with b6 and Ba6 or via d7-b5'],
    breaks: ['f4-f5 for White', 'c5 and f6 for Black'] },
  { moves: 'e4 e6 d4 d5 e5', eco: 'C02', name: 'French Advance', struct: 'French chain',
    white: ['Defend d4 with c3 and Nf3, then play on the kingside', 'Avoid loosening the chain too early'],
    black: ['Pile on d4 with c5, Nc6 and Qb6', 'The base of the chain is the target, not the head'],
    breaks: ['c5 hitting d4', 'f6 hitting e5'] },
  { moves: 'e4 c6', eco: 'B10', name: 'Caro-Kann Defence', struct: 'Caro',
    white: ['Take space and target the d5 square', 'Advance variation gains space but concedes c5 and f5 ideas'],
    black: ['Develop the light-squared bishop outside the pawn chain before e6', 'Solid structure, then break with c5'],
    breaks: ['c5 for Black', 'f4-f5 or c4 for White'] },
  { moves: 'e4 d5', eco: 'B01', name: 'Scandinavian Defence', struct: 'open',
    white: ['Develop with tempo against the black queen', 'Take the centre with d4 and c4'],
    black: ['Accept the tempo loss for a clear structure', 'Develop the c8 bishop early to f5 or g4'],
    breaks: ['d4 and c4', 'c6 and e6 solidity'] },
  { moves: 'e4 d6', eco: 'B07', name: 'Pirc Defence', struct: 'hypermodern',
    white: ['Occupy the centre with e4, d4 and f4 or Nf3', 'Punish the delayed centre with a direct attack'],
    black: ['Let White build, then strike with c5 or e5', 'The g7 bishop must stay alive'],
    breaks: ['e5 or f5 for White', 'c5 and e5 for Black'] },
  { moves: 'e4 Nf6', eco: 'B02', name: 'Alekhine Defence', struct: 'hypermodern',
    white: ['Chase the knight to build a big centre, then defend it', 'Do not overextend - each pawn push is a target'],
    black: ['Provoke the pawns forward, then hit them with c5, d6 and Bg4'],
    breaks: ['c4 and f4 for White', 'c5 and d6 for Black'] },

  // ---------------------------------------------------------------- 1.d4 d5
  { moves: 'd4 d5', eco: 'D00', name: 'Closed Game', struct: 'closed centre',
    white: ['Fight for e5 and the c-file', 'c4 is the main lever against d5'],
    black: ['Hold d5 and develop the c8 bishop before e6 if possible'],
    breaks: ['c4 and e4', 'c5 and e5'] },
  { moves: 'd4 d5 c4 e6', eco: 'D30', name: "Queen's Gambit Declined", struct: 'QGD',
    white: ['Minority attack: b4-b5 to leave Black with a weak c6 pawn', 'Or build the centre with e4'],
    black: ['Free the game with c5 or e5', 'The light-squared bishop needs a plan: b6 and Bb7 or Bf5 after dxc4'],
    breaks: ['b4-b5 minority attack, e3-e4', 'c5 and e5'] },
  { moves: 'd4 d5 c4 c6', eco: 'D10', name: 'Slav Defence', struct: 'Slav',
    white: ['Keep the centre and gain space with e3 and Nf3', 'Punish an early dxc4 with e4 and a4'],
    black: ['Develop the c8 bishop before e6 - that is the whole point of c6', 'Take on c4 only when b5 can be supported'],
    breaks: ['e4 for White', 'c5, b5 or e5 for Black'] },
  { moves: 'd4 d5 c4 dxc4', eco: 'D20', name: "Queen's Gambit Accepted", struct: 'open centre',
    white: ['Recover the pawn with e3 and Bxc4, then push e4', 'Use the central majority'],
    black: ['Do not try to hold c4 with b5 - it loses time', 'Hit d4 with c5 and Nc6 quickly'],
    breaks: ['e4', 'c5 and e5'] },
  { moves: 'd4 d5 Bf4', eco: 'D02', name: 'London System', struct: 'London',
    white: ['Solid pyramid with e3, c3, Bd3, Nbd2', 'Play for e4 or a kingside attack with Ne5 and f4'],
    black: ['Challenge the f4 bishop with c5 and Qb6 hitting b2', 'Do not allow a free Ne5 - contest it'],
    breaks: ['e3-e4, Ne5 and f4', 'c5 and Qb6'] },

  // -------------------------------------------------------------- 1.d4 Nf6
  { moves: 'd4 Nf6 c4 e6 Nc3 Bb4', eco: 'E20', name: 'Nimzo-Indian Defence', struct: 'Nimzo',
    white: ['Keep the bishop pair and open the position', 'Use the e4 break once the centre is prepared'],
    black: ['Trade on c3 to damage the structure, then blockade on the light squares', 'c5 and d5 hit the centre'],
    breaks: ['e4 and f3', 'c5, d5 and b6'] },
  { moves: 'd4 Nf6 c4 e6 Nf3 b6', eco: 'E12', name: "Queen's Indian Defence", struct: 'QID',
    white: ['Fight for e4 with Nc3, Qc2 and Bd3', 'Restrict the b7 bishop'],
    black: ['The b7 bishop controls the long diagonal - keep it', 'Break with c5 or d5 at the right moment'],
    breaks: ['e4', 'c5 and d5'] },
  { moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6', eco: 'E60', name: "King's Indian Defence", struct: 'KID',
    white: ['Play on the queenside with c5 and b4 - that is where your space is', 'Do not open the centre while Black attacks'],
    black: ['Close the centre with e5 and d5, then storm with f5, g5 and h5', 'Piece placement beats speed on the kingside'],
    breaks: ['c5 and b4 for White', 'f5 for Black'] },
  { moves: 'd4 Nf6 c4 g6 Nc3 d5', eco: 'D80', name: 'Grünfeld Defence', struct: 'Grünfeld',
    white: ['Build the big pawn centre and defend it', 'Every centre pawn is a strength and a target'],
    black: ['Trade on c3 then attack d4 with c5, Bg7 and Nc6', 'Pressure, do not occupy, the centre'],
    breaks: ['d5 and e5 for White', 'c5 and e5 for Black'] },
  { moves: 'd4 f5', eco: 'A80', name: 'Dutch Defence', struct: 'Dutch',
    white: ['Fight for e4 and e5 - Black has weakened the light squares', 'g3 and Bg2 pressure the long diagonal'],
    black: ['Choose a structure: Stonewall d5 and e6, Leningrad g6, or classical e6 and d6', 'The e4 square is the outpost'],
    breaks: ['e4 for White', 'e5 for Black'] },

  // ------------------------------------------------------------- flank
  { moves: 'c4', eco: 'A10', name: 'English Opening', struct: 'flank',
    white: ['Control d5 from the flank, transpose when useful', 'Fianchetto and play on the queenside'],
    black: ['Take the centre with e5 or d5', 'Do not drift - flank openings punish passive play'],
    breaks: ['d4 and b4', 'd5 and e5'] },
  { moves: 'Nf3 d5 c4', eco: 'A09', name: 'Réti Opening', struct: 'hypermodern',
    white: ['Undermine d5 from the side, fianchetto and pressure the long diagonal'],
    black: ['Support the centre with c6 or e6, or take space with d4'],
    breaks: ['cxd5 and b4', 'd4 and e5'] },
]

export const PRINCIPLES = [
  { id: 'centre', question: 'Who controls the centre right now, and which pawn break changes that?' },
  { id: 'development', question: 'Which of my pieces is doing the least work, and what is its best square?' },
  { id: 'king', question: 'Are both kings safe? Count attackers and defenders around each one.' },
  { id: 'structure', question: 'What does the pawn structure tell me: which files are open, which squares are weak forever?' },
  { id: 'targets', question: 'What is the weakest point in the enemy camp, and can I attack it twice?' },
]

/** Longest matching book line for a SAN move list. */
export function lookupOpening(moves) {
  const played = moves.join(' ')
  let best = null
  for (const entry of BOOK) {
    if (played === entry.moves || played.startsWith(`${entry.moves} `)) {
      if (!best || entry.moves.length > best.moves.length) best = entry
    }
  }
  return best
}

/**
 * First ply at which the played moves stop matching any known line.
 * Returns null while the game is still inside the book.
 */
export function outOfBookPly(moves) {
  const lines = BOOK.map((b) => b.moves.split(' '))
  for (let ply = 0; ply < moves.length; ply++) {
    const prefix = moves.slice(0, ply + 1)
    const stillKnown = lines.some(
      (line) => line.length > ply && line.slice(0, ply + 1).every((san, i) => san === prefix[i]),
    )
    if (!stillKnown) return ply
  }
  return null
}

/** Everything the coach needs to talk about a deviation in plain principles. */
export function describeDeviation({ moves, fen, evalCp = null, candidates = [], popularity = null }) {
  const known = lookupOpening(moves.slice(0, -1))
  const ply = moves.length - 1
  const chess = new Chess(fen)
  const brief = positionBrief(chess)
  const mover = ply % 2 === 0 ? 'w' : 'b'

  return {
    lastMove: moves[moves.length - 1],
    byColour: mover,
    leftBookAt: ply,
    knownOpening: known ? { name: known.name, eco: known.eco, struct: known.struct } : null,
    inheritedPlans: known ? { white: known.white, black: known.black, breaks: known.breaks } : null,
    position: brief,
    evalCp,
    candidates,
    popularity,
    unusual: popularity !== null ? popularity < 0.02 : null,
    checklist: PRINCIPLES.map((p) => p.question),
  }
}

/**
 * Should the trainer interrupt with a deviation panel?
 * Only when the opponent left a reasonably deep book line - otherwise it cries
 * wolf on every third move and the student stops reading it.
 */
export function shouldFlagDeviation({ moves, playerColour, minPly = 4 }) {
  const ply = outOfBookPly(moves)
  if (ply === null || ply < minPly) return null
  const mover = ply % 2 === 0 ? 'w' : 'b'
  if (mover === playerColour) return null
  return { ply, san: moves[ply], previous: lookupOpening(moves.slice(0, ply)) }
}

/**
 * Structured, engine-free description of a position. Used both for the offline
 * coach and as grounded JSON context for the LLM coach.
 */
export function positionBrief(chessOrFen) {
  const chess = typeof chessOrFen === 'string' ? new Chess(chessOrFen) : chessOrFen
  const material = { w: 0, b: 0 }
  const developed = { w: 0, b: 0 }
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
  const backRank = { w: '1', b: '8' }

  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) continue
      material[cell.color] += values[cell.type]
      if ((cell.type === 'n' || cell.type === 'b') && cell.square[1] !== backRank[cell.color]) {
        developed[cell.color]++
      }
    }
  }

  const centre = ['d4', 'd5', 'e4', 'e5']
  const control = {
    w: centre.reduce((n, sq) => n + chess.attackers(sq, 'w').length, 0),
    b: centre.reduce((n, sq) => n + chess.attackers(sq, 'b').length, 0),
  }

  const files = 'abcdefgh'.split('')
  const openFiles = []
  const halfOpen = { w: [], b: [] }
  for (const f of files) {
    const white = []
    const black = []
    for (let r = 1; r <= 8; r++) {
      const p = chess.get(`${f}${r}`)
      if (p && p.type === 'p') (p.color === 'w' ? white : black).push(r)
    }
    if (!white.length && !black.length) openFiles.push(f)
    else if (!white.length) halfOpen.w.push(f)
    else if (!black.length) halfOpen.b.push(f)
  }

  return {
    fen: chess.fen(),
    sideToMove: chess.turn(),
    material,
    materialBalance: material.w - material.b,
    developed,
    centreControl: control,
    openFiles,
    halfOpenFiles: halfOpen,
    inCheck: chess.inCheck(),
    castling: chess.fen().split(' ')[2],
    legalMoves: chess.moves().length,
  }
}
