# Press kit - Ramify

One page. Everything a journalist, blogger, or directory editor needs, in one place. All facts
below are checked against the source in this repository; see marketing/POSITIONING.md for the full
proof-points table with file and function references.

---

## Boilerplate (three lengths, pick what fits)

**Short (one sentence):**
Ramify is a free, open-source chess trainer that builds your curriculum from your own
games, explains every mistake with a named pattern, and runs entirely in your browser.

**Medium (three sentences):**
Ramify is a free, open-source chess trainer. Instead of teaching memorised lines that
stop working the moment an opponent deviates, it plays you at any strength with Stockfish running
in your own browser, tags every mistake with a named tactical or positional pattern, and turns your
own games into spaced-repetition drills. It is MIT licensed, has no signup, and your games never
leave your machine.

**Long (for an "about" page or directory listing):**
Chess lessons teach trees: if they play X, you play Y. Real opponents play graphs - anything legal -
and the moment they deviate, memorised lines stop helping. Ramify is a free,
open-source chess trainer built around that gap. It plays you at a chosen strength using Stockfish
running entirely in your own browser, marks every mistake with a named pattern rather than just a
worse evaluation number, and turns your own blunders into spaced-repetition drills using a Leitner
schedule. When an opponent leaves known opening theory it explains what changed in the position
instead of going silent. It is MIT licensed, has no account or signup, and no game data leaves the
user's machine unless the user explicitly opts into an optional LLM coaching feature with their own
API key.

## Key facts

- **License:** MIT (code). See "Known gap" below for one caveat on bundled default piece art.
- **Cost:** Free. No tier, no paywall, no usage cap.
- **Data:** Runs entirely client-side. No account, no server-side storage of games unless the user
  explicitly exports/imports through the local server's own save file.
- **Engine:** Stockfish (WASM build) running in a browser Web Worker.
- **Mistake detection:** 23 named tactical and positional patterns (`public/js/patterns.js`),
  detected with a real static-exchange evaluation, not just an engine-score threshold.
- **Opening coverage:** 37 hand-curated openings with plans, layered over roughly 3,800 named ECO
  lines (public domain, CC0) merged into one lookup tree.
- **Difficulty range:** Elo 1320 to 2850, adjustable per game.
- **Spaced repetition:** Leitner schedule, box intervals of 0, 1, 3, 7 and 21 days.
- **Testing:** 50 unit tests (`node --test`) plus a 25-check end-to-end suite that drives real
  headless Chrome over the DevTools Protocol - no mocked engine in the end-to-end path.
- **Built by:** an orchestrated fleet of AI coding agents working in parallel on the same
  repository, with a human at every commit boundary. The full, independently-checked account,
  written by the orchestrator itself, is in the repository at `docs/BUILT-WITH-AI.md`.

## Founder line

Built by Ragnar Pitla, founder of rbuild.ai (enterprise AI adoption and agent-driven workflows).
Ramify was built as a real test of what an orchestrated fleet of AI coding agents can
ship end to end, not as a funded product - which is also why it is free and MIT licensed rather than
a paid tier of anything.

## One thing worth knowing before you cover this

As of this writing, the shipped board still points at cm-chessboard's bundled default piece art
(`staunty.svg`), which is licensed CC BY-NC-SA 4.0 (NonCommercial) - separate from, and more
restrictive than, the MIT license on the surrounding code. This is documented candidly in
`docs/CREDITS.md` and is being replaced with an original, permissively licensed piece set as part of
this same build. Anyone writing about this project before that swap lands should check
`docs/CREDITS.md` for the current status rather than assume the MIT license covers 100 percent of
the shipped visual assets.

## Links

- Live app: https://ragnarpitla.github.io/chess-local-learning/
- Source: https://github.com/RagnarPitla/chess-local-learning
- License: MIT (repo root `LICENSE`)
- Owner: https://rbuild.ai

## Visual assets (all in marketing/ASSETS/, all monochrome, all hand-authored SVG)

- `og-image.svg` (1200x630) - general link-preview / Open Graph image
- `og-image-x.svg` (1200x675) - X / Twitter card variant
- `og-image-linkedin.svg` (1200x627) - LinkedIn variant, leads with the build story
- `logo-lockup.svg` (720x160) - icon plus wordmark
- `favicon.svg` (64x64) - bold solid silhouette, legible down to 16x16
- `social-trees-vs-graphs.svg` (1200x675) - the core positioning explainer
- `social-learning-loop.svg` (1200x675) - the five-step learning loop diagram
- `social-feature-card.svg` (1200x675) - the 23-pattern feature card
- `social-before-after.svg` (1200x675) - before/after review comparison card

See `marketing/ASSETS/rasterise.md` for exact PNG export commands and sizes per platform.

## What this is not

Not a paid product. Not a company with a funding round to announce. Not a claim that AI agents
built this unsupervised - a human reviewed and committed every change; see `docs/BUILT-WITH-AI.md`
section 5 for exactly what that human checkpoint did and did not cover.
