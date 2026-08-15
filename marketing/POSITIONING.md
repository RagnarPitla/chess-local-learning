# Positioning - Ramify

Status: messaging foundation. Everything else in marketing/ should trace back to this file.
All claims below were checked against the actual source in public/js/ and README.md on 2026-08-15.
See the "Proof points" table for the file and function behind every claim.

---

## 1. The one-liner

> Ramify turns your own games into your own curriculum - free, open source, and it
> never leaves your browser.

Alternate (more technical, for developer channels):

> An open-source chess trainer that runs Stockfish in your browser, tags every mistake with a
> named pattern, and builds your drills and lessons from your own games. No signup, no server,
> no cost.

## 2. The 25-word version

> A free, open-source chess trainer that builds your curriculum from your own games, explains the
> patterns behind your mistakes, and runs entirely in your browser.

(25 words.)

## 3. The 100-word version

> Chess lessons teach trees: if they play X, you play Y. Real opponents play graphs - anything
> legal - and the moment they deviate, memorised lines stop helping. Ramify is a
> free, open-source chess trainer that fixes this differently: it plays you at any strength, marks
> every mistake with a named tactical or positional pattern (not just "the engine prefers Nf3"),
> and turns your own blunders into spaced-repetition drills. When an opponent leaves known theory,
> it explains what changed and which principle applies, instead of pretending the line continues.
> Runs in your browser. Your games never leave your machine. No account, ever.

(100 words.)

## 4. Elevator pitch (spoken, ~30 seconds)

> Most chess training teaches you a script: if they play this, you play that. The problem is your
> opponents don't read the script - they play anything legal, and the moment they go off it you're
> stuck with no plan. I built a free, open-source trainer that does the opposite. It plays you at
> any level with Stockfish running in your own browser, and when you make a mistake it doesn't just
> say "you lost half a pawn" - it tells you the actual reason: a hanging piece, an overloaded
> defender, a bad bishop, whatever it was. Those mistakes become your personal drill set, spaced
> out over time so the ones that keep costing you come back until they stop. And when your
> opponent leaves known theory, instead of a wall of silence it tells you what actually changed in
> the position and which principle to reach for. No signup. No upload. Your games stay on your
> machine. It's free because it's just... genuinely useful, and I think chess training should be.

---

## 5. Three audience-specific angles

### 5.1 The frustrated adult improver

**Pain:** Stuck at the same rating for months. Memorised an opening line from a YouTube video, and
the first time a 1400 opponent played something "wrong," had no idea what to do. Bought a puzzle
app, solved a thousand tactics that all felt disconnected from actual games.

**Angle:** Stop drilling somebody else's mistakes. This trains on yours. Every drill in the Drills
tab is a position from a game you actually played and actually misjudged - not a generic puzzle
rated 1800 that has nothing to do with your habits. The Profile tab ranks your real weaknesses
(hanging pieces, missed forks, bad bishops, whatever keeps recurring) by how much they cost you and
how recently, and schedules them back to you with spaced repetition so fixed patterns stop eating
practice time. When theory runs out mid-game, the app tells you what changed in the position and
which principle to lean on, instead of leaving you to guess.

**Opening line for this audience:** "You don't have a memory problem. You have a 'my model breaks
the moment they deviate' problem. Here's a free tool that fixes that specific thing."

### 5.2 The coach

**Pain:** Every student needs something different, and figuring out what from a pile of PGNs is
slow. Paid tools are a recurring cost to push onto students who are often juniors, and closed
review products can't be inspected, adapted, or trusted to explain their reasoning consistently.

**Angle:** Assign it as homework with zero cost to the student. A student pastes a PGN from a
Lichess or Chess.com game, gets accuracy, centipawn loss, and every mistake tagged with a specific
reason and a better move - the same vocabulary a coach would use ("you left the knight on d4
defended only once," "the bishop never got outside the pawn chain"). The Profile tab gives the
coach a ranked, evidence-backed list of what to work on next session instead of a re-read of the
whole game. It is open source, so a coach who wants to check the actual scoring logic, or adapt the
pattern library for their own curriculum, can just read patterns.js and analysis.js - nothing is a
black box.

**Opening line for this audience:** "A free second pair of eyes between sessions - it won't replace
you, but it will make sure every session starts from a ranked list of what's actually costing your
student rating points, not a guess."

### 5.3 The developer who likes that it's open source and local-first

**Pain:** Tired of chess tools (and SaaS generally) that phone home for no reason, gate basic
features behind a login, or hide their scoring logic. Curious how a real Stockfish-in-the-browser
tool is actually built - engine plumbing, testable pure logic, zero build step.

**Angle:** No build step, no bundler, no database. `npm install && npm start` and the browser loads
ES modules directly through an import map; the same modules run under `node --test` because the
engine is injected as a callback rather than imported directly, so the entire review pipeline -
evaluation maths, pattern detection, spaced repetition, puzzle generation - is unit tested without
ever booting Stockfish. MIT licensed. Read CAMPAIGN.md's sibling doc, the dev.to post
(marketing/COPY/dev-to-blog-post.md), for the architecture write-up, and note the second story:
this thing was designed, built, tested and shipped by a fleet of AI coding agents working in
parallel on the same repository, in one extended session. That's a build-process story worth its
own thread, separate from the product pitch.

**Opening line for this audience:** "Zero build step, Stockfish via WASM in a Web Worker, pure
logic modules that run identically under node --test and in the browser, and an ECO opening corpus
that's actually the full public-domain lichess dataset, not 40 hand-typed lines. MIT licensed."

---

## 6. Message hierarchy

1. **Primary claim - personalization:** it builds your curriculum from your own games. This is the
   thing no generic course, puzzle app, or one-size curriculum does.
2. **Secondary claim - understands why, not just what:** patterns are named and explained (hanging
   piece, overloaded defender, bad bishop, IQP handling, and 20 more), and deviations are handled
   with position facts and principles instead of silence.
3. **Tertiary claim - free, open, local:** MIT license, no signup, no upload, runs in the browser,
   your games never leave your machine.
4. **Amplifying, not competing, claim - the build story:** designed, built, tested and shipped by a
   fleet of AI agents working in parallel. This is a legitimate secondary story (see CAMPAIGN.md
   for sequencing) but it must never be claim #1 in front of a chess audience - they came for
   chess help, not an AI demo. It is claim #1 only on channels that are explicitly about AI-assisted
   engineering (dev.to, LinkedIn, parts of X).

Do not lead with "free" alone - "free" is a qualifier that removes an objection, not a reason to
click. Do not lead with "AI-built" in front of chess audiences - see the objection-handling and
CAMPAIGN sequencing notes on why that risks the wrong kind of attention (skepticism about
correctness/security rather than curiosity about the product).

---

## 7. Proof points mapped to real features

Every claim usable in copy, and exactly where it comes from. If a row is not in this table, do not
make the claim in copy.

| Claim | Where it's true in the code | Notes / honest limits |
|---|---|---|
| Runs entirely in your browser, no signup | `server.js` serves static files + a local `/api` for profile storage and optional coach; `public/js/engine.js` runs Stockfish in a Web Worker | Requires `npm install && npm start` today (Node >= 20) unless/until the static-hosted build is live at the GitHub Pages URL |
| Your games never leave your machine | `public/js/profile.js` `storage` object: profile in `localStorage`, mirrored to `data/profile.json` on your own machine; both gitignored; Export/Reset buttons on Profile tab | The only outbound calls are opt-in: the LLM coach (if you add a key) and the Lichess puzzle API (if you press "Fetch a themed puzzle") |
| Free and open source, MIT | `LICENSE`, `package.json` `"license": "MIT"` | Stockfish itself ships as an unmodified GPL dependency from `node_modules`, per README; chess.js is BSD-2, cm-chessboard is MIT |
| Play Stockfish at a chosen strength, 1320-2850 | `public/index.html` elo slider `min="1320" max="2850"`, `public/js/engine.js` `configure({elo})` sends `setoption name UCI_Elo` | Uses Stockfish's own UCI_Elo limiter, not a custom weakening hack |
| Every mistake tagged with a real chess reason, not "engine prefers X" | `public/js/patterns.js`: 23-entry `PATTERN_LIBRARY` (hanging piece, missed/allowed fork, missed/allowed pin, back rank, king safety, uncastled king, overloaded defender, trapped piece, bad bishop, IQP, doubled/isolated/passed pawns, undeveloped pieces, moved-piece-twice, early queen, centre neglect, endgame technique, threw-away-win, panic-out-of-book) | Core primitive is a real static-exchange evaluation (`see()`) that plays out the full capture sequence, not a simple attacker/defender count |
| Every blunder gets an explanation, not silence | `patterns.js` `tagMove()`; README states every blunder is "guaranteed to receive at least one tag" | Verified by reading `tagMove` - it falls through to a scan-based tag if nothing more specific matched |
| Accuracy and average centipawn loss per game | `public/js/analysis.js` `moveAccuracy()` (Lichess-style win% formula), `annotateGame()` summary | N+1 engine calls for N moves, not 2N - documented rationale in the file header |
| Drills come from your own games, not a generic puzzle set | `public/js/puzzles.js` `puzzlesFromGame()` - builds puzzles directly from tagged mistakes in your annotated game | Falls back to your worst moves above a lower threshold if a game was clean, so the drill queue is never empty |
| Weakness profile ranks what's actually costing you | `public/js/profile.js` `rankWeaknesses()` - blends EWMA severity, frequency, recency, and drill resistance | Score formula and weights are visible in the source, nothing hidden |
| Spaced repetition brings weak patterns back automatically | `public/js/profile.js` `LEITNER_INTERVALS_DAYS = [0, 1, 3, 7, 21]`, `recordDrill()` | Standard Leitner-style box scheme |
| Optional extra puzzles from Lichess, filtered to your weak pattern | `public/js/puzzles.js` `fetchLichessPuzzle()` hits the public `lichess.org/api/puzzle/next` endpoint | Opt-in via the "Fetch a themed puzzle" button; fails soft if offline |
| When an opponent leaves theory, the app explains the position instead of going silent | `public/js/openings.js` `shouldFlagDeviation()` / `describeDeviation()`, wired in `public/js/app.js` ("Out of theory" card) | Deliberately conservative - only fires on the opponent's move and only after a minimum book depth, so it does not cry wolf every third move |
| Backed by the real ECO opening corpus, not a handful of hand-typed lines | `public/data/openings-data.js`, generated by `scripts/build-eco.mjs` from `lichess-org/chess-openings` (CC0-1.0, public-domain dedication); ~3,800 named lines merged into an ~8,700-node tree | On top of that, 37 curated openings carry hand-written plans (`white`/`black` ideas, pawn breaks) - ECO gives names, the curated layer gives plans; deep ECO-only positions inherit the nearest curated ancestor's plan |
| From any position, see what's legal, what's known theory, and what each move is for | `public/js/explorer.js` `classifyVariations()` / `explainVariation()` - lists every legal reply, marks book moves with name/ECO/popularity share, marks the rest `novelty: true`, and can optionally enrich with live Lichess master/lichess statistics | This module exists and works (traced by hand, defensively coded, fails soft). As of this writing it is not yet wired to a dedicated always-on panel in `public/index.html` / `public/js/app.js` - describe it as a capability of the trainer, not as a named tab, until the UI ships it |
| Coach works offline with zero setup, or with an LLM if you add your own key | `public/js/coach.js` - `offlineCoach()` always available; `ask()` calls `/api/coach` only if `coachStatus()` reports a configured key; header pill shows `coach: llm` or `coach: offline rules` | Coach never blocks: `ask()` is written to always resolve, never throw |
| 50 unit tests, no browser required | `package.json` `"test": "node --test scripts/logic.test.js"` | Counted directly: 50 `test(...)` calls in `scripts/logic.test.js` |
| End-to-end suite drives real headless Chrome, no automation framework dependency | `package.json` `"test:e2e": "node scripts/smoke.mjs"`; `scripts/smoke.mjs` talks to Chrome over raw DevTools Protocol via WebSocket | Confirms the "engine loads / board renders / play a move / import a PGN / review / drill" loop end to end |
| Zero build step | `public/index.html` `<script type="importmap">` maps bare specifiers (`chess.js`, `cm-chessboard`) straight to files served out of `node_modules` by `server.js` | No bundler, no transpile step, confirmed by reading `server.js`'s `VENDOR_MOUNTS` |

### Claims considered and dropped for lack of evidence

- "See how you're improving over time with a rating graph" - the Profile tab has an ACPL
  sparkline and trend deltas (`profile.js` `trend()`), not an Elo/rating graph. Copy says "trend"
  and "average centipawn loss over time," not "rating."
- "Import from Chess.com and Lichess with one click" - the Review tab accepts a pasted PGN from
  anywhere, which does include Lichess and Chess.com exports; there is no direct account-linked
  import button as of this writing. Copy says "paste a PGN," not "connect your account."
- "Play against a model of a specific human's style" - no such model exists in the shipped code.
  (`docs/RESOURCES.md`, owned by another workstream, discusses Maia as a possible future addition;
  it is not integrated. Do not market it.)
- "Explorer tab" / "Learn tab" as a named, clickable part of today's UI - the underlying logic
  (`explorer.js`) is real and works; the visible tab is not confirmed wired as of this writing.
  Described as a capability, not a UI location, until confirmed. See CAMPAIGN.md's launch-readiness
  checklist.
- Any specific claim about the live Lichess Opening Explorer API returning master-game statistics
  in this build environment - `explorer.js`'s own code comment states that endpoint returned HTTP
  401 from this dev machine (an upstream network block, not a real auth requirement) and so could
  not be exercised end to end here. Copy describes this as optional, best-effort enrichment that
  "fails soft," not as a guaranteed feature.
- Any user counts, testimonials, star counts, or download numbers. The product has not launched
  yet. See METRICS.md for real week-1/month-1/month-3 targets instead of invented numbers.

---

## 8. Objection handling

| Objection | Answer |
|---|---|
| "Why not just use Lichess's own analysis board?" | Lichess analysis is excellent for one game at a time and its move-by-move eval and accuracy numbers are the same family of maths this app uses. What it does not do is roll your mistakes across many games into a standing, ranked weakness profile, generate spaced-repetition drills from your own blunders automatically, or explain an opening deviation in terms of the resulting position's material/development/centre/open-files rather than just naming the line you left. This app is not a replacement for Lichess - it is a personal layer on top of the same idea, and it happens to also optionally pull Lichess's own puzzle API for extra themed practice. |
| "Why not Chess.com's Game Review?" | Game Review is a good product, and there's no pretending otherwise. The differences: this is open source (you can read exactly how "accuracy" and "mistake" are computed - `public/js/analysis.js` - instead of trusting a black box), it is free with no daily cap (Chess.com's free tier has historically limited full Game Reviews, with unlimited review gated behind a paid membership - check Chess.com's current terms, as pricing changes), and it builds a cross-game weakness profile and drills rather than a per-game report you read once and move past. It does not have Chess.com's opponent pool, ratings, or social features - it is a training tool, not a play server. |
| "Is it really free? What's the catch?" | MIT licensed, hosted at no cost (GitHub Pages), no account, no paywall, no ads, no data resold - there is nothing to sell because nothing you do leaves your machine unless you explicitly opt in (your own LLM API key, or pressing the Lichess puzzle button). The only cost anyone pays is their own, if they choose to add an LLM key for natural-language coaching; the built-in offline coach costs nothing and never expires. |
| "If it's free, is it any good?" | Free and open source means you can verify the quality claim yourself instead of taking a marketing page's word for it: read `patterns.js` and see the actual static-exchange-evaluation tactics detector, read `analysis.js` and see the same win-probability accuracy formula Lichess uses, read the 50 unit tests. Free here means "the author isn't trying to charge you for a training tool," not "less engineering went into it." |
| "Isn't this just another Stockfish wrapper?" | The engine is Stockfish, unmodified and un-improved-upon - that part is not the innovation and the product does not claim otherwise. The part that is different is everything wrapped around it: the pattern library that turns a centipawn number into a named, explained reason; the profile that remembers what you're bad at across games; the deviation handling that treats "opponent left theory" as a position to reason about rather than a dead end; and the fact that a lesson (docs/PRODUCT.md and the in-app lesson generator) can be generated for any weakness the moment it's identified. |
| "Will my data be used to train anything?" | No. There is no telemetry in the app. Games and profile data are stored locally (`localStorage` and a local `data/` folder on whatever machine runs the server); nothing is transmitted unless you opt in to the LLM coach or the Lichess puzzle button, and in that case only structured JSON (FEN, evaluations, pattern tags) is sent, never a raw account link or identity. |
| "This was built by AI agents - should I trust the code?" | Read it. It's on GitHub, MIT licensed, and the honest engineering write-up (marketing/COPY/dev-to-blog-post.md once published) explains the process, the test suite that gated every change, and where the approach's real limits are. "AI-built" describes how it was produced, not a claim about correctness in place of testing - the 50 unit tests and the headless-Chrome end-to-end suite exist precisely so that claim doesn't have to be taken on faith either. |

---

## 9. Voice rules (apply to every file in marketing/COPY)

- Technical, honest, plain. No exclamation points as a substitute for a good sentence.
- Never use "revolutionary," "game-changer," "10x," "supercharge," or similar. If a sentence would
  only work in a press release, cut it.
- Prefer specific numbers and named mechanisms ("static exchange evaluation," "Leitner spaced
  repetition," "1320-2850 Elo") over vague superlatives ("powerful," "smart," "advanced").
  Specificity is the whole brand voice.
- It is fine, and encouraged, to state real limits in the same breath as a claim (see the
  Explorer/UI-wiring caveat above). Confidence comes from precision, not from omission.
- ASCII only: "-" not an em or en dash, straight quotes, "->" not an arrow.
