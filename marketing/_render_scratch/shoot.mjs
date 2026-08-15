#!/usr/bin/env node
/*
 * Throwaway render-check harness for marketing SVG assets.
 * Mimics the CDP technique in scripts/smoke.mjs (spawn headless Chrome,
 * attach over the raw DevTools WebSocket) but is a separate script used
 * only to screenshot SVG files for visual verification. Not part of the
 * product. Deleted at the end of the marketing task.
 *
 *   node marketing/_render_scratch/shoot.mjs <manifest.json>
 *
 * manifest.json: [{ "svg": "abs/path.svg", "w": 1200, "h": 630, "out": "abs/out.png" }, ...]
 */
import { spawn } from 'node:child_process'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const DEBUG_PORT = 9333

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return await res.json()
    } catch { /* not up yet */ }
    await sleep(120)
  }
  throw new Error(`timed out waiting for ${url}`)
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id !== undefined) {
        const entry = this.pending.get(msg.id)
        if (!entry) return
        this.pending.delete(msg.id)
        if (msg.error) entry.reject(new Error(msg.error.message))
        else entry.resolve(msg.result)
      }
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
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => { if (this.pending.delete(id)) reject(new Error(`${method} timed out`)) }, 20000)
    })
  }
  close() { try { this.ws.close() } catch { /* already gone */ } }
}

async function main() {
  const manifestPath = process.argv[2]
  if (!manifestPath) throw new Error('usage: shoot.mjs <manifest.json>')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (!existsSync(CHROME_PATH)) throw new Error('chrome not found at expected path')

  const profileDir = await mkdtemp(join(tmpdir(), 'mktg-shoot-chrome-'))
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${DEBUG_PORT}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  try {
    await waitForHttp(`http://127.0.0.1:${DEBUG_PORT}/json/version`, 20000)

    for (const item of manifest) {
      const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()
      const page = targets.find((t) => t.type === 'page')
      const cdp = await Cdp.attach(page.webSocketDebuggerUrl)
      await cdp.send('Page.enable')
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: item.w, height: item.h, deviceScaleFactor: 2, mobile: false,
      })
      await cdp.send('Page.navigate', { url: `file://${item.svg}` })
      await sleep(600)
      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'png', clip: { x: 0, y: 0, width: item.w, height: item.h, scale: 1 },
      })
      const { writeFile } = await import('node:fs/promises')
      await writeFile(item.out, Buffer.from(shot.data, 'base64'))
      console.log(`  [ok] ${item.svg} -> ${item.out}`)
      cdp.close()
    }
  } finally {
    chrome.kill()
    await rm(profileDir, { recursive: true, force: true })
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
