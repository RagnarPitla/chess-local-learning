# LinkedIn copy

Audience: the owner's existing network around rbuild.ai (enterprise AI adoption, agent-driven
workflows). This is the one channel where the build story leads - see CAMPAIGN.md Section 4 for
why. Chess is the example, not the pitch; the pitch is what a real multi-agent build looks like
when it has to ship something that actually works, not a demo.

Format: LinkedIn rewards short paragraphs and white space, not walls of text. Written that way below.

---

## Post

I spent a chunk of the last stretch building something outside of client work: a free, open-source
chess trainer. Not because the world needs another chess app - because I wanted a real, non-trivial
test of what a fleet of AI coding agents working in parallel can actually ship, end to end, when
the output has to be genuinely correct and not just plausible-looking.

The premise of the tool itself: chess lessons teach trees ("if they play X, you play Y"). Real
opponents play graphs - anything legal - and the moment someone deviates from the memorised line,
the tree runs out. So instead of teaching more lines, it plays you at a chosen strength (Stockfish
running in your own browser), tags every mistake you make with an actual reason using real board
logic, builds your practice drills from your own games instead of a generic puzzle set, and - when
an opponent leaves known theory - explains what changed in the position and which principle to
reach for, instead of going silent.

Here's the part relevant to what we do at rbuild.ai. This wasn't one model autocompleting a file.
It was multiple agents working different parts of the same codebase in parallel, all of them
accountable to the same test suite - 50 unit tests on the core logic, plus a full end-to-end suite
that drives a real headless browser and walks the whole loop: engine loads, you play a move, you
import a real game, it gets reviewed, mistakes get tagged correctly, drills get generated, the
profile persists. That test suite is what turned "an agent wrote some code" into "the code actually
does what it claims" - the same discipline that has to exist for agentic workflows to be trustworthy
in any serious engineering context, not just a side project.

The product is free and MIT licensed because I think that's the right call for a training tool, and
because the whole point of building it this way was to prove a process, not to monetize a chess app.

Live: https://ragnarpitla.github.io/chess-local-learning/
Source: https://github.com/RagnarPitla/chess-local-learning
The longer build write-up: [dev.to link]
The full engineering account, warts included (a licence gap, a flaky first test run, exact commit
hashes): docs/BUILT-WITH-AI.md in the repo.

If you're thinking about where agent-driven workflows are actually ready for production-grade work
versus where they still need a human in the loop, I'm glad to talk through what this build did and
didn't get right - genuinely, warts included.

#AI #SoftwareEngineering #OpenSource

---

## Shorter variant (if a more compact post is wanted)

Built a free, open-source chess trainer over the last stretch - not because chess needed another
app, but because I wanted a real test of what a fleet of AI coding agents can ship end to end when
the result has to actually work, gated by a real test suite (50 unit tests plus a full headless-
browser end-to-end suite), not just look plausible.

The product itself solves a real problem: chess lessons teach you a script ("if they play X, you
play Y"), and real opponents don't follow scripts. This plays you at your level, explains your
mistakes in plain chess reasons instead of just a number, builds drills from your own games, and
explains it when your opponent leaves known theory instead of going quiet.

Free, MIT licensed, runs entirely in your browser.

Live: https://ragnarpitla.github.io/chess-local-learning/
Source: https://github.com/RagnarPitla/chess-local-learning

The AI-build write-up is on the blog if you want the process, not just the pitch: [dev.to link]
