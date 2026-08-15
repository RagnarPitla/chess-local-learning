# Deploying Ramify

Ramify is a static site: `npm run build` turns `public/` into a self-contained
`dist/` folder (HTML, CSS, JS, the vendor copies of chess.js / cm-chessboard /
Stockfish's WASM, and `.nojekyll` + `404.html`). Any static host can serve
`dist/` with no server process. The only feature a plain static host cannot
provide is the *server-held* LLM coach key, which is why two of the three
options below add a small serverless function.

All three are free at the usage level a personal or small community project
will see.

| Host | LLM coach | Cost | Notes |
| --- | --- | --- | --- |
| GitHub Pages | Offline coach or user's own key only | Free | No serverless functions; simplest, and what this repo already uses |
| Cloudflare Pages | Full server-side coach | Free tier | Runs `functions/api/coach.js` |
| Vercel | Full server-side coach | Free tier | Runs `api/coach.js` |

The app works fully without any key: `public/js/coach.js` falls back to an
offline, rule-based coach built on the same pattern library used everywhere
else. A key (server-side or user-supplied) only upgrades the wording from
"the engine's rules" to an LLM's plain-English explanation.

## 1. GitHub Pages (this repo's default)

Handled by `.github/workflows/pages.yml`, already wired to this repo. On
every push to `main`:

1. `npm ci`
2. `node scripts/build-static.mjs --base=/chess-local-learning/`
3. `node scripts/build-static.mjs --check --base=/chess-local-learning/`
4. Deploy via `actions/configure-pages`, `actions/upload-pages-artifact`,
   `actions/deploy-pages`

Live at: **https://ragnarpitla.github.io/chess-local-learning/**

To turn this on for a fork: Settings > Pages > Source > "GitHub Actions".
Nothing else to configure; there are no environment variables to set for
this path because GitHub Pages cannot run the serverless coach function at
all. On a fork, the coach will only ever be the offline rule-based one, or
a visitor's own pasted key (bring-your-own-key, see below) - never a key
you hold, because there is no server to hold it on.

## 2. Cloudflare Pages (full LLM coach, free)

1. Connect the GitHub repo in the Cloudflare dashboard (Workers & Pages >
   Create > Pages > Connect to Git).
2. Build command: `node scripts/build-static.mjs`
3. Build output directory: `dist`
4. Root directory: `/` (repo root - `wrangler.toml` and the `functions/`
   directory both need to be visible to the build)
5. Leave the base path at `/` (the default) - Cloudflare Pages serves a
   project from the domain root, not a subdirectory, unlike a GitHub Pages
   project site.
6. Set environment variables (Settings > Environment variables, or
   `wrangler pages secret put NAME`): `ANTHROPIC_API_KEY` (preferred) and/or
   `OPENAI_API_KEY`, plus optionally `COACH_MODEL`, `OPENAI_MODEL`,
   `OPENAI_BASE_URL`.
7. Deploy. `functions/api/coach.js` and `functions/api/health.js` are picked
   up automatically from the `functions/` directory - no extra config beyond
   `wrangler.toml` (already in the repo) is required.

## 3. Vercel (full LLM coach, free)

1. Import the GitHub repo as a new Vercel project.
2. `vercel.json` (already in the repo) sets the build command
   (`node scripts/build-static.mjs`), install command (`npm ci`), and output
   directory (`dist`) - Vercel should pick these up with no manual
   configuration ("Framework preset: Other").
3. Set the same environment variables as Cloudflare (Project Settings >
   Environment Variables): `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY`, plus
   optionally `COACH_MODEL`, `OPENAI_MODEL`, `OPENAI_BASE_URL`.
4. Deploy. `api/coach.js` and `api/health.js` are Vercel serverless functions
   picked up automatically from the `api/` directory.

## Bring-your-own-key (works on any host, including GitHub Pages)

Both serverless functions also accept a caller-supplied key on the request
itself, so a visitor who wants the LLM coach on a GitHub Pages deploy (which
has no server-held key) can paste in their own. Contract for whoever wires up
the UI for this:

| Header | Required | Meaning |
| --- | --- | --- |
| `x-coach-key` | yes, to activate BYO mode | the caller's own provider API key |
| `x-coach-provider` | no (default `anthropic`) | `anthropic` or `openai` |
| `x-coach-model` | no | overrides the provider's default model |
| `x-coach-base-url` | no | OpenAI-compatible base URL override; must be `https://`, and is rejected if it resolves to localhost or a private/link-local address |

The key is read once per request, used to call the provider, and never
logged or persisted anywhere server-side. Request bodies are capped, calls
time out after 20 seconds, and there is a best-effort per-instance rate
limit. This path only exists on Cloudflare Pages / Vercel deploys that have
the function - GitHub Pages has no server at all to send the header to, so
BYO-key there would need a direct browser-to-provider call, which the app
does not currently make.

## Engine build note (applies to all three hosts)

`scripts/build-static.mjs` only ever copies the `stockfish-18-lite-single`
build (about 7 MB, single-threaded, no cross-origin isolation headers
needed) into `dist/`. The multi-threaded build and the ~113 MB full builds
are never copied; the build fails loudly if an oversized file is about to be
included. Nothing to configure here - it is the same on every host.
