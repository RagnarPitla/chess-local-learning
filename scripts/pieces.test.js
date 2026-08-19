import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PIECES_DIR = path.join(ROOT, 'public', 'assets', 'pieces')
const SOURCE_DIR = path.join(ROOT, 'Resources', 'Design-1')
const EXPECTED_IDS = ['wk', 'wq', 'wr', 'wb', 'wn', 'wp', 'bk', 'bq', 'br', 'bb', 'bn', 'bp']

test('Design-1 source folder contains exactly the twelve normalized PNG names', async () => {
  const files = (await readdir(SOURCE_DIR))
    .filter((name) => name.endsWith('.png'))
    .sort()
  assert.deepEqual(files, EXPECTED_IDS.map((id) => `${id}.png`).sort())
})

test('Design-1 source renders remain 816 by 816 PNG files', async () => {
  for (const id of EXPECTED_IDS) {
    const png = await readFile(path.join(SOURCE_DIR, `${id}.png`))
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${id} PNG signature`)
    assert.equal(png.readUInt32BE(16), 816, `${id} width`)
    assert.equal(png.readUInt32BE(20), 816, `${id} height`)
  }
})

test('Design-1 sprite satisfies the cm-chessboard group contract', async () => {
  const svg = await readFile(path.join(PIECES_DIR, 'design-1.svg'), 'utf8')
  assert.match(svg, /viewBox="0 0 40 40"/)

  const ids = [...svg.matchAll(/<g id="([^"]+)">/g)].map((match) => match[1])
  assert.deepEqual(ids, EXPECTED_IDS)

  const images = [...svg.matchAll(/href="data:image\/png;base64,([^"]+)"/g)]
  assert.equal(images.length, 12)
  for (const [index, match] of images.entries()) {
    const png = Buffer.from(match[1], 'base64')
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${EXPECTED_IDS[index]} embedded PNG`)
    assert.equal(png.readUInt32BE(16), 256, `${EXPECTED_IDS[index]} embedded width`)
    assert.equal(png.readUInt32BE(20), 256, `${EXPECTED_IDS[index]} embedded height`)
  }
})

test('board.js selects Design-1 by an import-relative URL', async () => {
  const board = await readFile(path.join(ROOT, 'public', 'js', 'board.js'), 'utf8')
  assert.match(board, /new URL\('\.\.\/assets\/pieces\/design-1\.svg', import\.meta\.url\)\.href/)
})
