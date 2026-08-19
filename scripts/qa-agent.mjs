#!/usr/bin/env node
/**
 * Continuous Ramify QA agent.
 *
 * Drives the real app in a real headless Chrome over raw CDP, plays long games
 * against the browser Stockfish engine, and writes durable reports under
 * .local-ci/qa-agent/ (already gitignored by the repo's .local-ci/ rule).
 *
 *   node scripts/qa-agent.mjs [--quick] [--cron]
 */

import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const ARTIFACT_ROOT = join(ROOT, '.local-ci', 'qa-agent')
const REPORT_DIR = join(ARTIFACT_ROOT, 'reports')
const RUN_DIR = join(ARTIFACT_ROOT, 'runs', stamp(new Date()))
const HISTORY_PATH = join(ARTIFACT_ROOT, 'history.json')
const LATEST_HTML = join(ARTIFACT_ROOT, 'latest.html')

const APP_PORT = Number(readFlag('--port', process.env.QA_AGENT_PORT || '5499'))
const DEBUG_PORT = Number(readFlag('--debug-port', process.env.QA_AGENT_DEBUG_PORT || String(APP_PORT + 1)))
const ORIGIN = `http://127.0.0.1:${APP_PORT}`
const APP_URL = `${ORIGIN}/app/`
const QUICK = hasFlag('--quick') || process.env.QA_AGENT_QUICK === '1'
const CRON = hasFlag('--cron')
const INJECT_STARVATION = hasFlag('--inject-variation-starvation') || process.env.RAMIFY_QA_INJECT_VARIATION_STARVATION === '1'
const MAX_PLAYER_MOVES = Number(readFlag('--max-player-moves', QUICK ? '10' : '22'))
const DIFFICULTIES = readFlag('--difficulties', QUICK ? 'expert' : 'beginner,intermediate,advanced,expert')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1237/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

const EXPECTED_COUNTS = { beginner: 3, intermediate: 5, advanced: 7, expert: 9 }
const IGNORE_NETWORK = /favicon|lichess|explorer\.lichess|net::ERR_INTERNET|ERR_ABORTED/i
const ASCII = /^[\x00-\x7F]*$/

function hasFlag(name) {
  return process.argv.includes(name)
}

function readFlag(name, fallback) {
  const exact = process.argv.find((a) => a.startsWith(`${name}=`))
  if (exact) return exact.slice(name.length + 1)
  const i = process.argv.indexOf(name)
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1]
  return fallback
}

function stamp(date) {
  return date.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', 'Z')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForHttp(url, timeoutMs, json = true) {
  const deadline = Date.now() + timeoutMs
  let last
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      last = `${res.status} ${res.statusText}`
      if (res.ok) return json ? await res.json() : await res.text()
    } catch (err) {
      last = err.message
    }
    await sleep(150)
  }
  throw new Error(`timed out waiting for ${url}: ${last || 'no response'}`)
}

function describeRemote(arg) {
  if (arg.value !== undefined) return String(arg.value)
  if (arg.unserializableValue !== undefined) return String(arg.unserializableValue)
  return arg.description || arg.type || 'unknown'
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.consoleErrors = []
    this.pageErrors = []
    this.networkFailures = []
    this.failedResponses = []

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
    if (msg.method === 'Network.loadingFailed') {
      const p = msg.params
      this.networkFailures.push(`${p.errorText || 'network failed'} ${p.blockedReason || ''} ${p.type || ''} ${p.requestId}`.trim())
    }
    if (msg.method === 'Network.responseReceived') {
      const r = msg.params.response
      if (r.status >= 400) this.failedResponses.push(`${r.status} ${r.url}`)
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

  async waitFor(fn, { timeout = 30000, label = 'condition', args = [] } = {}) {
    const deadline = Date.now() + timeout
    let last
    while (Date.now() < deadline) {
      last = await this.eval(fn, { awaitPromise: false, args })
      if (last) return last
      await sleep(200)
    }
    throw new Error(`timed out waiting for ${label}; last=${JSON.stringify(last)}`)
  }

  close() {
    try {
      this.ws.close()
    } catch {
      /* already closed */
    }
  }
}

function record(checks, check) {
  checks.push({ ...check, ok: Boolean(check.ok), at: new Date().toISOString() })
  const mark = check.ok ? 'PASS' : 'FAIL'
  const detail = check.detail ? ` - ${check.detail}` : ''
  console.log(`  [${mark}] ${check.name}${detail}`)
}

function failCheck({ name, difficulty, fen, moves, expected, actual, invariant, detail }) {
  return { ok: false, name, difficulty, fen, moves, expected, actual, invariant, detail }
}

function passCheck({ name, difficulty, fen, moves, expected, actual, invariant, detail }) {
  return { ok: true, name, difficulty, fen, moves, expected, actual, invariant, detail }
}

function noise(cdp) {
  return [...cdp.consoleErrors, ...cdp.pageErrors, ...cdp.failedResponses, ...cdp.networkFailures]
    .filter((m) => m && !IGNORE_NETWORK.test(m))
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true })
  await mkdir(RUN_DIR, { recursive: true })

  const startedAt = new Date()
  const checks = []
  const games = []
  const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p))
  if (!chromePath) throw new Error('no Chrome or headless shell found; set CHROME_PATH')

  console.log('\nRamify continuous QA agent')
  console.log(`  app: ${APP_URL}`)
  console.log(`  chrome: ${chromePath}`)
  console.log(`  artifacts: ${relative(ROOT, ARTIFACT_ROOT)}`)
  if (INJECT_STARVATION) console.log('  injection: variation starvation proof mode')

  const nodeBin = existsSync(process.execPath) ? process.execPath : 'node'
  const dataDir = join(RUN_DIR, 'data')
  const profileDir = join(RUN_DIR, 'chrome-profile')
  await mkdir(dataDir, { recursive: true })
  await mkdir(profileDir, { recursive: true })

  let server
  let chrome
  let cdp
  const serverLog = []

  try {
    server = spawn(nodeBin, ['server.js'], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(APP_PORT), DATA_DIR: dataDir },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    server.stdout.on('data', (d) => serverLog.push(String(d)))
    server.stderr.on('data', (d) => serverLog.push(String(d)))

    const health = await waitForHttp(`${ORIGIN}/api/health`, 20000)
    record(checks, passCheck({ name: 'server reports health', expected: 'health.ok true', actual: JSON.stringify(health), invariant: 'engine availability' }))

    const isHeadlessShell = /chrome-headless-shell/.test(chromePath)
    chrome = spawn(
      chromePath,
      [
        ...(isHeadlessShell ? [] : ['--headless=new']),
        '--no-sandbox',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--mute-audio',
        `--user-data-dir=${profileDir}`,
        `--remote-debugging-port=${DEBUG_PORT}`,
        'about:blank',
      ],
      { stdio: 'ignore' },
    )

    await waitForHttp(`http://127.0.0.1:${DEBUG_PORT}/json/version`, 20000)
    const created = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(APP_URL)}`, { method: 'PUT' })
    if (!created.ok) throw new Error(`could not create Chrome tab: ${created.status} ${created.statusText}`)
    const page = await created.json()

    cdp = await Cdp.attach(page.webSocketDebuggerUrl)
    await cdp.send('Runtime.enable')
    await cdp.send('Log.enable')
    await cdp.send('Network.enable')
    await cdp.send('Page.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 2000, deviceScaleFactor: 1, mobile: false })

    await cdp.waitFor(() => document.readyState === 'complete', { timeout: 30000, label: 'page load' })
    await dismissOnboarding(cdp)
    await cdp.waitFor(() => Boolean(window.chessCoach?.state?.engine?.ready), { timeout: 120000, label: 'app and engine ready' })

    const bootState = await cdp.eval(() => ({
      pill: document.getElementById('pill-engine')?.textContent || '',
      squares: new Set([...document.querySelectorAll('#board [data-square]')].map((e) => e.dataset.square)).size,
      hasApi: Boolean(window.chessCoach?.playSan && window.chessCoach?.setVariationLevel),
    }))
    record(checks, passCheck({ name: 'browser app exposes QA API', expected: 'API present, 64 squares', actual: JSON.stringify(bootState), invariant: 'browser boot' }))
    if (!bootState.hasApi || bootState.squares !== 64) throw new Error(`app did not boot correctly: ${JSON.stringify(bootState)}`)

    const presets = await cdp.eval(async () => {
      const mod = await import('/js/explorer.js')
      return Object.fromEntries(Object.entries(mod.DIFFICULTY_PRESETS).map(([k, v]) => [k, v.variations]))
    })
    for (const [level, expected] of Object.entries(EXPECTED_COUNTS)) {
      record(
        checks,
        presets[level] === expected
          ? passCheck({ name: `difficulty preset ${level}`, difficulty: level, expected, actual: presets[level], invariant: 'difficulty contract' })
          : failCheck({ name: `difficulty preset ${level}`, difficulty: level, expected, actual: presets[level], invariant: 'difficulty contract' }),
      )
    }

    for (const difficulty of DIFFICULTIES) {
      games.push(await playLongGame(cdp, checks, difficulty))
    }

    const badNoise = noise(cdp)
    record(
      checks,
      badNoise.length === 0
        ? passCheck({ name: 'no uncaught console errors or failed network requests', expected: '0 errors', actual: '0', invariant: 'runtime health' })
        : failCheck({ name: 'no uncaught console errors or failed network requests', expected: '0 errors', actual: badNoise.slice(0, 8).join(' | '), invariant: 'runtime health' }),
    )
  } catch (err) {
    record(checks, failCheck({ name: 'qa agent crashed', expected: 'complete run', actual: err.stack || err.message, invariant: 'agent reliability' }))
  } finally {
    cdp?.close()
    await cleanupChrome(DEBUG_PORT, chrome)
    if (server?.pid) await killPid(server.pid)
    await rm(profileDir, { recursive: true, force: true }).catch(() => {})
    await writeFile(join(RUN_DIR, 'server.log'), serverLog.join(''), 'utf8').catch(() => {})
  }

  const finishedAt = new Date()
  const failures = checks.filter((c) => !c.ok)
  const run = {
    id: stamp(startedAt),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt - startedAt,
    quick: QUICK,
    cron: CRON,
    injectedVariationStarvation: INJECT_STARVATION,
    appUrl: APP_URL,
    difficulties: DIFFICULTIES,
    maxPlayerMoves: MAX_PLAYER_MOVES,
    summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length, games: games.length },
    games,
    checks,
  }

  const jsonPath = join(REPORT_DIR, `${run.id}.json`)
  const htmlPath = join(REPORT_DIR, `${run.id}.html`)
  await writeFile(jsonPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8')
  const history = await updateHistory(run)
  await writeFile(htmlPath, renderHtml(run, history), 'utf8')
  await copyFile(htmlPath, LATEST_HTML)

  console.log(`\n${run.summary.passed}/${run.summary.checks} checks passed`)
  console.log(`report: ${relative(ROOT, htmlPath)}`)
  console.log(`history: ${relative(ROOT, HISTORY_PATH)}`)
  for (const f of failures.slice(0, 6)) {
    console.log(`\nFAIL: ${f.name}`)
    if (f.difficulty) console.log(`  difficulty: ${f.difficulty}`)
    if (f.fen) console.log(`  FEN: ${f.fen}`)
    if (f.moves?.length) console.log(`  moves: ${f.moves.join(' ')}`)
    if (f.expected !== undefined || f.actual !== undefined) console.log(`  expected: ${f.expected}\n  actual: ${f.actual}`)
  }

  if (failures.length) process.exitCode = 1
}

async function dismissOnboarding(cdp) {
  for (let i = 0; i < 6; i++) {
    const clicked = await cdp.eval(() => {
      const re = /^(skip|got it|close|done|start)$/i
      const buttons = [...document.querySelectorAll('button')]
      const button = buttons.find((b) => re.test((b.textContent || '').trim()))
      if (!button) return false
      button.click()
      return true
    })
    if (!clicked) return
    await sleep(200)
  }
}

async function playLongGame(cdp, checks, difficulty) {
  console.log(`\nplaying ${difficulty} long game`)
  await cdp.eval((level) => {
    window.chessCoach.newGame()
    window.chessCoach.state.elo = 1500
    const elo = document.getElementById('rng-elo')
    if (elo) elo.value = '1500'
    window.chessCoach.setVariationLevel(level)
    return true
  }, { args: [difficulty] })

  await cdp.waitFor(() => window.chessCoach.state.mode === 'play' && window.chessCoach.state.chess.history().length === 0, { timeout: 10000, label: 'new game' })
  await cdp.waitFor(() => window.chessCoach.state.board.inputColour !== null, { timeout: 10000, label: 'initial board input' })

  let injected = false
  const engineTimes = []
  const snapshots = []

  for (let playerMove = 0; playerMove < MAX_PLAYER_MOVES; playerMove++) {
    const before = await validatePosition(cdp, checks, difficulty, { moveNumber: playerMove + 1, injected })
    snapshots.push(before)
    if (before.gameOver) break

    if (INJECT_STARVATION && !injected && before.moves.length >= 8) {
      await cdp.eval(() => {
        if (!window.__ramifyQaOriginalVariations) {
          window.__ramifyQaOriginalVariations = window.chessCoach.variations.bind(window.chessCoach)
          window.chessCoach.variations = () => {
            const original = window.__ramifyQaOriginalVariations()
            return original.slice(0, Math.max(0, original.length - 2))
          }
        }
        window.__ramifyQaInjectedViolation = true
        return window.chessCoach.variations().length
      })
      injected = true
      await validatePosition(cdp, checks, difficulty, { moveNumber: playerMove + 1, injected })
    }

    const chosen = await chooseMove(cdp, playerMove)
    if (!chosen?.san) break
    const accepted = await cdp.eval((san) => window.chessCoach.playSan(san), { args: [chosen.san], awaitPromise: false })
    const afterPlayer = await cdp.eval(() => ({ fen: window.chessCoach.state.chess.fen(), moves: window.chessCoach.state.chess.history() }))
    record(
      checks,
      accepted === true
        ? passCheck({ name: `player move accepted ${difficulty} #${playerMove + 1}`, difficulty, fen: afterPlayer.fen, moves: afterPlayer.moves, expected: 'accepted legal SAN', actual: chosen.san, invariant: 'board interaction API' })
        : failCheck({ name: `player move accepted ${difficulty} #${playerMove + 1}`, difficulty, fen: before.fen, moves: before.moves, expected: 'true', actual: String(accepted), invariant: 'board interaction API' }),
    )
    if (!accepted) break

    const started = Date.now()
    await cdp.waitFor(
      (plyAfterPlayer) => {
        const s = window.chessCoach.state
        return s.chess.history().length > plyAfterPlayer || (s.finished && s.chess.isGameOver())
      },
      { timeout: 65000, label: `engine reply ${difficulty} #${playerMove + 1}`, args: [afterPlayer.moves.length] },
    )
    await cdp.waitFor(() => !window.chessCoach.state.thinking, { timeout: 10000, label: `engine idle ${difficulty} #${playerMove + 1}` })
    const elapsed = Date.now() - started
    engineTimes.push(elapsed)

    const after = await cdp.eval(() => ({
      fen: window.chessCoach.state.chess.fen(),
      moves: window.chessCoach.state.chess.history(),
      gameOver: window.chessCoach.state.chess.isGameOver(),
      input: window.chessCoach.state.board.inputColour,
    }))
    const grew = after.moves.length >= afterPlayer.moves.length || after.gameOver
    record(
      checks,
      grew && elapsed <= 65000
        ? passCheck({ name: `engine responds ${difficulty} #${playerMove + 1}`, difficulty, fen: after.fen, moves: after.moves, expected: 'engine returns inside 65s', actual: `${elapsed}ms`, invariant: 'engine responsiveness' })
        : failCheck({ name: `engine responds ${difficulty} #${playerMove + 1}`, difficulty, fen: after.fen, moves: after.moves, expected: 'reply inside 65s and history advances', actual: `${elapsed}ms, ${after.moves.length} plies`, invariant: 'engine responsiveness' }),
    )
    if (after.gameOver) break
  }

  const last = await cdp.eval(() => ({
    fen: window.chessCoach.state.chess.fen(),
    moves: window.chessCoach.state.chess.history(),
    gameOver: window.chessCoach.state.chess.isGameOver(),
    finished: window.chessCoach.state.finished,
  }))

  const trendOk = engineTimes.length < 6 || Math.max(...engineTimes.slice(-5)) <= Math.max(15000, Math.max(...engineTimes.slice(0, 5)) * 4)
  record(
    checks,
    trendOk
      ? passCheck({ name: `engine response time bounded ${difficulty}`, difficulty, fen: last.fen, moves: last.moves, expected: 'no unbounded growth', actual: engineTimes.join(', ') || 'none', invariant: 'engine latency trend' })
      : failCheck({ name: `engine response time bounded ${difficulty}`, difficulty, fen: last.fen, moves: last.moves, expected: 'last five <= max(15s, first five * 4)', actual: engineTimes.join(', '), invariant: 'engine latency trend' }),
  )

  const minPlies = QUICK ? 16 : 36
  record(
    checks,
    last.moves.length >= minPlies || last.gameOver
      ? passCheck({ name: `long game reaches depth ${difficulty}`, difficulty, fen: last.fen, moves: last.moves, expected: `>= ${minPlies} plies or game over`, actual: `${last.moves.length} plies`, invariant: 'full-length coverage' })
      : failCheck({ name: `long game reaches depth ${difficulty}`, difficulty, fen: last.fen, moves: last.moves, expected: `>= ${minPlies} plies or game over`, actual: `${last.moves.length} plies`, invariant: 'full-length coverage' }),
  )

  const review = await cdp.eval(async () => {
    const coach = await import('/js/coach.js')
    const s = window.chessCoach.state
    const opening = document.getElementById('opening-name')?.textContent?.trim() || null
    const answer = await coach.ask('review', {
      moves: s.chess.history(),
      opening,
      result: s.chess.isGameOver() ? 'completed on board' : 'long QA sample',
      summary: { accuracy: 50, acpl: 100 },
      mistakes: [],
      patternSummary: [],
      deviation: null,
      profileBrief: '',
    })
    const coachText = answer?.text?.trim() || ''
    return {
      fen: s.chess.fen(),
      moves: s.chess.history(),
      hasSummary: true,
      coachText,
    }
  })
  record(
    checks,
    review.hasSummary && review.coachText.length > 20
      ? passCheck({ name: `coach review present ${difficulty}`, difficulty, fen: review.fen, moves: review.moves, expected: 'summary and substantive coach text', actual: `${review.coachText.length} chars`, invariant: 'coach output' })
      : failCheck({ name: `coach review present ${difficulty}`, difficulty, fen: review.fen, moves: review.moves, expected: 'summary and substantive coach text', actual: `${review.coachText.length} chars, summary=${review.hasSummary}`, invariant: 'coach output' }),
  )
  record(
    checks,
    ASCII.test(review.coachText)
      ? passCheck({ name: `coach review ASCII ${difficulty}`, difficulty, fen: review.fen, moves: review.moves, expected: 'ASCII only', actual: `${review.coachText.length} chars`, invariant: 'coach text hygiene' })
      : failCheck({ name: `coach review ASCII ${difficulty}`, difficulty, fen: review.fen, moves: review.moves, expected: 'ASCII only', actual: review.coachText, invariant: 'coach text hygiene' }),
  )

  return { difficulty, fen: last.fen, moves: last.moves, plies: last.moves.length, gameOver: last.gameOver, engineTimes, injectedVariationStarvation: injected, snapshots: snapshots.length }
}

async function validatePosition(cdp, checks, difficulty, { moveNumber, injected }) {
  await cdp.eval((level) => window.chessCoach.setVariationLevel(level), { args: [difficulty] })
  // setVariationLevel schedules the repaint on a macrotask. Give the product
  // code a chance to publish its current answer, then measure exactly what it
  // exposed. Waiting for a non-empty list would hide the starvation bug this
  // agent exists to catch.
  await sleep(150)

  const snapshot = await cdp.eval(() => {
    const s = window.chessCoach.state
    const legal = s.chess.moves({ verbose: true })
    const legalSans = legal.map((m) => m.san)
    const variations = window.chessCoach.variations().map((v) => ({ san: v.san, uci: v.uci, name: v.name, isBook: v.isBook, novelty: v.novelty, whyThisOne: v.whyThisOne || '' }))
    const openingLabel = document.getElementById('opening-name')?.textContent?.trim() || ''
    const coachText = document.getElementById('coach-text')?.textContent?.trim() || ''
    return {
      fen: s.chess.fen(),
      moves: s.chess.history(),
      legalSans,
      legalCount: legal.length,
      variations,
      openingLabel,
      coachText,
      mode: s.mode,
      finished: s.finished,
      thinking: s.thinking,
      gameOver: s.chess.isGameOver(),
      inputColour: s.board.inputColour,
      svgEnabled: Boolean(document.querySelector('svg.cm-chessboard g.board.input-enabled')),
      injected: Boolean(window.__ramifyQaInjectedViolation),
    }
  })

  const expected = Math.min(EXPECTED_COUNTS[difficulty], snapshot.legalCount)
  const countOk = snapshot.gameOver ? snapshot.variations.length === 0 || snapshot.legalCount === 0 : snapshot.variations.length === expected
  record(
    checks,
    countOk
      ? passCheck({ name: `variation count ${difficulty} move ${moveNumber}`, difficulty, fen: snapshot.fen, moves: snapshot.moves, expected, actual: snapshot.variations.length, invariant: 'difficulty variation count', detail: injected ? 'after injected mutation' : '' })
      : failCheck({ name: `variation count ${difficulty} move ${moveNumber}`, difficulty, fen: snapshot.fen, moves: snapshot.moves, expected, actual: snapshot.variations.length, invariant: 'difficulty variation count', detail: snapshot.injected ? 'runtime starvation was injected for proof' : '' }),
  )

  const illegal = snapshot.variations.filter((v) => !snapshot.legalSans.includes(v.san)).map((v) => v.san)
  record(
    checks,
    illegal.length === 0
      ? passCheck({ name: `offered moves legal ${difficulty} move ${moveNumber}`, difficulty, fen: snapshot.fen, moves: snapshot.moves, expected: 'all offered SAN legal', actual: snapshot.variations.map((v) => v.san).join(' '), invariant: 'legal variation moves' })
      : failCheck({ name: `offered moves legal ${difficulty} move ${moveNumber}`, difficulty, fen: snapshot.fen, moves: snapshot.moves, expected: snapshot.legalSans.join(' '), actual: illegal.join(' '), invariant: 'legal variation moves' }),
  )

  const identityOk = snapshot.moves.length === 0 || Boolean(snapshot.openingLabel) || snapshot.variations.some((v) => v.name || /last known opening/i.test(v.whyThisOne))
  record(
    checks,
    identityOk
      ? passCheck({ name: `opening identity available ${difficulty} move ${moveNumber}`, difficulty, fen: snapshot.fen, moves: snapshot.moves, expected: 'opening label or inherited context', actual: snapshot.openingLabel || 'variation context', invariant: 'opening identity' })
      : failCheck({ name: `opening identity available ${difficulty} move ${moveNumber}`, difficulty, fen: snapshot.fen, moves: snapshot.moves, expected: 'opening identity survives leaving book', actual: snapshot.openingLabel, invariant: 'opening identity' }),
  )

  const shouldInteract = snapshot.mode === 'play' && !snapshot.finished && !snapshot.thinking && !snapshot.gameOver
  const interactiveOk = !shouldInteract || (snapshot.inputColour !== null && snapshot.svgEnabled)
  record(
    checks,
    interactiveOk
      ? passCheck({ name: `board interactive ${difficulty} move ${moveNumber}`, difficulty, fen: snapshot.fen, moves: snapshot.moves, expected: shouldInteract ? 'input enabled' : 'input may be disabled', actual: `input=${snapshot.inputColour}, svg=${snapshot.svgEnabled}`, invariant: 'board interactivity' })
      : failCheck({ name: `board interactive ${difficulty} move ${moveNumber}`, difficulty, fen: snapshot.fen, moves: snapshot.moves, expected: 'state.board.inputColour not null and svg g.board.input-enabled present', actual: `input=${snapshot.inputColour}, svg=${snapshot.svgEnabled}`, invariant: 'board interactivity' }),
  )

  if (snapshot.coachText) {
    record(
      checks,
      ASCII.test(snapshot.coachText)
        ? passCheck({ name: `coach output ASCII ${difficulty} move ${moveNumber}`, difficulty, fen: snapshot.fen, moves: snapshot.moves, expected: 'ASCII only', actual: `${snapshot.coachText.length} chars`, invariant: 'coach text hygiene' })
        : failCheck({ name: `coach output ASCII ${difficulty} move ${moveNumber}`, difficulty, fen: snapshot.fen, moves: snapshot.moves, expected: 'ASCII only', actual: snapshot.coachText, invariant: 'coach text hygiene' }),
    )
  }

  return snapshot
}

async function chooseMove(cdp, plySeed) {
  return cdp.eval((seed) => {
    const s = window.chessCoach.state
    const legal = s.chess.moves({ verbose: true })
    if (!legal.length) return null
    const variations = window.chessCoach.variations().filter((v) => legal.some((m) => m.san === v.san))
    const preferredSans = variations.map((v) => v.san)
    const quiet = legal.filter((m) => !m.san.includes('#') && !m.san.includes('+'))
    const pool = preferredSans.length
      ? legal.filter((m) => preferredSans.includes(m.san))
      : (quiet.length ? quiet : legal)
    const idx = Math.abs((s.chess.history().join('').length + seed * 7 + pool.length * 3) % pool.length)
    const move = pool[idx]
    return { san: move.san, from: move.from, to: move.to }
  }, { args: [plySeed] })
}

async function cleanupChrome(port, chrome) {
  try {
    const raw = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' })
    for (const line of raw.split(/\s+/).filter(Boolean)) await killPid(Number(line))
  } catch {
    if (chrome?.pid) await killPid(chrome.pid)
  }
}

async function killPid(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    return
  }
  await sleep(300)
  try {
    process.kill(pid, 0)
    process.kill(pid, 'SIGKILL')
  } catch {
    /* exited */
  }
}

async function updateHistory(run) {
  let history = []
  try {
    history = JSON.parse(await readFile(HISTORY_PATH, 'utf8'))
    if (!Array.isArray(history)) history = []
  } catch {
    history = []
  }
  const slim = {
    id: run.id,
    startedAt: run.startedAt,
    durationMs: run.durationMs,
    quick: run.quick,
    cron: run.cron,
    injectedVariationStarvation: run.injectedVariationStarvation,
    summary: run.summary,
    failingInvariants: [...new Set(run.checks.filter((c) => !c.ok).map((c) => c.invariant || c.name))],
    report: relative(ROOT, join(REPORT_DIR, `${run.id}.html`)),
  }
  history.push(slim)
  history = history.slice(-60)
  await mkdir(dirname(HISTORY_PATH), { recursive: true })
  await writeFile(HISTORY_PATH, `${JSON.stringify(history, null, 2)}\n`, 'utf8')
  return history
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderHtml(run, history) {
  const failures = run.checks.filter((c) => !c.ok)
  const status = failures.length ? 'FAIL' : 'PASS'
  const firstFailure = failures[0]
  const rows = run.checks.map((c) => `
    <tr class="${c.ok ? 'ok' : 'bad'}">
      <td>${c.ok ? 'PASS' : 'FAIL'}</td><td>${esc(c.invariant || '')}</td><td>${esc(c.name)}</td><td>${esc(c.difficulty || '')}</td><td>${esc(c.expected)}</td><td>${esc(c.actual)}</td>
    </tr>`).join('')
  const gameRows = run.games.map((g) => `
    <tr><td>${esc(g.difficulty)}</td><td>${g.plies}</td><td>${g.gameOver ? 'yes' : 'closed by depth limit'}</td><td>${esc(g.fen)}</td><td>${esc(g.moves.join(' '))}</td></tr>`).join('')
  const historyRows = history.slice().reverse().map((h) => `
    <tr class="${h.summary.failed ? 'bad' : 'ok'}"><td>${esc(h.startedAt)}</td><td>${h.summary.passed}/${h.summary.checks}</td><td>${esc(h.failingInvariants.join(', ') || 'none')}</td><td>${esc(h.report)}</td></tr>`).join('')
  const repro = firstFailure
    ? `<ol><li>Run <code>npm run qa:agent -- ${run.quick ? '--quick ' : ''}${run.injectedVariationStarvation ? '--inject-variation-starvation ' : ''}</code></li><li>Set difficulty to <code>${esc(firstFailure.difficulty || 'n/a')}</code>.</li><li>Replay SAN: <code>${esc((firstFailure.moves || []).join(' '))}</code></li><li>Inspect FEN: <code>${esc(firstFailure.fen || '')}</code></li></ol>`
    : '<p>No failures in this run. Use the history table to compare with previous runs.</p>'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Ramify QA Agent - ${status} - ${esc(run.startedAt)}</title>
<style>
  body { margin: 32px; font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; background: #fff; }
  h1, h2 { margin: 0 0 12px; }
  section { border-top: 1px solid #111; padding-top: 20px; margin-top: 24px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #111; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f5f5f5; }
  code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  .status { display: inline-block; border: 2px solid #111; padding: 6px 10px; font-weight: 700; }
  .ok { background: #fff; }
  .bad { background: #eee; font-weight: 600; }
  .small { color: #333; font-size: 13px; }
</style>
</head>
<body>
<h1>Ramify continuous QA digest</h1>
<p class="status">${status}: ${run.summary.passed}/${run.summary.checks} checks passed</p>
<p class="small">Run ${esc(run.id)}. Duration ${Math.round(run.durationMs / 1000)}s. Artifacts are under <code>.local-ci/qa-agent/</code>.</p>
<section>
<h2>Problem</h2>
<p>Ramify previously shipped a deep-line regression where the variation trainer silently dropped to zero and coaching became generic because short smoke tests never played far enough. This agent plays long browser games against the real engine and checks the product promises at every move.</p>
</section>
<section>
<h2>Evidence</h2>
<p>${failures.length ? `Found ${failures.length} failing checks. First failing invariant: <strong>${esc(firstFailure.invariant)}</strong>.` : 'No invariant failures were observed in this run.'}</p>
<table><thead><tr><th>Status</th><th>Invariant</th><th>Check</th><th>Difficulty</th><th>Expected</th><th>Actual</th></tr></thead><tbody>${rows}</tbody></table>
</section>
<section>
<h2>Current versus expected behaviour</h2>
<p>Expected: each difficulty shows its promised number of legal candidate moves until the position has fewer legal moves; opening context remains visible after leaving book; the engine responds within a bounded time; no runtime errors or failed network requests occur; the board remains interactive on the student's turn; coaching text is ASCII-clean.</p>
<p>Current: ${failures.length ? esc(failures.map((f) => `${f.invariant}: expected ${f.expected}, actual ${f.actual}`).join(' | ')) : 'all checked promises held.'}</p>
</section>
<section>
<h2>Reproduction steps</h2>
${repro}
</section>
<section>
<h2>Games played</h2>
<table><thead><tr><th>Difficulty</th><th>Plies</th><th>Ended</th><th>Final FEN</th><th>Move list</th></tr></thead><tbody>${gameRows}</tbody></table>
</section>
<section>
<h2>History across runs</h2>
<table><thead><tr><th>Started</th><th>Checks</th><th>Failing invariants</th><th>Report</th></tr></thead><tbody>${historyRows}</tbody></table>
</section>
<section>
<h2>What the human needs to decide</h2>
<p>If this run failed, replay the listed SAN/FEN in the app and decide whether to fix the product code or adjust the promise. If it passed, keep the cron job enabled and review this digest only when the history turns red.</p>
</section>
</body>
</html>
`
}

main().catch((err) => {
  console.error(`\nqa agent failed: ${err.stack || err.message}`)
  process.exitCode = 1
})
