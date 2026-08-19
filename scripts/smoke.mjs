#!/usr/bin/env node
/**
 * End to end smoke test.
 *
 * Boots the app server, drives a real headless Chrome over the DevTools
 * protocol and walks the whole learning loop: engine load, play a move,
 * import a PGN, review it, generate drills, answer one.
 *
 * No test framework and no browser automation dependency: Chrome is spawned
 * directly and controlled through the WebSocket that ships with Node 22.
 *
 *   node scripts/smoke.mjs [--headful]
 */

import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const APP_PORT = Number(process.env.SMOKE_PORT || 5199)
const ORIGIN = `http://127.0.0.1:${APP_PORT}/`
// The trainer lives at /app/ in both dev and the deploy artifact; / is the
// landing page. See the route-parity note in server.js.
const APP_URL = `${ORIGIN}app/`
const HEADFUL = process.argv.includes('--headful')

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

/* A real game with a real mistake: the Fried Liver, seen from Black's side.
   5...Nxd5 is the classic error that hands White a strong attack. */
const SAMPLE_PGN = `[Event "Smoke test"]
[White "Engine"]
[Black "Student"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7 Kxf7 7. Qf3+ Ke6
8. Nc3 *`

const LOST_PGN = `[Event "Smoke lost game"]
[White "Student"]
[Black "Engine"]
[Result "0-1"]

1. f3 e5 2. g4 Qh4# 0-1`

const results = []
let failures = 0

function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`  [${mark}] ${name}${detail ? ` - ${detail}` : ''}`)
  if (!ok) failures += 1
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return await res.json()
    } catch {
      /* not up yet */
    }
    await sleep(120)
  }
  throw new Error(`timed out waiting for ${url}`)
}

/* ------------------------------------------------------------ cdp client */

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.consoleErrors = []
    this.pageErrors = []

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id !== undefined) {
        const entry = this.pending.get(msg.id)
        if (!entry) return
        this.pending.delete(msg.id)
        if (msg.error) entry.reject(new Error(`${msg.error.message} (${entry.method})`))
        else entry.resolve(msg.result)
        return
      }
      this.onEvent(msg)
    })
  }

  static async attach(wsUrl) {
    const ws = new WebSocket(wsUrl)
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true })
      ws.addEventListener('error', () => reject(new Error('devtools socket failed')), { once: true })
    })
    return new Cdp(ws)
  }

  onEvent(msg) {
    if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'assert')) {
      this.consoleErrors.push(msg.params.args.map(describeRemote).join(' '))
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails
      this.pageErrors.push(d.exception?.description || d.text || 'unknown exception')
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      this.consoleErrors.push(`${msg.params.entry.source}: ${msg.params.entry.text}`)
    }
  }

  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method })
      this.ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} timed out`))
      }, 180000)
    })
  }

  async eval(fn, { awaitPromise = true, args = [] } = {}) {
    const res = await this.send('Runtime.evaluate', {
      expression: `(${fn}).apply(null, ${JSON.stringify(args)})`,
      awaitPromise,
      returnByValue: true,
      userGesture: true,
    })
    if (res.exceptionDetails) {
      const d = res.exceptionDetails
      throw new Error(d.exception?.description || d.text)
    }
    return res.result.value
  }

  async waitFor(fn, { timeout = 30000, label = 'condition' } = {}) {
    const deadline = Date.now() + timeout
    let last
    while (Date.now() < deadline) {
      last = await this.eval(fn, { awaitPromise: false })
      if (last) return last
      await sleep(200)
    }
    throw new Error(`timed out waiting for ${label}`)
  }

  close() {
    try {
      this.ws.close()
    } catch {
      /* already gone */
    }
  }
}

function describeRemote(arg) {
  if (arg.value !== undefined) return String(arg.value)
  return arg.description || arg.type
}

/* ---------------------------------------------------------------- runner */

async function main() {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p))
  if (!chromePath) throw new Error('no Chrome or Edge found; set CHROME_PATH')
  const nodeBin = existsSync(process.execPath) ? process.execPath : 'node'

  console.log(`\nchess-local-learning smoke test\n  chrome: ${chromePath}`)

  const smokeRoot = join(root, '.smoke-runtime')
  const runId = `${Date.now()}-${process.pid}`
  const dataDir = join(smokeRoot, `data-${runId}`)
  const profileDir = join(smokeRoot, `chrome-${runId}`)
  await mkdir(dataDir, { recursive: true })
  await mkdir(profileDir, { recursive: true })

  const server = spawn(nodeBin, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(APP_PORT), DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const serverLog = []
  server.stdout.on('data', (d) => serverLog.push(String(d)))
  server.stderr.on('data', (d) => serverLog.push(String(d)))

  const debugPort = APP_PORT + 1
  let chrome
  let cdp

  try {
    const health = await waitForHttp(`${ORIGIN}api/health`, 15000)
    record('server boots and reports health', health.ok === true, `engine ${health.engine.build}`)

    chrome = spawn(
      chromePath,
      [
        HEADFUL ? '--no-sandbox' : '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--mute-audio',
        `--user-data-dir=${profileDir}`,
        `--remote-debugging-port=${debugPort}`,
        'about:blank',
      ],
      { stdio: 'ignore' },
    )

    await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`, 20000)
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()
    const page = targets.find((t) => t.type === 'page')
    if (!page) throw new Error('no page target in Chrome')

    cdp = await Cdp.attach(page.webSocketDebuggerUrl)
    await cdp.send('Runtime.enable')
    await cdp.send('Log.enable')
    await cdp.send('Page.enable')
    await cdp.send('Page.navigate', { url: APP_URL })

    await cdp.waitFor(() => document.readyState === 'complete', { timeout: 20000, label: 'page load' })

    /* 1. modules load and the engine comes up */
    await cdp.waitFor(() => Boolean(window.chessCoach), { timeout: 90000, label: 'app boot' })
    const pill = await cdp.eval(() => document.getElementById('pill-engine').textContent)
    record('stockfish wasm loads in the browser', pill === 'engine: stockfish 18', pill)

    const squares = await cdp.eval(
      () => new Set([...document.querySelectorAll('#board [data-square]')].map((e) => e.dataset.square)).size,
    )
    record('board renders 64 squares', squares === 64, `${squares} distinct squares`)

    const pieces = await cdp.eval(
      () => document.querySelectorAll('#board [data-piece], #board .piece, #board use').length,
    )
    record('starting pieces render', pieces >= 32, `${pieces} piece nodes`)

    /* 2. play a move and get an engine reply */
    await cdp.eval(() => window.chessCoach.newGame())
    const mode = await cdp.eval(() => window.chessCoach.state.mode)
    record('new game enters play mode', mode === 'play', mode)

    const accepted = await cdp.eval(() => window.chessCoach.playSan('e4'), { awaitPromise: false })
    record('player move accepted', accepted === true)

    await cdp.waitFor(
      () => window.chessCoach.state.chess.history().length >= 2 && !window.chessCoach.state.thinking,
      { timeout: 45000, label: 'engine reply' },
    )
    const history = await cdp.eval(() => window.chessCoach.state.chess.history())
    record('engine answers with a legal move', history.length === 2 && history[0] === 'e4', history.join(' '))

    const evalHeight = await cdp.eval(() => document.getElementById('evalbar-fill').style.height)
    record('evaluation bar updates', Boolean(evalHeight), evalHeight)

    const liveCoachText = await cdp.waitFor(
      () => {
        const el = document.getElementById('live-coach-text')
        return el && el.textContent.trim().length > 40 ? el.textContent.trim() : false
      },
      { timeout: 30000, label: 'live coach advice' },
    )
    record('live coach guidance appears during play', liveCoachText.length > 40, `${liveCoachText.slice(0, 70)}...`)

    const unsavableCoach = await cdp.eval(() => {
      const fen = window.chessCoach.state.chess.fen()
      const advice = window.chessCoach.showLiveCoachAdvice({
        evalCp: -1200,
        fen,
        ply: window.chessCoach.state.chess.history().length,
        bestSan: 'Qh5',
        candidates: [{ san: 'Qh5', cp: -900 }],
      })
      return {
        register: advice.register,
        text: document.getElementById('live-coach-text').textContent,
        label: document.getElementById('live-coach-register').textContent,
        lostClass: document.getElementById('live-coach-card').classList.contains('is-lost'),
      }
    })
    record(
      'live coach changes character when the game is unsavable',
      unsavableCoach.lostClass && /point of no return/i.test(unsavableCoach.label) && /gone|training rep|turning point/i.test(unsavableCoach.text),
      `${unsavableCoach.label}: ${unsavableCoach.text.slice(0, 70)}`,
    )

    /* 3. import a real game */
    const loaded = await cdp.eval((pgn) => window.chessCoach.loadPgnGame(pgn, 'b'), { args: [SAMPLE_PGN] })
    record('pgn import parses', loaded === true)

    const plies = await cdp.eval(() => window.chessCoach.state.chess.history().length)
    record('imported game has all moves', plies === 15, `${plies} plies`)

    const openingLabel = await cdp.eval(() => document.getElementById('opening-name').textContent)
    record('opening is named from the book', /Two Knights|Italian|Fried/i.test(openingLabel), openingLabel)

    /* 4. review it */
    await cdp.eval(() => {
      document.getElementById('sel-depth').value = '10'
      return true
    })
    await cdp.eval(() => window.chessCoach.runReview())

    const summary = await cdp.eval(() => window.chessCoach.state.annotation?.summary || null)
    record('review produces a summary', Boolean(summary), summary ? `accuracy ${summary.accuracy}` : 'none')
    record(
      'accuracy is in range',
      summary && summary.accuracy >= 0 && summary.accuracy <= 100,
      String(summary?.accuracy),
    )

    const worst = await cdp.eval(() => {
      const mine = window.chessCoach.state.taggedMoves.filter((m) => m.isPlayer)
      const top = [...mine].sort((a, b) => b.loss - a.loss)[0]
      return top ? { san: top.san, loss: top.loss, best: top.bestSan } : null
    })
    record(
      'finds the worst move in the game',
      Boolean(worst) && worst.loss > 0 && Boolean(worst.best),
      worst ? `${worst.san} lost ${worst.loss}cp, best was ${worst.best}` : 'none',
    )

    const tags = await cdp.eval(() => window.chessCoach.state.patternSummary.map((p) => p.id))
    record('mistakes carry pattern tags', tags.length > 0, tags.join(', ') || 'none')


    const coachText = await cdp.waitFor(
      () => {
        const el = document.getElementById('coach-text')
        return el && el.textContent.trim().length > 40 ? el.textContent.trim() : false
      },
      { timeout: 30000, label: 'coach text' },
    )
    record('offline coach writes a review', coachText.length > 40, `${coachText.slice(0, 60)}...`)

    /* 5. drills built from that game */
    const puzzles = await cdp.eval(() => window.chessCoach.state.puzzles.length)
    record('drills generated from your own mistakes', puzzles > 0, `${puzzles} drills`)

    await cdp.eval(() => {
      document.querySelector('.tab[data-tab="drills"]').click()
      return true
    })
    await cdp.waitFor(() => Boolean(window.chessCoach.state.currentPuzzle), { timeout: 20000, label: 'drill load' })
    const drillFen = await cdp.eval(() => window.chessCoach.state.currentPuzzle.fen)
    record('drill loads on the board', typeof drillFen === 'string' && drillFen.includes('/'), drillFen)

    /* answer it by revealing the solution so the explain path runs end to end */
    const graded = await cdp.eval(async () => {
      document.getElementById('btn-drill-solution').click()
      await new Promise((r) => setTimeout(r, 900))
      return {
        verdict: document.getElementById('drill-verdict').textContent,
        explain: document.getElementById('drill-explain').textContent,
      }
    })
    record('solution names the move', /The move is/.test(graded.verdict), graded.verdict.slice(0, 60))
    record(
      'solution reveal explains why',
      graded.explain.length > 40 && graded.explain !== 'Explaining.',
      graded.explain.replace(/\n+/g, ' ').slice(0, 80),
    )


    const lostLoaded = await cdp.eval((pgn) => window.chessCoach.loadPgnGame(pgn, 'w'), { args: [LOST_PGN] })
    record('lost game import for turning point retry parses', lostLoaded === true)
    await cdp.eval(() => {
      document.getElementById('sel-depth').value = '10'
      return window.chessCoach.runReview()
    })
    const turningReview = await cdp.eval(() => {
      const tp = window.chessCoach.state.turningPoint
      const row = document.querySelector('#mistake-list li.is-turning-point')
      return {
        status: tp?.status,
        san: tp?.playedMove?.san,
        bestSan: tp?.bestSan,
        retryFen: tp?.retryFen,
        rowText: row?.textContent || '',
        moveText: document.getElementById('turning-point-move')?.textContent || '',
      }
    })
    record(
      'turning point highlights the expected losing move',
      turningReview.status === 'found' && /g4/.test(turningReview.san || turningReview.rowText),
      `${turningReview.san || 'none'}; ${turningReview.moveText}`,
    )

    const retryResult = await cdp.eval(async () => {
      const retryFen = window.chessCoach.state.turningPoint?.retryFen
      const ok = await window.chessCoach.retryFromTurningPoint()
      await new Promise((r) => setTimeout(r, 1200))
      return {
        ok,
        retryFen,
        currentFen: window.chessCoach.state.chess.fen(),
        inputColour: window.chessCoach.state.board.inputColour,
        enabled: Boolean(document.querySelector('svg.cm-chessboard g.board.input-enabled')),
        mode: window.chessCoach.state.mode,
      }
    })
    record(
      'retry reloads the turning point and leaves the board interactive',
      retryResult.ok === true && retryResult.currentFen === retryResult.retryFen && retryResult.inputColour !== null && retryResult.enabled,
      `mode=${retryResult.mode}, input=${retryResult.inputColour}`,
    )

    /* 6. profile updated and persisted */
    const profile = await cdp.eval(() => window.chessCoach.state.profile)
    record('profile records the game', profile.gamesPlayed >= 1, `${profile.gamesPlayed} games`)
    record('weakness profile is populated', Object.keys(profile.patterns || {}).length > 0, Object.keys(profile.patterns || {}).join(', '))

    await cdp.eval(() => {
      document.querySelector('.tab[data-tab="profile"]').click()
      return true
    })
    const weaknessRows = await cdp.eval(() => document.querySelectorAll('#weakness-list li').length)
    record('profile tab renders weaknesses', weaknessRows > 0, `${weaknessRows} rows`)

    const stored = await (await fetch(`${ORIGIN}api/profile`)).json()
    record('profile survives to the server', stored.ok && stored.profile?.gamesPlayed >= 1)

    /* 7. saved games library persists to a real IndexedDB.
       library.js (public/js/library.js) is entirely IndexedDB-backed and has
       no in-memory fallback, so this can only be exercised in a real browser
       - node --test covers its graceful-degradation path (no indexedDB
       global) but never its actual CRUD, which is the point of this block. */
    const library = await cdp.eval(async () => {
      const lib = await import('/js/library.js')
      await lib.clearLibrary()
      const gameA = {
        id: 'smoke-game-a',
        pgn: '[Event "Smoke A"]\n[White "Ana"]\n[Black "Bao"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0',
        moves: ['e4', 'e5', 'Nf3', 'Nc6'],
        headers: { Event: 'Smoke A' },
        white: 'Ana',
        black: 'Bao',
        result: '1-0',
        date: '2024-01-01',
        eco: 'C50',
        opening: 'Italian Game',
        source: 'file',
        colour: 'w',
      }
      const gameB = {
        id: 'smoke-game-b',
        pgn: '[Event "Smoke B"]\n[White "Cy"]\n[Black "Dee"]\n[Result "0-1"]\n\n1. d4 d5 0-1',
        moves: ['d4', 'd5'],
        headers: { Event: 'Smoke B' },
        white: 'Cy',
        black: 'Dee',
        result: '0-1',
        date: '2024-02-01',
        eco: 'D00',
        opening: 'Queens Pawn Game',
        source: 'file',
        colour: 'b',
      }
      const addResult = await lib.addGames([gameA, gameB])
      // Re-adding the same id must dedupe, not double-write - this is the
      // exact path a re-import of an already-saved game takes in the app.
      const dupeResult = await lib.addGames([gameA])
      const listed = await lib.listGames({ sort: 'date-asc' })
      const fetched = await lib.getGame('smoke-game-a')
      const reviewed = await lib.saveReview('smoke-game-a', { acpl: 42 })
      const stats = await lib.libraryStats()
      const exportedBlob = await lib.exportLibrary()
      const exportedText = await exportedBlob.text()
      await lib.deleteGame('smoke-game-b')
      const afterDelete = await lib.listGames()
      await lib.clearLibrary()
      const afterClear = await lib.listGames()
      return {
        addResult,
        dupeResult,
        listedIds: listed.map((g) => g.id),
        fetchedWhite: fetched?.white,
        reviewedAcpl: reviewed?.review?.acpl,
        reviewedFlag: reviewed?.reviewedFlag,
        stats,
        exportedText,
        afterDeleteIds: afterDelete.map((g) => g.id),
        afterClearCount: afterClear.length,
      }
    })
    record(
      'library.addGames writes both real games to IndexedDB',
      library.addResult.added === 2 && library.addResult.duplicates === 0,
      JSON.stringify(library.addResult),
    )
    record(
      'library.addGames dedupes a re-added game by stable id instead of double-writing it',
      library.dupeResult.added === 0 && library.dupeResult.duplicates === 1,
      JSON.stringify(library.dupeResult),
    )
    record(
      'library.listGames returns both saved games sorted by date',
      JSON.stringify(library.listedIds) === JSON.stringify(['smoke-game-a', 'smoke-game-b']),
      library.listedIds.join(', '),
    )
    record('library.getGame fetches a single saved game by id', library.fetchedWhite === 'Ana', library.fetchedWhite)
    record(
      'library.saveReview attaches a review and flips reviewedFlag',
      library.reviewedAcpl === 42 && library.reviewedFlag === 1,
      JSON.stringify({ acpl: library.reviewedAcpl, flag: library.reviewedFlag }),
    )
    record(
      'library.libraryStats reports the right total and result split',
      library.stats.total === 2 && library.stats.byResult['1-0'] === 1 && library.stats.byResult['0-1'] === 1,
      JSON.stringify(library.stats),
    )
    record(
      'library.exportLibrary produces a PGN blob containing both saved games',
      library.exportedText.includes('Smoke A') && library.exportedText.includes('Smoke B'),
      `${library.exportedText.length} chars`,
    )
    record(
      'library.deleteGame removes exactly the targeted game and keeps the other',
      JSON.stringify(library.afterDeleteIds) === JSON.stringify(['smoke-game-a']),
      library.afterDeleteIds.join(', '),
    )
    record('library.clearLibrary empties the store entirely', library.afterClearCount === 0, String(library.afterClearCount))

    /* 8. lessons stay playable. The board is handed between the game, lessons
       and drills by async functions. When two of those overlapped, a trailing
       disableInput() landed on top of the enableInput() a lesson had just
       done: the position rendered correctly, the caption was right and
       nothing threw, but no piece would move. The first lesson of a session
       always worked, so this walks the journey a student actually takes -
       open a lesson, go back to the list, open a different one - and then
       drags the answer with real mouse events. */
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 2000, deviceScaleFactor: 1, mobile: false,
    })
    const lessonJourney = await cdp.eval(async () => {
      const pause = (ms) => new Promise((r) => setTimeout(r, ms))
      const openable = () => [...document.querySelectorAll('#panel-learn button')]
        .filter((b) => /continue lesson|start lesson|open lesson|review lesson/i.test(b.textContent))

      document.querySelector('.tab[data-tab="learn"]').click()
      await pause(400)
      const available = openable().length
      openable()[0].click()
      await pause(900)
      const firstInput = window.chessCoach.state.board.inputColour

      const back = [...document.querySelectorAll('#panel-learn button')]
        .find((b) => /back to lessons|back to all lessons|all lessons/i.test(b.textContent))
      if (back) back.click()
      await pause(700)
      const afterBackOwner = window.chessCoach.state.boardOwner
      const afterBackCaption = document.getElementById('board-caption').textContent

      const again = openable()
      ;(again[1] || again[0]).click()
      await pause(1100)
      return {
        available,
        firstInput,
        afterBackOwner,
        afterBackCaption,
        secondInput: window.chessCoach.state.board.inputColour,
        secondEnabled: Boolean(document.querySelector('svg.cm-chessboard g.board.input-enabled')),
      }
    })
    record('the lesson list offers lessons to open', lessonJourney.available > 1, `${lessonJourney.available} lessons`)
    record('the first lesson accepts move input', lessonJourney.firstInput !== null, `input=${lessonJourney.firstInput}`)
    record(
      'leaving a lesson hands the board back to the game',
      lessonJourney.afterBackOwner === 'game' && !lessonJourney.afterBackCaption.startsWith('Lesson:'),
      `owner=${lessonJourney.afterBackOwner}`,
    )
    record(
      'a lesson opened after another lesson still accepts move input',
      lessonJourney.secondInput !== null && lessonJourney.secondEnabled,
      `input=${lessonJourney.secondInput}`,
    )

    const answerSquares = await cdp.eval(async () => {
      const { Chess } = await import('chess.js')
      const s = window.chessCoach.state
      const position = s.lesson.positions[s.lessonIndex]
      const move = new Chess(position.fen).move(position.answer)
      const centre = (square) => {
        const r = document.querySelector(`[data-square="${square}"]`).getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      }
      return { answer: position.answer, from: centre(move.from), to: centre(move.to) }
    })
    const mouse = (type, at, buttons) =>
      cdp.send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1, buttons })
    await mouse('mouseMoved', answerSquares.from, 0)
    await mouse('mousePressed', answerSquares.from, 1)
    await sleep(120)
    await mouse('mouseMoved', answerSquares.to, 1)
    await sleep(120)
    await mouse('mouseReleased', answerSquares.to, 0)
    await sleep(900)
    const lessonGraded = await cdp.eval(() => ({
      answered: window.chessCoach.state.lessonAnswered,
      verdict: document.getElementById('learn-verdict').textContent.trim(),
    }))
    record(
      'dragging the answer onto a lesson board plays and grades the move',
      lessonGraded.answered === true && lessonGraded.verdict.length > 0,
      `${answerSquares.answer} - ${lessonGraded.verdict.slice(0, 50)}`,
    )
    await cdp.send('Emulation.clearDeviceMetricsOverride')

    /* 9. depth and borders: the board, cards, controls and pieces must retain
       the restrained elevation that separates them on the white page. These
       are rendered-style checks, not source-string checks, so they catch a
       selector losing to vendor CSS or a rule being removed during a build. */
    const depthStyles = await cdp.eval(() => {
      const boardWrap = getComputedStyle(document.querySelector('.board-wrap'))
      const card = getComputedStyle(document.querySelector('.card'))
      const button = getComputedStyle(document.querySelector('button:not(:disabled)'))
      const piece = getComputedStyle(document.querySelector('#board use.piece'))
      return {
        boardBorder: boardWrap.borderTopWidth,
        boardShadow: boardWrap.boxShadow,
        cardBorder: card.borderTopWidth,
        cardShadow: card.boxShadow,
        buttonShadow: button.boxShadow,
        pieceFilter: piece.filter,
      }
    })
    record(
      'the board shell renders a visible border and shadow',
      parseFloat(depthStyles.boardBorder) >= 1 && depthStyles.boardShadow !== 'none',
      `border=${depthStyles.boardBorder}, shadow=${depthStyles.boardShadow}`,
    )
    record(
      'cards and buttons retain restrained elevation',
      parseFloat(depthStyles.cardBorder) >= 1
        && depthStyles.cardShadow !== 'none'
        && depthStyles.buttonShadow !== 'none',
      `card=${depthStyles.cardShadow}, button=${depthStyles.buttonShadow}`,
    )
    record(
      'piece silhouettes retain an edge shadow',
      depthStyles.pieceFilter !== 'none',
      depthStyles.pieceFilter,
    )

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 1100,
      deviceScaleFactor: 1,
      mobile: false,
    })
    const mobileDepth = await cdp.eval(() => ({
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      boardWidth: document.querySelector('.board').getBoundingClientRect().width,
    }))
    record(
      'the bordered board stays inside a 390px viewport',
      mobileDepth.scrollWidth <= mobileDepth.viewport + 1
        && mobileDepth.boardWidth < mobileDepth.viewport,
      `viewport=${mobileDepth.viewport}, scroll=${mobileDepth.scrollWidth}, board=${mobileDepth.boardWidth}`,
    )
    await cdp.send('Emulation.clearDeviceMetricsOverride')

    /* 10. dark mode: an OS/browser dark preference must never invert either
       page. This is a real-browser check of the exact historical defect
       described in the project brief (an automatic prefers-color-scheme
       block turned the app dark while the landing page stayed light) -
       scripts/theme.test.js asserts no such CSS rule exists in the source;
       this asserts the RENDERED result under a forced dark preference,
       which would also catch a regression introduced via inline styles or
       JS rather than a stylesheet. */
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
    const appBgUnderDarkPreference = await cdp.eval(() => getComputedStyle(document.body).backgroundColor)
    record(
      'the app keeps its light background under an emulated OS dark preference',
      appBgUnderDarkPreference === 'rgb(255, 255, 255)',
      appBgUnderDarkPreference,
    )

    await cdp.send('Page.navigate', { url: ORIGIN })
    await cdp.waitFor(() => document.readyState === 'complete', { timeout: 20000, label: 'landing page load' })
    const landingBgUnderDarkPreference = await cdp.eval(() => getComputedStyle(document.body).backgroundColor)
    record(
      'the landing page also keeps its light background under the same emulated dark preference',
      landingBgUnderDarkPreference === 'rgb(255, 255, 255)',
      landingBgUnderDarkPreference,
    )
    await cdp.send('Emulation.setEmulatedMedia', { features: [] })

    /* 11. nothing broke along the way */
    const noise = [...cdp.consoleErrors, ...cdp.pageErrors].filter(
      (m) => !/favicon|lichess|net::ERR_INTERNET|Failed to load resource: the server responded with a status of 404/i.test(m),
    )
    record('no console errors', noise.length === 0, noise.slice(0, 3).join(' | '))
  } finally {
    cdp?.close()
    if (chrome) chrome.kill()
    server.kill()
    await rm(profileDir, { recursive: true, force: true }).catch(() => {})
    await rm(dataDir, { recursive: true, force: true }).catch(() => {})
  }

  const passed = results.length - failures
  console.log(`\n${passed}/${results.length} checks passed\n`)
  if (failures) process.exitCode = 1
}

main().catch((err) => {
  console.error(`\nsmoke test crashed: ${err.stack || err.message}\n`)
  process.exitCode = 1
})
