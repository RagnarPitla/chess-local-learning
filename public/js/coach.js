/**
 * Coaching layer.
 *
 * If an API key is configured server-side you get natural-language coaching.
 * If not, the offline coach writes the same shape of advice from the pattern
 * library and the engine data. The app never depends on the network.
 */
import { PATTERN_LIBRARY, pieceName } from './patterns.js'
import { PRINCIPLES } from './openings.js'

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
    default:
      return 'No coaching available for this request.'
  }
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
