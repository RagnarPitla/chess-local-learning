/**
 * Coaching layer.
 *
 * If an API key is configured server-side you get natural-language coaching.
 * If not, the offline coach writes the same shape of advice from the pattern
 * library and the engine data. The app never depends on the network.
 */
import { PATTERN_LIBRARY, pieceName } from './patterns.js'
import { positionBrief, PRINCIPLES } from './openings.js'
import { EVAL_CLAMP, THRESHOLDS, TURNING_POINT_DEFAULTS, positionRecoverability, winPercent } from './analysis.js'

let coachAvailable = null

export async function coachStatus() {
  if (coachAvailable !== null) return coachAvailable
  try {
    const r = await fetch('/api/health')
    const json = await r.json()
    coachAvailable = Boolean(json?.coach?.configured)
    return coachAvailable
  } catch {
    coachAvailable = false
    return false
  }
}

/**
 * Ask the coach. Always resolves - never throws - so the UI can render
 * something useful whatever happens.
 *
 * @returns {{text:string, source:'llm'|'offline', error?:string}}
 */
export async function ask(kind, data) {
  const offline = () => ({ text: offlineCoach(kind, data), source: 'offline' })
  if (!(await coachStatus())) return offline()

  try {
    const r = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, data }),
    })
    const json = await r.json()
    if (json?.ok && json.text) return { text: json.text, source: 'llm' }
    return { ...offline(), error: json?.error || json?.reason || null }
  } catch (err) {
    return { ...offline(), error: err.message }
  }
}

/* ------------------------------------------------------------ offline coach */

export function offlineCoach(kind, data) {
  switch (kind) {
    case 'game-review':
      return offlineGameReview(data)
    case 'move-explain':
      return offlineMoveExplain(data)
    case 'deviation':
      return offlineDeviation(data)
    case 'puzzle-explain':
      return offlinePuzzleExplain(data)
    case 'lesson':
      return offlineLesson(data)
    case 'live':
      return liveCoachAdvice(data).text
    default:
      return 'No coaching available for this request.'
  }
}

/* ---------------------------------------------------------- live coaching */

export const LIVE_COACH_REGISTERS = {
  converting: 'winning-or-equal',
  fighting: 'worse-but-savable',
  learning: 'beyond-saving',
}

export const LIVE_COACH_BOUNDARIES = {
  equalFloorCp: -THRESHOLDS.inaccuracy,
  winningFloorCp: THRESHOLDS.mistake,
  savableWinPercent: TURNING_POINT_DEFAULTS.savableWinPercent,
  beyondSavingCp: Math.floor(cpForWinPercent(TURNING_POINT_DEFAULTS.savableWinPercent)),
}

export function liveCoachRegister(evalCp, { mate = null } = {}) {
  if (mate !== null && mate !== undefined) {
    if (mate < 0) return LIVE_COACH_REGISTERS.learning
    return LIVE_COACH_REGISTERS.converting
  }
  const cp = normaliseEval(evalCp)
  if (!positionRecoverability(cp).recoverable) return LIVE_COACH_REGISTERS.learning
  if (cp < LIVE_COACH_BOUNDARIES.equalFloorCp) return LIVE_COACH_REGISTERS.fighting
  return LIVE_COACH_REGISTERS.converting
}

export function shouldSpeakLiveCoach({
  register,
  previousRegister = null,
  evalCp = 0,
  previousEvalCp = null,
  ply = null,
  force = false,
  position = null,
  bestSan = null,
} = {}) {
  if (force) return true
  if (!register) return false
  if (previousRegister && previousRegister !== register) return true
  if (previousEvalCp === null || previousEvalCp === undefined) return true
  if (Math.abs(normaliseEval(evalCp) - normaliseEval(previousEvalCp)) >= THRESHOLDS.mistake) return true
  if (position?.inCheck) return true
  if (bestSan && register !== LIVE_COACH_REGISTERS.converting) return true
  return Number.isInteger(ply) && ply > 0 && ply % 6 === 0
}

export function liveCoachAdvice(data = {}) {
  const {
    evalCp = data.cp ?? 0,
    mate = null,
    fen = null,
    playerColour = 'w',
    previousRegister = null,
    previousEvalCp = null,
    ply = null,
    force = false,
    bestSan = null,
    bestLine = [],
    candidates = [],
  } = data

  const cp = normaliseEval(evalCp, mate)
  const register = liveCoachRegister(cp, { mate })
  const position = data.position || briefFromFen(fen)
  const shouldSpeak = shouldSpeakLiveCoach({
    register,
    previousRegister,
    evalCp: cp,
    previousEvalCp,
    ply,
    force,
    position,
    bestSan,
  })
  const text = shouldSpeak
    ? asciiOnly(renderLiveAdvice({ register, cp, mate, position, playerColour, bestSan, bestLine, candidates }))
    : ''

  return {
    text,
    register,
    shouldSpeak,
    evalCp: cp,
    winPercent: Number(winPercent(cp).toFixed(1)),
    boundaryCp: LIVE_COACH_BOUNDARIES.beyondSavingCp,
    source: 'offline',
  }
}

function renderLiveAdvice({ register, cp, mate, position, playerColour, bestSan, bestLine, candidates }) {
  const score = scoreText(cp, mate)
  const facts = livePositionFacts(position, playerColour)
  const moveIdea = liveMoveIdea({ bestSan, bestLine, candidates })

  if (register === LIVE_COACH_REGISTERS.learning) {
    return [
      `This one is gone: ${score}.`,
      `Use the rest as a training rep. ${facts.learning}`,
      moveIdea ? `Best use of the position: compare your move with ${moveIdea} and find the earlier turning point.` : 'Best use of the position: find the earlier turning point, then retry from there.',
      'Keep it useful, then reset for the next game.',
    ].join(' ')
  }

  if (register === LIVE_COACH_REGISTERS.fighting) {
    return [
      `You are worse, but the game is not decided: ${score}.`,
      `Make the opponent prove it. ${facts.fighting}`,
      moveIdea ? `Look hard at ${moveIdea}; forcing moves matter more than tidy moves here.` : `Use the checklist: ${PRINCIPLES[2].question}`,
      'Avoid easy trades, loose pawns, and passive defense.',
    ].join(' ')
  }

  if (isWinningLiveScore(cp, mate)) {
    return [
      `You can play for the full point from here: ${score}.`,
      `Conversion plan: ${facts.converting}`,
      moveIdea ? `Candidate to calculate first: ${moveIdea}.` : `Before moving, ask: ${PRINCIPLES[4].question}`,
      'What throws it away is rushing a tactic, ignoring counterplay, or trading into an unclear ending.',
    ].join(' ')
  }

  return [
    `This is balanced: ${score}.`,
    `Your job is to create a small edge, not force a win that is not there. ${facts.equal}`,
    moveIdea ? `Candidate to compare first: ${moveIdea}.` : `Before moving, ask: ${PRINCIPLES[1].question}`,
    'Look for a better piece, a safer king, or a pawn break that gives the opponent a real problem.',
  ].join(' ')
}

function livePositionFacts(position, playerColour) {
  if (!position) {
    return {
      converting: 'Improve the least active piece, keep your king safe, and only trade when the resulting position is clearly simpler.',
      equal: 'Improve the least active piece, keep tension when it helps you, and do not trade just because a trade is available.',
      fighting: 'Keep pieces active, create one concrete threat, and make every trade earn something.',
      learning: 'Check king safety, material, and the last forcing sequence instead of chasing random checks.',
    }
  }

  const enemy = playerColour === 'w' ? 'b' : 'w'
  const material = position.materialBalance ? (playerColour === 'w' ? position.materialBalance : -position.materialBalance) : 0
  const mineCentre = position.centreControl?.[playerColour] ?? 0
  const theirCentre = position.centreControl?.[enemy] ?? 0
  const openFiles = (position.openFiles || []).slice(0, 2)
  const halfOpen = (position.halfOpenFiles?.[playerColour] || []).slice(0, 2)
  const files = [...openFiles, ...halfOpen]

  if (position.inCheck) {
    return {
      converting: 'Answer the check with the move that keeps the most activity. Do not give back material just to feel safe.',
      equal: 'Answer the check in the way that keeps your pieces active. Do not spend extra material for comfort.',
      fighting: 'First get out of check without swapping off your active defender. Survival comes before style.',
      learning: 'Start with the check. Ask which earlier move left the king exposed.',
    }
  }

  if (Math.abs(material) >= 3) {
    if (material > 0) {
      return {
        converting: `You are up ${materialText(material)}. Trade attackers, not pawns, and keep one active rook or queen.`,
        equal: `You are up ${materialText(material)}, but the engine still calls it balanced. Check king safety before assuming the material tells the whole story.`,
        fighting: `The material edge is your practical chance: you are up ${materialText(material)}. Avoid a mating net and force trades on your terms.`,
        learning: `Material says you are up ${materialText(material)}, so the lesson is likely king safety or a tactic, not counting pieces.`,
      }
    }
    return {
      converting: `Even with material trouble (${materialText(material)}), your evaluation is holding. Use activity before the material count catches up.`,
      equal: `You are down ${materialText(Math.abs(material))}, so the compensation must be activity, king safety, or a target. Keep that compensation alive.`,
      fighting: `You are down ${materialText(Math.abs(material))}. Keep queens or rooks active and attack targets, not defended pawns.`,
      learning: `You are down ${materialText(Math.abs(material))}. Trace which capture or tactic changed the material balance.`,
    }
  }

  if (mineCentre !== theirCentre) {
    const centre = `central control is ${mineCentre} to ${theirCentre}`
    if (mineCentre > theirCentre) {
      return {
        converting: `Your ${centre}. Use that space to improve a piece before opening the position.`,
        equal: `Your ${centre}. Use that small edge to improve a piece or prepare a pawn break.`,
        fighting: `Your ${centre}, so use the center to make threats instead of defending passively.`,
        learning: `Your ${centre}. The lesson is whether that control was converted into a real threat.`,
      }
    }
    return {
      converting: `Their ${centre}, so convert by neutralizing the next pawn break before going after material.`,
      equal: `Their ${centre}. Equal does not mean quiet: challenge one central square before making flank moves.`,
      fighting: `Their ${centre}. Challenge a central square or trade one active attacker before it becomes permanent.`,
      learning: `Their ${centre}. Review when the center was conceded and what pawn break was missed.`,
    }
  }

  if (files.length) {
    const fileText = `${files[0]}-file`
    return {
      converting: `Use the ${fileText}. Rooks and queen belong on open lines when you are trying to convert.`,
      equal: `The ${fileText} is where you can ask a question. Put a rook or queen there if it creates pressure.`,
      fighting: `Use the ${fileText} for counterplay. Active pieces make conversion harder for the opponent.`,
      learning: `The ${fileText} is the useful clue. Review who took it first and why it mattered.`,
    }
  }

  return {
    converting: 'No single tactic jumps out, so improve the worst piece, stop counterplay, then only trade when it reduces risk.',
    equal: 'No single tactic jumps out, so improve the worst piece and keep enough tension to make the opponent choose.',
    fighting: 'No easy target is visible. Create one threat, keep pieces on, and avoid pawn moves that leave new holes.',
    learning: 'No simple feature explains it. Rewind to the last forcing sequence and name the missed threat.',
  }
}

function isWinningLiveScore(cp, mate) {
  if (mate !== null && mate !== undefined) return mate > 0
  return cp >= LIVE_COACH_BOUNDARIES.winningFloorCp
}

function liveMoveIdea({ bestSan, bestLine = [], candidates = [] }) {
  if (bestSan) {
    const line = bestLine.length > 1 ? ` with ${bestLine.slice(0, 4).join(' ')}` : ''
    return `${bestSan}${line}`
  }
  const first = candidates[0]
  if (!first) return ''
  const san = first.san || first.move || first.bestSan
  return san ? `${san}${first.cp !== undefined ? ` (${pawns(first.cp)})` : ''}` : ''
}

function briefFromFen(fen) {
  if (!fen) return null
  try {
    return positionBrief(fen)
  } catch {
    return null
  }
}

function normaliseEval(cp, mate = null) {
  if (mate !== null && mate !== undefined) return mate > 0 ? EVAL_CLAMP : -EVAL_CLAMP
  const n = Number(cp)
  if (!Number.isFinite(n)) return 0
  return Math.max(-EVAL_CLAMP, Math.min(EVAL_CLAMP, Math.round(n)))
}

function cpForWinPercent(percent) {
  const bounded = Math.max(0.1, Math.min(99.9, percent))
  return Math.log(bounded / (100 - bounded)) / 0.00368208
}

function scoreText(cp, mate) {
  if (mate !== null && mate !== undefined) return mate > 0 ? `mate threat for you in ${mate}` : `mate threat against you in ${Math.abs(mate)}`
  return `${pawns(cp)} pawns, about ${winPercent(cp).toFixed(0)} percent`
}

function materialText(points) {
  const p = Math.abs(points)
  if (p === 9) return 'a queen'
  if (p === 5) return 'a rook'
  if (p === 3) return 'a minor piece'
  if (p === 1) return 'a pawn'
  return `${p} points`
}

function asciiOnly(text) {
  return text.replace(/[^\x00-\x7F]/g, '')
}

function pawns(cp) {
  const v = (cp / 100).toFixed(1)
  return cp > 0 ? `+${v}` : v
}

function offlineGameReview(data) {
  const { summary = {}, mistakes = [], patternSummary = [], opening = null, result = null, deviation = null } = data
  const out = []

  const verdict = []
  if (result) verdict.push(`Result: ${result}.`)
  if (summary.accuracy !== undefined) verdict.push(`Accuracy ${summary.accuracy}% with an average loss of ${summary.acpl} centipawns per move.`)
  const c = summary.counts || {}
  verdict.push(`${c.blunder || 0} blunders, ${c.mistake || 0} mistakes, ${c.inaccuracy || 0} inaccuracies.`)
  out.push(`What decided the game:\n${verdict.join(' ')}`)

  if (mistakes.length) {
    const lines = mistakes.map((m) => {
      const tag = m.tags?.[0]
      const detail = tag?.detail || PATTERN_LIBRARY[tag?.id]?.why || 'The engine found a clearly stronger continuation.'
      return `- Move ${m.moveNumber} ${m.san}: ${pawns(m.evalBefore)} became ${pawns(m.evalAfter)}. ${detail} Better was ${m.bestSan}${m.bestLine?.length > 1 ? ` (${m.bestLine.slice(0, 3).join(' ')})` : ''}.`
    })
    out.push(`Your three costliest moments:\n${lines.join('\n')}`)
  } else {
    out.push('Your three costliest moments:\n- Nothing serious went wrong. Raise the engine level.')
  }

  if (patternSummary.length) {
    const top = patternSummary[0]
    const meta = PATTERN_LIBRARY[top.id]
    out.push(`The pattern:\n- ${top.label} appeared ${top.count} time${top.count === 1 ? '' : 's'} and cost ${(top.cost / 100).toFixed(1)} pawns. ${meta?.why || ''}`)
    out.push(`Drill this week:\n- ${meta?.drill || 'Slow down on critical moves and check every capture for both sides.'}`)
  }

  if (deviation?.leftBookAt !== undefined && deviation?.leftBookAt !== null) {
    out.push(`Opening note:\n- Theory ended at move ${Math.floor(deviation.leftBookAt / 2) + 1} with ${deviation.lastMove}. From there the position, not your preparation, had to guide you.`)
  }

  return out.join('\n\n')
}

function offlineMoveExplain(data) {
  const { san, bestSan, bestLine = [], evalBefore, evalAfter, tags = [], phase } = data
  const out = []
  out.push(`${san} turned ${pawns(evalBefore)} into ${pawns(evalAfter)}.`)

  if (tags.length) {
    for (const tag of tags.slice(0, 2)) {
      const meta = PATTERN_LIBRARY[tag.id]
      out.push(`${meta?.label || tag.id}: ${tag.detail || meta?.why || ''}`)
    }
  }

  if (bestSan) {
    out.push(`${bestSan} was stronger${bestLine.length > 1 ? `, with the idea ${bestLine.slice(0, 4).join(' ')}` : ''}.`)
  }

  const meta = tags[0] ? PATTERN_LIBRARY[tags[0].id] : null
  out.push(meta?.drill || `In the ${phase || 'middlegame'}, check every capture and check for both sides before committing.`)
  return out.join('\n\n')
}

function offlineDeviation(data) {
  const { lastMove, knownOpening, inheritedPlans, position = {}, evalCp = null, candidates = [], byColour } = data
  const me = byColour === 'w' ? 'b' : 'w'
  const out = []

  out.push(
    knownOpening
      ? `${lastMove} leaves the ${knownOpening.name}. Your preparation stops being useful here, so read the position instead.`
      : `${lastMove} is not in your book. Read the position instead of trying to recall a line.`,
  )

  const facts = []
  const dev = position.developed || {}
  if (dev.w !== undefined) {
    const mine = dev[me]
    const theirs = dev[byColour]
    if (mine !== theirs) facts.push(`Development: ${mine} minor pieces out against ${theirs}.`)
  }
  const cc = position.centreControl || {}
  if (cc.w !== undefined && cc.w !== cc.b) {
    facts.push(`Centre: ${cc[me] > cc[byColour] ? 'you control more central squares' : 'the opponent controls more central squares'} (${cc[me]} against ${cc[byColour]}).`)
  }
  if (position.materialBalance) {
    const diff = me === 'w' ? position.materialBalance : -position.materialBalance
    if (diff !== 0) facts.push(`Material: you are ${diff > 0 ? 'up' : 'down'} ${Math.abs(diff)} point${Math.abs(diff) === 1 ? '' : 's'}.`)
  }
  if (position.openFiles?.length) facts.push(`Open files: ${position.openFiles.join(', ')} - rooks belong there.`)
  if (evalCp !== null) facts.push(`Engine assessment: ${pawns(evalCp)}.`)
  if (facts.length) out.push(`What actually changed:\n- ${facts.join('\n- ')}`)

  const plans = inheritedPlans ? (me === 'w' ? inheritedPlans.white : inheritedPlans.black) : null
  if (plans?.length) out.push(`The plans in this structure still apply:\n- ${plans.join('\n- ')}`)
  if (inheritedPlans?.breaks?.length) out.push(`Pawn breaks to watch: ${inheritedPlans.breaks.join('; ')}.`)

  if (candidates.length) {
    out.push(`Engine candidates: ${candidates.slice(0, 3).map((c) => `${c.san} (${pawns(c.cp)})`).join(', ')}.`)
  }

  out.push(`Run the checklist:\n- ${PRINCIPLES.map((p) => p.question).join('\n- ')}`)
  return out.join('\n\n')
}

function offlinePuzzleExplain(data) {
  const { solutionSan, verdict, playedSan, tags = [], line = [], origin } = data
  const out = []
  if (verdict === 'best' || verdict === 'equivalent') {
    out.push(`Correct. ${solutionSan} is the move${line.length > 1 ? `, and the follow-up runs ${line.slice(0, 4).join(' ')}` : ''}.`)
  } else if (verdict === 'gave-up' || !playedSan) {
    out.push(`The move is ${solutionSan}${line.length > 1 ? `, and the follow-up runs ${line.slice(0, 4).join(' ')}` : ''}.`)
  } else {
    out.push(`${playedSan} is not the strongest here. The move is ${solutionSan}${line.length > 1 ? ` with the idea ${line.slice(0, 4).join(' ')}` : ''}.`)
  }
  const meta = tags[0] ? PATTERN_LIBRARY[typeof tags[0] === 'string' ? tags[0] : tags[0].id] : null
  if (meta) {
    out.push(`${meta.label}: ${meta.why}`)
    out.push(`Cue to spot it next time: ${meta.drill}`)
  }
  if (origin) out.push(origin)
  return out.join('\n\n')
}

function offlineLesson(data) {
  const { patternId, examples = [], profile = null } = data
  const meta = PATTERN_LIBRARY[patternId]
  if (!meta) return 'No lesson available for this pattern.'

  const out = [`${meta.label}`, `Why it costs you material or position:\n${meta.why}`]

  if (examples.length) {
    const lines = examples
      .slice(0, 3)
      .map((ex) => `- Move ${ex.moveNumber} (${ex.san}): ${ex.detail || 'the same idea appeared here.'}`)
    out.push(`It showed up in your own games:\n${lines.join('\n')}`)
  }

  out.push(`Three-step checklist:\n- ${meta.drill}\n- Say the threat out loud before you move.\n- Re-check the move you are about to play against the opponent's most forcing reply.`)

  if (profile?.drillAccuracy !== null && profile?.drillAccuracy !== undefined) {
    out.push(`Drill record so far: ${profile.drillAccuracy}% correct.`)
  }
  return out.join('\n\n')
}

/** Build the JSON payload for a game review request. */
export function gameReviewPayload({ annotation, taggedMoves, patternSummary, opening, result, deviation, profileBrief }) {
  const mistakes = taggedMoves
    .filter((m) => m.isPlayer && ['blunder', 'mistake', 'inaccuracy'].includes(m.classification))
    .sort((a, b) => b.loss - a.loss)
    .slice(0, 3)
    .map((m) => ({
      moveNumber: m.moveNumber,
      san: m.san,
      classification: m.classification,
      evalBefore: m.evalBefore,
      evalAfter: m.evalAfter,
      loss: m.loss,
      bestSan: m.bestSan,
      bestLine: m.bestLine,
      phase: m.phase,
      fen: m.fenBefore,
      tags: (m.tags || []).map((t) => ({ id: t.id, label: t.label, detail: t.detail })),
    }))

  return {
    playerColour: annotation.playerColour,
    result,
    opening,
    summary: annotation.summary,
    mistakes,
    patternSummary: patternSummary.slice(0, 4).map((p) => ({ id: p.id, label: p.label, count: p.count, cost: p.cost })),
    deviation,
    history: profileBrief,
  }
}

export { pieceName }
