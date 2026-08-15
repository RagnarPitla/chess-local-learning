/**
 * Controller: play -> review -> pattern extraction -> drills -> profile.
 */
import { Chess } from 'chess.js'
import { Board, ARROW_TYPE, MARKER_TYPE } from './board.js'
import { Engine } from './engine.js'
import { annotateGame } from './analysis.js'
import { tagMove, summarisePatterns, PATTERN_LIBRARY } from './patterns.js'
import { lookupOpening, outOfBookPly, shouldFlagDeviation, describeDeviation } from './openings.js'
import * as coach from './coach.js'
import { puzzlesFromGame, buildQueue, gradeAnswer, puzzleContext, fetchLichessPuzzle } from './puzzles.js'
import {
  storage,
  recordGame,
  recordDrill,
  rankWeaknesses,
  dueDrills,
  trend,
  profileBrief,
  emptyProfile,
} from './profile.js'

const $ = (id) => document.getElementById(id)
const state = {
  engine: null,
  board: null,
  chess: new Chess(),
  mode: 'idle', // idle | play | review | drill
  playerColour: 'w',
  elo: 1500,
  gameId: null,
  finished: false,
  thinking: false,
  annotation: null,
  taggedMoves: [],
  patternSummary: [],
  puzzles: [],
  queue: [],
  puzzleIndex: 0,
  currentPuzzle: null,
  answered: false,
  profile: emptyProfile(),
  deviationShown: false,
  hintStage: 0,
}

/* ------------------------------------------------------------------- boot */

async function boot() {
  state.profile = storage.load()
  const remote = await storage.loadRemote()
  if (remote && (remote.gamesPlayed || 0) > (state.profile.gamesPlayed || 0)) state.profile = remote

  state.board = new Board($('board'), {
    onMove: handleBoardMove,
    isPromotion: (from, to) => isPromotionMove(from, to),
    onCancel: () => syncBoard(),
  })

  wireUi()
  renderProfile()
  renderMoves()

  const configured = await coach.coachStatus()
  setPill('pill-coach', configured ? 'ok' : 'warn', configured ? 'coach: llm' : 'coach: offline rules')

  state.engine = new Engine({
    url: await engineUrl(),
    onStatus: (s) => setPill('pill-engine', s === 'engine ready' ? 'ok' : 'pending', `engine: ${s}`),
  })

  try {
    await state.engine.init()
    setPill('pill-engine', 'ok', 'engine: stockfish 18')
    $('btn-new').disabled = false
  } catch (err) {
    setPill('pill-engine', 'bad', 'engine: failed')
    setCaption(`Engine failed to load: ${err.message}`)
  }

  window.chessCoach = {
    state,
    newGame,
    loadPgnGame,
    runReview,
    nextDrill,
    playSan(san) {
      if (state.mode !== 'play' || state.finished || state.thinking) return false
      let move
      try {
        move = state.chess.move(san)
      } catch {
        return false
      }
      if (!move) return false
      afterPlayerMove(move)
      return true
    },
  }
  window.dispatchEvent(new CustomEvent('chess-coach-ready'))
}

async function engineUrl() {
  try {
    const r = await fetch('/api/health')
    const json = await r.json()
    return json?.engine?.url || '/vendor/stockfish/stockfish-18-lite-single.js'
  } catch {
    return '/vendor/stockfish/stockfish-18-lite-single.js'
  }
}

function wireUi() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab))
  })

  $('rng-elo').addEventListener('input', (e) => {
    state.elo = Number(e.target.value)
    $('out-elo').textContent = state.elo
  })

  $('btn-new').addEventListener('click', newGame)
  $('btn-flip').addEventListener('click', () => state.board.flip())
  $('btn-takeback').addEventListener('click', takeBack)
  $('btn-hint').addEventListener('click', showHint)
  $('btn-finish').addEventListener('click', finishGame)
  $('btn-review').addEventListener('click', runReview)
  $('btn-load-pgn').addEventListener('click', () => loadPgnGame())
  $('btn-dismiss-deviation').addEventListener('click', () => $('deviation-card').classList.add('hidden'))
  $('btn-drill-next').addEventListener('click', nextDrill)
  $('btn-drill-solution').addEventListener('click', revealSolution)
  $('btn-lichess').addEventListener('click', addLichessPuzzle)
  $('btn-export').addEventListener('click', exportProfile)
  $('btn-reset').addEventListener('click', resetProfile)
}

function selectTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name))
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('is-active', p.id === `panel-${name}`))
  if (name === 'drills') enterDrillMode()
  else if (state.mode === 'drill') exitDrillMode()
  if (name === 'profile') renderProfile()
}

/* ------------------------------------------------------------------- play */

async function newGame() {
  const choice = $('sel-colour').value
  state.playerColour = choice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : choice
  state.chess = new Chess()
  state.mode = 'play'
  state.finished = false
  state.annotation = null
  state.taggedMoves = []
  state.patternSummary = []
  state.deviationShown = false
  state.hintStage = 0
  state.gameId = `g${Date.now()}`

  await state.engine.newGame()
  state.board.clearAnnotations()
  await state.board.setOrientation(state.playerColour)
  await state.board.setPosition(state.chess.fen(), false)

  $('btn-finish').disabled = false
  $('btn-takeback').disabled = true
  $('btn-hint').disabled = false
  $('btn-review').disabled = true
  $('deviation-card').classList.add('hidden')
  $('hint-card').classList.add('hidden')
  hideReviewCards()
  renderMoves()
  updateEvalBar(0)

  setCaption(`You are ${state.playerColour === 'w' ? 'White' : 'Black'} against a ${state.elo}-rated engine.`)
  selectTab('play')

  if (state.chess.turn() === state.playerColour) enablePlayerInput()
  else engineMove()
}

function enablePlayerInput() {
  if (state.finished) return
  state.board.enableInput(state.playerColour)
}

function isPromotionMove(from, to) {
  if (state.mode === 'drill') {
    const chess = new Chess(state.currentPuzzle.fen)
    return chess.moves({ verbose: true }).some((m) => m.from === from && m.to === to && m.promotion)
  }
  return state.chess.moves({ verbose: true }).some((m) => m.from === from && m.to === to && m.promotion)
}

function handleBoardMove({ from, to, promotion }) {
  if (state.mode === 'drill') return handleDrillMove({ from, to, promotion })
  if (state.mode !== 'play' || state.finished || state.thinking) return false

  let move
  try {
    move = state.chess.move({ from, to, promotion: promotion || 'q' })
  } catch {
    return false
  }
  if (!move) return false

  afterPlayerMove(move)
  return true
}

async function afterPlayerMove(move) {
  state.board.clearAnnotations()
  state.board.markMove(move.from, move.to)
  renderMoves()
  $('btn-takeback').disabled = false
  $('hint-card').classList.add('hidden')
  state.hintStage = 0
  await syncBoard()

  if (checkGameOver()) return
  engineMove()
}

async function engineMove() {
  if (state.finished) return
  state.thinking = true
  state.board.disableInput()
  setCaption('Engine is thinking.')

  try {
    const uci = await state.engine.pickMove(state.chess.fen(), { elo: state.elo, movetime: 500 })
    if (!uci) {
      state.thinking = false
      checkGameOver()
      return
    }
    const move = state.chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    })
    state.board.clearAnnotations()
    if (move) state.board.markMove(move.from, move.to)
    await syncBoard()
    renderMoves()
  } catch (err) {
    setCaption(`Engine error: ${err.message}`)
  }

  state.thinking = false
  if (checkGameOver()) return

  setCaption('Your move.')
  enablePlayerInput()
  updateOpeningLabel()
  refreshEval()
  maybeFlagDeviation()
}

function checkGameOver() {
  if (!state.chess.isGameOver()) return false
  state.finished = true
  state.board.disableInput()
  $('btn-review').disabled = false
  $('btn-hint').disabled = true

  let text = 'Game over.'
  if (state.chess.isCheckmate()) {
    const loser = state.chess.turn()
    text = loser === state.playerColour ? 'Checkmate. You lost.' : 'Checkmate. You won.'
  } else if (state.chess.isStalemate()) text = 'Stalemate.'
  else if (state.chess.isInsufficientMaterial()) text = 'Draw by insufficient material.'
  else if (state.chess.isThreefoldRepetition()) text = 'Draw by repetition.'
  else if (state.chess.isDrawByFiftyMoves()) text = 'Draw by the fifty move rule.'

  setCaption(`${text} Run the review to turn it into drills.`)
  selectTab('review')
  return true
}

function finishGame() {
  if (!state.chess.history().length) return
  state.finished = true
  state.board.disableInput()
  $('btn-review').disabled = false
  $('btn-finish').disabled = true
  setCaption('Game closed. Analyse it to build your drills.')
  selectTab('review')
}

async function loadPgnGame(pgnText, colour) {
  const pgn = (pgnText ?? $('pgn-input').value).trim()
  const status = $('pgn-status')
  if (!pgn) {
    status.textContent = 'Paste a PGN first.'
    return false
  }

  const parsed = new Chess()
  try {
    parsed.loadPgn(pgn)
  } catch (err) {
    status.textContent = `Could not read that PGN: ${err.message}`
    return false
  }
  if (!parsed.history().length) {
    status.textContent = 'That PGN has no moves.'
    return false
  }

  state.chess = parsed
  state.playerColour = colour ?? $('sel-pgn-colour').value
  state.mode = 'idle'
  state.finished = true
  state.annotation = null
  state.taggedMoves = []
  state.patternSummary = []
  state.gameId = `g${Date.now()}`

  state.board.clearAnnotations()
  await state.board.setOrientation(state.playerColour)
  await state.board.setPosition(state.chess.fen(), false)
  state.board.disableInput()

  $('btn-review').disabled = false
  $('btn-finish').disabled = true
  $('btn-hint').disabled = true
  hideReviewCards()
  renderMoves()
  updateOpeningLabel()

  const headers = parsed.header()
  const label = headers.White && headers.Black ? `${headers.White} vs ${headers.Black}` : 'Imported game'
  status.textContent = `${label} loaded: ${parsed.history().length} moves. Ready to analyse.`
  setCaption(`${label} loaded. Analyse it to build your drills.`)
  selectTab('review')
  return true
}

async function takeBack() {
  if (state.mode !== 'play' || state.thinking) return
  state.chess.undo()
  if (state.chess.turn() !== state.playerColour) state.chess.undo()
  state.finished = false
  state.board.clearAnnotations()
  await syncBoard()
  renderMoves()
  enablePlayerInput()
  $('btn-takeback').disabled = state.chess.history().length === 0
}

async function syncBoard() {
  await state.board.setPosition(state.chess.fen(), true)
}

/* ------------------------------------------------------- live assistance */

async function refreshEval() {
  if (state.mode !== 'play' || state.finished) return
  try {
    const r = await state.engine.search(state.chess.fen(), { depth: 10, multipv: 1 })
    const white = state.chess.turn() === 'w' ? r.cp : -r.cp
    updateEvalBar(white)
  } catch {
    /* eval is cosmetic */
  }
}

function updateEvalBar(cpWhite) {
  const clamped = Math.max(-800, Math.min(800, cpWhite))
  const pct = 50 + (clamped / 800) * 50
  $('evalbar-fill').style.height = `${pct}%`
  $('evalbar-label').textContent = (cpWhite / 100).toFixed(1)
}

function updateOpeningLabel() {
  const opening = lookupOpening(state.chess.history())
  $('opening-name').textContent = opening ? `${opening.name} (${opening.eco})` : 'out of book'
}

async function maybeFlagDeviation() {
  if (!$('chk-deviation').checked || state.deviationShown || state.finished) return
  const moves = state.chess.history()
  const flagged = shouldFlagDeviation({ moves, playerColour: state.playerColour })
  if (!flagged) return

  state.deviationShown = true
  const card = $('deviation-card')
  card.classList.remove('hidden')
  $('deviation-chip').textContent = flagged.previous ? flagged.previous.name : 'unknown line'
  $('deviation-text').textContent = 'Working out what changed.'

  try {
    const search = await state.engine.search(state.chess.fen(), { depth: 12, multipv: 3 })
    const chess = new Chess(state.chess.fen())
    const candidates = search.lines
      .map((line) => {
        const probe = new Chess(state.chess.fen())
        const uci = line.pv?.[0]
        if (!uci) return null
        const m = probe.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
        return m ? { san: m.san, cp: line.cp ?? 0, mate: line.mate } : null
      })
      .filter(Boolean)

    const payload = describeDeviation({
      moves: moves.slice(0, flagged.ply + 1),
      fen: state.chess.fen(),
      evalCp: chess.turn() === state.playerColour ? search.cp : -search.cp,
      candidates,
    })
    const answer = await coach.ask('deviation', payload)
    $('deviation-text').textContent = answer.text
    $('deviation-chip').textContent = `${flagged.previous ? flagged.previous.name : 'unknown line'} - ${answer.source}`
  } catch (err) {
    $('deviation-text').textContent = `Could not analyse the deviation: ${err.message}`
  }
}

async function showHint() {
  if (state.mode !== 'play' || state.finished || state.thinking) return
  const card = $('hint-card')
  card.classList.remove('hidden')

  if (state.hintStage === 0) {
    $('hint-text').textContent = 'Thinking about the position.'
    try {
      const search = await state.engine.search(state.chess.fen(), { depth: 12, multipv: 3 })
      const candidates = search.lines
        .map((line) => {
          const probe = new Chess(state.chess.fen())
          const uci = line.pv?.[0]
          if (!uci) return null
          const m = probe.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
          return m ? { san: m.san, cp: line.cp ?? 0 } : null
        })
        .filter(Boolean)

      state.hintBest = search.best
      const payload = describeDeviation({
        moves: state.chess.history(),
        fen: state.chess.fen(),
        evalCp: search.cp,
        candidates: candidates.slice(0, 1),
      })
      const answer = await coach.ask('deviation', payload)
      $('hint-text').textContent = `${answer.text}\n\nPress Hint again to see the engine move on the board.`
      state.hintStage = 1
    } catch (err) {
      $('hint-text').textContent = `Hint failed: ${err.message}`
    }
    return
  }

  if (state.hintBest) {
    state.board.clearAnnotations()
    state.board.arrow(state.hintBest.slice(0, 2), state.hintBest.slice(2, 4), ARROW_TYPE.info)
  }
  state.hintStage = 0
}

/* ----------------------------------------------------------------- review */

function hideReviewCards() {
  for (const id of ['review-summary-card', 'coach-card', 'mistakes-card']) $(id).classList.add('hidden')
  $('mistake-detail').classList.add('hidden')
}

async function runReview() {
  const moves = state.chess.history()
  if (!moves.length) return

  state.mode = 'review'
  state.board.disableInput()
  const depth = Number($('sel-depth').value)
  const bar = $('review-progress')
  const fill = $('review-progress-fill')
  bar.classList.remove('hidden')
  fill.style.width = '0%'
  $('btn-review').disabled = true
  $('review-status').textContent = 'Analysing every position.'

  try {
    const annotation = await annotateGame({
      moves,
      playerColour: state.playerColour,
      analyse: (fen) => state.engine.search(fen, { depth, multipv: 2 }),
      onProgress: (done, total) => {
        fill.style.width = `${Math.round((done / total) * 100)}%`
        $('review-status').textContent = `Analysing position ${done} of ${total}.`
      },
    })

    const bookPly = outOfBookPly(moves)
    const tagged = annotation.moves.map((move) => {
      if (!move.isPlayer || move.loss < 40) return { ...move, tags: [] }
      return {
        ...move,
        tags: tagMove(move, { historySan: moves.slice(0, move.ply), outOfBookPly: bookPly }),
      }
    })

    state.annotation = annotation
    state.taggedMoves = tagged
    state.patternSummary = summarisePatterns(tagged.filter((m) => m.isPlayer))

    renderReview()
    renderMoves()

    state.puzzles = puzzlesFromGame({
      moves: tagged,
      playerColour: state.playerColour,
      gameId: state.gameId,
      limit: 5,
    })
    prepareQueue()

    const opening = lookupOpening(moves)
    state.profile = recordGame(state.profile, {
      patternSummary: state.patternSummary,
      summary: annotation.summary,
      result: resultText(),
      opening: opening ? opening.name : null,
      playerColour: state.playerColour,
    })
    storage.save(state.profile)
    storage.sync(state.profile)
    renderProfile()
    saveGame(annotation, opening)

    $('review-status').textContent = `Done. ${state.puzzles.length} drill${state.puzzles.length === 1 ? '' : 's'} generated from your mistakes.`
    await runCoachReview(opening, bookPly, moves)
  } catch (err) {
    $('review-status').textContent = `Review failed: ${err.message}`
  } finally {
    bar.classList.add('hidden')
    $('btn-review').disabled = false
    state.mode = state.finished ? 'idle' : 'play'
    if (state.mode === 'play') enablePlayerInput()
  }
}

async function runCoachReview(opening, bookPly, moves) {
  const card = $('coach-card')
  card.classList.remove('hidden')
  $('coach-text').textContent = 'Writing your review.'

  const deviation = bookPly === null
    ? null
    : describeDeviation({
        moves: moves.slice(0, bookPly + 1),
        fen: state.taggedMoves[bookPly]?.fenAfter || state.chess.fen(),
      })

  const payload = coach.gameReviewPayload({
    annotation: state.annotation,
    taggedMoves: state.taggedMoves,
    patternSummary: state.patternSummary,
    opening: opening ? `${opening.name} (${opening.eco})` : null,
    result: resultText(),
    deviation,
    profileBrief: profileBrief(state.profile),
  })

  const answer = await coach.ask('game-review', payload)
  $('coach-text').textContent = answer.text
  $('coach-source').textContent = answer.source === 'llm' ? 'language model' : 'offline rules'
}

function resultText() {
  if (!state.chess.isGameOver()) return 'unfinished'
  if (state.chess.isCheckmate()) return state.chess.turn() === state.playerColour ? 'loss' : 'win'
  return 'draw'
}

function renderReview() {
  const s = state.annotation.summary
  $('review-summary-card').classList.remove('hidden')
  $('review-stats').innerHTML = [
    stat('Accuracy', `${s.accuracy}%`, s.accuracy >= 85 ? 'good' : s.accuracy >= 70 ? 'warn' : 'bad'),
    stat('Avg loss', `${s.acpl}`, s.acpl <= 30 ? 'good' : s.acpl <= 70 ? 'warn' : 'bad'),
    stat('Blunders', s.counts.blunder, s.counts.blunder ? 'bad' : 'good'),
    stat('Mistakes', s.counts.mistake, s.counts.mistake ? 'warn' : 'good'),
    stat('Inaccurate', s.counts.inaccuracy, ''),
    stat('Engine avg', `${s.opponentAcpl}`, ''),
  ].join('')

  const mistakes = state.taggedMoves
    .filter((m) => m.isPlayer && ['blunder', 'mistake', 'inaccuracy'].includes(m.classification))
    .sort((a, b) => b.loss - a.loss)

  $('mistakes-card').classList.toggle('hidden', mistakes.length === 0)
  $('mistake-list').innerHTML = mistakes
    .map(
      (m, i) => `<li data-ply="${m.ply}" class="${i === 0 ? 'is-active' : ''}">
        <span class="dot ${m.classification}"></span>
        <span class="move">${m.moveNumber}${m.colour === 'w' ? '.' : '...'} ${m.san}</span>
        <span class="muted small">${m.tags?.[0]?.label || m.classification}</span>
        <span class="loss">-${(m.loss / 100).toFixed(1)}</span>
      </li>`,
    )
    .join('')

  $('mistake-list').querySelectorAll('li').forEach((li) => {
    li.addEventListener('click', () => showMistake(Number(li.dataset.ply), li))
  })
  if (mistakes.length) showMistake(mistakes[0].ply, $('mistake-list').querySelector('li'))
}

function stat(k, v, cls) {
  return `<div class="stat ${cls}"><div class="v">${v}</div><div class="k">${k}</div></div>`
}

async function showMistake(ply, li) {
  const move = state.taggedMoves.find((m) => m.ply === ply)
  if (!move) return
  $('mistake-list').querySelectorAll('li').forEach((el) => el.classList.toggle('is-active', el === li))

  state.mode = 'browse'
  state.board.disableInput()
  state.board.clearAnnotations()
  await state.board.setPosition(move.fenBefore, true)
  state.board.arrow(move.uci.slice(0, 2), move.uci.slice(2, 4), ARROW_TYPE.danger)
  if (move.bestMove) state.board.arrow(move.bestMove.slice(0, 2), move.bestMove.slice(2, 4), ARROW_TYPE.success)
  setCaption(`Move ${move.moveNumber}: you played ${move.san} (red). The engine prefers ${move.bestSan} (green).`)

  const detail = $('mistake-detail')
  detail.classList.remove('hidden')
  detail.innerHTML = `
    <div class="taglist">${(move.tags || []).map((t) => `<span class="chip">${t.label}</span>`).join('') || '<span class="chip">no pattern matched</span>'}</div>
    <div class="prose" id="mistake-prose">Writing the explanation.</div>`

  const answer = await coach.ask('move-explain', {
    san: move.san,
    bestSan: move.bestSan,
    bestLine: move.bestLine,
    evalBefore: move.evalBefore,
    evalAfter: move.evalAfter,
    loss: move.loss,
    phase: move.phase,
    fen: move.fenBefore,
    tags: (move.tags || []).map((t) => ({ id: t.id, label: t.label, detail: t.detail })),
  })
  const prose = document.getElementById('mistake-prose')
  if (prose) prose.textContent = answer.text
}

async function saveGame(annotation, opening) {
  try {
    await fetch('/api/games', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: state.gameId,
        pgn: state.chess.pgn(),
        playerColour: state.playerColour,
        elo: state.elo,
        result: resultText(),
        opening: opening ? opening.name : null,
        summary: annotation.summary,
        patterns: state.patternSummary.map((p) => ({ id: p.id, count: p.count, cost: p.cost })),
      }),
    })
  } catch {
    /* local-first: losing the server copy is not fatal */
  }
}

/* ----------------------------------------------------------------- drills */

function prepareQueue() {
  const weaknesses = rankWeaknesses(state.profile, { limit: 6 })
  const due = dueDrills(state.profile, { limit: 5 })
  state.queue = buildQueue({ pool: state.puzzles, weaknesses, due, limit: 5 })
  state.puzzleIndex = 0
}

function enterDrillMode() {
  if (!state.queue.length) {
    $('drill-empty').classList.remove('hidden')
    $('drill-live').classList.add('hidden')
    $('drill-extra-card').classList.toggle('hidden', rankWeaknesses(state.profile, { limit: 1 }).length === 0)
    return
  }
  $('drill-empty').classList.add('hidden')
  $('drill-live').classList.remove('hidden')
  $('drill-extra-card').classList.remove('hidden')
  loadPuzzle(state.queue[state.puzzleIndex])
}

function exitDrillMode() {
  state.mode = state.finished ? 'idle' : 'play'
  state.board.disableInput()
}

async function loadPuzzle(puzzle) {
  if (!puzzle) return
  state.currentPuzzle = puzzle
  state.answered = false
  state.mode = 'drill'

  const ctx = puzzleContext(puzzle)
  $('drill-counter').textContent = `${state.puzzleIndex + 1} of ${state.queue.length}`
  $('drill-tag').textContent = puzzle.primaryTag || 'critical moment'
  $('drill-heading').textContent = ctx.heading
  $('drill-prompt').textContent = ctx.prompt
  $('drill-origin').textContent = puzzle.external ? `Lichess puzzle, rating ${puzzle.rating || 'unknown'}.` : ctx.origin
  $('drill-verdict').classList.add('hidden')
  $('drill-explain').classList.add('hidden')

  state.board.clearAnnotations()
  await state.board.setOrientation(puzzle.sideToMove)
  await state.board.setPosition(puzzle.fen, true)
  state.board.enableInput(puzzle.sideToMove)
  setCaption(`${puzzle.sideToMove === 'w' ? 'White' : 'Black'} to move. ${ctx.prompt}`)
}

function handleDrillMove({ from, to, promotion }) {
  if (state.answered || !state.currentPuzzle) return false
  const chess = new Chess(state.currentPuzzle.fen)
  let move
  try {
    move = chess.move({ from, to, promotion: promotion || 'q' })
  } catch {
    return false
  }
  if (!move) return false
  gradeDrill(move)
  return true
}

async function gradeDrill(move) {
  state.answered = true
  state.board.disableInput()
  const puzzle = state.currentPuzzle
  const uci = move.from + move.to + (move.promotion || '')

  let grade = gradeAnswer(puzzle, uci)
  if (!grade.correct && grade.verdict === 'different' && !puzzle.external) {
    try {
      const [answerEval, bestEval] = await Promise.all([
        evaluateAfter(puzzle.fen, uci),
        evaluateAfter(puzzle.fen, puzzle.solution.uci),
      ])
      grade = gradeAnswer(puzzle, uci, { answerEvalCp: answerEval, bestEvalCp: bestEval })
    } catch {
      /* fall back to the strict verdict */
    }
  }

  const verdict = $('drill-verdict')
  verdict.classList.remove('hidden')
  verdict.className = `verdict ${grade.correct ? 'ok' : 'no'}`
  verdict.textContent = grade.message

  state.board.clearAnnotations()
  state.board.markMove(move.from, move.to)
  if (!grade.correct && puzzle.solution.uci) {
    state.board.arrow(puzzle.solution.uci.slice(0, 2), puzzle.solution.uci.slice(2, 4), ARROW_TYPE.success)
  }

  if (puzzle.primaryTag) {
    state.profile = recordDrill(state.profile, puzzle.primaryTag, grade.correct)
    storage.save(state.profile)
    storage.sync(state.profile)
    renderProfile()
  }

  await explainSolution(puzzle, { playedSan: grade.san, verdict: grade.verdict })
}

/** Ask the coach why the solution works. Shared by grading and by giving up. */
async function explainSolution(puzzle, { playedSan = null, verdict = 'gave-up' } = {}) {
  const explain = $('drill-explain')
  explain.classList.remove('hidden')
  explain.textContent = 'Explaining.'
  const answer = await coach.ask('puzzle-explain', {
    fen: puzzle.fen,
    solutionSan: puzzle.solution.san || puzzle.solution.uci,
    line: puzzle.solution.line,
    playedSan,
    verdict,
    tags: puzzle.tags,
    origin: puzzle.external ? null : puzzleContext(puzzle).origin,
  })
  explain.textContent = answer.text
}

/** Evaluation after a candidate move, from the point of view of the mover. */
async function evaluateAfter(fen, uci) {
  const chess = new Chess(fen)
  const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  if (!move) throw new Error('illegal candidate')
  if (chess.isCheckmate()) return 10000
  const r = await state.engine.search(chess.fen(), { depth: 12, multipv: 1 })
  return -r.cp // engine reports for the side to move, which is now the opponent
}

function revealSolution() {
  const puzzle = state.currentPuzzle
  if (!puzzle) return
  state.answered = true
  state.board.disableInput()
  state.board.clearAnnotations()
  state.board.arrow(puzzle.solution.uci.slice(0, 2), puzzle.solution.uci.slice(2, 4), ARROW_TYPE.success)
  const verdict = $('drill-verdict')
  verdict.classList.remove('hidden')
  verdict.className = 'verdict no'
  verdict.textContent = `The move is ${puzzle.solution.san || puzzle.solution.uci}${puzzle.solution.line?.length > 1 ? ` (${puzzle.solution.line.slice(0, 4).join(' ')})` : ''}.`
  if (puzzle.primaryTag) {
    state.profile = recordDrill(state.profile, puzzle.primaryTag, false)
    storage.save(state.profile)
    storage.sync(state.profile)
    renderProfile()
  }
  return explainSolution(puzzle)
}

function nextDrill() {
  if (!state.queue.length) return
  state.puzzleIndex = (state.puzzleIndex + 1) % state.queue.length
  loadPuzzle(state.queue[state.puzzleIndex])
}

async function addLichessPuzzle() {
  const top = rankWeaknesses(state.profile, { limit: 1 })[0]
  if (!top) return
  const btn = $('btn-lichess')
  btn.disabled = true
  btn.textContent = 'Fetching.'
  const puzzle = await fetchLichessPuzzle(top.id)
  btn.disabled = false
  btn.textContent = 'Fetch a themed puzzle'
  if (!puzzle) {
    setCaption('No matching Lichess puzzle available right now.')
    return
  }
  state.queue.push(puzzle)
  state.puzzleIndex = state.queue.length - 1
  $('drill-empty').classList.add('hidden')
  $('drill-live').classList.remove('hidden')
  loadPuzzle(puzzle)
}

/* ---------------------------------------------------------------- profile */

function renderProfile() {
  const t = trend(state.profile)
  $('profile-trend').innerHTML = t
    ? [
        stat('Games', t.games, ''),
        stat('Avg loss', t.recentAcpl ?? '-', t.recentAcpl <= 40 ? 'good' : t.recentAcpl <= 80 ? 'warn' : 'bad'),
        stat('Change', t.acplDelta === null ? '-' : `${t.acplDelta > 0 ? '+' : ''}${t.acplDelta}`, t.acplDelta === null ? '' : t.acplDelta <= 0 ? 'good' : 'bad'),
        stat('Accuracy', t.recentAccuracy ?? '-', ''),
        stat('Blunders/game', t.blundersPerGame, t.blundersPerGame <= 0.5 ? 'good' : 'warn'),
      ].join('')
    : stat('Games', 0, '')

  drawSparkline(t?.sparkline || [])

  const ranked = rankWeaknesses(state.profile, { limit: 6 })
  $('profile-empty').classList.toggle('hidden', ranked.length > 0)
  $('weakness-list').innerHTML = ranked
    .map((w) => {
      const pct = Math.round(w.score * 100)
      return `<li>
        <div class="head">
          <span class="label">${w.label}</span>
          <span class="meta">${w.count}x / ${w.games} games${w.accuracy !== null ? ` / drills ${w.accuracy}%` : ''}</span>
        </div>
        <div class="bar"><span style="width:${Math.min(100, pct)}%"></span></div>
        <p class="muted small">${PATTERN_LIBRARY[w.id]?.why || ''}</p>
        <button class="ghost small" data-lesson="${w.id}" type="button">Build a lesson</button>
      </li>`
    })
    .join('')

  $('weakness-list').querySelectorAll('[data-lesson]').forEach((btn) => {
    btn.addEventListener('click', () => buildLesson(btn.dataset.lesson))
  })
}

function drawSparkline(values) {
  const svg = $('profile-spark')
  if (!values.length) {
    svg.innerHTML = ''
    return
  }
  const max = Math.max(...values, 10)
  const step = values.length > 1 ? 300 / (values.length - 1) : 300
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(58 - (v / max) * 54).toFixed(1)}`).join(' ')
  const last = values[values.length - 1]
  svg.innerHTML = `<polyline points="${points}"></polyline><circle cx="${((values.length - 1) * step).toFixed(1)}" cy="${(58 - (last / max) * 54).toFixed(1)}" r="3"></circle>`
}

async function buildLesson(patternId) {
  const entry = state.profile.patterns[patternId]
  $('lesson-card').classList.remove('hidden')
  $('lesson-tag').textContent = PATTERN_LIBRARY[patternId]?.label || patternId
  $('lesson-text').textContent = 'Writing the lesson.'
  const answer = await coach.ask('lesson', {
    patternId,
    label: PATTERN_LIBRARY[patternId]?.label,
    why: PATTERN_LIBRARY[patternId]?.why,
    drill: PATTERN_LIBRARY[patternId]?.drill,
    examples: entry?.examples || [],
    profile: { drillAccuracy: entry?.attempts ? Math.round((entry.correct / entry.attempts) * 100) : null },
  })
  $('lesson-text').textContent = answer.text
}

function exportProfile() {
  const blob = new Blob([JSON.stringify(state.profile, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `chess-profile-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

function resetProfile() {
  if (!confirm('Delete your weakness profile and start over?')) return
  state.profile = emptyProfile()
  storage.save(state.profile)
  storage.sync(state.profile)
  renderProfile()
}

/* ------------------------------------------------------------------- misc */

function renderMoves() {
  const history = state.chess.history()
  const classes = new Map((state.taggedMoves || []).map((m) => [m.ply, m.classification]))
  const rows = []
  for (let i = 0; i < history.length; i += 2) {
    const n = i / 2 + 1
    const white = history[i]
    const black = history[i + 1]
    const wc = classes.get(i + 1) || ''
    const bc = classes.get(i + 2) || ''
    rows.push(
      `<li><span class="num">${n}.</span><span class="san ${wc}">${white}</span>${black ? `<span class="san ${bc}">${black}</span>` : ''}</li>`,
    )
  }
  $('movelist').innerHTML = rows.join('')
  updateOpeningLabel()
}

function setCaption(text) {
  $('board-caption').textContent = text
}

function setPill(id, stateName, text) {
  const el = $(id)
  el.dataset.state = stateName
  el.textContent = text
}

$('btn-new').disabled = true
boot()
