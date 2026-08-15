/**
 * Vercel serverless function: POST /api/coach
 *
 * Deploy target: Vercel (see vercel.json - it points outputDirectory at
 * dist/ for the static build; Vercel always scans the repo-root api/
 * directory for functions regardless of outputDirectory). Behaviour and
 * response shapes are identical to server.js's /api/coach handler and to
 * functions/api/coach.js (the Cloudflare equivalent) - all three share the
 * pure prompt/provider logic in lib/coach-prompts.js.
 *
 * Two ways to get a real LLM reply on this static deploy:
 *
 *  1. Platform key - set ANTHROPIC_API_KEY (or OPENAI_API_KEY, optionally
 *     with OPENAI_MODEL / OPENAI_BASE_URL) as a Vercel Environment Variable
 *     (Project Settings > Environment Variables). Every visitor then gets
 *     coaching for free, on the site owner's quota.
 *
 *  2. Bring your own key - the caller sends their own key in a request
 *     header instead. Header contract (names are case-insensitive):
 *
 *       x-coach-key         required  - the caller's own provider API key
 *       x-coach-provider    optional  - 'anthropic' (default) or 'openai'
 *       x-coach-model       optional  - overrides the provider's default model
 *       x-coach-base-url    optional  - OpenAI-compatible base URL override,
 *                                       must be https and not a private/local host
 *
 *     The key is read once, forwarded straight to the provider for this one
 *     request, and never logged, persisted or echoed back in any response.
 *
 * If neither a platform key nor a caller-supplied key is present, the
 * response is the same {ok:false, reason:'no-key'} shape the client already
 * knows how to fall back on to the fully offline rule-based coach.
 */
import {
  callCoachProvider,
  validateCoachRequestBody,
  resolveCoachConfig,
  buildByoCoachConfig,
  createRateLimiter,
  COACH_BODY_ERROR,
  NO_KEY_RESPONSE,
  MAX_BODY_BYTES,
  COACH_TIMEOUT_MS,
} from '../lib/coach-prompts.js'

// Vercel-specific request handling: caps the parsed JSON body size (a plain
// number is interpreted as bytes) and the function's own wall-clock budget.
// Hobby/free-tier projects clamp maxDuration to their plan limit regardless
// of what is requested here.
export const config = {
  api: { bodyParser: { sizeLimit: MAX_BODY_BYTES } },
  maxDuration: 20,
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-coach-key, x-coach-provider, x-coach-model, x-coach-base-url',
  'access-control-max-age': '86400',
}

// Best-effort, per-instance limiter only - see createRateLimiter's doc comment.
const limiter = createRateLimiter({ windowMs: 60_000, max: 20 })

function applyCors(res) {
  for (const [name, value] of Object.entries(CORS_HEADERS)) res.setHeader(name, value)
}

function singleHeader(value) {
  return Array.isArray(value) ? value[0] : value
}

function clientIp(req) {
  const header = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.headers['x-real-ip']
  if (!header) return 'unknown'
  return singleHeader(header).split(',')[0].trim()
}

export default async function handler(req, res) {
  applyCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' })
    return
  }

  const body = req.body
  if (!validateCoachRequestBody(body)) {
    res.status(400).json({ ok: false, error: COACH_BODY_ERROR })
    return
  }

  limiter.sweep()
  if (limiter.check(clientIp(req))) {
    res.status(429).json({ ok: false, error: 'rate limited, try again shortly' })
    return
  }

  const byoKeyHeader = req.headers['x-coach-key']
  let coachConfig
  if (byoKeyHeader) {
    coachConfig = buildByoCoachConfig({
      key: singleHeader(byoKeyHeader),
      provider: singleHeader(req.headers['x-coach-provider']),
      model: singleHeader(req.headers['x-coach-model']),
      baseUrl: singleHeader(req.headers['x-coach-base-url']),
    })
    if (!coachConfig) {
      res.status(400).json({ ok: false, error: 'invalid bring-your-own-key headers' })
      return
    }
  } else {
    coachConfig = resolveCoachConfig(process.env)
  }

  if (!coachConfig) {
    res.status(200).json(NO_KEY_RESPONSE)
    return
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), COACH_TIMEOUT_MS)
  try {
    const text = await callCoachProvider(coachConfig, body.kind, body.data, { signal: controller.signal })
    res.status(200).json({ ok: true, text, provider: coachConfig.provider, model: coachConfig.model })
  } catch (err) {
    console.error('[coach:vercel]', err && err.message ? err.message : String(err))
    res.status(200).json({ ok: false, reason: 'upstream-error', error: err.message, text: null })
  } finally {
    clearTimeout(timer)
  }
}
