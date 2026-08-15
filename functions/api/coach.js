/**
 * Cloudflare Pages Function: POST /api/coach
 *
 * Deploy target: Cloudflare Pages (see wrangler.toml). Cloudflare's filesystem
 * routing maps functions/api/coach.js to the /api/coach path automatically.
 * Behaviour and response shapes are identical to server.js's /api/coach
 * handler and to api/coach.js (the Vercel equivalent) - all three share the
 * pure prompt/provider logic in lib/coach-prompts.js.
 *
 * Two ways to get a real LLM reply on this static deploy:
 *
 *  1. Platform key - set ANTHROPIC_API_KEY (or OPENAI_API_KEY, optionally
 *     with OPENAI_MODEL / OPENAI_BASE_URL) as a Cloudflare Pages environment
 *     variable (Settings > Environment variables). Every visitor then gets
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
} from '../../lib/coach-prompts.js'

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-coach-key, x-coach-provider, x-coach-model, x-coach-base-url',
  'access-control-max-age': '86400',
}

// Best-effort, per-instance limiter only - see createRateLimiter's doc comment.
const limiter = createRateLimiter({ windowMs: 60_000, max: 20 })

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  })
}

function singleHeader(value) {
  return Array.isArray(value) ? value[0] : value
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function onRequestPost({ request, env }) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength && contentLength > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: 'payload too large' })
  }

  let rawBody
  try {
    rawBody = await request.text()
  } catch {
    return json(400, { ok: false, error: 'could not read request body' })
  }
  if (rawBody.length > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: 'payload too large' })
  }

  let body
  try {
    body = rawBody ? JSON.parse(rawBody) : null
  } catch {
    return json(400, { ok: false, error: 'invalid JSON body' })
  }
  if (!validateCoachRequestBody(body)) {
    return json(400, { ok: false, error: COACH_BODY_ERROR })
  }

  const clientId = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
  limiter.sweep()
  if (limiter.check(clientId)) {
    return json(429, { ok: false, error: 'rate limited, try again shortly' })
  }

  const byoKeyHeader = request.headers.get('x-coach-key')
  let coachConfig
  if (byoKeyHeader) {
    coachConfig = buildByoCoachConfig({
      key: byoKeyHeader,
      provider: singleHeader(request.headers.get('x-coach-provider')),
      model: singleHeader(request.headers.get('x-coach-model')),
      baseUrl: singleHeader(request.headers.get('x-coach-base-url')),
    })
    if (!coachConfig) return json(400, { ok: false, error: 'invalid bring-your-own-key headers' })
  } else {
    coachConfig = resolveCoachConfig(env)
  }

  if (!coachConfig) return json(200, NO_KEY_RESPONSE)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), COACH_TIMEOUT_MS)
  try {
    const text = await callCoachProvider(coachConfig, body.kind, body.data, { signal: controller.signal })
    return json(200, { ok: true, text, provider: coachConfig.provider, model: coachConfig.model })
  } catch (err) {
    console.error('[coach:cloudflare]', err && err.message ? err.message : String(err))
    return json(200, { ok: false, reason: 'upstream-error', error: err.message, text: null })
  } finally {
    clearTimeout(timer)
  }
}
