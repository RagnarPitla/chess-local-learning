# Rasterise: converting the SVGs to PNG

Every asset in marketing/ASSETS/ is authored as hand-written SVG (see each file's own dimensions).
Most platforms want a PNG or JPEG upload, not an SVG, so this doc gives the exact target sizes and
exact commands. Three ways to do the conversion are given; pick whichever tool you already have.

Checked on this machine (2026-08-15): rsvg-convert, Inkscape and ImageMagick are NOT installed.
Google Chrome IS installed at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` and
Node 22 is available, so Option A below works with zero new installs. Options B and C are given
for anyone who prefers a standard system tool or already has Inkscape/librsvg.

---

## Target sizes, by file and by platform

| Source SVG | Native size | Use as-is for | Also export at |
|---|---|---|---|
| `og-image.svg` | 1200x630 | Open Graph meta tag (Facebook, Slack, iMessage, generic link previews) | - |
| `og-image-x.svg` | 1200x675 | X / Twitter `summary_large_image` card | - |
| `og-image-linkedin.svg` | 1200x627 | LinkedIn link preview (`og:image` when sharing from rbuild.ai or the repo) | - |
| `logo-lockup.svg` | 720x160 | README header, site header | 1440x320 (2x, for retina headers) |
| `favicon.svg` | 64x64 | Modern browsers read the SVG directly | 16x16, 32x32, 48x48 (legacy `.ico`), 180x180 (`apple-touch-icon.png`), 192x192 and 512x512 (PWA / Android) |
| `social-trees-vs-graphs.svg` | 1200x675 | Direct image upload: X, LinkedIn, Reddit, Discord, Lichess forum | 2560x1440 (2x, for a crisper Reddit/LinkedIn upload) |
| `social-learning-loop.svg` | 1200x675 | Same as above | 2560x1440 |
| `social-feature-card.svg` | 1200x675 | Same as above | 2560x1440 |
| `social-before-after.svg` | 1200x675 | Same as above | 2560x1440 |
| any social-*.svg | 1200x675 | Product Hunt gallery (crop/pad to 1270x760, see note below) | 1270x760 |

**Product Hunt specifics:** gallery images should be 1270x760 (about 5:3); the first gallery image
is auto-cropped to 240x180 for the thumbnail, so keep the important content centred; the separate
product logo/icon slot wants a 240x240 square (use `favicon.svg` rendered at 240x240, not stretched
- it is already designed to work as a square mark). See `marketing/COPY/product-hunt.md` for the
full gallery shot list.

---

## Option A: headless Chrome over CDP (zero new installs, most exact - this is the same rendering
## engine used to verify every asset in this campaign)

Save this as a throwaway script (for example `rasterise.mjs` in the repo root, then delete it when
done - do not commit it, it is not a product file):

```js
#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9444
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// edit this list: [svg absolute path, width, height, output png path]
const jobs = [
  ['/absolute/path/to/marketing/ASSETS/og-image.svg', 1200, 630, '/absolute/path/to/og-image.png'],
]

const profile = await mkdtemp(join(tmpdir(), 'rasterise-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, 'about:blank',
], { stdio: 'ignore' })

async function waitUp(url) {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) return } catch { /* not up yet */ }
    await sleep(150)
  }
  throw new Error('chrome did not come up')
}

await waitUp(`http://127.0.0.1:${PORT}/json/version`)
for (const [svg, w, h, out] of jobs) {
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res) => ws.addEventListener('open', res, { once: true }))
  let id = 0
  const send = (method, params = {}) => new Promise((resolve) => {
    const myId = ++id
    const onMsg = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id === myId) { ws.removeEventListener('message', onMsg); resolve(msg.result) }
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id: myId, method, params }))
  })
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: false })
  await send('Page.navigate', { url: `file://${svg}` })
  await sleep(500)
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } })
  await writeFile(out, Buffer.from(shot.data, 'base64'))
  console.log(`wrote ${out}`)
  ws.close()
}
chrome.kill()
await rm(profile, { recursive: true, force: true })
```

Run with: `node rasterise.mjs`

`deviceScaleFactor: 2` gives you a 2x export automatically (a 1200x630 SVG becomes a 2400x1260 PNG).
Set it to 1 for an exact 1x export, or change `w`/`h` in the jobs list for the favicon sizes.

## Option B: rsvg-convert (librsvg - fast, widely available)

```
brew install librsvg

rsvg-convert -w 1200 -h 630  marketing/ASSETS/og-image.svg           -o og-image.png
rsvg-convert -w 1200 -h 675  marketing/ASSETS/og-image-x.svg         -o og-image-x.png
rsvg-convert -w 1200 -h 627  marketing/ASSETS/og-image-linkedin.svg  -o og-image-linkedin.png
rsvg-convert -w 1270 -h 760  marketing/ASSETS/social-trees-vs-graphs.svg -o ph-gallery-1.png
rsvg-convert -w 16   -h 16   marketing/ASSETS/favicon.svg -o favicon-16.png
rsvg-convert -w 32   -h 32   marketing/ASSETS/favicon.svg -o favicon-32.png
rsvg-convert -w 48   -h 48   marketing/ASSETS/favicon.svg -o favicon-48.png
rsvg-convert -w 180  -h 180  marketing/ASSETS/favicon.svg -o apple-touch-icon.png
rsvg-convert -w 192  -h 192  marketing/ASSETS/favicon.svg -o icon-192.png
rsvg-convert -w 512  -h 512  marketing/ASSETS/favicon.svg -o icon-512.png
rsvg-convert -w 240  -h 240  marketing/ASSETS/favicon.svg -o product-hunt-logo.png
```

## Option C: Inkscape CLI

```
brew install --cask inkscape

inkscape marketing/ASSETS/og-image.svg -w 1200 -h 630 -o og-image.png
inkscape marketing/ASSETS/favicon.svg  -w 512  -h 512 -o icon-512.png
```

## Combining PNGs into a legacy favicon.ico (optional)

Modern browsers, and GitHub Pages, serve `favicon.svg` directly - no `.ico` is required. If you
want a `.ico` anyway for very old browser support, and have ImageMagick:

```
brew install imagemagick
convert favicon-16.png favicon-32.png favicon-48.png favicon.ico
```

## After rasterising

Nothing in `marketing/ASSETS/` writes into `public/`. If any PNG here is meant to become the site's
actual favicon or `og:image`, that is a change to `public/` or the HTML `<head>`, which belongs to
the agents/workstreams that own those files, not to this marketing campaign - hand the exported
files off rather than placing them there directly.
