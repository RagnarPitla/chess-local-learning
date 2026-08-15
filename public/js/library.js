/**
 * A persistent, queryable library of the student's games. Client-side only -
 * this app ships as a static site with no backend, so "keep your whole
 * history and come back to it" has to mean the browser's own storage.
 *
 * Storage split: localStorage caps out around 5 MB, nowhere near enough for
 * a few thousand PGNs plus engine reviews, so the game bodies live in
 * IndexedDB (effectively unbounded for this use case). A small summary
 * (counts by result/colour/opening/eco, reviewed/unreviewed, date range) is
 * mirrored into localStorage on every write so the app can show library
 * stats instantly on boot without waiting on an IndexedDB open/transaction.
 *
 * Pure helpers (filtering, sorting, stats maths) are free of DOM so this
 * module can be imported under `node --test`; only functions that touch
 * `indexedDB` do so lazily inside their own bodies, never at module load.
 */

const DB_NAME = 'chess-local-learning-library'
const DB_VERSION = 1
const STORE = 'games'
const INDEX_CACHE_KEY = 'chess-local-learning.library-index.v1'

export class LibraryError extends Error {
  constructor(message, code = 'error') {
    super(message)
    this.name = 'LibraryError'
    this.code = code
  }
}

function isQuotaError(err) {
  return Boolean(err) && (err.name === 'QuotaExceededError' || err.code === 22)
}

/* ------------------------------------------------------------ idb glue */

let dbPromise = null

/** Open (and cache) the library database. Safe to call many times. */
export function openLibrary() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new LibraryError('This browser does not support IndexedDB, so the game library cannot be saved here.', 'unsupported'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('date', 'date')
        store.createIndex('result', 'result')
        store.createIndex('source', 'source')
        store.createIndex('colour', 'colour')
        store.createIndex('reviewedFlag', 'reviewedFlag')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new LibraryError('The library database is open in another tab. Close it and try again.', 'blocked'))
  })
  return dbPromise
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function runInTransaction(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    let result
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new LibraryError('The library transaction was aborted.', 'aborted'))
    try {
      result = fn(tx.objectStore(STORE))
      // If fn() returned a promise (e.g. a get-then-validate check that can
      // reject before the transaction itself errors), attach a rejection
      // handler immediately. Otherwise the rejection only gets handled once
      // tx.oncomplete adopts it, and browsers report that gap as an
      // unhandled promise rejection even though it is caught a moment later.
      if (result && typeof result.catch === 'function') result.catch((err) => reject(err))
    } catch (err) {
      reject(err)
    }
  })
}

function getAllRecords(db) {
  return runInTransaction(db, 'readonly', (store) => requestToPromise(store.getAll()))
}

/** Get-then-add inside one transaction so a duplicate id never overwrites an
 *  existing record, and so a quota failure on game N leaves games 1..N-1
 *  safely committed rather than rolling back the whole batch. */
function addOneRecord(db, record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    let outcome = 'duplicate'
    const getReq = store.get(record.id)
    getReq.onsuccess = () => {
      if (getReq.result) return
      const addReq = store.add(record)
      addReq.onsuccess = () => {
        outcome = 'added'
      }
    }
    getReq.onerror = () => reject(getReq.error)
    tx.oncomplete = () => resolve(outcome)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new LibraryError('The library transaction was aborted.', 'aborted'))
  })
}

function toRecord(game) {
  if (!game || !game.id) throw new LibraryError('A game needs a stable "id" before it can be added to the library.', 'invalid')
  return {
    id: game.id,
    pgn: game.pgn || '',
    moves: Array.isArray(game.moves) ? game.moves : [],
    headers: game.headers || {},
    white: game.white || 'Unknown',
    black: game.black || 'Unknown',
    result: game.result || '*',
    date: game.date || null,
    timeControl: game.timeControl || null,
    eco: game.eco || null,
    opening: game.opening || null,
    whiteElo: game.whiteElo ?? null,
    blackElo: game.blackElo ?? null,
    url: game.url || null,
    source: game.source || 'file',
    colour: game.colour || null,
    addedAt: new Date().toISOString(),
    reviewedFlag: 0,
    reviewedAt: null,
    review: null,
  }
}

/* --------------------------------------------------------------- write */

/**
 * Add games to the library, deduping on the stable id.
 * @param {object[]} games
 * @returns {{added: number, duplicates: number, error?: string}}
 */
export async function addGames(games) {
  const db = await openLibrary()
  let added = 0
  let duplicates = 0
  let quotaMessage = null

  for (const game of games || []) {
    if (quotaMessage) break
    try {
      const outcome = await addOneRecord(db, toRecord(game))
      if (outcome === 'added') added++
      else duplicates++
    } catch (err) {
      if (isQuotaError(err)) {
        quotaMessage = 'Storage is full - some games could not be added. Export your library or delete old games, then import the rest.'
        break
      }
      throw err
    }
  }

  await refreshIndexCache(db)
  return quotaMessage ? { added, duplicates, error: quotaMessage } : { added, duplicates }
}

/** Persist an engine review so a game is never re-analysed needlessly. */
export async function saveReview(id, review) {
  const db = await openLibrary()
  try {
    return await runInTransaction(db, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const getReq = store.get(id)
        getReq.onsuccess = () => {
          const record = getReq.result
          if (!record) {
            reject(new LibraryError(`No game with id "${id}" in the library.`, 'not-found'))
            return
          }
          record.review = review
          record.reviewedFlag = 1
          record.reviewedAt = new Date().toISOString()
          const putReq = store.put(record)
          putReq.onsuccess = () => resolve(record)
          putReq.onerror = () => reject(putReq.error)
        }
        getReq.onerror = () => reject(getReq.error)
      })
    })
  } catch (err) {
    if (isQuotaError(err)) {
      throw new LibraryError('Storage is full - this review could not be saved. Export your library or delete old games, then retry.', 'quota')
    }
    throw err
  } finally {
    await refreshIndexCache(db)
  }
}

export async function deleteGame(id) {
  const db = await openLibrary()
  await runInTransaction(db, 'readwrite', (store) => store.delete(id))
  await refreshIndexCache(db)
}

export async function clearLibrary() {
  const db = await openLibrary()
  await runInTransaction(db, 'readwrite', (store) => store.clear())
  await refreshIndexCache(db)
}

/* ---------------------------------------------------------------- read */

export async function getGame(id) {
  const db = await openLibrary()
  const record = await runInTransaction(db, 'readonly', (store) => requestToPromise(store.get(id)))
  return record || null
}

function matchesSearch(game, term) {
  const q = term.toLowerCase()
  return [game.white, game.black, game.opening, game.eco, game.headers?.Event]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q))
}

function matchesFilter(game, filter) {
  if (filter.colour && game.colour !== filter.colour) return false
  if (filter.result && game.result !== filter.result) return false
  if (filter.eco && game.eco !== filter.eco) return false
  if (filter.opening && game.opening !== filter.opening) return false
  if (filter.source && game.source !== filter.source) return false
  if (typeof filter.reviewed === 'boolean' && Boolean(game.reviewedFlag) !== filter.reviewed) return false
  if (filter.dateFrom && (!game.date || game.date < filter.dateFrom)) return false
  if (filter.dateTo && (!game.date || game.date > filter.dateTo)) return false
  if (filter.search && !matchesSearch(game, filter.search)) return false
  return true
}

function compareValues(a, b) {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  return a < b ? -1 : 1
}

function comparatorFor(sort) {
  switch (sort) {
    case 'date-asc':
      return (a, b) => compareValues(a.date, b.date)
    case 'white':
      return (a, b) => compareValues(a.white, b.white)
    case 'black':
      return (a, b) => compareValues(a.black, b.black)
    case 'opening':
      return (a, b) => compareValues(a.opening, b.opening)
    case 'result':
      return (a, b) => compareValues(a.result, b.result)
    case 'date-desc':
    default:
      return (a, b) => compareValues(b.date, a.date)
  }
}

/**
 * List games matching a filter.
 * @param {{colour?, result?, opening?, eco?, source?, dateFrom?, dateTo?, reviewed?, search?, sort?, limit?, offset?}} [filter]
 */
export async function listGames(filter = {}) {
  const db = await openLibrary()
  const all = await getAllRecords(db)
  let list = all.filter((game) => matchesFilter(game, filter))
  list.sort(comparatorFor(filter.sort))
  if (typeof filter.offset === 'number' && filter.offset > 0) list = list.slice(filter.offset)
  if (typeof filter.limit === 'number' && filter.limit >= 0) list = list.slice(0, filter.limit)
  return list
}

function emptyStats() {
  return {
    total: 0,
    byResult: {},
    byColour: {},
    byOpening: {},
    byEco: {},
    reviewed: 0,
    unreviewed: 0,
    dateRange: { from: null, to: null },
  }
}

function bump(map, key) {
  map[key] = (map[key] || 0) + 1
}

function computeStats(records) {
  const stats = emptyStats()
  stats.total = records.length
  for (const game of records) {
    bump(stats.byResult, game.result || '*')
    bump(stats.byColour, game.colour || 'unknown')
    if (game.opening) bump(stats.byOpening, game.opening)
    if (game.eco) bump(stats.byEco, game.eco)
    if (game.reviewedFlag) stats.reviewed++
    else stats.unreviewed++
    if (game.date) {
      if (!stats.dateRange.from || game.date < stats.dateRange.from) stats.dateRange.from = game.date
      if (!stats.dateRange.to || game.date > stats.dateRange.to) stats.dateRange.to = game.date
    }
  }
  return stats
}

function loadIndexCache() {
  try {
    const raw = globalThis.localStorage?.getItem(INDEX_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveIndexCache(stats) {
  try {
    globalThis.localStorage?.setItem(INDEX_CACHE_KEY, JSON.stringify(stats))
  } catch {
    /* private browsing or quota: IndexedDB remains the source of truth */
  }
}

async function refreshIndexCache(db) {
  const records = await getAllRecords(db)
  const stats = computeStats(records)
  saveIndexCache(stats)
  return stats
}

/** Library stats, served instantly from the localStorage cache when present
 *  so the app can show "N games, M reviewed" on boot without opening IndexedDB. */
export async function libraryStats() {
  const cached = loadIndexCache()
  if (cached) return cached
  const db = await openLibrary()
  return refreshIndexCache(db)
}

/** One PGN blob of the whole library, so users are never locked in. */
export async function exportLibrary() {
  const db = await openLibrary()
  const all = await getAllRecords(db)
  all.sort(comparatorFor('date-asc'))
  const text = `${all.map((g) => (g.pgn || '').trim()).filter(Boolean).join('\n\n')}\n`
  return new Blob([text], { type: 'application/x-chess-pgn' })
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

const COLOUR_LABEL = { w: 'White', b: 'Black', unknown: 'Unknown' }
const RESULT_LABEL = { '1-0': '1-0', '0-1': '0-1', '1/2-1/2': 'Draw', '*': 'Unfinished' }
const PAGE_SIZE = 20

/**
 * Render the self-contained library UI into `container`.
 *
 * @param {HTMLElement} container
 * @param {{onSelectGame?: Function, onReviewRequested?: Function}} [handlers]
 * @returns {{refresh: Function, destroy: Function}}
 */
export function mountLibrary(container, { onSelectGame, onReviewRequested } = {}) {
  clearNode(container)
  container.classList.add('lib-root')

  const state = { page: 0, filter: {}, cancelQueue: false, games: [] }

  const statsRow = h('div', { class: 'stats lib-stats' })

  const searchInput = h('input', { type: 'search', placeholder: 'Search opponent, opening, ECO...' })
  const colourSelect = h('select', {}, [
    h('option', { value: '', text: 'Any colour' }),
    h('option', { value: 'w', text: 'White' }),
    h('option', { value: 'b', text: 'Black' }),
  ])
  const resultSelect = h('select', {}, [
    h('option', { value: '', text: 'Any result' }),
    h('option', { value: '1-0', text: '1-0' }),
    h('option', { value: '0-1', text: '0-1' }),
    h('option', { value: '1/2-1/2', text: 'Draw' }),
    h('option', { value: '*', text: 'Unfinished' }),
  ])
  const sourceSelect = h('select', {}, [
    h('option', { value: '', text: 'Any source' }),
    h('option', { value: 'lichess', text: 'Lichess' }),
    h('option', { value: 'chesscom', text: 'Chess.com' }),
    h('option', { value: 'file', text: 'File' }),
  ])
  const reviewedSelect = h('select', {}, [
    h('option', { value: '', text: 'Reviewed or not' }),
    h('option', { value: 'reviewed', text: 'Reviewed' }),
    h('option', { value: 'unreviewed', text: 'Not reviewed' }),
  ])
  const sortSelect = h('select', {}, [
    h('option', { value: 'date-desc', text: 'Newest first' }),
    h('option', { value: 'date-asc', text: 'Oldest first' }),
    h('option', { value: 'white', text: 'White name' }),
    h('option', { value: 'black', text: 'Black name' }),
    h('option', { value: 'opening', text: 'Opening' }),
  ])

  for (const el of [searchInput, colourSelect, resultSelect, sourceSelect, reviewedSelect, sortSelect]) {
    el.addEventListener('change', () => {
      state.page = 0
      refresh()
    })
  }
  searchInput.addEventListener('input', debounce(() => {
    state.page = 0
    refresh()
  }, 250))

  const exportBtn = h('button', { type: 'button', class: 'ghost small', text: 'Export library (.pgn)' })
  exportBtn.addEventListener('click', doExport)
  const clearBtn = h('button', { type: 'button', class: 'ghost small danger', text: 'Clear library' })
  clearBtn.addEventListener('click', doClear)

  const reviewQueueBtn = h('button', { type: 'button', class: 'ghost small', text: 'Review unreviewed games' })
  const reviewStopBtn = h('button', { type: 'button', class: 'ghost small hidden', text: 'Stop' })
  reviewQueueBtn.addEventListener('click', runReviewQueue)
  reviewStopBtn.addEventListener('click', () => {
    state.cancelQueue = true
  })
  const queueStatus = h('span', { class: 'muted small lib-queue-status' })

  const toolbar = h('div', { class: 'lib-toolbar' }, [
    h('div', { class: 'form-row' }, [h('label', { text: 'Search' }), searchInput]),
    h('div', { class: 'form-row' }, [h('label', { text: 'Colour' }), colourSelect]),
    h('div', { class: 'form-row' }, [h('label', { text: 'Result' }), resultSelect]),
    h('div', { class: 'form-row' }, [h('label', { text: 'Source' }), sourceSelect]),
    h('div', { class: 'form-row' }, [h('label', { text: 'Reviewed' }), reviewedSelect]),
    h('div', { class: 'form-row' }, [h('label', { text: 'Sort' }), sortSelect]),
  ])

  const tableBody = h('tbody')
  const table = h('table', { class: 'lib-table' }, [
    h('thead', {}, [
      h('tr', {}, [
        h('th', { text: 'Date' }),
        h('th', { text: 'White' }),
        h('th', { text: 'Black' }),
        h('th', { text: 'Result' }),
        h('th', { text: 'You' }),
        h('th', { text: 'Opening' }),
        h('th', { text: 'ECO' }),
        h('th', { text: 'Source' }),
        h('th', { text: 'Reviewed' }),
        h('th', { text: 'Actions' }),
      ]),
    ]),
    tableBody,
  ])

  const emptyState = h('p', { class: 'muted small hidden lib-empty', text: 'No games yet. Import a PGN file or fetch by username above to build your library.' })
  const pagerLabel = h('span', { class: 'muted small lib-pager-label' })
  const prevBtn = h('button', { type: 'button', class: 'ghost small', text: 'Previous' })
  const nextBtn = h('button', { type: 'button', class: 'ghost small', text: 'Next' })
  prevBtn.addEventListener('click', () => {
    if (state.page > 0) {
      state.page--
      render()
    }
  })
  nextBtn.addEventListener('click', () => {
    if ((state.page + 1) * PAGE_SIZE < state.games.length) {
      state.page++
      render()
    }
  })
  const pager = h('div', { class: 'row lib-pagination' }, [prevBtn, pagerLabel, nextBtn])

  const card = h('div', { class: 'card lib-card' }, [
    h('h2', { text: 'Your library' }),
    statsRow,
    toolbar,
    h('div', { class: 'row' }, [exportBtn, clearBtn, reviewQueueBtn, reviewStopBtn, queueStatus]),
    emptyState,
    table,
    pager,
  ])

  container.append(card)

  function currentFilter() {
    const reviewed = reviewedSelect.value === 'reviewed' ? true : reviewedSelect.value === 'unreviewed' ? false : undefined
    return {
      search: searchInput.value.trim() || undefined,
      colour: colourSelect.value || undefined,
      result: resultSelect.value || undefined,
      source: sourceSelect.value || undefined,
      reviewed,
      sort: sortSelect.value,
    }
  }

  async function refresh() {
    const [games, stats] = await Promise.all([listGames(currentFilter()), libraryStats()])
    state.games = games
    renderStats(stats)
    render()
  }

  function renderStats(stats) {
    clearNode(statsRow)
    const items = [
      ['Games', stats.total],
      ['Reviewed', stats.reviewed],
      ['Unreviewed', stats.unreviewed],
      ['Span', stats.dateRange.from ? `${stats.dateRange.from} to ${stats.dateRange.to}` : 'n/a'],
    ]
    for (const [label, value] of items) {
      statsRow.append(h('div', { class: 'stat' }, [h('div', { class: 'v', text: String(value) }), h('div', { class: 'k', text: label })]))
    }
  }

  function render() {
    clearNode(tableBody)
    emptyState.classList.toggle('hidden', state.games.length > 0)
    table.classList.toggle('hidden', state.games.length === 0)
    pager.classList.toggle('hidden', state.games.length === 0)

    const start = state.page * PAGE_SIZE
    const pageGames = state.games.slice(start, start + PAGE_SIZE)
    for (const game of pageGames) tableBody.append(renderRow(game))

    pagerLabel.textContent = state.games.length
      ? `Showing ${start + 1}-${Math.min(start + PAGE_SIZE, state.games.length)} of ${state.games.length}`
      : ''
    prevBtn.disabled = state.page === 0
    nextBtn.disabled = start + PAGE_SIZE >= state.games.length
  }

  function renderRow(game) {
    const openBtn = h('button', { type: 'button', class: 'ghost small', text: 'Open' })
    openBtn.addEventListener('click', () => onSelectGame?.(game))

    const reviewBtn = h('button', { type: 'button', class: 'ghost small', text: game.reviewedFlag ? 'Re-review' : 'Review' })
    reviewBtn.addEventListener('click', async () => {
      reviewBtn.disabled = true
      reviewBtn.textContent = 'Reviewing...'
      try {
        await onReviewRequested?.(game)
        await refresh()
      } catch (err) {
        reviewBtn.textContent = 'Failed'
        reviewBtn.title = err.message
      } finally {
        reviewBtn.disabled = false
      }
    })

    const deleteBtn = h('button', { type: 'button', class: 'ghost small danger', text: 'Delete' })
    deleteBtn.addEventListener('click', async () => {
      await deleteGame(game.id)
      await refresh()
    })

    return h('tr', { class: game.reviewedFlag ? 'lib-row-reviewed' : 'lib-row-unreviewed' }, [
      h('td', { text: game.date || '?' }),
      h('td', { text: game.white }),
      h('td', { text: game.black }),
      h('td', { text: RESULT_LABEL[game.result] || game.result }),
      h('td', { text: COLOUR_LABEL[game.colour || 'unknown'] }),
      h('td', { text: game.opening || '-' }),
      h('td', { text: game.eco || '-' }),
      h('td', { text: game.source }),
      h('td', { class: 'chip', text: game.reviewedFlag ? 'yes' : 'no' }),
      h('td', { class: 'row' }, [openBtn, reviewBtn, deleteBtn]),
    ])
  }

  async function doExport() {
    const blob = await exportLibrary()
    const url = URL.createObjectURL(blob)
    const a = h('a', { href: url, download: `chess-local-learning-library-${new Date().toISOString().slice(0, 10)}.pgn` })
    document.body.append(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function doClear() {
    if (!window.confirm('Delete every game in your library? This cannot be undone. Export first if you want to keep a copy.')) return
    await clearLibrary()
    await refresh()
  }

  async function runReviewQueue() {
    state.cancelQueue = false
    reviewQueueBtn.classList.add('hidden')
    reviewStopBtn.classList.remove('hidden')
    const queue = await listGames({ reviewed: false, sort: 'date-asc' })
    let done = 0
    for (const game of queue) {
      if (state.cancelQueue) break
      if (!game.moves || !game.moves.length) {
        done++
        continue
      }
      queueStatus.textContent = `Reviewing ${game.white} vs ${game.black} (${done + 1}/${queue.length})...`
      try {
        // eslint-disable-next-line no-await-in-loop
        await onReviewRequested?.(game)
      } catch (err) {
        queueStatus.textContent = `Stopped: ${err.message}`
        break
      }
      done++
      // eslint-disable-next-line no-await-in-loop
      await refresh()
    }
    if (!state.cancelQueue && done >= queue.length) queueStatus.textContent = `Reviewed ${done} game${done === 1 ? '' : 's'}.`
    else if (state.cancelQueue) queueStatus.textContent = `Stopped after ${done} game${done === 1 ? '' : 's'}.`
    reviewQueueBtn.classList.remove('hidden')
    reviewStopBtn.classList.add('hidden')
    await refresh()
  }

  function debounce(fn, ms) {
    let timer = null
    return (...args) => {
      clearTimeout(timer)
      timer = setTimeout(() => fn(...args), ms)
    }
  }

  refresh()

  return {
    refresh,
    destroy() {
      state.cancelQueue = true
      clearNode(container)
    },
  }
}
