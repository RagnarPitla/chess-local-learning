/**
 * Stockfish WASM wrapper: promise-based UCI over a Web Worker.
 *
 * The npm `stockfish` build self-registers an onmessage handler when loaded in
 * a worker and treats every posted string as a raw UCI command, replying with
 * engine output lines. Everything below is serialised through a single queue so
 * the same engine can safely serve both "play a move" and "analyse" callers.
 */

const MATE_SCORE = 10000

export class Engine {
  constructor({ url, onStatus } = {}) {
    this.url = url || '/vendor/stockfish/stockfish-18-lite-single.js'
    this.onStatus = onStatus || (() => {})
    this.worker = null
    this.ready = false
    this.busy = false
    this.queue = []
    this.pending = null
    this.options = { multipv: 1, limitStrength: false, elo: null }
  }

  async init() {
    if (this.ready) return this
    this.onStatus('loading engine')
    this.worker = new Worker(this.url)
    this.worker.onmessage = (e) => this._onLine(typeof e.data === 'string' ? e.data : String(e.data ?? ''))
    this.worker.onerror = (e) => {
      const err = new Error(`engine worker error: ${e.message || 'unknown'}`)
      if (this.pending) this._settle(null, err)
      this.onStatus('engine failed to load')
    }

    await this._command('uci', (line) => line.trim() === 'uciok', 120000)
    await this._command('setoption name Ponder value false', null)
    await this.isReady()
    this.ready = true
    this.onStatus('engine ready')
    return this
  }

  isReady() {
    return this._command('isready', (line) => line.trim() === 'readyok', 120000)
  }

  /** Strength control. Pass elo=null to analyse at full strength. */
  async configure({ elo = null, multipv = 1 } = {}) {
    if (multipv !== this.options.multipv) {
      await this._command(`setoption name MultiPV value ${multipv}`, null)
      this.options.multipv = multipv
    }
    const wantLimit = Number.isFinite(elo)
    if (wantLimit !== this.options.limitStrength) {
      await this._command(`setoption name UCI_LimitStrength value ${wantLimit}`, null)
      this.options.limitStrength = wantLimit
    }
    if (wantLimit && elo !== this.options.elo) {
      await this._command(`setoption name UCI_Elo value ${Math.round(elo)}`, null)
      this.options.elo = elo
    }
    return this.isReady()
  }

  async newGame() {
    await this._command('ucinewgame', null)
    return this.isReady()
  }

  /**
   * Search a position.
   * @returns {{fen:string, depth:number, best:string|null, ponder:string|null,
   *            lines:Array<{multipv:number, cp:number|null, mate:number|null, pv:string[]}>,
   *            cp:number, mate:number|null, timeMs:number}}
   *          Scores are centipawns from the side-to-move point of view.
   */
  async search(fen, { depth = 12, movetime = null, multipv = 1, elo = null, nodes = null } = {}) {
    await this.init()
    await this.configure({ elo, multipv })

    const started = performance.now()
    const collected = new Map()
    let bestDepth = 0

    const go = movetime
      ? `go movetime ${movetime}`
      : nodes
        ? `go nodes ${nodes}`
        : `go depth ${depth}`

    const result = await this._command(
      `position fen ${fen}\n${go}`,
      (line) => {
        if (line.startsWith('info ')) {
          const info = parseInfo(line)
          const scored = info && (info.cp !== null || info.mate !== null)
          if (info && info.pv && scored && !info.bound) {
            if (info.depth >= bestDepth) bestDepth = info.depth
            collected.set(info.multipv, info)
          }
          return false
        }
        if (line.startsWith('bestmove')) {
          const parts = line.split(/\s+/)
          return { best: parts[1] && parts[1] !== '(none)' ? parts[1] : null, ponder: parts[3] || null }
        }
        return false
      },
      180000,
    )

    const lines = [...collected.values()].sort((a, b) => a.multipv - b.multipv)
    const top = lines[0] || null
    return {
      fen,
      depth: bestDepth,
      best: result.best,
      ponder: result.ponder,
      lines: lines.map((l) => ({ multipv: l.multipv, cp: l.cp, mate: l.mate, pv: l.pv, depth: l.depth })),
      cp: top ? scoreToCp(top) : 0,
      mate: top ? top.mate : null,
      timeMs: Math.round(performance.now() - started),
    }
  }

  /** Convenience: engine plays a move at a given rating. */
  async pickMove(fen, { elo = 1500, movetime = 400 } = {}) {
    const r = await this.search(fen, { elo, movetime, multipv: 1 })
    return r.best
  }

  stop() {
    if (this.worker && this.busy) this.worker.postMessage('stop')
  }

  quit() {
    if (!this.worker) return
    try {
      this.worker.postMessage('quit')
    } catch {
      /* worker already gone */
    }
    this.worker.terminate()
    this.worker = null
    this.ready = false
  }

  /* ----------------------------------------------------------- internals */

  _command(text, matcher, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      this.queue.push({ text, matcher, timeoutMs, resolve, reject })
      this._drain()
    })
  }

  _drain() {
    if (this.busy || !this.queue.length || !this.worker) return
    const job = this.queue.shift()
    this.busy = true

    if (!job.matcher) {
      for (const line of job.text.split('\n')) this.worker.postMessage(line)
      this.busy = false
      job.resolve(true)
      this._drain()
      return
    }

    this.pending = job
    job.timer = setTimeout(() => {
      this._settle(null, new Error(`engine timeout after ${job.timeoutMs}ms for: ${job.text.split('\n')[0]}`))
    }, job.timeoutMs)

    for (const line of job.text.split('\n')) this.worker.postMessage(line)
  }

  _onLine(line) {
    if (!line) return
    const job = this.pending
    if (!job) return
    let matched
    try {
      matched = job.matcher(line)
    } catch (err) {
      this._settle(null, err)
      return
    }
    if (matched) this._settle(matched === true ? line : matched, null)
  }

  _settle(value, err) {
    const job = this.pending
    if (!job) return
    clearTimeout(job.timer)
    this.pending = null
    this.busy = false
    if (err) job.reject(err)
    else job.resolve(value)
    this._drain()
  }
}

/** Parse a UCI `info` line into a structured object. */
export function parseInfo(line) {
  const t = line.split(/\s+/)
  const out = { multipv: 1, depth: 0, cp: null, mate: null, pv: null, bound: false, nps: null }
  for (let i = 1; i < t.length; i++) {
    switch (t[i]) {
      case 'depth':
        out.depth = Number(t[++i])
        break
      case 'multipv':
        out.multipv = Number(t[++i])
        break
      case 'nps':
        out.nps = Number(t[++i])
        break
      case 'score':
        if (t[i + 1] === 'cp') {
          out.cp = Number(t[i + 2])
          i += 2
        } else if (t[i + 1] === 'mate') {
          out.mate = Number(t[i + 2])
          i += 2
        }
        break
      case 'lowerbound':
      case 'upperbound':
        out.bound = true
        break
      case 'pv':
        out.pv = t.slice(i + 1)
        i = t.length
        break
      default:
        break
    }
  }
  return out.pv || out.cp !== null || out.mate !== null ? out : null
}

/** Collapse a cp/mate score into a single centipawn number. */
export function scoreToCp({ cp, mate }) {
  if (mate !== null && mate !== undefined) {
    return mate > 0 ? MATE_SCORE - mate * 10 : -MATE_SCORE - mate * 10
  }
  return cp ?? 0
}

export { MATE_SCORE }
