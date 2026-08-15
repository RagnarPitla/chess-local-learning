/**
 * Vercel serverless function: GET /api/health
 *
 * This exists only because public/js/coach.js gates the entire LLM coaching
 * path behind it: `coachStatus()` fetches /api/health first and only calls
 * /api/coach at all if the response says `coach.configured: true` (see
 * public/js/coach.js, not owned by this file - read only). Without this
 * endpoint the client silently falls back to the offline coach forever, even
 * when a coach key IS configured on the platform. public/js/app.js also reads
 * `engine.url` from here as its preferred Stockfish URL, though it already
 * falls back to the same default if this call fails.
 *
 * Response shape matches server.js's /api/health exactly, except
 * `crossOriginIsolated` is hardcoded false: the static build only ever ships
 * the single-threaded lite Stockfish build, which needs no COOP/COEP headers
 * (see scripts/build-static.mjs).
 */
import { resolveCoachConfig } from '../lib/coach-prompts.js'

const ENGINE_BUILD = 'stockfish-18-lite-single'

export default function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method not allowed' })
    return
  }

  const coach = resolveCoachConfig(process.env)
  res.status(200).json({
    ok: true,
    engine: { build: ENGINE_BUILD, url: `/vendor/stockfish/${ENGINE_BUILD}.js`, crossOriginIsolated: false },
    coach: { configured: Boolean(coach), provider: coach?.provider ?? null, model: coach?.model ?? null },
    version: '0.1.0',
  })
}
