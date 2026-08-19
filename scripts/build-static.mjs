#!/usr/bin/env node
// Build a self-contained static site in dist/ that works on ANY dumb static
// host with no Node server: GitHub Pages, Cloudflare Pages, Vercel (static),
// Netlify, S3+CloudFront, a plain `python -m http.server`, etc.
//
// What it does:
//   1. Copies public/** into dist/** (whole directories, not a filename list,
//      so files other agents add to public/ later are picked up automatically).
//   2. Copies the same vendor assets server.js mounts at dev time
//      (chess.js, cm-chessboard, the lite-single Stockfish build) into
//      dist/vendor/... at the SAME URLs, so the import map keeps working
//      unmodified.
//   3. Optionally rewrites root-absolute URLs (import map, href/src attributes,
//      and the handful of hardcoded "/api/..." and "/vendor/..." string
//      literals in public/js/*.js) when the site is deployed under a
//      sub-path, via --base=/repo-name/ (for GitHub Pages project sites).
//   4. Emits .nojekyll (see the concrete reason below) and a 404.html app
//      shell copy so GitHub Pages' 404 fallback still boots the app.
//   5. Provides a --check mode that validates the OUTPUT: every import map
//      target and href/src reference resolves to a real file, the Stockfish
//      engine files are present, cm-chessboard assets are present, and
//      nothing oversized snuck into the artifact. This is the deploy safety
//      net referenced in CI.
//
// Usage:
//   node scripts/build-static.mjs                 # build dist/ for base "/"
//   node scripts/build-static.mjs --base=/chess-local-learning/
//   node scripts/build-static.mjs --check          # verify an existing dist/
//   node scripts/build-static.mjs --base=/x/ --check
//
// Node 22, zero new dependencies (fs/promises, path, url, node:fs only).
//
// Environment gotchas specific to this repo/sandbox (see README/task notes):
//   - `new URL('..', import.meta.url).pathname` PERCENT-ENCODES spaces in this
//     repo's path ("VS Code Repo" -> "VS%20Code%20Repo"), which silently
//     breaks every path built from it. We always resolve paths with
//     `fileURLToPath` instead (never `.pathname`).
//   - `process.execPath` can be a stale/broken path in this sandbox. This
//     script does not itself spawn a child `node` process, but anything that
//     does (see scripts/smoke.mjs and this project's throwaway QA scripts)
//     must guard with `existsSync(process.execPath) ? process.execPath : 'node'`.

import { existsSync } from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const NODE_MODULES = path.join(ROOT, 'node_modules');
const DIST_DIR = path.join(ROOT, 'dist');

// Mirrors server.js's VENDOR_MOUNTS table (see server.js, `VENDOR_MOUNTS`).
// chess.js and cm-chessboard are mounted (and therefore copied) as complete
// directories so every URL the dev server could ever serve keeps working
// unmodified. cm-chessboard is intentionally narrowed to its two runtime
// subdirectories (src/, assets/) rather than the whole npm package: the
// published package also contains test/, examples/, README.md, and even a
// stray `.claude/settings.local.json` dev-tool file that have no runtime
// purpose and should not become public URLs on the deployed site. Every URL
// index.html/board.js can possibly request (Chessboard.js, chessboard.css,
// the pieces/ SVGs) lives under src/ or assets/ - verified by grep before
// narrowing this.
const CM_CHESSBOARD_SUBDIRS = ['src', 'assets'];

// cm-chessboard bundles several piece sets under different licences. Its
// staunty.svg set is CC BY-NC-SA 4.0 - a NonCommercial licence, which cannot
// ship inside an MIT-licensed artifact that may be used commercially. The
// board renders this project's owner-provided Design-1 set from
// public/assets/pieces/, so no bundled set is needed at runtime. standard.svg
// (CC BY-SA 3.0) is kept because it is the library's own documented default
// and is commercially redistributable with attribution (see docs/CREDITS.md).
const EXCLUDED_VENDOR_SUFFIXES = [
  path.join('assets', 'pieces', 'staunty.svg'),
];

function isExcludedVendorFile(srcPath) {
  return EXCLUDED_VENDOR_SUFFIXES.some((suffix) => srcPath.endsWith(suffix));
}

// The Stockfish npm package ships several builds in bin/, including ~113 MB
// full (non-lite) builds. server.js's ENGINE_BUILD defaults to the
// single-threaded "lite-single" build specifically because it needs no
// COOP/COEP headers - the only kind of header a plain static host cannot be
// relied on to send. The static build always uses this same fixed build
// regardless of any ENGINE_BUILD env var (there is no server process at
// deploy time to read that env var from).
const ENGINE_BUILD = 'stockfish-18-lite-single';
const STOCKFISH_ALLOWLIST = [`${ENGINE_BUILD}.js`, `${ENGINE_BUILD}.wasm`];

// Per-file safety net: fail the build outright if any single file we are
// about to copy is anywhere near the size of a full Stockfish build. ~20 MB
// per the task spec - generous enough for the ~7 MB lite-single .wasm, far
// below the ~113 MB full builds.
const MAX_FILE_BYTES = 20 * 1024 * 1024;
// The lite-single build (.js + .wasm together) is expected to total a few
// MB. If it were ever much bigger than this, ENGINE_BUILD or the npm
// package likely changed to something we should not be shipping.
const STOCKFISH_TOTAL_MAX_BYTES = 15 * 1024 * 1024;
// Sanity ceiling for the whole artifact, mostly to catch "something copied
// way more than intended" mistakes; the expected real total is a few MB.
const TOTAL_DIST_MAX_BYTES = 50 * 1024 * 1024;

// File extensions whose *text content* may need root-absolute URLs rewritten
// when deploying under a sub-path (--base). Anything else is copied as
// opaque bytes (images, fonts, wasm, etc.) and never read as text.
const REWRITABLE_TEXT_EXT = new Set(['.html', '.js', '.mjs', '.css']);
// Known top-level directory names that appear in root-absolute references
// throughout public/ (import map targets, href/src attributes, and the
// hardcoded "/api/..." and "/vendor/..." string literals in public/js/*.js).
const REWRITE_DIR_NAMES = ['vendor', 'css', 'js', 'api', 'data'];
const LITERAL_PATH_RE = new RegExp(`([\`'"(])/(${REWRITE_DIR_NAMES.join('|')})/`, 'g');
const ATTR_REF_RE = /\b(href|src)="(\/(?!\/)[^"]*)"/g;
const IMPORTMAP_BLOCK_RE = /(<script type="importmap">)([\s\S]*?)(<\/script>)/;

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

function parseArgs(argv) {
  const args = { base: '/', check: false, help: false };
  for (const raw of argv) {
    if (raw === '--check') args.check = true;
    else if (raw === '--help' || raw === '-h') args.help = true;
    else if (raw.startsWith('--base=')) args.base = raw.slice('--base='.length);
    else throw new Error(`unrecognized argument: ${raw} (see --help)`);
  }
  args.base = normalizeBase(args.base);
  return args;
}

function normalizeBase(raw) {
  let base = raw && raw.length ? raw : '/';
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
}

function printHelp() {
  console.log(`Usage: node scripts/build-static.mjs [--base=/repo-name/] [--check]

  (no flags)        build dist/ for root deployment (base "/")
  --base=/x/        build (or check) as if deployed under https://host/x/
  --check           verify an existing dist/ instead of building
  --help            show this message
`);
}

// ---------------------------------------------------------------------------
// URL rewriting (only ever applied to already-copied files under dist/, never
// to anything under public/ - public/ is read-only from this script's point
// of view). Only invoked at all when --base is not the default "/".
// ---------------------------------------------------------------------------

function joinBase(base, absPath) {
  return base + absPath.replace(/^\/+/, '');
}

function rewriteAttrs(html, base) {
  return html.replace(ATTR_REF_RE, (_m, attr, value) => `${attr}="${joinBase(base, value)}"`);
}

function rewriteImportMapBlock(html, base) {
  return html.replace(IMPORTMAP_BLOCK_RE, (full, open, json, close) => {
    let map;
    try {
      map = JSON.parse(json);
    } catch {
      return full; // leave untouched if we cannot parse it - never corrupt on failure
    }
    const rewriteEntries = (obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
          obj[key] = joinBase(base, value);
        }
      }
    };
    if (map.imports) rewriteEntries(map.imports);
    if (map.scopes) {
      for (const scopeKey of Object.keys(map.scopes)) rewriteEntries(map.scopes[scopeKey]);
    }
    return `${open}\n${JSON.stringify(map, null, 2)}\n${close}`;
  });
}

function rewriteHtml(html, base) {
  return rewriteImportMapBlock(rewriteAttrs(html, base), base);
}

function rewriteLiteralPaths(text, base) {
  return text.replace(LITERAL_PATH_RE, (_m, lead, dir) => `${lead}${joinBase(base, `/${dir}/`)}`);
}

function rewriteFileContent(text, ext, base) {
  return ext === '.html' ? rewriteHtml(text, base) : rewriteLiteralPaths(text, base);
}

// ---------------------------------------------------------------------------
// Guarded copy
// ---------------------------------------------------------------------------

function createStats() {
  const files = [];
  return {
    files,
    record(filePath, size, replace = false) {
      if (replace) {
        const existing = files.find((f) => f.path === filePath);
        if (existing) {
          existing.size = size;
          return;
        }
      }
      files.push({ path: filePath, size });
    },
    total() {
      return files.reduce((sum, f) => sum + f.size, 0);
    },
  };
}

async function copyGuardedFile(srcPath, destPath, { rewrite = false, base = '/', stats } = {}) {
  const st = await fsp.stat(srcPath); // fsp.stat follows symlinks
  if (st.size > MAX_FILE_BYTES) {
    throw new Error(
      `refusing to copy ${path.relative(ROOT, srcPath)} (${formatBytes(st.size)}) - exceeds the ` +
        `${formatBytes(MAX_FILE_BYTES)} per-file safety limit for the static build`,
    );
  }
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  const ext = path.extname(srcPath).toLowerCase();
  if (rewrite && base !== '/' && REWRITABLE_TEXT_EXT.has(ext)) {
    const text = await fsp.readFile(srcPath, 'utf8');
    const out = rewriteFileContent(text, ext, base);
    await fsp.writeFile(destPath, out, 'utf8');
    stats?.record(destPath, Buffer.byteLength(out, 'utf8'));
  } else {
    await fsp.copyFile(srcPath, destPath);
    stats?.record(destPath, st.size);
  }
}

async function copyTree(srcDir, destDir, opts = {}) {
  await fsp.mkdir(destDir, { recursive: true });
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    const st = await fsp.stat(srcPath); // follow symlinks uniformly
    if (st.isDirectory()) {
      await copyTree(srcPath, destPath, opts);
    } else if (st.isFile()) {
      if (opts.exclude && opts.exclude(srcPath)) continue;
      await copyGuardedFile(srcPath, destPath, opts);
    }
  }
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

async function runBuild({ base }) {
  if (!existsSync(PUBLIC_DIR)) throw new Error(`public/ not found at ${PUBLIC_DIR}`);

  console.log(`Building static site -> ${path.relative(ROOT, DIST_DIR)}/ (base=${base})`);
  await fsp.rm(DIST_DIR, { recursive: true, force: true });
  await fsp.mkdir(DIST_DIR, { recursive: true });

  const stats = createStats();

  // 1. public/** -> dist/** (whole-directory copy; picks up files other
  //    agents add to public/ without this script needing to know their names)
  await copyTree(PUBLIC_DIR, DIST_DIR, { rewrite: true, base, stats });

  if (!existsSync(path.join(DIST_DIR, 'index.html'))) {
    throw new Error('public/index.html not found - nothing to build');
  }

  // 2. vendor/chess.js - mirrors VENDOR_MOUNTS['/vendor/chess.js/'] exactly
  await copyTree(
    path.join(NODE_MODULES, 'chess.js', 'dist', 'esm'),
    path.join(DIST_DIR, 'vendor', 'chess.js'),
    { stats },
  );

  // 3. vendor/cm-chessboard - mirrors VENDOR_MOUNTS['/vendor/cm-chessboard/']
  //    narrowed to the two subdirectories the app actually references
  //    (src/, assets/) - see CM_CHESSBOARD_SUBDIRS comment above.
  const cmChessboardSrc = path.join(NODE_MODULES, 'cm-chessboard');
  for (const subdir of CM_CHESSBOARD_SUBDIRS) {
    const from = path.join(cmChessboardSrc, subdir);
    if (!existsSync(from)) throw new Error(`expected cm-chessboard/${subdir} missing (run npm install)`);
    await copyTree(from, path.join(DIST_DIR, 'vendor', 'cm-chessboard', subdir), {
      stats,
      exclude: isExcludedVendorFile,
    });
  }

  // 4. vendor/stockfish - explicit allowlist only. NEVER mirror the whole
  //    bin/ directory: it also contains ~113 MB full/multi-threaded builds
  //    that must never ship in a deploy artifact.
  const stockfishSrcDir = path.join(NODE_MODULES, 'stockfish', 'bin');
  const stockfishDestDir = path.join(DIST_DIR, 'vendor', 'stockfish');
  let stockfishTotal = 0;
  for (const name of STOCKFISH_ALLOWLIST) {
    const from = path.join(stockfishSrcDir, name);
    if (!existsSync(from)) throw new Error(`expected stockfish file missing: ${from} (run npm install)`);
    const before = stats.files.length;
    await copyGuardedFile(from, path.join(stockfishDestDir, name), { stats });
    stockfishTotal += stats.files[before]?.size ?? 0;
  }
  if (stockfishTotal > STOCKFISH_TOTAL_MAX_BYTES) {
    throw new Error(
      `stockfish vendor payload is ${formatBytes(stockfishTotal)}, expected the ${ENGINE_BUILD} ` +
        `build to total well under ${formatBytes(STOCKFISH_TOTAL_MAX_BYTES)} - did the build change ` +
        'to a full/multi-threaded engine?',
    );
  }

  // 5. .nojekyll - required because GitHub Pages otherwise runs Jekyll,
  //    which silently drops any file/directory starting with an underscore.
  //    Concretely: cm-chessboard/assets ships "_chessboard-theme.scss",
  //    which would vanish from the deploy without this.
  await fsp.writeFile(path.join(DIST_DIR, '.nojekyll'), '');
  stats.record(path.join(DIST_DIR, '.nojekyll'), 0);

  // 6. Site routing. In development, server.js serves public/ directly, so
  //    the app sits at / and the marketing page at /landing.html - the
  //    convenient shape while building. A published site needs the opposite:
  //    a visitor arriving at the bare domain should get the explanation, not
  //    an unlabelled chessboard. So the deploy artifact is reshaped here:
  //
  //      /            -> the landing page  (was landing.html)
  //      /app/        -> the trainer       (was index.html)
  //      /landing.html -> kept as an alias so older links still resolve
  //
  //    Every asset reference in both documents is root-absolute and has
  //    already been base-rewritten above, so moving the documents does not
  //    move their assets. The only thing that must change is the landing
  //    page's own relative call-to-action links, which point at ./index.html
  //    and would otherwise point at the landing page itself.
  const appShellHtml = await fsp.readFile(path.join(DIST_DIR, 'index.html'), 'utf8');
  const landingSrc = path.join(DIST_DIR, 'landing.html');
  let rootHtml = appShellHtml;

  if (existsSync(landingSrc)) {
    await fsp.mkdir(path.join(DIST_DIR, 'app'), { recursive: true });
    await fsp.writeFile(path.join(DIST_DIR, 'app', 'index.html'), appShellHtml);
    stats.record(path.join(DIST_DIR, 'app', 'index.html'), Buffer.byteLength(appShellHtml, 'utf8'));

    const landingHtml = await fsp.readFile(landingSrc, 'utf8');
    const before = countAppLinks(landingHtml);
    rootHtml = rewriteLandingAppLinks(landingHtml, base);
    const after = countAppLinks(rootHtml);
    if (before === 0) {
      throw new Error(
        'landing.html has no ./index.html call-to-action link - the app would be unreachable ' +
          'from the published home page',
      );
    }
    if (after !== 0) {
      throw new Error(`landing.html still has ${after} unrewritten ./index.html link(s)`);
    }
    await fsp.writeFile(path.join(DIST_DIR, 'index.html'), rootHtml);
    stats.record(path.join(DIST_DIR, 'index.html'), Buffer.byteLength(rootHtml, 'utf8'), true);
    await fsp.writeFile(landingSrc, rootHtml);
    stats.record(landingSrc, Buffer.byteLength(rootHtml, 'utf8'), true);
    console.log(`  routing      : / -> landing, /app/ -> trainer (${before} CTA link(s) rewritten)`);
  } else {
    console.log('  routing      : no landing.html found - app served at / (development shape)');
  }

  // 7. 404.html - the app shell, so a hard refresh on any client-side route
  //    (or any typo'd path) still boots the app instead of hitting a host's
  //    bare 404 page. Reuses the ALREADY base-rewritten output.
  await fsp.writeFile(path.join(DIST_DIR, '404.html'), appShellHtml);
  stats.record(path.join(DIST_DIR, '404.html'), Buffer.byteLength(appShellHtml, 'utf8'));

  const total = stats.total();
  if (total > TOTAL_DIST_MAX_BYTES) {
    throw new Error(
      `dist/ total size ${formatBytes(total)} exceeds the ${formatBytes(TOTAL_DIST_MAX_BYTES)} sanity ` +
        'ceiling - something unexpected was copied',
    );
  }

  printSummary(stats, base);
}

function printSummary(stats, base) {
  const total = stats.total();
  const largest = [...stats.files].sort((a, b) => b.size - a.size).slice(0, 10);
  console.log('');
  console.log(`Build complete -> ${path.relative(ROOT, DIST_DIR)}/`);
  console.log(`  base          : ${base}`);
  console.log(`  files         : ${stats.files.length}`);
  console.log(`  total size    : ${formatBytes(total)}`);
  console.log('  largest files :');
  for (const f of largest) {
    console.log(`    ${formatBytes(f.size).padStart(9)}  ${path.relative(DIST_DIR, f.path)}`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Check (deploy safety net)
// ---------------------------------------------------------------------------

function extractImportMap(html) {
  const m = IMPORTMAP_BLOCK_RE.exec(html);
  if (!m) return null;
  try {
    return JSON.parse(m[2]);
  } catch {
    return null;
  }
}

function extractAttrRefs(html) {
  const out = [];
  const re = new RegExp(ATTR_REF_RE.source, 'g');
  let m;
  while ((m = re.exec(html))) out.push([m[1], m[2]]);
  return out;
}

// Resolves a root-absolute site URL (e.g. "/chess-local-learning/vendor/x.js")
// back to the file it should have come from under dist/, given the base the
// site was built for. Returns null if the URL is not a resolvable local path
// (external, protocol-relative, or - critically - missing the expected base
// prefix, which is exactly the kind of build bug this check exists to catch).
function resolveSiteUrlToFile(urlPath, base, fromDir = null) {
  if (typeof urlPath !== 'string' || urlPath.length === 0) return null;
  if (urlPath.startsWith('//') || urlPath.includes('://')) return null;
  if (!urlPath.startsWith('/')) {
    // Document-relative reference. Only resolvable when the caller says which
    // document it came from, and must not escape the artifact.
    if (!fromDir) return null;
    const resolved = path.resolve(fromDir, urlPath.split('#')[0].split('?')[0]);
    return resolved.startsWith(DIST_DIR) ? resolved : null;
  }
  if (!urlPath.startsWith(base)) return null;
  return path.join(DIST_DIR, urlPath.slice(base.length));
}

// The landing page's call-to-action links are written as ./index.html so the
// development server (public/ served flat, app at /) works with no build step.
// In the deploy artifact the landing page IS index.html, so those links must
// be retargeted at the relocated app or they would loop back to the landing.
const LANDING_APP_LINK_RE = /(\bhref\s*=\s*")\.\/index\.html(#[^"]*)?(")/g;

function countAppLinks(html) {
  return (html.match(LANDING_APP_LINK_RE) || []).length;
}

function rewriteLandingAppLinks(html, base) {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return html.replace(LANDING_APP_LINK_RE, (_m, open, hash, close) => `${open}${prefix}app/${hash || ''}${close}`);
}

async function findOversizedFiles(dir) {
  const bad = [];
  async function walk(d) {
    for (const entry of await fsp.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      const st = await fsp.stat(p);
      if (st.isDirectory()) await walk(p);
      else if (st.isFile() && st.size > MAX_FILE_BYTES) bad.push({ path: p, size: st.size });
    }
  }
  await walk(dir);
  return bad;
}

// Licence safety net. A NonCommercial asset must never reach the deploy
// artifact: this repo is MIT and is intended to support commercial use, and
// CC BY-NC-SA content would silently poison that. Scans shipped SVGs for the
// licence declarations these sets embed in their own header comments.
async function findNonCommercialAssets(dir) {
  const bad = [];
  const pattern = /BY-NC|NonCommercial/i;
  async function walk(d) {
    for (const entry of await fsp.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      const st = await fsp.stat(p);
      if (st.isDirectory()) await walk(p);
      else if (st.isFile() && /\.svg$/i.test(entry.name)) {
        const text = await fsp.readFile(p, 'utf8');
        if (pattern.test(text)) bad.push(p);
      }
    }
  }
  await walk(dir);
  return bad;
}

async function runCheck({ base }) {
  console.log(`Checking ${path.relative(ROOT, DIST_DIR)}/ (base=${base})\n`);

  if (!existsSync(DIST_DIR)) {
    console.error(`FAIL: dist/ does not exist - run a build first (node scripts/build-static.mjs --base=${base})`);
    process.exitCode = 1;
    return;
  }

  const problems = [];
  const check = (label, cond, detail = '') => {
    console.log(`  [${cond ? ' OK ' : 'FAIL'}] ${label}${detail ? ` (${detail})` : ''}`);
    if (!cond) problems.push(label);
  };

  // The published shape puts the landing page at /index.html and the trainer
  // at /app/index.html. Fall back to /index.html when no landing page was
  // present, which is the development shape.
  const relocatedApp = path.join(DIST_DIR, 'app', 'index.html');
  const appShellPath = existsSync(relocatedApp) ? relocatedApp : path.join(DIST_DIR, 'index.html');
  const appShellLabel = path.relative(DIST_DIR, appShellPath);
  const indexPath = path.join(DIST_DIR, 'index.html');

  check('index.html present', existsSync(indexPath));
  check('.nojekyll present', existsSync(path.join(DIST_DIR, '.nojekyll')));
  check('404.html present', existsSync(path.join(DIST_DIR, '404.html')));
  check(`app shell present at ${appShellLabel}`, existsSync(appShellPath));

  const checkHtmlRefs = async (filePath, label, { requireImportMap }) => {
    const html = await fsp.readFile(filePath, 'utf8');

    if (requireImportMap) {
      const importMap = extractImportMap(html);
      check('import map block present and parses as JSON', Boolean(importMap));
      if (importMap?.imports) {
        for (const [specifier, target] of Object.entries(importMap.imports)) {
          const resolved = resolveSiteUrlToFile(target, base);
          check(
            `import map "${specifier}" -> ${target}`,
            Boolean(resolved) && existsSync(resolved),
            resolved ? path.relative(DIST_DIR, resolved) : 'could not resolve against base',
          );
        }
      }
    }

    let attrCount = 0;
    for (const [attr, value] of extractAttrRefs(html)) {
      if (value.startsWith('data:')) continue;
      attrCount += 1;
      const resolved = resolveSiteUrlToFile(value, base, path.dirname(filePath));
      check(
        `${label} ${attr}="${value}" resolves to a real file`,
        Boolean(resolved) && existsSync(resolved),
        resolved ? path.relative(DIST_DIR, resolved) : 'could not resolve against base',
      );
    }
    check(`${label} has at least one local href/src reference`, attrCount > 0);
    return html;
  };

  if (existsSync(appShellPath)) {
    await checkHtmlRefs(appShellPath, appShellLabel, { requireImportMap: true });
  }

  if (existsSync(relocatedApp) && existsSync(indexPath)) {
    const landingHtml = await checkHtmlRefs(indexPath, 'index.html (landing)', { requireImportMap: false });
    const appHref = base.endsWith('/') ? `${base}app/` : `${base}/app/`;
    check(
      'landing page links to the trainer at /app/',
      landingHtml.includes(`href="${appHref}"`),
      appHref,
    );
    check(
      'landing page no longer self-links via ./index.html',
      countAppLinks(landingHtml) === 0,
    );
  }

  for (const name of STOCKFISH_ALLOWLIST) {
    check(`stockfish vendor file present: vendor/stockfish/${name}`, existsSync(path.join(DIST_DIR, 'vendor', 'stockfish', name)));
  }

  check(
    'cm-chessboard assets/chessboard.css present',
    existsSync(path.join(DIST_DIR, 'vendor', 'cm-chessboard', 'assets', 'chessboard.css')),
  );
  check(
    'cm-chessboard assets/pieces present',
    existsSync(path.join(DIST_DIR, 'vendor', 'cm-chessboard', 'assets', 'pieces')),
  );
  check(
    'cm-chessboard src/Chessboard.js present',
    existsSync(path.join(DIST_DIR, 'vendor', 'cm-chessboard', 'src', 'Chessboard.js')),
  );
  check('chess.js vendor file present', existsSync(path.join(DIST_DIR, 'vendor', 'chess.js', 'chess.js')));

  const oversized = await findOversizedFiles(DIST_DIR);
  check(
    'no file in dist/ exceeds the size safety limit',
    oversized.length === 0,
    oversized.map((f) => `${path.relative(DIST_DIR, f.path)}: ${formatBytes(f.size)}`).join(', '),
  );

  const nonCommercial = await findNonCommercialAssets(DIST_DIR);
  check(
    'no NonCommercial-licensed asset shipped in dist/',
    nonCommercial.length === 0,
    nonCommercial.map((f) => path.relative(DIST_DIR, f)).join(', '),
  );

  const piecesSprite = path.join(DIST_DIR, 'assets', 'pieces', 'design-1.svg');
  check('active Design-1 piece sprite present', existsSync(piecesSprite));

  const builtBoardSource = path.join(DIST_DIR, 'js', 'board.js');
  const boardUsesDesign1 = existsSync(builtBoardSource)
    && (await fsp.readFile(builtBoardSource, 'utf8')).includes('assets/pieces/design-1.svg');
  check('built board selects the Design-1 piece sprite', boardUsesDesign1);

  console.log('');
  if (problems.length === 0) {
    console.log('CHECK PASSED');
  } else {
    console.log(`CHECK FAILED (${problems.length} problem${problems.length === 1 ? '' : 's'})`);
    process.exitCode = 1;
  }
  console.log('');
}

// ---------------------------------------------------------------------------

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    printHelp();
    process.exitCode = 1;
    return;
  }
  if (args.help) {
    printHelp();
    return;
  }
  if (args.check) {
    await runCheck(args);
  } else {
    await runBuild(args);
  }
}

main().catch((err) => {
  console.error(`\nbuild-static.mjs failed: ${err.message}`);
  process.exitCode = 1;
});
