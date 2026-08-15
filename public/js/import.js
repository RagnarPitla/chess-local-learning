/**
 * Bring games in from anywhere: a pasted/dropped file, or a username on
 * Lichess or Chess.com. The thesis of this app is that a student's own games
 * are the curriculum, so importing a whole history has to be a one-click,
 * forgiving operation - one bad game in a 2000-game export must never abort
 * the rest of the import.
 *
 * Pure parsing/fetch logic (no DOM) lives in the first section so it can run
 * under `node --test` exactly like it runs in the browser. `mountImport` at
 * the bottom is the only DOM-touching export.
 */
import { Chess } from 'chess.js'

const STANDARD_VARIANTS = new Set(['', 'standard', 'standard chess', 'from position'])
const RESULT_VALUES = new Set(['1-0', '0-1', '1/2-1/2', '*'])

/* ------------------------------------------------------------- splitting */

/** Strip a leading UTF-8 BOM and normalise all line endings to "\n". */
function normaliseText(text) {
  return String(text ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
}

/**
 * Split a multi-game PGN blob into individual game chunks.
 *
 * Every PGN game starts its tag section with an `[Event "..."]` line (the
 * first of the "seven tag roster"), and that token cannot legally appear at
 * the start of a line anywhere else in a well-formed PGN. So the boundary
 * between games is simply "a newline immediately followed by [Event ".
 */
function splitPgnDatabase(text) {
  const normalised = normaliseText(text).trim()
  if (!normalised) return []
  return normalised.split(/\n(?=\[Event\s)/).map((chunk) => chunk.trim()).filter(Boolean)
}

/** Cheap tag-pair scan, independent of chess.js, used before we commit to a
 *  full parse (so we can skip unsupported variants without risking chess.js
 *  mis-reading a non-standard starting position) and as a fallback source of
 *  headers when chess.js throws. */
function quickHeaders(raw) {
  const headers = {}
  const re = /^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm
  let match
  while ((match = re.exec(raw))) {
    headers[match[1]] = match[2].replace(/\\(["\\])/g, '$1')
  }
  return headers
}

function isStandardVariant(variant) {
  if (!variant) return true
  return STANDARD_VARIANTS.has(String(variant).trim().toLowerCase())
}

/* ------------------------------------------------------------------ id */

/** Deterministic non-cryptographic 64-bit-ish hash (two 32-bit FNV/xor-mix
 *  passes) so re-importing the same file never creates duplicate games. */
function hashString(str) {
  let h1 = 0x811c9dc5
  let h2 = 0x9e3779b9
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h1 ^= c
    h1 = Math.imul(h1, 0x01000193)
    h2 = Math.imul(h2 ^ c, 0x85ebca6b)
    h2 = ((h2 << 13) | (h2 >>> 19)) >>> 0
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')
}

function makeGameId(headers, moves) {
  const keys = Object.keys(headers).sort()
  const basis = `${keys.map((k) => `${k}=${headers[k]}`).join('\n')}\n#MOVES#\n${moves.join(' ')}`
  return `g_${hashString(basis)}`
}

/* -------------------------------------------------------------- fields */

function normaliseResult(result) {
  const trimmed = result ? String(result).trim() : ''
  return RESULT_VALUES.has(trimmed) ? trimmed : '*'
}

/** PGN dates look like "2024.03.17" and often have unknown "??" parts. This
 *  returns a sortable "YYYY-MM-DD" string, or null when the year is unknown. */
function normaliseDate(raw) {
  if (!raw) return null
  const match = String(raw).match(/^(\d{4})\.(\d{2}|\?\?)\.(\d{2}|\?\?)/)
  if (!match) return null
  const [, year, month, day] = match
  if (!/^\d{4}$/.test(year)) return null
  return `${year}-${month === '??' ? '01' : month}-${day === '??' ? '01' : day}`
}

function toIntOrNull(raw) {
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

function extractUrl(headers) {
  if (headers.Link && /^https?:\/\//.test(headers.Link)) return headers.Link
  if (headers.Site && /^https?:\/\//.test(headers.Site)) return headers.Site
  return null
}

function detectSource(headers) {
  const site = `${headers.Site || ''} ${headers.Link || ''}`.toLowerCase()
  if (site.includes('lichess')) return 'lichess'
  if (site.includes('chess.com')) return 'chesscom'
  return 'file'
}

/* ------------------------------------------------------------ database */

/**
 * Split a multi-game PGN file into individual games and parse each one
 * defensively - a bad game is recorded as an error, never a thrown
 * exception that would abort the whole file.
 *
 * @param {string} text
 * @param {{maxGames?: number}} [opts]
 * @returns {{games: object[], errors: {index:number, message:string}[], truncated: boolean}}
 */
export function parsePgnDatabase(text, { maxGames = 2000 } = {}) {
  const chunks = splitPgnDatabase(text)
  const truncated = chunks.length > maxGames
  const toProcess = truncated ? chunks.slice(0, maxGames) : chunks

  const games = []
  const errors = []

  toProcess.forEach((raw, index) => {
    const preHeaders = quickHeaders(raw)
    const variant = preHeaders.Variant
    if (!isStandardVariant(variant)) {
      errors.push({ index, message: `Unsupported variant "${variant}" - skipped (only standard chess is supported)` })
      return
    }

    try {
      const chess = new Chess()
      chess.loadPgn(raw, { strict: false })
      const moves = chess.history()
      const headers = chess.getHeaders()
      games.push({
        id: makeGameId(headers, moves),
        pgn: raw,
        moves,
        headers,
        white: headers.White || 'Unknown',
        black: headers.Black || 'Unknown',
        result: normaliseResult(headers.Result),
        date: normaliseDate(headers.Date || headers.UTCDate),
        timeControl: headers.TimeControl || null,
        eco: headers.ECO || null,
        opening: headers.Opening || null,
        whiteElo: toIntOrNull(headers.WhiteElo),
        blackElo: toIntOrNull(headers.BlackElo),
        url: extractUrl(headers),
        source: detectSource(headers),
      })
    } catch (err) {
      const who = preHeaders.White && preHeaders.Black ? `${preHeaders.White} vs ${preHeaders.Black}: ` : ''
      errors.push({ index, message: `${who}${err && err.message ? err.message : String(err)}` })
    }
  })

  return { games, errors, truncated }
}

/* ------------------------------------------------------------ fetching */

function countGamesInText(text) {
  const matches = text.match(/^\[Event\s/gm)
  return matches ? matches.length : 0
}

/** Read a fetch Response body as text while reporting real incremental
 *  progress (bytes received, games spotted so far) - not a simulated bar. */
async function streamWithProgress(res, onProgress) {
  if (!res.body || typeof res.body.getReader !== 'function') {
    const text = await res.text()
    onProgress?.({ bytesLoaded: text.length, games: countGamesInText(text), done: true })
    return text
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let text = ''
  let bytesLoaded = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    bytesLoaded += value.byteLength
    text += decoder.decode(value, { stream: true })
    onProgress?.({ bytesLoaded, games: countGamesInText(text), done: false })
  }
  text += decoder.decode()
  onProgress?.({ bytesLoaded, games: countGamesInText(text), done: true })
  return text
}

/**
 * Stream a user's whole Lichess history as PGN and parse it.
 *
 * CORS note: lichess.org sends `Access-Control-Allow-Origin: *` on this
 * route, so a browser can read the response from any origin - verified with
 * a real headless Chrome against this app's own dev origin. See the CORS
 * verification note in the project summary for how this was checked and for
 * the current live status of the endpoint itself.
 */
export async function importFromLichess(username, { max = 100, since = null, signal = null, onProgress = null } = {}) {
  const name = String(username || '').trim()
  if (!name) throw new Error('Enter a Lichess username first.')

  const params = new URLSearchParams({
    max: String(max),
    pgnInJson: 'false',
    clocks: 'false',
    evals: 'false',
    opening: 'true',
  })
  if (since) params.set('since', String(since))

  const url = `https://lichess.org/api/games/user/${encodeURIComponent(name)}?${params.toString()}`

  let res
  try {
    res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' }, signal })
  } catch (err) {
    if (err && err.name === 'AbortError') throw err
    throw new Error(
      `Could not reach Lichess (${err.message}). Download your PGN export from lichess.org and drop the file in instead.`,
    )
  }

  if (res.status === 429) {
    throw new Error('Lichess rate limit reached (HTTP 429). Wait a minute before importing again.')
  }
  if (res.status === 404) {
    throw new Error(
      `Lichess did not return an export for "${name}" (account not found, or the export is temporarily ` +
        `unavailable). Go to lichess.org/@/${encodeURIComponent(name)}/download, download the PGN there, ` +
        'and drop the file in instead.',
    )
  }
  if (!res.ok) {
    throw new Error(`Lichess returned an error (HTTP ${res.status}). Download the PGN export and drop the file in instead.`)
  }

  const text = await streamWithProgress(res, onProgress)
  const parsed = parsePgnDatabase(text)
  parsed.games.forEach((g) => {
    g.source = 'lichess'
  })
  return { ...parsed, source: 'lichess', username: name }
}

/**
 * Fetch a user's recent Chess.com history: the archive index, then the last
 * N monthly archives, concatenated and parsed together.
 *
 * CORS note: api.chess.com sends permissive CORS headers on both the
 * archives index and the monthly archive JSON - verified with a real
 * headless Chrome against this app's own dev origin.
 */
export async function importFromChessCom(username, { months = 3, signal = null, onProgress = null } = {}) {
  const name = String(username || '').trim()
  if (!name) throw new Error('Enter a Chess.com username first.')
  const lower = name.toLowerCase()

  let archives
  try {
    const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(lower)}/games/archives`, { signal })
    if (res.status === 404) throw new Error(`Chess.com has no player named "${name}".`)
    if (res.status === 429) throw new Error('Chess.com rate limit reached (HTTP 429). Wait a minute and try again.')
    if (!res.ok) throw new Error(`Chess.com returned an error (HTTP ${res.status}).`)
    const json = await res.json()
    archives = Array.isArray(json.archives) ? json.archives : []
  } catch (err) {
    if (err && err.name === 'AbortError') throw err
    if (err instanceof Error && /^Chess\.com/.test(err.message)) throw err
    throw new Error(
      `Could not reach Chess.com (${err.message}). Download your PGN export from chess.com and drop the file in instead.`,
    )
  }

  const wanted = archives.slice(-Math.max(1, months))
  const texts = []
  const errors = []

  for (let i = 0; i < wanted.length; i++) {
    onProgress?.({ archiveIndex: i, archiveCount: wanted.length, month: wanted[i], done: false })
    try {
      const res = await fetch(wanted[i], { signal })
      if (res.status === 429) throw new Error('rate limit reached (HTTP 429)')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      for (const g of json.games || []) {
        if (g.pgn) texts.push(g.pgn)
      }
    } catch (err) {
      if (err && err.name === 'AbortError') throw err
      errors.push({ index: i, message: `Could not fetch ${wanted[i]}: ${err.message}` })
    }
  }
  onProgress?.({ archiveIndex: wanted.length, archiveCount: wanted.length, done: true })

  const parsed = parsePgnDatabase(texts.join('\n\n'))
  parsed.games.forEach((g) => {
    g.source = 'chesscom'
  })
  parsed.errors = [...errors, ...parsed.errors]
  return { ...parsed, source: 'chesscom', username: name }
}

/** Parse a dropped/chosen File (from an <input type="file"> or a drop event). */
export async function importFromFile(file) {
  if (!file) throw new Error('No file given.')
  let text
  try {
    text = await file.text()
  } catch (err) {
    throw new Error(`Could not read "${file.name || 'file'}": ${err.message}`)
  }
  const parsed = parsePgnDatabase(text)
  return { ...parsed, source: 'file', filename: file.name || 'import.pgn' }
}

/** Which side the student played, case-insensitive. Returns null when the
 *  username does not match either player (spectated or unknown game). */
export function detectPlayerColour(game, username) {
  const target = String(username || '').trim().toLowerCase()
  if (!game || !target) return null
  const white = String(game.white || '').trim().toLowerCase()
  const black = String(game.black || '').trim().toLowerCase()
  if (white === target) return 'w'
  if (black === target) return 'b'
  return null
}

function sourceLabel(source) {
  if (source === 'lichess') return 'Lichess'
  if (source === 'chesscom') return 'Chess.com'
  if (source === 'file') return 'a file'
  return source || 'an unknown source'
}

/** A short human-readable sentence about what was imported. */
export function importSummary(result) {
  const { games = [], errors = [], truncated = false, source, username } = result || {}
  const parts = []
  const from = source ? ` from ${sourceLabel(source)}${username ? ` (${username})` : ''}` : ''
  parts.push(`Imported ${games.length} game${games.length === 1 ? '' : 's'}${from}.`)
  if (errors.length) {
    parts.push(`${errors.length} game${errors.length === 1 ? '' : 's'} could not be read and ${errors.length === 1 ? 'was' : 'were'} skipped.`)
  }
  if (truncated) parts.push('Stopped early because the file had more games than the import limit.')
  return parts.join(' ')
}

/* =============================================================== mount == */
/* Everything below this line touches the DOM.                             */

function h(tag, props = {}, children = []) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue
    if (key === 'class') node.className = value
    else if (key === 'text') node.textContent = value
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value)
    else node.setAttribute(key, value)
  }
  for (const child of [].concat(children || [])) {
    if (child === null || child === undefined || child === false) continue
    node.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
  return node
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild)
}

/**
 * Render the self-contained import UI into `container`.
 *
 * @param {HTMLElement} container
 * @param {{onGamesAdded?: Function, onReviewRequested?: Function}} [handlers]
 * @returns {{destroy: Function}}
 */
export function mountImport(container, { onGamesAdded, onReviewRequested } = {}) {
  clearNode(container)
  container.classList.add('imp-root')

  const state = { source: 'lichess', busy: false, controller: null, lastResult: null }

  /* ---- drop zone + file input ---- */
  const fileInput = h('input', {
    type: 'file',
    accept: '.pgn,.txt,text/plain',
    multiple: 'multiple',
    class: 'imp-file-input',
  })
  const dropText = h('div', { class: 'imp-drop-text', text: 'Drag your .pgn export here, or choose a file below.' })
  const dropZone = h('div', { class: 'imp-drop', tabindex: '0', role: 'button', 'aria-label': 'Drop a PGN file to import' }, [
    h('div', { class: 'imp-drop-icon', text: String.fromCharCode(0x2659) }),
    dropText,
    fileInput,
  ])

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.classList.add('is-dragover')
  })
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragover'))
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.classList.remove('is-dragover')
    const files = [...(e.dataTransfer?.files || [])]
    if (files.length) runFileImport(files)
  })
  dropZone.addEventListener('click', (e) => {
    if (e.target !== fileInput) fileInput.click()
  })
  fileInput.addEventListener('change', () => {
    const files = [...fileInput.files]
    if (files.length) runFileImport(files)
    fileInput.value = ''
  })

  const fileCard = h('div', { class: 'card imp-card' }, [
    h('h2', { text: 'Import a file' }),
    h('p', { class: 'muted small', text: 'A .pgn export from Lichess, Chess.com or any other site - hundreds of games at once.' }),
    dropZone,
  ])

  /* ---- username + source toggle ---- */
  const lichessTab = h('button', { type: 'button', class: 'tab is-active', text: 'Lichess' })
  const chesscomTab = h('button', { type: 'button', class: 'tab', text: 'Chess.com' })
  lichessTab.addEventListener('click', () => setSource('lichess'))
  chesscomTab.addEventListener('click', () => setSource('chesscom'))

  const usernameInput = h('input', { type: 'text', placeholder: 'Your username', autocomplete: 'off' })

  const maxSelect = h('select', {}, [
    h('option', { value: '25', text: 'Last 25 games' }),
    h('option', { value: '100', selected: 'selected', text: 'Last 100 games' }),
    h('option', { value: '300', text: 'Last 300 games' }),
    h('option', { value: '1000', text: 'Last 1000 games' }),
    h('option', { value: '2000', text: 'Everything (up to 2000)' }),
  ])
  const monthsSelect = h('select', { class: 'hidden' }, [
    h('option', { value: '1', text: 'Last month' }),
    h('option', { value: '3', selected: 'selected', text: 'Last 3 months' }),
    h('option', { value: '6', text: 'Last 6 months' }),
    h('option', { value: '12', text: 'Last 12 months' }),
    h('option', { value: '999', text: 'Entire history' }),
  ])

  const fetchBtn = h('button', { type: 'button', class: 'primary wide', text: 'Import games' })
  const cancelBtn = h('button', { type: 'button', class: 'ghost hidden', text: 'Cancel' })
  fetchBtn.addEventListener('click', runRemoteImport)
  cancelBtn.addEventListener('click', () => state.controller?.abort())

  function setSource(source) {
    state.source = source
    lichessTab.classList.toggle('is-active', source === 'lichess')
    chesscomTab.classList.toggle('is-active', source === 'chesscom')
    maxSelect.classList.toggle('hidden', source !== 'lichess')
    monthsSelect.classList.toggle('hidden', source !== 'chesscom')
  }

  const remoteCard = h('div', { class: 'card imp-card' }, [
    h('h2', { text: 'Fetch by username' }),
    h('div', { class: 'form-row' }, [h('label', { text: 'Source' }), h('div', { class: 'imp-source-toggle' }, [lichessTab, chesscomTab])]),
    h('div', { class: 'form-row' }, [h('label', { text: 'Username' }), usernameInput]),
    h('div', { class: 'form-row' }, [h('label', { text: 'How many games' }), maxSelect, monthsSelect]),
    h('div', { class: 'row' }, [fetchBtn, cancelBtn]),
    h('div', { class: 'progress hidden imp-progress' }, [h('div', { class: 'progress-fill imp-progress-fill' })]),
  ])

  /* ---- status + errors + summary ---- */
  const statusText = h('p', { class: 'muted small imp-status' })
  const errorList = h('ul', { class: 'imp-error-list hidden' })
  const reviewBtn = h('button', { type: 'button', class: 'ghost wide hidden', text: 'Review the most recent game now' })
  reviewBtn.addEventListener('click', () => {
    const game = state.lastResult?.games?.[0]
    if (game) onReviewRequested?.(game)
  })
  const summaryCard = h('div', { class: 'card imp-card hidden' }, [
    h('h2', { text: 'Last import' }),
    statusText,
    errorList,
    reviewBtn,
  ])

  container.append(fileCard, remoteCard, summaryCard)

  /* ---- shared result handling ---- */
  function showResult(result) {
    state.lastResult = result
    summaryCard.classList.remove('hidden')
    statusText.textContent = importSummary(result)

    clearNode(errorList)
    if (result.errors.length) {
      errorList.classList.remove('hidden')
      for (const e of result.errors.slice(0, 25)) {
        errorList.append(h('li', { text: `Game ${e.index + 1}: ${e.message}` }))
      }
      if (result.errors.length > 25) {
        errorList.append(h('li', { class: 'muted', text: `...and ${result.errors.length - 25} more.` }))
      }
    } else {
      errorList.classList.add('hidden')
    }

    reviewBtn.classList.toggle('hidden', !result.games.some((g) => g.moves.length > 0))
    onGamesAdded?.(result)
  }

  function applyColourHint(result, username) {
    const name = username.trim()
    if (!name) return result
    result.games.forEach((g) => {
      g.colour = detectPlayerColour(g, name)
    })
    return result
  }

  async function runFileImport(files) {
    setBusy(true)
    statusText.textContent = `Reading ${files.length} file${files.length === 1 ? '' : 's'}...`
    try {
      const merged = { games: [], errors: [], truncated: false, source: 'file' }
      for (const file of files) {
        const result = await importFromFile(file)
        merged.games.push(...result.games)
        merged.errors.push(...result.errors.map((e) => ({ ...e, message: `${file.name}: ${e.message}` })))
        merged.truncated = merged.truncated || result.truncated
      }
      applyColourHint(merged, usernameInput.value)
      showResult(merged)
    } catch (err) {
      statusText.textContent = `Import failed: ${err.message}`
    } finally {
      setBusy(false)
    }
  }

  async function runRemoteImport() {
    const username = usernameInput.value.trim()
    if (!username) {
      statusText.textContent = 'Enter a username first.'
      return
    }
    setBusy(true)
    state.controller = new AbortController()
    const onProgress = (info) => renderProgress(info)
    try {
      const result =
        state.source === 'lichess'
          ? await importFromLichess(username, { max: Number(maxSelect.value), signal: state.controller.signal, onProgress })
          : await importFromChessCom(username, { months: Number(monthsSelect.value), signal: state.controller.signal, onProgress })
      applyColourHint(result, username)
      showResult(result)
    } catch (err) {
      if (err && err.name === 'AbortError') statusText.textContent = 'Import cancelled.'
      else statusText.textContent = err.message
    } finally {
      setBusy(false)
    }
  }

  function renderProgress(info) {
    const fill = remoteCard.querySelector('.imp-progress-fill')
    if (typeof info.bytesLoaded === 'number') {
      const kb = Math.round(info.bytesLoaded / 1024)
      statusText.textContent = `Downloading... ${kb} KB received, ${info.games} game${info.games === 1 ? '' : 's'} found so far.`
      fill.style.width = '50%'
    } else if (typeof info.archiveIndex === 'number') {
      const pct = info.archiveCount ? Math.round((info.archiveIndex / info.archiveCount) * 100) : 0
      statusText.textContent = info.done
        ? 'Parsing games...'
        : `Fetching month ${info.archiveIndex + 1} of ${info.archiveCount}...`
      fill.style.width = `${Math.min(100, pct)}%`
    }
  }

  function setBusy(busy) {
    state.busy = busy
    fetchBtn.disabled = busy
    cancelBtn.classList.toggle('hidden', !busy)
    remoteCard.querySelector('.imp-progress').classList.toggle('hidden', !busy)
    if (!busy) remoteCard.querySelector('.imp-progress-fill').style.width = '0%'
  }

  return {
    destroy() {
      state.controller?.abort()
      clearNode(container)
    },
  }
}
