/**
 * Guards the specific historical defect described in the project brief:
 * this app must never auto-invert to dark based on the visitor's OS/browser
 * colour-scheme preference. It happened once - a `prefers-color-scheme:
 * dark` block in theme.css turned the app black while the marketing
 * landing page (a separate stylesheet, light-only) stayed white for the
 * same visitor - and dark values were then deliberately moved behind an
 * explicit `[data-theme="dark"]` opt-in that nothing in this codebase sets.
 *
 * These tests read the actual shipped CSS/JS/HTML files as text (this is a
 * static, no-build-step site - the shipped file IS the source file) so a
 * reintroduced auto-dark block is caught even if it is added to a
 * completely different file than the one that broke last time.
 *
 *   node --test scripts/
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(here, '..', 'public')
const cssDir = path.join(publicDir, 'css')
const jsDir = path.join(publicDir, 'js')

function readText(...segments) {
  return readFileSync(path.join(...segments), 'utf8')
}

/** Strip CSS comments before searching. Without this, a passing test could
 * be hiding an active rule (false negative) OR - the failure mode this
 * project actually hit during authoring - a documentation comment that
 * merely quotes the media query as prose could trip a naive substring
 * search into a false positive. Stripping comments first makes the search
 * describe only LIVE rules. */
function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '')
}

function listCssFiles() {
  return readdirSync(cssDir).filter((f) => f.endsWith('.css'))
}

/** A conservative sweep for "@media", "prefers-color-scheme" and "dark"
 * landing within roughly the same rule - deliberately looser than a full
 * CSS parse so it also flags a reformatted or reworded reintroduction, not
 * just an exact repeat of the original one-liner. */
function findLiveDarkMediaBlocks(strippedText) {
  const hits = []
  const mediaRe = /@media[^{]*\{/gi
  let match
  while ((match = mediaRe.exec(strippedText))) {
    const header = match[0]
    if (/prefers-color-scheme/i.test(header) && /dark/i.test(header)) {
      hits.push(header.trim())
    }
  }
  return hits
}

test('theme.css literally mentions prefers-color-scheme only inside a comment, not as a live rule', () => {
  // Sanity-checks the test's own method: if this ever started failing, the
  // stripping regex itself would be suspect, not necessarily the CSS.
  const raw = readText(cssDir, 'theme.css')
  assert.match(raw, /prefers-color-scheme/, 'expected the historical-defect explanation comment to still be present in theme.css')
  const stripped = stripCssComments(raw)
  assert.doesNotMatch(stripped, /prefers-color-scheme/, 'the phrase must not survive comment-stripping - it should only exist in prose')
})

test('no shipped CSS file contains a live @media (prefers-color-scheme: dark) block', () => {
  const offenders = []
  for (const file of listCssFiles()) {
    const stripped = stripCssComments(readText(cssDir, file))
    const hits = findLiveDarkMediaBlocks(stripped)
    if (hits.length) offenders.push(`${file}: ${hits.join(', ')}`)
  }
  assert.deepEqual(offenders, [], `found a live automatic dark-mode block:\n${offenders.join('\n')}`)
})

test('dark tokens are preserved behind an explicit [data-theme="dark"] opt-in selector, not deleted outright', () => {
  // Guards the OTHER direction of regression: someone "fixing" auto-dark by
  // deleting the dark palette entirely, rather than gating it - which would
  // silently break a future opt-in toggle the product may still want to add.
  const stripped = stripCssComments(readText(cssDir, 'theme.css'))
  assert.match(stripped, /\[data-theme=("|')dark\1\]/, 'expected the dark palette to still exist behind an explicit opt-in attribute selector')
  assert.match(stripped, /--background:\s*#0a0a0a/, 'expected the actual dark background token value to still be defined')
})

test('the default :root block (light) is not itself nested inside any @media condition', () => {
  // If :root were only defined inside a media query, browsers without a
  // matching preference could fall back to unstyled/undefined tokens.
  const stripped = stripCssComments(readText(cssDir, 'theme.css'))
  const rootDecl = stripped.match(/:root\s*\{[^}]*--background:\s*#ffffff[^}]*\}/)
  assert.ok(rootDecl, 'expected an un-conditional :root block defining the light --background token')
})

test('no JS file calls matchMedia for a colour-scheme preference or sets data-theme automatically', () => {
  // Belt-and-braces: even if the CSS gate holds, a script that reads
  // window.matchMedia("(prefers-color-scheme: dark)") and sets
  // documentElement.dataset.theme accordingly would reintroduce the exact
  // same user-visible defect through JS instead of CSS.
  const offenders = []
  const files = readdirSync(jsDir).filter((f) => f.endsWith('.js'))
  for (const file of files) {
    const text = readText(jsDir, file)
    if (/matchMedia/.test(text)) offenders.push(`${file}: calls matchMedia`)
    if (/setAttribute\(\s*["']data-theme["']/.test(text) || /\.dataset\.theme\s*=/.test(text)) {
      offenders.push(`${file}: sets a data-theme attribute`)
    }
  }
  assert.deepEqual(offenders, [], `found JS that could auto-activate dark mode:\n${offenders.join('\n')}`)
})

test('the landing page explicitly pins color-scheme to light in its own markup', () => {
  const html = readText(publicDir, 'landing.html')
  assert.match(
    html,
    /<meta\s+name=["']color-scheme["']\s+content=["']light["']\s*\/?>/i,
    'the landing page must keep pinning color-scheme to light so the browser never auto-darkens its own form controls / scrollbars either',
  )
})

test('landing.css (the marketing page) never references prefers-color-scheme at all', () => {
  // landing.css has no dark palette of its own; the historical bug was
  // specifically that ONLY the app side went dark while this file did not
  // - so this file must stay completely free of the media feature, full
  // stop, not just free of a "dark" branch of it.
  const raw = readText(cssDir, 'landing.css')
  assert.doesNotMatch(raw, /prefers-color-scheme/i)
})
