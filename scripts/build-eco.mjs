#!/usr/bin/env node
/**
 * Compiles the lichess-org/chess-openings ECO TSVs into a single generated
 * ES module, public/data/openings-data.js, that the app and the unit tests
 * import at zero build-time cost (a plain `const`, no fetch, no fs).
 *
 * Source: https://github.com/lichess-org/chess-openings (a.tsv .. e.tsv)
 * Licence: CC0-1.0 (public domain dedication).
 *
 * Usage:
 *   node scripts/build-eco.mjs             fetch fresh copies from GitHub
 *   node scripts/build-eco.mjs --offline    rebuild from the last successful
 *                                           fetch, cached at data/eco-source-cache.json
 *                                           (gitignored: data/*.json)
 */
import { Chess } from 'chess.js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT_FILE = path.join(ROOT, 'public', 'data', 'openings-data.js')
const CACHE_FILE = path.join(ROOT, 'data', 'eco-source-cache.json')

const LETTERS = ['a', 'b', 'c', 'd', 'e']
const SOURCE_REPO = 'lichess-org/chess-openings'
const BASE_URL = `https://raw.githubusercontent.com/${SOURCE_REPO}/master`
const FETCH_TIMEOUT_MS = 20_000
const LICENSE = 'CC0-1.0'

const OFFLINE = process.argv.includes('--offline')

async function main() {
  const startedAt = Date.now()
  const sources = OFFLINE ? await loadCachedSources() : await fetchSources()

  const rows = []
  for (const letter of LETTERS) {
    rows.push(...parseTsv(sources[letter], letter))
  }
  console.log(`[build-eco] parsed ${rows.length} rows from ${LETTERS.length} files`)

  const { tree, names, valid, dropped } = buildTree(rows)

  if (dropped.length) {
    console.log(`[build-eco] dropped ${dropped.length} row(s) that did not replay legally:`)
    for (const d of dropped) console.log(`  - [${d.eco}] ${d.name}: "${d.pgn}" (${d.reason})`)
  } else {
    console.log('[build-eco] every row replayed legally, nothing dropped')
  }

  const stats = treeStats(tree)
  console.log(
    `[build-eco] tree: ${stats.positions} positions, ${stats.openings} named openings, max depth ${stats.maxDepth} plies`,
  )

  const source = await writeModule({ tree, names, rowCount: valid })
  const elapsed = Date.now() - startedAt
  const sizeKb = (source.length / 1024).toFixed(1)
  console.log(`[build-eco] wrote ${path.relative(ROOT, OUT_FILE)} (${sizeKb} KiB) in ${elapsed}ms`)
}

/* ---------------------------------------------------------------- fetch */

async function fetchSources() {
  const results = await Promise.allSettled(LETTERS.map((letter) => fetchOne(letter)))
  const sources = {}
  const failures = []
  results.forEach((result, i) => {
    const letter = LETTERS[i]
    if (result.status === 'fulfilled') sources[letter] = result.value
    else failures.push(`${letter}.tsv (${BASE_URL}/${letter}.tsv): ${result.reason.message}`)
  })

  if (failures.length) {
    throw new Error(
      `Failed to fetch ${failures.length}/${LETTERS.length} ECO source file(s):\n  ${failures.join('\n  ')}\n` +
        'Run with --offline to rebuild from the last cached fetch, if one exists.',
    )
  }

  await cacheSources(sources)
  return sources
}

async function fetchOne(letter) {
  const url = `${BASE_URL}/${letter}.tsv`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    const text = await res.text()
    if (!text.includes('\t')) throw new Error('response did not look like a TSV file')
    return text
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`timed out after ${FETCH_TIMEOUT_MS}ms`)
    throw new Error(err.message)
  } finally {
    clearTimeout(timer)
  }
}

async function cacheSources(sources) {
  try {
    await mkdir(path.dirname(CACHE_FILE), { recursive: true })
    await writeFile(CACHE_FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), sources }))
  } catch (err) {
    console.warn(`[build-eco] could not write offline cache (non-fatal): ${err.message}`)
  }
}

async function loadCachedSources() {
  let raw
  try {
    raw = await readFile(CACHE_FILE, 'utf8')
  } catch {
    throw new Error(
      `--offline was requested but no cache was found at ${path.relative(ROOT, CACHE_FILE)}. ` +
        'Run once without --offline while online to create it.',
    )
  }
  const parsed = JSON.parse(raw)
  console.log(`[build-eco] using offline cache from ${parsed.fetchedAt}`)
  return parsed.sources
}

/* ---------------------------------------------------------------- parse */

/** Turn one TSV file's text into { eco, name, pgn, sanMoves } rows. */
function parseTsv(text, letter) {
  const lines = text.split(/\r?\n/)
  const rows = []
  // lines[0] is the header: eco, name, pgn
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const cols = line.split('\t')
    if (cols.length !== 3) {
      console.warn(`[build-eco] ${letter}.tsv line ${i + 1}: expected 3 columns, got ${cols.length} - skipped`)
      continue
    }
    const [eco, name, pgn] = cols
    rows.push({ eco: eco.trim(), name: name.trim(), pgn: pgn.trim(), source: `${letter}.tsv:${i + 1}` })
  }
  return rows
}

/**
 * Replay every row through chess.js so the SAN tokens stored in the tree are
 * byte-for-byte what chess.js itself would generate at runtime (this matters:
 * the explorer looks up `chess.moves({verbose:true})[i].san` as a tree key).
 * Rows that do not replay legally are dropped and reported, not guessed at.
 */
function buildTree(rows) {
  const root = { m: {} }
  const names = []
  const nameIndex = new Map()
  const dropped = []
  let valid = 0

  for (const row of rows) {
    const chess = new Chess()
    let history
    try {
      chess.loadPgn(row.pgn)
      history = chess.history()
    } catch (err) {
      dropped.push({ ...row, reason: err.message })
      continue
    }
    if (!history.length) {
      dropped.push({ ...row, reason: 'no moves parsed' })
      continue
    }

    let node = root
    for (const san of history) {
      if (!node.m[san]) node.m[san] = { m: {} }
      node = node.m[san]
    }
    node.d = nameId(row.eco, row.name)
    valid++
  }

  return { tree: root, names, valid, dropped }

  function nameId(eco, name) {
    const key = `${eco}\u0001${name}`
    let id = nameIndex.get(key)
    if (id === undefined) {
      id = names.length
      names.push([eco, name])
      nameIndex.set(key, id)
    }
    return id
  }
}

function treeStats(root) {
  let positions = 0
  let openings = 0
  let maxDepth = 0
  ;(function walk(node, depth) {
    positions++
    if (node.d !== undefined) openings++
    maxDepth = Math.max(maxDepth, depth)
    for (const san in node.m) walk(node.m[san], depth + 1)
  })(root, 0)
  return { positions, openings, maxDepth }
}

/* --------------------------------------------------------------- output */

async function writeModule({ tree, names, rowCount }) {
  const header = `/**
 * GENERATED FILE - do not hand edit.
 *
 * Produced by scripts/build-eco.mjs from the lichess-org/chess-openings ECO
 * TSVs (a.tsv..e.tsv), licensed CC0-1.0 (public domain dedication).
 * Source: https://github.com/${SOURCE_REPO}
 *
 * Regenerate with: node scripts/build-eco.mjs
 *
 * Shape:
 *   ECO_NAMES  Array<[eco, name]>   deduped (eco, name) pairs referenced by index
 *   ECO_TREE   { m: { [san]: node } }   nested move tree, root has no d/eco/name
 *                node = { m: {...children, or omitted if none} , d?: number }
 *                node.d indexes into ECO_NAMES when this exact position is a
 *                named ECO entry; nodes without a "d" are unnamed transitions.
 *   ECO_COUNT  number of distinct named ECO rows compiled into the tree
 *   ECO_META   provenance metadata (source, licence, generation time, row count)
 *
 * Positions are not stored as FENs; replay the SAN path with chess.js to get
 * one. This keeps the file small and the shape stable regardless of variant
 * rules.
 */
`
  const meta = {
    source: `https://github.com/${SOURCE_REPO}`,
    license: LICENSE,
    generatedAt: new Date().toISOString(),
    rowCount,
  }

  const body =
    `export const ECO_NAMES = ${JSON.stringify(names)}\n\n` +
    `export const ECO_TREE = ${JSON.stringify(tree)}\n\n` +
    `export const ECO_COUNT = ${rowCount}\n\n` +
    `export const ECO_META = ${JSON.stringify(meta, null, 2)}\n`

  const source = header + '\n' + body
  await mkdir(path.dirname(OUT_FILE), { recursive: true })
  await writeFile(OUT_FILE, source)
  return source
}

main().catch((err) => {
  console.error(`[build-eco] FAILED: ${err.message}`)
  process.exitCode = 1
})
