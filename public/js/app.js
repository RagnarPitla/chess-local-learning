/**
 * Controller: play -> review -> pattern extraction -> drills -> profile,
 * plus the four surfaces layered on top of that loop: the live variation
 * panel (explorer.js), Learn (lessons.js), Library (import.js + library.js)
 * and Progress (progress.js).
 */
import { Chess } from 'chess.js'
import { Board, ARROW_TYPE, MARKER_TYPE } from './board.js'
import { Engine } from './engine.js'
import { annotateGame, findTurningPoint } from './analysis.js'
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
import { DIFFICULTY_PRESETS, trainingVariations, explore, explainVariation } from './explorer.js'
import { TRACKS, allLessons, lessonById, lessonsForTrack, recommendLessons, curriculumStats } from './lessons.js'
import {
  mountProgress,
  loadProgress,
  saveProgress,
  addXp,
  recordStudyDay,
  recordLessonEvent,
  lessonStatus,
  XP_EVENTS,
} from './progress.js'
import { mountImport } from './import.js'
import { mountLibrary, addGames, saveReview } from './library.js'
import { shouldShowOnboarding, mountOnboarding } from './landing.js'

const $ = (id) => document.getElementById(id)
const state = {
  engine: null,
  board: null,
  chess: new Chess(),
  mode: 'idle', // idle | play | review | drill | lesson | browse
  playerColour: 'w',
  elo: 1500,
  gameId: null,
  finished: false,
  thinking: false,
  annotation: null,
  turningPoint: null,
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
  liveCoach: { previousRegister: null, previousEvalCp: null, advice: null },

  /* which surface currently owns the board, so switching tabs can hand it
     back to the game instead of leaving a drill or lesson position up */
  boardOwner: 'game', // game | drill | lesson | review

  /* the variation panel */
  progress: null,
  variationLevel: 'intermediate',
  variationShowAll: false,
  variationToken: 0,
  variations: [],

  /* Learn */
  lesson: null,
  lessonIndex: 0,
  lessonAnswered: false,
  lessonTrack: 'recommended',

  /* mounted module handles */
  onboarding: null,
  progressHandle: null,
  libraryHandle: null,
  libraryMounted: false,
}

/* ------------------------------------------------------------------- boot */

async function boot() {
  state.profile = storage.load()
  const remote = await storage.loadRemote()
  if (remote && (remote.gamesPlayed || 0) > (state.profile.gamesPlayed || 0)) state.profile = remote

  // Opening the app at all is evidence of a study day: without this the
  // streak in the Progress dashboard could never leave zero.
  state.progress = recordStudyDay(loadProgress())
  saveProgress(state.progress)

  state.board = new Board($('board'), {
    onMove: handleBoardMove,
    isPromotion: (from, to) => isPromotionMove(from, to),
    onCancel: () => syncBoard(),
  })

  wireUi()
  buildTrackSelect()
  renderProfile()
  renderMoves()
  maybeShowOnboarding()

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
    retryFromTurningPoint,
    showLiveCoachAdvice,
    nextDrill,
    selectTab,
    openLesson,
    variations: () => state.variations,
    setVariationLevel,
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
  document.querySelectorAll('#main-tabs .tab').forEach((tab) => {
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
  $('btn-retry-turning').addEventListener('click', retryFromTurningPoint)
  $('btn-load-pgn').addEventListener('click', () => loadPgnGame())
  $('btn-dismiss-deviation').addEventListener('click', () => $('deviation-card').classList.add('hidden'))
  $('btn-drill-next').addEventListener('click', nextDrill)
  $('btn-drill-solution').addEventListener('click', revealSolution)
  $('btn-lichess').addEventListener('click', addLichessPuzzle)
  $('btn-export').addEventListener('click', exportProfile)
  $('btn-reset').addEventListener('click', resetProfile)

  $('sel-variation-level').addEventListener('change', (e) => setVariationLevel(e.target.value))
  $('chk-variation-all').addEventListener('change', (e) => {
    state.variationShowAll = e.target.checked
    scheduleVariations()
  })

  $('sel-track').addEventListener('change', (e) => {
    state.lessonTrack = e.target.value
    renderLessonList()
  })
  $('btn-learn-back').addEventListener('click', closeLesson)
  $('btn-learn-answer').addEventListener('click', revealLessonAnswer)
  $('btn-learn-next').addEventListener('click', nextLessonPosition)
}

const TAB_NAMES = ['play', 'learn', 'review', 'drills', 'library', 'progress', 'profile']

function selectTab(name) {
  if (!TAB_NAMES.includes(name)) return
  document.querySelectorAll('#main-tabs .tab').forEach((t) => {
    const on = t.dataset.tab === name
    t.classList.toggle('is-active', on)
    t.setAttribute('aria-selected', on ? 'true' : 'false')
  })
  document.querySelectorAll('.side-col > .panel').forEach((p) => p.classList.toggle('is-active', p.id === `panel-${name}`))

  // A lesson, a drill or a review must not leave its position and caption
  // sitting under another tab. Board work is queued, so a restore followed by
  // a lesson load now finishes in that order instead of racing.
  const wasDetour = state.boardOwner !== 'game'
  if (name !== 'learn' && state.mode === 'lesson') exitLessonMode()

  if (name === 'drills') enterDrillMode()
  else if (state.mode === 'drill') exitDrillMode()

  if (name === 'play') restorePlayBoard()
  else if (wasDetour && name !== 'drills') restorePlayBoard()
  if (name === 'learn') renderLearn()
  if (name === 'library') ensureLibraryMounted()
  if (name === 'progress') renderProgressDashboard()
  if (name === 'profile') renderProfile()
}

/** Board handovers are async, so two of them in flight at once can finish in
 *  the wrong order and leave a trailing disableInput() sitting on top of the
 *  enableInput() that was supposed to win. Run them strictly one at a time. */
let boardQueue = Promise.resolve()
function queueBoardWork(work) {
  boardQueue = boardQueue.then(work, work)
  return boardQueue
}

/** Hand the board back to the game after a drill, lesson or review detour. */
async function restorePlayBoard() {
  return queueBoardWork(() => restorePlayBoardInner())
}

async function restorePlayBoardInner() {
  if (state.boardOwner === 'game') return
  state.boardOwner = 'game'
  state.board.clearAnnotations()
  await state.board.setOrientation(state.playerColour)
  await state.board.setPosition(state.chess.fen(), false)
  // A drill or lesson may have left move input enabled; cm-chessboard throws
  // "moveInput already enabled" on a second enable, so always clear it first.
  state.board.disableInput()
  if (state.mode === 'play' && !state.finished && !state.thinking && state.chess.turn() === state.playerColour) {
    enablePlayerInput()
  } else {
    state.board.disableInput()
  }
  if ($('board-caption').textContent.startsWith('Lesson:')) {
    setCaption(state.chess.history().length ? 'Back to your game.' : 'Start a game to see the variations from every position.')
  }
}

/* ------------------------------------------------------------------- play */

async function newGame() {
  dismissOnboarding()
  const choice = $('sel-colour').value
  state.playerColour = choice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : choice
  state.chess = new Chess()
  state.mode = 'play'
  state.boardOwner = 'game'
  state.finished = false
  state.annotation = null
  state.turningPoint = null
  state.taggedMoves = []
  state.patternSummary = []
  state.deviationShown = false
  state.hintStage = 0
  resetLiveCoach()
  renderLiveCoach(null)
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

  if (state.chess.turn() === state.playerColour) {
    enablePlayerInput()
    refreshEval()
  } else engineMove()
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
  if (state.mode === 'lesson') {
    const position = currentLessonPosition()
    if (!position) return false
    const chess = new Chess(position.fen)
    return chess.moves({ verbose: true }).some((m) => m.from === from && m.to === to && m.promotion)
  }
  return state.chess.moves({ verbose: true }).some((m) => m.from === from && m.to === to && m.promotion)
}

function handleBoardMove({ from, to, promotion }) {
  if (state.mode === 'drill') return handleDrillMove({ from, to, promotion })
  if (state.mode === 'lesson') return handleLessonMove({ from, to, promotion })
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
  state.boardOwner = 'game'
  state.finished = true
  state.annotation = null
  state.turningPoint = null
  state.taggedMoves = []
  state.patternSummary = []
  resetLiveCoach()
  renderLiveCoach(null)
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
    const fen = state.chess.fen()
    const r = await state.engine.search(fen, { depth: 10, multipv: 3 })
    const white = state.chess.turn() === 'w' ? r.cp : -r.cp
    updateEvalBar(white)
    showLiveCoachAdvice({
      evalCp: state.playerColour === 'w' ? white : -white,
      mate: r.mate,
      fen,
      ply: state.chess.history().length,
      bestSan: sanFromUci(fen, r.best),
      bestLine: sanLineFromPv(fen, r.lines?.[0]?.pv || []),
      candidates: candidateAdvice(fen, r.lines || []),
    })
  } catch {
    /* eval and live coaching are cosmetic */
  }
}


function resetLiveCoach() {
  state.liveCoach = { previousRegister: null, previousEvalCp: null, advice: null }
}

function showLiveCoachAdvice(data = {}) {
  const advice = coach.liveCoachAdvice({
    ...data,
    playerColour: state.playerColour,
    previousRegister: state.liveCoach.previousRegister,
    previousEvalCp: state.liveCoach.previousEvalCp,
  })
  state.liveCoach.previousRegister = advice.register
  state.liveCoach.previousEvalCp = advice.evalCp
  if (advice.shouldSpeak && advice.text) state.liveCoach.advice = advice
  else if (!state.liveCoach.advice) state.liveCoach.advice = advice
  renderLiveCoach(advice)
  return advice
}

function renderLiveCoach(latest) {
  const card = $('live-coach-card')
  if (!card) return
  const shown = state.liveCoach?.advice
  const register = latest?.register || shown?.register || 'waiting'
  card.classList.remove('hidden', 'is-winning', 'is-fighting', 'is-lost')
  card.classList.add(liveCoachClass(register))
  $('live-coach-register').textContent = liveCoachLabel(register)
  $('live-coach-score').textContent = latest && Number.isFinite(latest.winPercent)
    ? `${latest.winPercent.toFixed(1)} percent win chance`
    : 'Waiting for the next position'
  $('live-coach-text').textContent = shown?.text || 'Play a move. I will speak when the position changes enough to matter.'
}

function liveCoachClass(register) {
  const values = coach.LIVE_COACH_REGISTERS || {}
  if (register === values.learning) return 'is-lost'
  if (register === values.fighting) return 'is-fighting'
  return 'is-winning'
}

function liveCoachLabel(register) {
  const values = coach.LIVE_COACH_REGISTERS || {}
  if (register === values.learning) return 'Point of no return'
  if (register === values.fighting) return 'Still savable'
  if (register === values.converting) return 'Play to win'
  return 'Live coach'
}

function sanFromUci(fen, uci) {
  if (!uci) return null
  try {
    const probe = new Chess(fen)
    const move = probe.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return move?.san || null
  } catch {
    return null
  }
}

function sanLineFromPv(fen, pv = []) {
  const probe = new Chess(fen)
  const line = []
  for (const uci of pv.slice(0, 5)) {
    try {
      const move = probe.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      if (!move) break
      line.push(move.san)
    } catch {
      break
    }
  }
  return line
}

function candidateAdvice(fen, lines = []) {
  return lines
    .map((line) => {
      const san = sanFromUci(fen, line.pv?.[0])
      if (!san) return null
      return { san, cp: line.cp ?? 0, mate: line.mate, line: sanLineFromPv(fen, line.pv || []) }
    })
    .filter(Boolean)
}

function updateEvalBar(cpWhite) {
  const clamped = Math.max(-800, Math.min(800, cpWhite))
  const pct = 50 + (clamped / 800) * 50
  $('evalbar-fill').style.height = `${pct}%`
  $('evalbar-label').textContent = (cpWhite / 100).toFixed(1)
}

function updateOpeningLabel() {
  const opening = lookupOpening(state.chess.history())
  const empty = state.chess.history().length ? 'out of book' : 'no moves yet'
  $('opening-name').textContent = opening ? `${opening.name} (${opening.eco})` : empty
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
  for (const id of ['review-summary-card', 'coach-card', 'mistakes-card', 'turning-point-card']) $(id).classList.add('hidden')
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
    state.turningPoint = findTurningPoint({ ...annotation, moves: tagged })
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
    recordProgress((p) => addXp(p, { type: XP_EVENTS.GAME_REVIEWED }))

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

  renderTurningPoint()

  const mistakes = state.taggedMoves
    .filter((m) => m.isPlayer && ['blunder', 'mistake', 'inaccuracy'].includes(m.classification))
    .sort((a, b) => b.loss - a.loss)

  const turningPly = state.turningPoint?.status === 'found' ? state.turningPoint.highlightPly : null
  const reviewMoves = [...mistakes]
  if (turningPly && !reviewMoves.some((m) => m.ply === turningPly)) {
    const turningMove = state.taggedMoves.find((m) => m.ply === turningPly)
    if (turningMove) reviewMoves.unshift(turningMove)
  }

  $('mistakes-card').classList.toggle('hidden', reviewMoves.length === 0)
  $('mistake-list').innerHTML = reviewMoves
    .map((m, i) => {
      const isTurning = m.ply === turningPly
      const label = isTurning ? 'point of no return' : (m.tags?.[0]?.label || m.classification)
      return `<li data-ply="${m.ply}" class="${i === 0 ? 'is-active' : ''}${isTurning ? ' is-turning-point' : ''}">
        <span class="dot ${m.classification}"></span>
        <span class="move">${m.moveNumber}${m.colour === 'w' ? '.' : '...'} ${m.san}</span>
        <span class="muted small">${label}</span>
        <span class="loss">-${(m.loss / 100).toFixed(1)}</span>
      </li>`
    })
    .join('')

  $('mistake-list').querySelectorAll('li').forEach((li) => {
    li.addEventListener('click', () => showMistake(Number(li.dataset.ply), li))
  })
  if (reviewMoves.length) showMistake(reviewMoves[0].ply, $('mistake-list').querySelector('li'))
}


function renderTurningPoint() {
  const tp = state.turningPoint
  const card = $('turning-point-card')
  if (!tp || !card) return
  card.classList.remove('hidden', 'is-found')
  if (tp.status === 'found') card.classList.add('is-found')
  $('turning-point-kind').textContent = tp.status === 'found' ? (tp.kind || 'found') : tp.status
  $('turning-point-text').textContent = tp.explanation || 'No turning point was found.'
  const moveText = tp.status === 'found'
    ? `Move ${tp.moveNumber || tp.ply}: ${tp.playedMove?.san || 'unknown move'}. Better was ${tp.bestSan || 'unknown'}.`
    : 'No retry position is available for this review.'
  $('turning-point-move').textContent = moveText
  const btn = $('btn-retry-turning')
  btn.disabled = !(tp.status === 'found' && tp.retryFen)
}

async function retryFromTurningPoint() {
  const tp = state.turningPoint
  if (!tp || tp.status !== 'found' || !tp.retryFen) return false
  dismissOnboarding()
  const playedSan = tp.playedMove?.san || 'the game move'
  state.chess = new Chess(tp.retryFen)
  state.mode = 'play'
  state.boardOwner = 'game'
  state.finished = false
  state.thinking = false
  state.annotation = null
  state.turningPoint = null
  state.taggedMoves = []
  state.patternSummary = []
  state.puzzles = []
  state.queue = []
  state.currentPuzzle = null
  state.hintStage = 0
  resetLiveCoach()
  renderLiveCoach(null)
  hideReviewCards()
  renderMoves()
  updateEvalBar(0)
  $('btn-finish').disabled = false
  $('btn-takeback').disabled = true
  $('btn-hint').disabled = false
  $('btn-review').disabled = true
  $('review-status').textContent = 'Retry loaded. Play this position differently, then review the new line.'
  await state.engine.newGame()
  await queueBoardWork(async () => {
    state.board.clearAnnotations()
    await state.board.setOrientation(state.playerColour)
    await state.board.setPosition(state.chess.fen(), false)
    state.board.disableInput()
    if (state.chess.turn() === state.playerColour) state.board.enableInput(state.playerColour)
  })
  setCaption(`Retry from the point of no return: play something better than ${playedSan}.`)
  selectTab('play')
  if (state.chess.turn() !== state.playerColour) engineMove()
  else refreshEval()
  return true
}

function stat(k, v, cls) {
  return `<div class="stat ${cls}"><div class="v">${v}</div><div class="k">${k}</div></div>`
}

async function showMistake(ply, li) {
  const move = state.taggedMoves.find((m) => m.ply === ply)
  if (!move) return
  $('mistake-list').querySelectorAll('li').forEach((el) => el.classList.toggle('is-active', el === li))

  await queueBoardWork(async () => {
    state.mode = 'browse'
    state.boardOwner = 'review'
    state.board.disableInput()
    state.board.clearAnnotations()
    await state.board.setPosition(move.fenBefore, true)
    state.board.arrow(move.uci.slice(0, 2), move.uci.slice(2, 4), ARROW_TYPE.danger)
    if (move.bestMove) state.board.arrow(move.bestMove.slice(0, 2), move.bestMove.slice(2, 4), ARROW_TYPE.success)
  })
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
    // There is nothing to drill, so the board must not keep the position it
    // was left with, unplayable, from wherever the student came from.
    restorePlayBoard()
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
  state.boardOwner = 'drill'

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
  recordProgress((p) => addXp(p, { type: XP_EVENTS.DRILL, correct: grade.correct }))

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
  recordProgress((p) => addXp(p, { type: XP_EVENTS.DRILL, correct: false }))
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
  const turningPly = state.turningPoint?.status === 'found' ? state.turningPoint.highlightPly : null
  const rows = []
  for (let i = 0; i < history.length; i += 2) {
    const n = i / 2 + 1
    const white = history[i]
    const black = history[i + 1]
    const wc = `${classes.get(i + 1) || ''}${turningPly === i + 1 ? ' turning-point' : ''}`.trim()
    const bc = `${classes.get(i + 2) || ''}${turningPly === i + 2 ? ' turning-point' : ''}`.trim()
    rows.push(
      `<li><span class="num">${n}.</span><span class="san ${wc}">${white}</span>${black ? `<span class="san ${bc}">${black}</span>` : ''}</li>`,
    )
  }
  $('movelist').innerHTML = rows.join('')
  updateOpeningLabel()
  scheduleVariations()
}

function setCaption(text) {
  $('board-caption').textContent = text
}

function setPill(id, stateName, text) {
  const el = $(id)
  el.dataset.state = stateName
  el.textContent = text
}

/* =================================================== the variation panel
 *
 * The core of the product. Lessons teach a tree ("if they play X, you play
 * Y"); opponents play a graph. So instead of one memorised line, this shows
 * the live branching structure of whatever position is actually on the
 * board: what is playable, what it is called, where it leads, why you would
 * choose it, and whether it is even in the book at all.
 *
 * DIFFICULTY_PRESETS drives how many lines are shown (3/5/7/9). Note that
 * explorer.js keeps `count` and `level` independent on purpose, so the
 * count has to be passed explicitly from the preset - setting the level
 * alone would silently leave the count at the default 5.
 * ==================================================================== */

const VARIATION_ARROW = { main: ARROW_TYPE.success, book: ARROW_TYPE.secondary, novelty: ARROW_TYPE.warning }

function setVariationLevel(level) {
  if (!Object.prototype.hasOwnProperty.call(DIFFICULTY_PRESETS, level)) return
  state.variationLevel = level
  const select = $('sel-variation-level')
  if (select.value !== level) select.value = level
  scheduleVariations()
}

/* Classifying a position walks a 340 KB opening book, so the panel is rebuilt
 * on a macrotask rather than inline. That keeps a move, a takeback or a review
 * sweep responsive, and coalesces the burst of renderMoves() calls a review
 * makes into a single rebuild for the final position. */
let variationTimer = 0

function scheduleVariations() {
  if (variationTimer) return
  variationTimer = setTimeout(() => {
    variationTimer = 0
    updateVariations()
  }, 0)
}

/** Recompute and repaint the panel for the position now on the board.
 *  Fire-and-forget: a token guards against an older run painting over a
 *  newer one if two moves land close together. */
async function updateVariations() {
  const token = ++state.variationToken
  const sanMoves = state.chess.history()
  const level = state.variationLevel
  const preset = DIFFICULTY_PRESETS[level]
  const count = preset.variations

  $('variation-level-blurb').textContent = preset.description

  let full
  try {
    // live:false keeps this instant and fully offline - the Lichess explorer
    // is best-effort enrichment and is not worth a network round trip here.
    full = await explore({ sanMoves, live: false })
  } catch {
    return
  }
  if (token !== state.variationToken) return

  const entries = state.variationShowAll
    ? full.moves
    : trainingVariations({ sanMoves, level, count })

  state.variations = entries
  renderVariations(entries, full)
}

function renderVariations(entries, full) {
  const position = full.position
  const list = $('variation-list')
  const sideToMove = state.chess.turn() === 'w' ? 'White' : 'Black'

  $('variation-position').textContent = positionLabel(position, sideToMove)

  const theoryCount = entries.filter(isTheory).length
  const pastCount = entries.length - theoryCount
  const noun = state.variationShowAll
    ? `legal ${entries.length === 1 ? 'move' : 'moves'}`
    : `${entries.length === 1 ? 'line' : 'lines'}`
  const split = theoryCount && pastCount ? ` - ${theoryCount} theory, ${pastCount} past book` : ''
  $('variation-count').textContent = `${entries.length} ${noun}${split}`

  $('variation-empty').classList.toggle('hidden', entries.length > 0)

  const plans = position.plans
  const planSide = state.chess.turn() === 'w' ? 'white' : 'black'
  const planText = plans?.[planSide]?.length ? `Plan here: ${plans[planSide].join('. ')}.` : ''
  const breaks = plans?.breaks?.length ? ` Pawn breaks: ${plans.breaks.join('; ')}.` : ''
  $('variation-plans').textContent = `${planText}${breaks}`
  $('variation-plans').classList.toggle('hidden', !planText)

  const rows = entries.map((entry, i) => variationRow(entry, position, i))
  const cut = theoryEndIndex(entries)
  if (cut !== -1) rows.splice(cut, 0, theoryDivider(position))
  list.replaceChildren(...rows)
}

/** Index of the first past-the-book entry, but only when the set really is
 *  theory-first-then-not. Anything interleaved gets no divider rather than a
 *  misleading one. */
function theoryEndIndex(entries) {
  const cut = entries.findIndex((e) => !isTheory(e))
  if (cut <= 0) return -1
  return entries.slice(cut).every((e) => !isTheory(e)) ? cut : -1
}

/** The moment the opening book stops having an opinion - the whole point of
 *  the product, so the panel says it out loud instead of leaving the learner
 *  to infer it from a dashed border. */
function theoryDivider(position) {
  const li = document.createElement('li')
  li.className = 'var-divider'
  li.setAttribute('role', 'separator')

  const label = document.createElement('span')
  label.className = 'var-divider-label'
  label.textContent = 'End of theory'

  const note = document.createElement('span')
  note.className = 'var-divider-note'
  note.textContent = position?.inBook
    ? 'Below: sound moves past the book, not memorised lines'
    : 'Below: sound moves, no book to follow'

  li.append(label, note)
  return li
}

/** A named node without an ECO entry is not out of book, so only trust
 *  position.inBook for that verdict, never the absence of a name. */
function positionLabel(position, sideToMove) {
  if (position.name) {
    const eco = position.eco ? ` (${position.eco})` : ''
    const via = position.inherited ? ', by transposition' : ''
    return `${position.name}${eco}${via} - ${sideToMove} to move`
  }
  if (position.inBook) return `Book position, not named yet - ${sideToMove} to move`
  return `Out of book - ${sideToMove} to move`
}

/* Theory vs past-the-book.
 *
 * explorer.js marks every entry it returns with isBook. Real opening theory is
 * isBook:true; the moves it adds to fill a difficulty preset once the book runs
 * out are isBook:false (and carry novelty:true, name:null). That single field is
 * the whole basis of the visual distinction below - the panel must never imply
 * a topped-up move is documented theory. */
function isTheory(entry) {
  return entry.isBook === true
}

function variationClass(entry) {
  if (!isTheory(entry)) return 'novelty'
  if (entry.isMain) return 'main'
  return 'book'
}

function variationBadge(entry, position) {
  if (!isTheory(entry)) return position?.inBook ? 'beyond the book' : 'off book'
  if (entry.isMain) return 'main line'
  const pct = Math.round((entry.share || 0) * 100)
  return pct >= 15 ? 'known alternative' : 'sideline'
}

function isSharp(entry) {
  return /gambit|sacrifice/i.test(entry.name || '')
}

function variationRow(entry, position, index) {
  const kind = variationClass(entry)
  const li = document.createElement('li')
  li.className = `var-item is-${kind}`
  li.dataset.uci = entry.uci || ''
  li.dataset.san = entry.san

  const head = document.createElement('div')
  head.className = 'var-head'

  const san = document.createElement('span')
  san.className = 'var-san'
  san.textContent = entry.san

  const name = document.createElement('span')
  name.className = 'var-name'
  name.textContent = entry.name || ''

  const badge = document.createElement('span')
  badge.className = `var-badge is-${kind}`
  badge.textContent = variationBadge(entry, position)

  head.append(san)
  if (entry.name) head.append(name)
  head.append(badge)

  const meta = document.createElement('div')
  meta.className = 'var-meta'
  const bits = []
  if (entry.eco) bits.push(entry.eco)
  if (isTheory(entry) && entry.lineCount) bits.push(`${Math.round((entry.share || 0) * 100)}% of book lines here`)
  if (!isTheory(entry)) bits.push('not in the book')
  if (isSharp(entry)) bits.push('sharp')
  if (entry.level && !state.variationShowAll) bits.push(`${entry.level} set`)
  for (const bit of bits) {
    const chip = document.createElement('span')
    chip.className = 'var-metabit'
    chip.textContent = bit
    meta.append(chip)
  }

  const line = document.createElement('p')
  line.className = 'var-line'
  line.textContent = formatSampleLine(entry)
  const hasLine = (entry.sampleLine || []).length > 1

  const why = document.createElement('p')
  why.className = 'var-why'
  why.textContent = entry.whyThisOne || explainVariation(entry, position)

  const actions = document.createElement('div')
  actions.className = 'var-actions'

  const showBtn = document.createElement('button')
  showBtn.type = 'button'
  showBtn.className = 'ghost small'
  showBtn.textContent = 'Show on board'
  showBtn.addEventListener('click', () => previewVariation(entry))
  actions.append(showBtn)

  if (canPlayVariation()) {
    const playBtn = document.createElement('button')
    playBtn.type = 'button'
    playBtn.className = 'ghost small'
    playBtn.textContent = 'Play it'
    playBtn.addEventListener('click', () => playVariation(entry))
    actions.append(playBtn)
  }

  if (!entry.whyThisOne) {
    const explainBtn = document.createElement('button')
    explainBtn.type = 'button'
    explainBtn.className = 'ghost small'
    explainBtn.textContent = 'Explain'
    explainBtn.addEventListener('click', () => {
      why.textContent = explainVariation(entry, position)
    })
    actions.append(explainBtn)
  }

  li.append(head)
  if (bits.length) li.append(meta)
  if (hasLine) li.append(line)
  li.append(why, actions)
  if (index === 0) li.classList.add('is-first')
  return li
}

function formatSampleLine(entry) {
  const line = entry.sampleLine || [entry.san]
  const startPly = state.chess.history().length
  const parts = []
  for (let i = 0; i < line.length; i++) {
    const ply = startPly + i
    if (ply % 2 === 0) parts.push(`${ply / 2 + 1}.`)
    else if (i === 0) parts.push(`${Math.floor(ply / 2) + 1}...`)
    parts.push(line[i])
  }
  return line.length > 1 ? `Leads to ${parts.join(' ')}` : `Continues ${parts.join(' ')}`
}

function canPlayVariation() {
  return (
    state.mode === 'play' &&
    state.boardOwner === 'game' &&
    !state.finished &&
    !state.thinking &&
    state.chess.turn() === state.playerColour
  )
}

function previewVariation(entry) {
  if (state.boardOwner !== 'game') restorePlayBoard()
  if (!entry.uci || entry.uci.length < 4) return
  state.board.clearAnnotations()
  state.board.arrow(entry.uci.slice(0, 2), entry.uci.slice(2, 4), VARIATION_ARROW[variationClass(entry)])
  state.board.markSquares([entry.uci.slice(0, 2)], MARKER_TYPE.square)
  setCaption(`${entry.san}: ${entry.name || 'not in the book from here'}.`)
  $('variation-list')
    .querySelectorAll('.var-item')
    .forEach((el) => el.classList.toggle('is-selected', el.dataset.san === entry.san))
}

function playVariation(entry) {
  if (!canPlayVariation()) return
  let move
  try {
    move = state.chess.move(entry.san)
  } catch {
    return
  }
  if (!move) return
  afterPlayerMove(move)
}

/* ============================================================== Learn
 *
 * lessons.js is deliberately pure data plus pure functions, so the whole
 * teaching surface is built here: browse a track, read the idea, then play
 * each position on the real board. Every attempt is fed to
 * recordLessonEvent so the Progress dashboard has something to show.
 * ==================================================================== */

function buildTrackSelect() {
  const select = $('sel-track')
  const options = [
    { id: 'recommended', label: 'Recommended for you' },
    { id: 'all', label: 'All lessons' },
    ...TRACKS.map((t) => ({ id: t.id, label: t.label })),
  ]
  select.replaceChildren(
    ...options.map((o) => {
      const opt = document.createElement('option')
      opt.value = o.id
      opt.textContent = o.label
      return opt
    }),
  )
  select.value = state.lessonTrack
}

function renderLearn() {
  const stats = curriculumStats()
  $('learn-stats').textContent = `${stats.lessons} lessons / ${stats.positions} positions`
  renderLessonList()
}

function lessonsForCurrentTrack() {
  if (state.lessonTrack === 'all') return allLessons()
  if (state.lessonTrack === 'recommended') return recommendLessons(state.profile, { limit: 8 }).map((r) => r.lesson)
  return lessonsForTrack(state.lessonTrack)
}

function currentTrackBlurb() {
  if (state.lessonTrack === 'recommended') {
    return 'Ranked against your own weakness profile: the patterns that have actually cost you points come first.'
  }
  if (state.lessonTrack === 'all') return 'The whole curriculum, in track order.'
  return TRACKS.find((t) => t.id === state.lessonTrack)?.blurb || ''
}

function renderLessonList() {
  $('learn-track-blurb').textContent = currentTrackBlurb()
  const reasons = new Map()
  if (state.lessonTrack === 'recommended') {
    for (const rec of recommendLessons(state.profile, { limit: 8 })) reasons.set(rec.lesson.id, rec.reason)
  }

  const list = $('lesson-list')
  const lessons = lessonsForCurrentTrack()
  list.replaceChildren(
    ...lessons.map((lesson) => {
      const status = lessonStatus(state.progress, lesson.id)
      const li = document.createElement('li')
      li.className = 'lesson-item'
      li.dataset.mastery = status.mastery

      const head = document.createElement('div')
      head.className = 'lesson-head'

      const title = document.createElement('span')
      title.className = 'lesson-title'
      title.textContent = lesson.title

      const level = document.createElement('span')
      level.className = 'chip'
      level.textContent = lesson.level

      head.append(title, level)

      const meta = document.createElement('p')
      meta.className = 'lesson-meta'
      meta.textContent = `${lesson.positions.length} position${lesson.positions.length === 1 ? '' : 's'} / ${status.mastery}`

      const summary = document.createElement('p')
      summary.className = 'lesson-summary'
      summary.textContent = lesson.summary

      li.append(head, meta, summary)

      if (reasons.has(lesson.id)) {
        const why = document.createElement('p')
        why.className = 'lesson-why'
        why.textContent = reasons.get(lesson.id)
        li.append(why)
      }

      const open = document.createElement('button')
      open.type = 'button'
      open.className = 'ghost small'
      open.textContent = status.started ? 'Continue lesson' : 'Start lesson'
      open.addEventListener('click', () => openLesson(lesson.id))
      const row = document.createElement('div')
      row.className = 'row'
      row.append(open)
      li.append(row)
      return li
    }),
  )
}

function openLesson(lessonId) {
  const lesson = lessonById(lessonId)
  if (!lesson) return false
  state.lesson = lesson
  state.lessonIndex = 0
  selectTab('learn')

  $('learn-browse-card').classList.add('hidden')
  $('learn-lesson-card').classList.remove('hidden')
  $('learn-lesson-track').textContent = TRACKS.find((t) => t.id === lesson.track)?.label || lesson.track
  $('learn-lesson-level').textContent = lesson.level
  $('learn-lesson-title').textContent = lesson.title
  $('learn-lesson-summary').textContent = lesson.summary
  fillList($('learn-ideas'), lesson.ideas)
  fillList($('learn-pitfalls'), lesson.pitfalls)

  const nextRow = $('learn-next-row')
  const nextIds = (lesson.nextIds || []).map(lessonById).filter(Boolean)
  $('learn-next-head').classList.toggle('hidden', nextIds.length === 0)
  nextRow.replaceChildren(
    ...nextIds.map((next) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ghost small'
      btn.textContent = next.title
      btn.addEventListener('click', () => openLesson(next.id))
      return btn
    }),
  )

  loadLessonPosition(0)
  return true
}

function closeLesson() {
  exitLessonMode()
  state.lesson = null
  // Without this the board keeps the lesson position, the lesson caption and
  // no move input while the browse list is showing.
  restorePlayBoard()
  $('learn-lesson-card').classList.add('hidden')
  $('learn-browse-card').classList.remove('hidden')
  renderLessonList()
}

function exitLessonMode() {
  if (state.mode === 'lesson') state.mode = state.finished ? 'idle' : 'play'
  queueBoardWork(() => state.board.disableInput())
}

function currentLessonPosition() {
  return state.lesson?.positions?.[state.lessonIndex] || null
}

async function loadLessonPosition(index) {
  return queueBoardWork(() => loadLessonPositionInner(index))
}

async function loadLessonPositionInner(index) {
  const lesson = state.lesson
  if (!lesson) return
  state.lessonIndex = Math.max(0, Math.min(index, lesson.positions.length - 1))
  state.lessonAnswered = false
  state.mode = 'lesson'
  state.boardOwner = 'lesson'

  const position = currentLessonPosition()
  const status = lessonStatus(state.progress, lesson.id)
  $('learn-lesson-progress').textContent = `${status.correct}/${lesson.positions.length} solved`
  $('learn-pos-counter').textContent = `Position ${state.lessonIndex + 1} of ${lesson.positions.length}`
  $('learn-pos-side').textContent = `${position.sideToMove === 'w' ? 'White' : 'Black'} to move`
  $('learn-prompt').textContent = position.prompt
  $('learn-verdict').classList.add('hidden')
  $('learn-explain').classList.add('hidden')
  $('btn-learn-next').textContent =
    state.lessonIndex < lesson.positions.length - 1 ? 'Next position' : 'Finish lesson'

  state.board.clearAnnotations()
  await state.board.setOrientation(position.sideToMove)
  await state.board.setPosition(position.fen, true)
  // The board may still be accepting input for a game in progress; cm-chessboard
  // throws "moveInput already enabled" if you enable it twice.
  state.board.disableInput()
  state.board.enableInput(position.sideToMove)
  setCaption(`Lesson: ${lesson.title}. ${position.sideToMove === 'w' ? 'White' : 'Black'} to move - play your answer on the board.`)
}

function handleLessonMove({ from, to, promotion }) {
  const position = currentLessonPosition()
  if (!position || state.lessonAnswered) return false
  const chess = new Chess(position.fen)
  let move
  try {
    move = chess.move({ from, to, promotion: promotion || 'q' })
  } catch {
    return false
  }
  if (!move) return false
  gradeLessonMove(move)
  return true
}

/** SAN comparison that ignores check, mate and annotation glyphs, so Nf7+
 *  and Nf7 are the same answer. */
function bareSan(san) {
  return String(san || '').replace(/[+#!?]/g, '')
}

function gradeLessonMove(move) {
  const lesson = state.lesson
  const position = currentLessonPosition()
  const correct = bareSan(move.san) === bareSan(position.answer)
  state.lessonAnswered = true
  state.board.disableInput()
  state.board.clearAnnotations()
  state.board.markMove(move.from, move.to)

  const verdict = $('learn-verdict')
  verdict.classList.remove('hidden')
  verdict.className = `verdict ${correct ? 'ok' : 'no'}`
  verdict.textContent = correct
    ? `Correct: ${move.san} is the move.`
    : `Not quite. You played ${move.san}; the lesson move is ${position.answer}.`

  if (!correct) showLessonAnswerArrow(position)

  const explain = $('learn-explain')
  explain.classList.remove('hidden')
  explain.textContent = position.explanation

  recordLessonAttempt(lesson, correct)
}

function showLessonAnswerArrow(position) {
  try {
    const chess = new Chess(position.fen)
    const answer = chess.move(position.answer)
    if (answer) state.board.arrow(answer.from, answer.to, ARROW_TYPE.success)
  } catch {
    /* an unplayable answer is a content bug, not a reason to break the UI */
  }
}

function revealLessonAnswer() {
  const lesson = state.lesson
  const position = currentLessonPosition()
  if (!lesson || !position || state.lessonAnswered) return
  state.lessonAnswered = true
  state.board.disableInput()
  state.board.clearAnnotations()
  showLessonAnswerArrow(position)

  const verdict = $('learn-verdict')
  verdict.classList.remove('hidden')
  verdict.className = 'verdict no'
  verdict.textContent = `The move is ${position.answer}.`
  const explain = $('learn-explain')
  explain.classList.remove('hidden')
  explain.textContent = position.explanation

  recordLessonAttempt(lesson, false)
}

/* progress.js derives its canonical position key as
 *   pos.id ?? pos.positionId ?? pos.fen ?? index
 * and a lessons.js position carries only `fen`, so the FEN is the key the
 * curriculum rollup will look for. Passing the array index instead records
 * the attempt but leaves curriculumProgress reporting 0 of 46 forever. */
function recordLessonAttempt(lesson, correct) {
  const position = currentLessonPosition()
  if (!position) return
  recordProgress((p) =>
    recordLessonEvent(p, { lessonId: lesson.id, positionId: position.fen, correct }),
  )
  const status = lessonStatus(state.progress, lesson.id)
  $('learn-lesson-progress').textContent = `${status.correct}/${lesson.positions.length} solved`
  if (status.correct >= lesson.positions.length && status.total >= lesson.positions.length) {
    recordProgress((p) => addXp(p, { type: XP_EVENTS.LESSON_COMPLETED }))
  }
}

function nextLessonPosition() {
  const lesson = state.lesson
  if (!lesson) return
  if (state.lessonIndex < lesson.positions.length - 1) {
    loadLessonPosition(state.lessonIndex + 1)
    return
  }
  closeLesson()
}

function fillList(el, items) {
  el.replaceChildren(
    ...(items || []).map((text) => {
      const li = document.createElement('li')
      li.textContent = text
      return li
    }),
  )
}

/* ============================================================ Library */

function ensureLibraryMounted() {
  if (state.libraryMounted) {
    state.libraryHandle?.refresh?.()
    return
  }
  state.libraryMounted = true

  mountImport($('import-mount'), {
    onGamesAdded: async (result) => {
      try {
        await addGames(result.games || [])
      } catch (err) {
        setCaption(`Could not save those games: ${err.message}`)
      }
      await state.libraryHandle?.refresh?.()
    },
    onReviewRequested: (game) => reviewLibraryGame(game),
  })

  state.libraryHandle = mountLibrary($('library-mount'), {
    onSelectGame: (game) => openLibraryGame(game),
    onReviewRequested: (game) => reviewLibraryGame(game),
  })
}

async function openLibraryGame(game) {
  const ok = await loadPgnGame(game.pgn, game.colour || 'w')
  if (ok) selectTab('review')
  return ok
}

/** Load a library game into the trainer, review it, and write the summary
 *  back so the library can show it as reviewed. Returns a promise because
 *  library.js awaits this when running its whole-library review queue. */
async function reviewLibraryGame(game) {
  const ok = await loadPgnGame(game.pgn, game.colour || 'w')
  if (!ok) throw new Error('That game could not be loaded from the library.')
  selectTab('review')
  await runReview()
  if (!state.annotation) throw new Error('The review did not complete.')
  if (!game.id) return
  try {
    await saveReview(game.id, {
      summary: state.annotation.summary,
      patterns: state.patternSummary.map((p) => ({ id: p.id, count: p.count, cost: p.cost })),
      reviewedWith: 'stockfish-18',
    })
  } catch {
    /* a game reviewed but not flagged is a cosmetic loss, not a failure */
  }
}

/* =========================================================== Progress */

/** Single funnel for every progress mutation: apply, persist, refresh the
 *  dashboard. Mounting the dashboard without calling these would leave XP
 *  and streaks permanently at zero. */
function recordProgress(mutate) {
  state.progress = mutate(state.progress)
  saveProgress(state.progress)
  state.progressHandle?.refresh?.()
}

function renderProgressDashboard() {
  state.progressHandle = mountProgress($('progress-mount'), {
    profile: state.profile,
    lessons: allLessons(),
    onAction: handleProgressAction,
  })
}

function handleProgressAction(action) {
  if (!action) return
  if (action.type === 'lesson' && action.lessonId && openLesson(action.lessonId)) return
  if (action.type === 'drill') {
    selectTab('drills')
    return
  }
  selectTab('play')
}

/* ========================================================= onboarding */

function maybeShowOnboarding() {
  if (!shouldShowOnboarding()) return
  const backdrop = $('onboarding-backdrop')
  backdrop.classList.remove('hidden')
  state.onboarding = mountOnboarding($('onboarding-mount'), {
    onDone: () => {
      backdrop.classList.add('hidden')
      state.onboarding = null
    },
  })
}

function dismissOnboarding() {
  state.onboarding?.close?.()
  state.onboarding = null
  $('onboarding-backdrop').classList.add('hidden')
}

$('btn-new').disabled = true
boot()
