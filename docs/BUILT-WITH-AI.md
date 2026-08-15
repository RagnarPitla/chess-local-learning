# Built with AI: how Chess Local Learning was actually made

This is an engineering essay, not a testimonial. It is written by the same GitHub
Copilot CLI orchestrator that ran the build, documenting its own process while the
process is still, quite literally, running. Every specific claim below is checked
against the repository - the git log, the test suite, and the live coordination
database - and marked as verified, reported, or unverifiable where it matters. If
you want to copy this way of working, section 7 is the checklist; everything above
it is the evidence for why the checklist looks the way it does.

## 1. What was built, and in how long

Chess Local Learning is an adaptive chess trainer: a zero-dependency Node HTTP
server, a Stockfish 18 WASM engine running in a browser Web Worker, a static
exchange evaluation and pattern-detection layer, a weakness profile with Leitner
spaced repetition, generated drills, and an LLM coaching layer with a complete
offline rule-based fallback. It runs with no build step and no database - the
server maps `node_modules` straight into the page and the browser resolves bare
module specifiers through an import map.

It was built in two phases:

- **Phase 1 - the core.** One orchestrator, working sequentially, produced the
  engine wrapper, analysis layer, pattern detector, opening-deviation handling,
  weakness profile, drill generator, coach, board wrapper, controller and server.
  This landed as a single commit, `c74af8e`, timestamped `02:57:28` on the build
  day: 21 files, 5,360 lines, 50 unit tests and 25 end-to-end checks, all
  described in the commit message itself. A 4-line documentation follow-up
  (`8101fc9`) landed 40 seconds later.
- **Phase 2 - product expansion.** Up to 11 sub-agents in parallel, building the
  full ECO variation engine, a lesson curriculum, bulk game import from Lichess
  and Chess.com, progress/mastery tracking, a landing page, product and business
  strategy docs, a white-theme design system, an original chess piece set, a
  marketing campaign, static hosting and CI.

**On timing, precisely:** the only wall-clock signal that actually exists is git
commit timestamps and file mtimes. This document is being written at
approximately `03:29`, about 31 minutes after the Phase 1 commit landed, and at
that moment Phase 2 is still in flight: 2 of its 13 tracked workstreams are done,
10 are in progress, 4 more are queued behind them. I looked for a recorded
transcript of either build session in this environment's cross-session history
store and found none, so I have no verified token-cost or agent-hour figure for
either phase, and I am not going to invent one. What is measurable - file counts,
test counts, commit history, and the live todo table - is used throughout this
document instead.

## 2. The orchestration model

One GitHub Copilot CLI session acted as the orchestrator. It did not write most
of the Phase 2 code itself; it broke the work into disjoint file-ownership zones,
wrote the interface contracts between them up front, recorded the plan as rows in
a SQLite table, and dispatched a sub-agent per zone. This section documents the
actual dependency graph, read directly from that table with the `sql` tool while
Phase 2 was running (its rows are literally named `todos` / `todo_deps`, the same
mechanism this CLI exposes for any session).

**Phase 1 - the module graph** (from the real `import` statements in
`public/js/*.js`):

```
node_modules: chess.js, cm-chessboard, stockfish   (vendored, mounted by server.js)

  engine.js  (Stockfish in a Web Worker; no local imports; injected into
              everything below as a callback, per the pattern documented
              in README.md's "Why this shape" section)
        |
        v
  analysis.js   patterns.js   openings.js      (each imports only chess.js)
        |            |             |
        +------------+-------------+
                     |
        profile.js (patterns.js)   puzzles.js (chess.js, patterns.js)
        coach.js (patterns.js, openings.js)
                     |
                     v
                  app.js   <- imports all of the above, plus board.js
                     |
                     v
                 board.js  (cm-chessboard)
                     |
                     v
               public/index.html  <-- server.js (static files, vendor
                                       mounts, /api/coach proxy, /api/profile
                                       and /api/games persistence)
```

Phase 1 is a single squashed commit, so its internal iteration is not visible -
only the final, tested state is. That is an honest limit of this evidence, not a
claim about how smooth the process was.

**Phase 2 - the real dependency graph**, read from this session's live
`todos`/`todo_deps` tables (52 todos, 44 edges, at the moment queried):

```
LAYER 0 - parallel, no upstream dependency (the "up to 11 concurrent" workstreams)
  research-sources    [done]        -> feeds docs-publish
  product-strategy    [done]        -> feeds docs-publish
  variation-engine    [in progress] -> feeds ui-integration
  lessons-module      [in progress] -> feeds ui-integration
  game-import         [in progress] -> feeds ui-integration
                                        (sub-plan: gi-explore -> gi-import-js,
                                         gi-library-js -> gi-cors-verify,
                                         gi-real-data-test -> gi-npm-test)
  progress-system     [in progress] -> feeds ui-integration
  design-system       [in progress] -> feeds ui-integration AND testing
  chess-pieces        [in progress] -> feeds ui-integration
  landing-brand       [in progress] -> feeds testing
                                        (sub-plan: landing-explore ->
                                         landing-name/css/js -> landing-verify
                                         -> landing-test)
  static-deploy       [in progress] -> feeds testing
  marketing-campaign  [in progress] -> feeds docs-publish
                                        (sub-plan: mktg-explore-repo ->
                                         mktg-positioning-doc -> {campaign-doc,
                                         copy-files, assets-svg, assets-presskit}
                                         -> render-verify/metrics-doc ->
                                         readme-doc -> final-report)
  built-with-ai       [in progress] <- this document. Not gated on, or gating,
                                        anything else in the graph (see the
                                        note below).

LAYER 1                    ui-integration <- {variation-engine, lessons-module,
                                               game-import, progress-system,
                                               design-system, chess-pieces}

LAYER 2                    testing <- {ui-integration, design-system,
                                        landing-brand, static-deploy}

LAYER 3                    docs-howto <- {ui-integration}

LAYER 4 (finish line)      docs-publish <- {docs-howto, marketing-campaign,
                                             product-strategy, research-sources,
                                             testing}
```

Counting only root workstreams (not their internal sub-plans), 11 were
`in_progress` at the same instant partway through this session - a live,
queryable match for "up to 11 concurrent agents." By the time this section was
written, `product-strategy` and `research-sources` had finished and the count had
dropped to 10, which is itself a small piece of evidence that this really is a
live system and not a diagram drawn after the fact.

One honest gap in the graph itself: `built-with-ai` and `docs-publish` are not
connected. Nothing forces the story and credits documents to be finished before,
or reviewed as part of, the public-release step. That is a real limitation of
this planning approach worth naming in section 4 rather than hiding: a
dependency graph only enforces the edges someone remembered to add.

## 3. The five techniques that made it work

**1. File ownership as a concurrency primitive.** Every sub-agent - and this
document is a live example - is told exactly which files it owns and is
forbidden from touching anything else. `git status` mid-Phase-2 shows exactly
that shape: `public/js/openings.js`, `server.js` and `package.json` modified by
name, `api/`, `lib/`, `functions/`, `public/data/`, and several `scripts/*.mjs`
added as whole new files, with zero overlap between the sets any two agents were
allowed to write. That is what makes writing to the same repository from 11
directions at once safe without a merge step: two agents cannot conflict on
files neither of them is allowed to open.

**2. Contract-first interfaces.** The orchestrator specified exact export names
and shapes before dispatching, so agents could build against each other without
waiting. The clearest evidence of this working - and of it still being
mid-flight - is `public/js/explorer.js` and `public/js/progress.js`. Both exist
right now as complete modules with wide, deliberate export surfaces
(`explore`, `classifyVariations`, `explainVariation`, `fetchLiveStats` in
`explorer.js`; `createProgressState`, `recordLessonEvent`, `masteryFor`,
`nextBestAction`, `mountProgress` and 15 more in `progress.js`), but as of this
writing neither is imported by `public/js/app.js` and neither tab exists in
`public/index.html` (the nav still lists only `play`, `review`, `drills`,
`profile`). The `ui-integration` todo that will wire them in is still `pending`,
waiting on exactly the six workstreams the dependency graph says it should wait
on. The modules were buildable and independently reasoned-about before
integration existed to consume them, because their contracts were fixed first.

**3. A dependency graph in SQL, not prose.** Section 2's graph is not a
diagram drawn from memory - it is the literal output of `SELECT * FROM
todo_deps`. Any agent (or the orchestrator, or a human) can ask "what is
blocking me" or "what is safe to start now" as a query instead of a Slack
message. That is what let `testing` and `docs-publish` sit correctly `pending`
while their dependencies were still running, rather than someone having to
track that by hand across 11 concurrent workstreams.

**4. Verification loops with real browsers and real engines, not mocks.**
`scripts/logic.test.js` runs 50 tests with Node's built-in `node --test` -
zero test-framework dependency. `scripts/smoke.mjs` is the more interesting
piece: it spawns real headless Chrome (`/Applications/Google Chrome.app/...`)
and drives it entirely over the Chrome DevTools Protocol using the `WebSocket`
global that ships in Node itself (`scripts/smoke.mjs:99`, `new WebSocket(wsUrl)`)
- there is no Playwright, Puppeteer or any other automation package in
`package.json` or `node_modules`. The comment at the top of the file says why:
"No test framework and no browser automation dependency: Chrome is spawned
directly." Playwright was not an option in the environment this was built in (a
shared browser profile lock), so the orchestrator built a CDP harness rather
than skip browser testing. Running it live for this document produced:

```
25/25 checks passed
```

with every stage of the real loop actually exercised - engine load, a played
move, a PGN import, a review, pattern tags, drill generation, and a check
literally named "solution reveal explains why" (see section 4).

**5. Enough context to decide, not a spec to obey.** Before any Phase 2 code was
written, a research pass produced `docs/RESOURCES.md` - 1,074 lines cataloguing
real, HTTP-verified chess data sources, their licences, and their rate limits,
including the finding that `explorer.lichess.ovh` returns HTTP 401 from this
build environment and that the app must therefore bundle its own opening data
rather than call that API live. The agents that built the ECO engine and the
bulk importer did not have to discover the Lichess and Chess.com endpoints
themselves - `public/js/import.js` calls `https://lichess.org/api/games/user/`
and `https://api.chess.com/pub/player/.../games/archives`, exactly the endpoints
that research pass had already verified. That is context handed down, not an
implementation prescribed.

## 4. What went wrong, in detail

This is the part worth trusting the rest of the document for.

**19 of 50 unit tests failed on the first run.** Reported from the build
session, not independently replayable now that the suite is green - but
consistent with what the current suite looks like: dense, specific assertions
against real function signatures (`foldScore`, `clampEval`, `see`,
`normaliseProfile`, and 46 others in `scripts/logic.test.js`). The stated cause
was the test author assuming API shapes instead of reading them, and fixing that
surfaced 2 genuine product bugs alongside the test bugs.

**The first end-to-end run passed 22 of 24.** One of the two failures was a real
product gap, not a test bug: revealing a drill solution never explained why.
That gap is now closed and directly checkable - `offlinePuzzleExplain` in
`public/js/coach.js` appends the pattern's `label` and `why` after naming the
move, and the live e2e run above includes the exact check that guards it:

```
[PASS] solution reveal explains why - The move is b5, and the follow-up runs
b5 dxc6 bxc4 O-O. Allowed a fork: The mov...
```

**Engine nondeterminism produced zero drills.** Stockfish returned different
evaluations for identical input across runs, so a reviewed game could
occasionally cross no mistake threshold at all. The fix is a floor, not a
retry - `public/js/puzzles.js:42-50`:

```js
export function puzzlesFromGame({ moves, playerColour, gameId, limit = 5, minLoss = 100, floorLoss = 40 }) {
  ...
  let candidates = playable.filter((m) => m.loss >= minLoss)
  if (!candidates.length) candidates = playable.filter((m) => m.loss >= floorLoss).slice(0, 3)
```

The lesson stated in the build history, and consistent with this code, is: never
assert exact engine values in tests - assert shape, and give the product a
floor so a review always yields something to practise.

**The README claimed COOP/COEP support that did not exist, and it was
implemented rather than deleted.** Verified directly in `server.js`:

```js
// server.js:37-39
const NEEDS_ISOLATION = !/-single$/.test(ENGINE_BUILD)
const ISOLATION_HEADERS = NEEDS_ISOLATION
  ? { 'cross-origin-opener-policy': 'same-origin', 'cross-origin-embedder-policy': 'require-corp' }
  : {}
```

`ISOLATION_HEADERS` is spread into both the 200 and 304 response paths
(`server.js:220`, `server.js:229`) and is conditional on which Stockfish build is
selected - the single-threaded default needs no isolation headers and gets
none, the multi-threaded build gets both. This is a real, working, conditional
implementation, not a doc fix.

**An agent broke a source file with a curly apostrophe in a single-quoted JS
string.** I cannot verify this specific incident in the git history - the repo
has two commits total and the incident is not visible in either diff, so it may
have happened and been fixed before anything was committed. What is verifiable:
there are zero curly quotes anywhere in the current JS source, and the practice
this incident is said to have produced (ASCII-only source strings) is followed
throughout. Marked here as reported-but-unverifiable, not confirmed.

**A live example of the same failure class, caught while writing this
document.** Running `npm test` just now returns `48 pass, 2 fail`, not 50/50.
Both failures are in opening-book coverage
(`scripts/logic.test.js:340`, `lookupOpening names a known line`, and
`scripts/logic.test.js:363`, `outOfBookPly reports where theory stops`), and the
cause is visible in `git status`: `public/js/openings.js` is mid-edit by the
`variation-engine` workstream (Phase 2, in progress), and the test file that
covers it has not been touched to match. This is not a regression I introduced
or fixed - `scripts/logic.test.js` and `public/js/openings.js` both belong to
other agents under this document's own file-ownership rule - but it is real,
current, and exactly the risk that verification loops exist to catch: a
concurrent change can outrun its own test suite, and the fix is to re-run the
full suite after every merge, not to trust that a change which looked correct in
isolation stayed correct once another change landed beside it.

**A licence gap found during this documentation pass, not the build itself.**
`public/js/board.js:34` currently points the board at
`pieces: { file: 'pieces/staunty.svg' }`, which is cm-chessboard's bundled
default piece art. That SVG's own header states its licence as CC BY-NC-SA 4.0 -
NonCommercial - a fact that was evidently not checked before the default was
wired up. Full detail and the fix are in `docs/CREDITS.md`; it is mentioned here
because it is the same failure mode as the COOP/COEP claim and the GPL version
slip below: trusting a library's surface (or a default it ships with) instead of
reading the licence file that comes with it.

## 5. Cost and time, honestly

What is measurable: Phase 1 is one commit, 21 files, 5,360 lines, 50 unit tests,
25 e2e checks, timestamped `02:57:28`. Phase 2, at the time of writing, is 52
todos and 44 dependency edges across 13 root workstreams, 11 of which were
running concurrently at one observed instant, roughly 31 minutes after Phase 1
landed and still not finished. `npm ls --all` shows 3 runtime dependencies and
zero transitive dependencies - there is very little surface area for the fleet
to have gotten wrong in the dependency tree itself.

What is not measurable, and not invented here: token cost and agent-hours for
either phase. I checked this environment's cross-session history for a recorded
transcript of the sessions that built this repository and found none, on this
machine or in the cloud store, for this repository. Anyone repeating this claim
with a specific dollar or token figure for this exact build is asserting
something I could not verify.

Where a human was genuinely required, and is visible in the repository: every
commit is authored by a human git identity (`Ragnar git`) with the agent
recorded only as a co-author trailer - the CLI does not run `git add`,
`git commit`, or `git push` itself in this workflow, so a human is the
checkpoint at every point code actually ships. What is not visible from the
repository is how much review of content, logic or business claims happened
before each commit - that is not observable from the outside, and this document
does not claim to know it. Notably, even `product-strategy` ("Defining the
product and business model") was itself delegated to an agent in this Phase 2
run; that is a reasonable thing to delegate, but it is exactly the kind of
output - market claims, competitive positioning, pricing logic - that most needs
a human to have actually read it before it goes out, not just committed it.

## 6. What AI was bad at here

Specific, not general:

- **Judging visual design without a rendered screenshot.** The orchestration
  itself treats this as a known weakness rather than trusting it away: both the
  landing-page workstream and the marketing workstream schedule an explicit,
  separate CDP screenshot/render-verification step (`landing-verify: Rendering
  and screenshotting via CDP`, `mktg-render-verify: Verifying SVG renders via
  CDP`) as a hard dependency before anything downstream is allowed to call
  itself tested. Writing CSS or SVG and asserting it looks right was
  specifically not trusted; only a render was.
- **Guessing API shapes instead of reading them.** The direct cause of the
  19-failure first test run (section 4), and the reason `docs/RESOURCES.md`
  exists at all: it pastes real, HTTP-verified JSON response bodies from
  live Lichess and Chess.com calls rather than describing them from memory.
- **Over-claiming in documentation, twice.** The COOP/COEP claim (section 4)
  is the reported instance. A second one I found independently while writing
  this: `docs/RESOURCES.md`'s own licence-compliance table states Stockfish is
  "GPL-2.0." It is not - `node_modules/stockfish/package.json`, its bundled
  `Copying.txt`, and its upstream README all say GPL-3.0 (GPLv3). Trust the
  code over the doc; see `docs/CREDITS.md` for the corrected table.
- **Nondeterminism blindness in tests.** The engine-eval story in section 4.
  A test suite that asserts exact values from a component that is allowed to
  vary will eventually fail for reasons that have nothing to do with a real
  regression, and will train reviewers to ignore red builds.
- **Trusting a dependency's default instead of reading its licence.** The
  piece-art gap in section 4 and `docs/CREDITS.md`: an agent wired up the
  chessboard library's bundled default piece set without checking that the
  artwork itself (as distinct from the library's own MIT code) carries a
  separate, more restrictive licence.

## 7. How to copy this: a practical checklist

1. Write the contracts before the code - exact export names, argument shapes,
   and return shapes - so agents can build against each other without waiting.
2. Partition strictly by file path, in writing, before dispatching anyone. Two
   agents must never be allowed to hold write access to the same file.
3. Put the plan in a queryable table (todos + dependency edges), not only in
   prose, so "what can start now" and "what is blocking me" are queries anyone
   can run, including you.
4. Design every module to take its heaviest dependency as an injected argument
   (an engine, a network client) so unit tests run in milliseconds without a
   browser, a GPU, or a live API.
5. If your preferred browser-automation tool is unavailable in the environment,
   build a substitute (CDP over a raw WebSocket costs about 370 lines here) -
   do not quietly downgrade to skipping browser tests.
6. Never assert an exact value from a nondeterministic component. Assert shape,
   and give the product a floor/fallback so a real result always comes back.
7. Treat anything visual as untested until it has been rendered and
   screenshotted, not merely authored.
8. Read the licence file of every bundled asset separately from the licence of
   the code that ships it - a permissively licensed library can still bundle a
   more restrictively licensed image, font, or dataset.
9. When documentation makes a claim the code does not yet support, resolve it
   in the direction of implementing the claim or deleting it - never leave it
   standing unverified.
10. Re-run the full test and e2e suite after every concurrent merge. A change
    that is correct in isolation can still be raced by a sibling change; this
    document caught exactly that happening live (section 4).
11. Keep a human at the commit boundary, and read anything agent-authored that
    makes a market, legal, or pricing claim before it ships - delegating the
    drafting is fine, delegating the sign-off is not.

## 8. What this implies for enterprise AI adoption

The owner of this project runs rbuild.ai, an enterprise AI adoption consultancy,
so it is worth being direct about what generalizes from a chess app to a
production engineering org, and what does not.

What generalizes: the five techniques in section 3 are process disciplines, not
AI-specific tricks. File ownership as a concurrency control, contracts before
implementation, a queryable plan instead of a verbal one, and a verification
gate that uses the real dependency rather than a mock - a team of humans
benefits from all four regardless of who is typing the code. What an agent
fleet changes is throughput: the same disjoint-ownership plan that would take a
human team days of calendar time to execute in parallel ran here as 11
concurrent workstreams inside one session.

What does not generalize for free: every failure in section 4 and 6 is a known
enterprise risk category with or without AI - licence and IP compliance, visual
QA that nobody actually looked at, flaky tests that erode trust in CI, and
documentation that outruns what was actually shipped. Agents do not remove the
need for the controls that already exist for these risks (licence review,
design review, test hygiene, doc-vs-code audits); they change how fast an
organization can generate the work that those controls need to catch. An
organization adopting this pattern without also keeping those review gates will
ship the same kind of gap documented in section 4 - just faster, and at more
places in the codebase at once.
