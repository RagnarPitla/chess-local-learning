/**
 * Chess Local Learning - zero-dependency server.
 *
 * Responsibilities:
 *  1. Serve the static single-page app from ./public
 *  2. Mount vendored ES modules + the Stockfish WASM engine straight out of
 *     node_modules (no build step, no CDN, works fully offline)
 *  3. Proxy the optional LLM coaching layer so the API key never reaches the
 *     browser. All prompts live server-side so they stay versioned with the app.
 *  4. Persist the weakness profile and played games to ./data
 */
import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.join(ROOT, 'public')
const NODE_MODULES = path.join(ROOT, 'node_modules')

loadDotEnv(path.join(ROOT, '.env'))

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data')

const PORT = Number(process.env.PORT || 5173)
const HOST = process.env.HOST || '127.0.0.1'
const ENGINE_BUILD = process.env.ENGINE_BUILD || 'stockfish-18-lite-single'

/**
 * The multi threaded engine builds use SharedArrayBuffer, which browsers only
 * hand out to cross-origin isolated pages. The single threaded default needs
 * none of this, so the headers are only sent when they are actually required.
 */
const NEEDS_ISOLATION = !/-single$/.test(ENGINE_BUILD)
const ISOLATION_HEADERS = NEEDS_ISOLATION
  ? { 'cross-origin-opener-policy': 'same-origin', 'cross-origin-embedder-policy': 'require-corp' }
  : {}

const COACH = resolveCoachConfig()

/** Public URL prefix -> absolute directory it is allowed to read from. */
const VENDOR_MOUNTS = {
  '/vendor/chess.js/': path.join(NODE_MODULES, 'chess.js', 'dist', 'esm'),
  '/vendor/cm-chessboard/': path.join(NODE_MODULES, 'cm-chessboard'),
  '/vendor/stockfish/': path.join(NODE_MODULES, 'stockfish', 'bin'),
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const coachCache = new Map()
const COACH_CACHE_LIMIT = 200

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error('[server]', err)
    sendJson(res, 500, { ok: false, error: String(err && err.message ? err.message : err) })
  })
})

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(url.pathname)

  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname)

  for (const [prefix, dir] of Object.entries(VENDOR_MOUNTS)) {
    if (pathname.startsWith(prefix)) {
      return serveFile(req, res, safeJoin(dir, pathname.slice(prefix.length)), { immutable: true })
    }
  }

  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const file = safeJoin(PUBLIC_DIR, rel)
  if (file && (await isFile(file))) return serveFile(req, res, file)

  // SPA fallback so deep links keep working.
  if (!path.extname(rel)) return serveFile(req, res, path.join(PUBLIC_DIR, 'index.html'))
  return sendText(res, 404, 'Not found')
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      engine: { build: ENGINE_BUILD, url: `/vendor/stockfish/${ENGINE_BUILD}.js`, crossOriginIsolated: NEEDS_ISOLATION },
      coach: { configured: Boolean(COACH), provider: COACH?.provider ?? null, model: COACH?.model ?? null },
      version: '0.1.0',
    })
  }

  if (pathname === '/api/coach' && req.method === 'POST') {
    const body = await readJson(req)
    if (!body || typeof body.kind !== 'string') {
      return sendJson(res, 400, { ok: false, error: 'expected { kind, data }' })
    }
    if (!COACH) {
      return sendJson(res, 200, { ok: false, reason: 'no-key', text: null })
    }
    const key = hash(JSON.stringify({ k: body.kind, d: body.data, m: COACH.model }))
    if (coachCache.has(key)) {
      return sendJson(res, 200, { ok: true, text: coachCache.get(key), cached: true, provider: COACH.provider })
    }
    try {
      const text = await callCoach(body.kind, body.data)
      rememberCoach(key, text)
      return sendJson(res, 200, { ok: true, text, provider: COACH.provider, model: COACH.model })
    } catch (err) {
      console.error('[coach]', err.message)
      return sendJson(res, 200, { ok: false, reason: 'upstream-error', error: err.message, text: null })
    }
  }

  if (pathname === '/api/profile') {
    if (req.method === 'GET') return sendJson(res, 200, { ok: true, profile: await readStore('profile.json', null) })
    if (req.method === 'PUT') {
      const body = await readJson(req)
      await writeStore('profile.json', body)
      return sendJson(res, 200, { ok: true })
    }
  }

  if (pathname === '/api/games') {
    if (req.method === 'GET') return sendJson(res, 200, { ok: true, games: await readStore('games.json', []) })
    if (req.method === 'POST') {
      const body = await readJson(req)
      const games = await readStore('games.json', [])
      games.unshift({ ...body, savedAt: new Date().toISOString() })
      await writeStore('games.json', games.slice(0, 200))
      return sendJson(res, 200, { ok: true, count: games.length })
    }
  }

  return sendJson(res, 404, { ok: false, error: 'unknown endpoint' })
}

/* ------------------------------------------------------------------ coach */

function resolveCoachConfig() {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      key: process.env.ANTHROPIC_API_KEY,
      model: process.env.COACH_MODEL || 'claude-sonnet-4-5',
    }
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    }
  }
  return null
}

const BASE_SYSTEM = `You are a chess coach for an adult improver who learns by understanding, not memorisation.

Hard rules:
- Explain WHY a move works using concrete features: pawn structure, piece activity, weak squares, king safety, tempo, material.
- Never tell the student to "memorise" a line. If you cite a line, give the idea behind it.
- Be concrete about squares and pieces (e.g. "the bishop on c8 is boxed in by the pawn on e6").
- Never invent moves. Only reference moves and evaluations present in the supplied data.
- Evaluations are centipawns from the student's point of view. Positive means the student is better.
- Plain text with short paragraphs and hyphen bullets. No markdown headers, no tables, no emoji.
- British-neutral plain English, direct, no filler or praise padding.`

const KIND_PROMPTS = {
  'game-review': `Task: review one game. Output exactly these sections as plain lines:
"What decided the game:" one or two sentences.
"Your three costliest moments:" one bullet per mistake supplied - name the move, what it allowed, and the principle that was broken.
"The pattern:" one bullet naming the single recurring weakness across those moments.
"Drill this week:" one concrete, repeatable habit (a checklist question the student asks before moving).
Maximum 260 words.`,
  'move-explain': `Task: explain one move the student got wrong. Cover, in order: what the played move overlooks, why the engine's move is stronger in terms of position not calculation, and the general rule this position teaches. Maximum 130 words.`,
  deviation: `Task: the opponent has just left known opening theory. The student panics here because their preparation was a memorised tree.
Cover, in order: what the opponent's move actually changes about the position (structure, space, development, weaknesses it creates or concedes), the correct plan derived from first principles, and one concrete candidate move with its idea.
Do not say "this is a sideline" or refer to theory names as the answer. Maximum 150 words.`,
  'puzzle-explain': `Task: the student attempted a puzzle drawn from their own game. Explain why the solution works and, if they answered wrong, what visual cue they missed that would have flagged it. Maximum 120 words.`,
  lesson: `Task: write a short targeted lesson on the supplied weakness pattern, using the student's own positions as evidence. Cover: how to recognise the pattern on the board, why it costs material or position, and a three-step checklist to avoid it. Maximum 220 words.`,
}

async function callCoach(kind, data) {
  const instruction = KIND_PROMPTS[kind] || KIND_PROMPTS['move-explain']
  const system = `${BASE_SYSTEM}\n\n${instruction}`
  const user = `Here is the position data as JSON:\n\n${JSON.stringify(data, null, 2)}`

  if (COACH.provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': COACH.key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: COACH.model,
        max_tokens: 1200,
        temperature: 0.4,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`)
    const json = await r.json()
    return (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
  }

  const r = await fetch(`${COACH.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${COACH.key}` },
    body: JSON.stringify({
      model: COACH.model,
      temperature: 0.4,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!r.ok) throw new Error(`openai ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const json = await r.json()
  return (json.choices?.[0]?.message?.content || '').trim()
}

function rememberCoach(key, text) {
  coachCache.set(key, text)
  if (coachCache.size > COACH_CACHE_LIMIT) coachCache.delete(coachCache.keys().next().value)
}

/* ------------------------------------------------------------------ store */

async function readStore(name, fallback) {
  try {
    return JSON.parse(await fsp.readFile(path.join(DATA_DIR, name), 'utf8'))
  } catch {
    return fallback
  }
}

async function writeStore(name, value) {
  await fsp.mkdir(DATA_DIR, { recursive: true })
  const target = path.join(DATA_DIR, name)
  const tmp = `${target}.${process.pid}.tmp`
  await fsp.writeFile(tmp, JSON.stringify(value, null, 2))
  await fsp.rename(tmp, target)
}

/* ------------------------------------------------------------------ utils */

function loadDotEnv(file) {
  let raw
  try {
    raw = fs.readFileSync(file, 'utf8')
  } catch {
    return
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
    if (!m || line.trim().startsWith('#')) continue
    const value = m[2].replace(/^["'](.*)["']$/, '$1')
    if (value && !process.env[m[1]]) process.env[m[1]] = value
  }
}

function safeJoin(root, rel) {
  const target = path.resolve(root, rel.replace(/^\/+/, ''))
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep
  return target === root || target.startsWith(rootWithSep) ? target : null
}

async function isFile(file) {
  try {
    return (await fsp.stat(file)).isFile()
  } catch {
    return false
  }
}

async function serveFile(req, res, file, { immutable = false } = {}) {
  if (!file) return sendText(res, 403, 'Forbidden')
  let stat
  try {
    stat = await fsp.stat(file)
  } catch {
    return sendText(res, 404, 'Not found')
  }
  if (!stat.isFile()) return sendText(res, 404, 'Not found')

  const etag = `W/"${stat.size}-${Number(stat.mtimeMs).toString(36)}"`
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { etag, ...ISOLATION_HEADERS })
    return res.end()
  }

  res.writeHead(200, {
    'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'content-length': stat.size,
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'cross-origin-resource-policy': 'same-origin',
    ...ISOLATION_HEADERS,
    etag,
  })
  if (req.method === 'HEAD') return res.end()
  fs.createReadStream(file).pipe(res)
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 4_000_000) {
        reject(new Error('payload too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve(null)
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (err) {
        reject(new Error(`invalid JSON body: ${err.message}`))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, { 'content-type': MIME['.json'], 'content-length': Buffer.byteLength(body) })
  res.end(body)
}

function sendText(res, status, text) {
  res.writeHead(status, { 'content-type': MIME['.txt'], 'content-length': Buffer.byteLength(text) })
  res.end(text)
}

function hash(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 32)
}

server.listen(PORT, HOST, () => {
  const engineFile = path.join(NODE_MODULES, 'stockfish', 'bin', `${ENGINE_BUILD}.js`)
  console.log(`Chess Local Learning  ->  http://${HOST}:${PORT}`)
  console.log(`  engine : ${ENGINE_BUILD} ${fs.existsSync(engineFile) ? '(ready)' : '(MISSING - run npm install)'}`)
  console.log(`  coach  : ${COACH ? `${COACH.provider} / ${COACH.model}` : 'offline heuristic (no API key set)'}`)
})

export { server }
