# dev.to blog post

Front matter suggestion (dev.to accepts up to 4 tags):
```
title: How a fleet of AI agents built a free, open-source chess trainer
published: true
tags: ai, opensource, javascript, chess
```

---

# How a fleet of AI agents built a free, open-source chess trainer

I run rbuild.ai, which is about enterprise AI adoption and agent-driven workflows, so I wanted a
real, non-trivial project to stress-test what a fleet of AI coding agents can actually ship end to
end, on their own, when the output has to be correct and not just plausible. Ramify
(free, MIT licensed, https://github.com/RagnarPitla/chess-local-learning) is that project. This is
the honest write-up of how it got built, not a highlight reel.

## The premise, briefly, because it explains some of the design decisions below

Chess lessons teach trees: if they play X, you play Y. Real opponents play graphs - anything legal
- and the moment someone deviates, the tree runs out. The product plays you at a chosen Stockfish
strength, tags every mistake with a real, named reason (a static-exchange evaluation plus board-
logic checks, not just an engine score), turns your own mistakes into spaced-repetition drills, and
explains an opening deviation in terms of the resulting position rather than going silent. All of
that runs client-side; nothing about your games leaves your machine unless you opt in.

The rest of this post is about how that got built, not what it does - see the README for the
product write-up.

## What "a fleet of agents" actually looked like

Not one long chat where a single model wrote the whole thing in order. Multiple agents worked
different parts of the same repository over the same extended session, coordinating through two
concrete mechanisms rather than through a shared chat transcript:

1. **A shared task database.** Every agent read and wrote to the same structured todo table - what's
   done, what's in progress, what's blocked, and the dependency edges between tasks. The repo's own
   build log (`docs/BUILT-WITH-AI.md`, written by the orchestrator mid-build, from the live table
   via SQL, not from memory) counts this precisely rather than impressionistically: 52 todos, 44
   dependency edges, across 13 root workstreams, 11 of which were `in_progress` at the same queried
   instant. Mine was one edge in that graph - `marketing-campaign`, gated on an exploration step and
   feeding a shared documentation-publish step at the end, same as everyone else's. That table, and
   its dependency edges, is the actual coordination mechanism, not a group chat.
2. **A file-ownership partition.** Each agent was scoped to a specific slice of the file tree it
   could write to, with explicit instructions to read anything else freely but never write outside
   its own slice. Mine was `marketing/` only - everything under `public/`, `server.js`, `scripts/`,
   `package.json`, `docs/` belonged to other agents, working at the same time, on the same repo.
   That partition is what makes true parallelism safe: without it, two agents editing the same file
   concurrently is a guaranteed conflict; with it, "parallel" is a real property of the system, not
   a simulated one.

Both of those are unglamorous, and that's the point: the interesting engineering problem in
multi-agent building isn't "can a model write a static-exchange evaluation function" (it can) - it's
"how do eleven of them work on the same codebase without stepping on each other," and the answer
looks a lot more like classic distributed-systems discipline (ownership boundaries, a shared source
of truth for task state, explicit dependencies) than like anything AI-specific. If you want the
full account - exact commit hashes, the dependency graph as it was actually queried, and an honest
section on what went wrong (a licence gap, a flaky first test run, a doc that overclaimed a browser
API) - it's in the repo at `docs/BUILT-WITH-AI.md`. It was written by the same orchestrator that ran
the build, checking its own claims against git log and the test suite as it wrote them. This post
is the shorter, distribution version; that document is the primary source.

## The thing that actually kept the agents honest: the test suite

None of the file-partitioning or task-tracking matters if an agent can write code that looks right
and isn't. The part of this repo doing the real work of catching that is:

- **50 unit tests** (`node --test scripts/logic.test.js`) over the pure logic - evaluation maths,
  pattern detection, spaced repetition, puzzle generation - with no browser and no engine involved.
- **A full end-to-end suite** (`scripts/smoke.mjs`, 25 checks) that spawns real headless Chrome and
  drives it over the raw DevTools Protocol via a plain WebSocket - no Selenium, no Playwright, no
  test-runner dependency at all. It boots the actual server, loads the actual page, waits for
  Stockfish's WASM build to come up in a Web Worker, plays a move, waits for the engine's reply,
  imports a real PGN, runs a full review, confirms a mistake gets tagged with a pattern, generates a
  drill, and checks the browser console stayed clean the whole time.

Neither suite was green on the first attempt, and the build log is specific about it rather than
skipping past it: 19 of the 50 unit tests failed on the first run (mostly the test author assuming
a function's shape instead of reading it, though fixing that also surfaced two real product bugs),
and the first end-to-end run passed 22 of 24 checks - one of the two failures was a real gap, not a
flaky test: revealing a drill's solution never explained why it was the answer. That's the kind of
detail that's easy to leave out of a build story and is exactly the part worth keeping in.

The design choice that makes the unit tests possible in the first place is worth calling out on its
own: the engine is never imported directly by the logic modules. Every function that needs an
evaluation takes the engine as an injected async callback (`analyse(fen) -> {cp, mate, best, lines}`
). That single decision is why the entire review pipeline - annotation, pattern tagging, weakness
ranking, spaced repetition, puzzle generation - can run under plain `node --test` with a fake
engine, in milliseconds, instead of needing a real Stockfish instance and a browser for every test.
It's a dependency-injection pattern that predates AI-assisted coding by decades; it just happens to
matter more than ever when the code writing to that boundary is a fleet of agents that need a fast,
deterministic way to know whether they broke something.

## A few implementation details that are genuinely interesting on their own

**Evaluation cost: N+1, not 2N.** Reviewing a game of N moves needs the evaluation of N+1 positions
(the starting position plus the position after each move), not two searches per move. The
insight the code leans on: the engine's evaluation of position *i* already assumes best play from
there, so the "loss" for the move played at position *i* is just `eval(i) - eval(i+1)`, both taken
from the mover's point of view. Halving the number of engine calls matters a lot when the engine is
a multi-megabyte WASM build running in the user's own browser rather than a server you control.

**Tactics detection is a real static-exchange evaluation, not a heuristic.** "Is this piece
actually hanging" isn't answered by counting attackers and defenders - it's answered by playing out
the full capture sequence on the square (lowest-value attacker takes first, both sides keep
recapturing until it's no longer profitable) and checking whether the side to move comes out ahead.
That's the same primitive real chess engines use internally to prune bad captures, reused here to
turn "the engine disagrees with this move" into "this piece was defended once and attacked twice, so
it was simply lost."

**The opening book is a merge, not a replacement.** The public `lichess-org/chess-openings` ECO
dataset (CC0, public domain) gives around 3,800 named lines but no *plans* - it can tell you a
position is called the Najdorf, not what either side is actually trying to do there. A much smaller
hand-written layer (a few dozen entries) carries the plan text - concrete pawn breaks, which minor
pieces belong where, what each side is racing to achieve. The two get merged into one tree at
module load: every node in the full ~8,700-node ECO tree gets a name if ECO has one, and inherits
the plan from its nearest curated ancestor if the position itself doesn't have a hand-written entry.
That's what lets the trainer say something useful about a position eleven moves deep in a sideline
nobody bothered to annotate by hand.

**Spaced repetition is a plain Leitner scheme, and that's a feature, not a limitation.** Box
intervals are `[0, 1, 3, 7, 21]` days; get a drill right and the pattern moves up a box (further
out); get it wrong and it resets to day zero. Nothing exotic - the interesting part is what feeds
it: a weakness-ranking score that blends how expensive a pattern's mistakes have been (an
exponentially-weighted moving average, so recent games dominate but old ones don't vanish
instantly), how often it recurs, how long it's been since it last showed up, and how often you've
gotten its drills right. All of that lives in one short, readable file precisely because it's the
kind of scoring logic you want to be able to point at and say "here is exactly why this pattern is
ranked first," not a black box.

## Where the agents needed a human anyway

In the interest of not overselling this: parallel agents working against a shared test suite and a
file-ownership boundary is a genuinely effective pattern for well-specified, independently-testable
modules - pattern detection, evaluation maths, spaced repetition, an opening-book merge algorithm
all fit that description well. It is a much worse fit, unsupervised, for the things that need one
coherent judgment call across the whole product: what the actual positioning should be, when a UI
decision in one module should change a decision in another, and - the reason this post exists -
deciding what's true enough to put in front of a stranger and what needs a caveat or has to be cut
entirely. `docs/BUILT-WITH-AI.md` names its own failures in detail rather than hiding them: a
licence gap where a bundled default piece-art asset turned out to be NonCommercial-licensed and got
wired up without anyone checking, a README claim about a browser API that didn't match the server
code until it was implemented for real, and a test run that went from 50/50 to 48/50 mid-build
because a concurrent edit to the opening book outran the test file that covers it. None of that is
solved by adding more agents. It's solved by someone, or something, actually reading the code before
writing the claim, every time, and being willing to say "this isn't wired up yet" instead of
rounding up.

## Try it, or read it

It's free, MIT licensed, and runs entirely in your browser:

- Live: https://ragnarpitla.github.io/chess-local-learning/
- Source: https://github.com/RagnarPitla/chess-local-learning
- The full build story, written by the orchestrator, checked against git log as it was written:
  `docs/BUILT-WITH-AI.md` in the repo.

If the multi-agent build process is the interesting part for you, that document - not this post -
is the primary source.
