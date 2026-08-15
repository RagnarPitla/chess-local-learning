/**
 * Shared coach prompt + provider-call logic.
 *
 * Runtime-agnostic ES module: only uses globals available everywhere this app
 * runs (fetch, URL, Map, Date). No `node:` imports and no `process` access -
 * every caller (the local dev server, the Cloudflare Pages Function and the
 * Vercel serverless function) passes its own config/env in explicitly. This
 * is what lets the exact same prompts and provider-call code run on all three.
 *
 * Extracted from server.js as a pure refactor - the prompt text, the request
 * shape and the response shape are unchanged.
 */

export const BASE_SYSTEM = `You are a chess coach for an adult improver who learns by understanding, not memorisation.

Hard rules:
- Explain WHY a move works using concrete features: pawn structure, piece activity, weak squares, king safety, tempo, material.
- Never tell the student to "memorise" a line. If you cite a line, give the idea behind it.
- Be concrete about squares and pieces (e.g. "the bishop on c8 is boxed in by the pawn on e6").
- Never invent moves. Only reference moves and evaluations present in the supplied data.
- Evaluations are centipawns from the student's point of view. Positive means the student is better.
- Plain text with short paragraphs and hyphen bullets. No markdown headers, no tables, no emoji.
- British-neutral plain English, direct, no filler or praise padding.`

export const KIND_PROMPTS = {
  'game-review': `Task: review one game. Output exactly these sections as plain lines:
"What decided the game:" one or two sentences.
"Your three costliest moments:" one bullet per mistake supplied - name the move, what it allowed, and the principle that was broken.
"The pattern:" one bullet naming the single recurring weakness across those moments.
"Drill this week:" one concrete, repeatable habit (a checklist question the student asks before moving).
Maximum 260 words.`,
  'move-explain': `Task: explain one move the student got wrong. Cover, in order: what the played move overlooks, why the engine's move is stronger in terms of position not calculation, and the general rule this position teaches. Maximum 130 words.`,
  deviation: `Task: the opponent has just left known opening theory. The student panics here because their preparation was a memorised tree.
Cover, in order: what the opponent's move actually changes about the position (structure, space, development, weaknesses it creates or concedes), the correct plan derived from first principles, and one concrete candidate move with its idea.
Do not say "this is a sideline" or refer to theory names as the answer. Maximum 150 words.`,
  'puzzle-explain': `Task: the student attempted a puzzle drawn from their own game. Explain why the solution works and, if they answered wrong, what visual cue they missed that would have flagged it. Maximum 120 words.`,
  lesson: `Task: write a short targeted lesson on the supplied weakness pattern, using the student's own positions as evidence. Cover: how to recognise the pattern on the board, why it costs material or position, and a three-step checklist to avoid it. Maximum 220 words.`,
}

/** Fallback kind used when an unknown `kind` is requested - matches the original server.js behaviour. */
export const DEFAULT_KIND = 'move-explain'

export const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-5',
  openai: 'gpt-4o-mini',
}

export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'

/** Error text returned when the request body does not match `{ kind, data }`. */
export const COACH_BODY_ERROR = 'expected { kind, data }'

/** The exact "no key configured" degradation shape the client expects. */
export const NO_KEY_RESPONSE = { ok: false, reason: 'no-key', text: null }

/** Request body cap for the coach endpoint on the serverless deployments (bytes). */
export const MAX_BODY_BYTES = 32 * 1024

/** Max accepted length for a caller-supplied (bring-your-own-key) API key header. */
export const MAX_BYO_KEY_LENGTH = 512

/** Upstream provider call timeout for the serverless deployments (ms). */
export const COACH_TIMEOUT_MS = 20000

/**
 * Build the {system, user} messages for a coaching request. Pure function of
 * (kind, data) - identical to the inline template building server.js used to do.
 *
 * @param {string} kind
 * @param {unknown} data
 * @returns {{system: string, user: string}}
 */
export function buildCoachPrompt(kind, data) {
  const instruction = KIND_PROMPTS[kind] || KIND_PROMPTS[DEFAULT_KIND]
  const system = `${BASE_SYSTEM}\n\n${instruction}`
  const user = `Here is the position data as JSON:\n\n${JSON.stringify(data, null, 2)}`
  return { system, user }
}

/**
 * `{ kind, data }` shape check shared by every entry point so the 400 case
 * behaves identically everywhere.
 */
export function validateCoachRequestBody(body) {
  return Boolean(body) && typeof body.kind === 'string'
}

/**
 * Resolve which provider to call from a plain env-like object. Works for
 * `process.env` (Node) and Cloudflare's `env` binding (both are plain
 * string-keyed objects) - callers own how they obtain that object.
 *
 * @param {Record<string, string|undefined>} env
 * @returns {{provider:'anthropic', key:string, model:string} | {provider:'openai', key:string, model:string, baseUrl:string} | null}
 */
export function resolveCoachConfig(env = {}) {
  if (env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      key: env.ANTHROPIC_API_KEY,
      model: env.COACH_MODEL || DEFAULT_MODELS.anthropic,
    }
  }
  if (env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      key: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL || DEFAULT_MODELS.openai,
      baseUrl: env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL,
    }
  }
  return null
}

/**
 * Hostnames a caller-supplied base URL must never resolve to: loopback, link
 * local and RFC1918 private ranges. The serverless functions accept a
 * caller-supplied OpenAI-compatible base URL (see buildByoCoachConfig) and a
 * server-side fetch to an attacker-chosen URL is a classic SSRF vector, so
 * this is checked before every bring-your-own-key request that overrides it.
 */
const BLOCKED_BASE_URL_HOSTNAMES = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^169\.254\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^\[?f[cd][0-9a-f]{0,2}:/i, // unique local IPv6 (fc00::/7)
  /^\[?fe80:/i, // link-local IPv6
]

/** True if `rawUrl` is an https URL that does not point at a private/local host. */
export function isSafeCoachBaseUrl(rawUrl) {
  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  return !BLOCKED_BASE_URL_HOSTNAMES.some((re) => re.test(parsed.hostname))
}

/**
 * Build a coach config from caller-supplied (bring-your-own-key) fields. The
 * serverless functions read these from request headers - see the header
 * contract documented in functions/api/coach.js and api/coach.js - and pass
 * the plain values here so the validation is identical on both platforms.
 *
 * Returns null if the input is missing or unsafe; never throws.
 *
 * @param {{key?: string, provider?: string, model?: string, baseUrl?: string}} fields
 */
export function buildByoCoachConfig({ key, provider, model, baseUrl } = {}) {
  const trimmedKey = typeof key === 'string' ? key.trim() : ''
  if (!trimmedKey || trimmedKey.length > MAX_BYO_KEY_LENGTH) return null

  const normalisedProvider = provider === 'openai' ? 'openai' : 'anthropic'

  if (normalisedProvider === 'openai') {
    const resolvedBaseUrl = typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim() : DEFAULT_OPENAI_BASE_URL
    if (!isSafeCoachBaseUrl(resolvedBaseUrl)) return null
    return {
      provider: 'openai',
      key: trimmedKey,
      model: typeof model === 'string' && model.trim() ? model.trim() : DEFAULT_MODELS.openai,
      baseUrl: resolvedBaseUrl,
    }
  }

  return {
    provider: 'anthropic',
    key: trimmedKey,
    model: typeof model === 'string' && model.trim() ? model.trim() : DEFAULT_MODELS.anthropic,
  }
}

/**
 * Call the configured LLM provider and return the plain-text coaching reply.
 * Identical request bodies/headers to the original server.js implementation.
 *
 * @param {{provider:'anthropic'|'openai', key:string, model:string, baseUrl?:string}} config
 * @param {string} kind
 * @param {unknown} data
 * @param {{fetchImpl?: typeof fetch, signal?: AbortSignal}} [opts]
 * @returns {Promise<string>}
 */
export async function callCoachProvider(config, kind, data, opts = {}) {
  const doFetch = opts.fetchImpl || fetch
  const { system, user } = buildCoachPrompt(kind, data)

  if (config.provider === 'anthropic') {
    const r = await doFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1200,
        temperature: 0.4,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal: opts.signal,
    })
    if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`)
    const json = await r.json()
    return (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
  }

  const r = await doFetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${config.key}` },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.4,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: opts.signal,
  })
  if (!r.ok) throw new Error(`openai ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const json = await r.json()
  return (json.choices?.[0]?.message?.content || '').trim()
}

/**
 * Best-effort, per-instance rate limiter (sliding window). Serverless
 * platforms give no shared state across regions/cold starts, so this only
 * protects a single warm instance - it is defence in depth, not a hard
 * guarantee. Good enough to blunt a single client hammering the endpoint.
 *
 * @param {{windowMs?: number, max?: number}} [opts]
 */
export function createRateLimiter({ windowMs = 60_000, max = 20 } = {}) {
  const hits = new Map()
  return {
    /** True if `id` (e.g. caller IP) has exceeded `max` requests in the current window. */
    check(id) {
      const now = Date.now()
      const key = id || 'unknown'
      const entry = hits.get(key)
      if (!entry || now - entry.start > windowMs) {
        hits.set(key, { start: now, count: 1 })
        return false
      }
      entry.count += 1
      return entry.count > max
    },
    /** Drop stale entries so the map cannot grow without bound on a long-lived isolate. */
    sweep() {
      const now = Date.now()
      for (const [key, entry] of hits) {
        if (now - entry.start > windowMs) hits.delete(key)
      }
    },
  }
}
