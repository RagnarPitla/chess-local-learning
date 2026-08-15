# Product Hunt copy

## Product name (the required "Name" field on the submission form)

Ramify

## Tagline (60 characters max - Product Hunt enforces this)

Primary (53 chars):
> Turn your own chess games into your own lessons, free

Alternates, all under 60 characters:
> A free chess trainer built from your own mistakes (51 chars)
> Chess coaching that runs on your own games, not a script (58 chars)
> Free, open-source chess trainer - no signup, no upload (56 chars)

## Description

Chess lessons teach trees: if they play X, you play Y. Real opponents play graphs - anything legal
- and the moment they deviate, the tree runs out and you're left with no plan.

Ramify plays you at a strength you pick (Stockfish 18, running in your own browser),
tags every mistake with a real, named reason instead of just a centipawn number (hanging piece,
missed fork, bad bishop, one of 23 patterns backed by an actual static-exchange evaluation), and
turns your own blunders into a personal, spaced-repetition drill set. When your opponent leaves
known opening theory, it explains what changed in the position and which principle applies, instead
of going quiet.

Free. Open source (MIT). No account, no upload - your games never leave your browser unless you
choose to add your own LLM key for richer coaching, or tap the button for an extra themed puzzle
from Lichess's public API.

## First comment (post immediately after launch, from the maker account)

Hi everyone - maker here.

I built this because I kept hitting the same wall as an adult improver: every course and opening
line I studied was a script, and the moment an opponent deviated from it even slightly, I had
nothing left to fall back on. Not "the wrong move" - no model of the position at all. That felt
like a format problem, not a "study harder" problem, so I built something that trains the thing
that actually transfers: recognizing patterns and understanding why a move is good, using your own
games as the material instead of somebody else's curriculum.

A few specifics people tend to ask about first:

- **The engine is real Stockfish**, adjustable from 1320 to 2850 using its own UCI_Elo limiter, run
  entirely client-side via WASM in a Web Worker.
- **The tactics detector is not "the engine disagrees."** It runs a static-exchange evaluation (the
  same primitive engines use to judge whether a capture sequence on a square is safe) plus board-
  logic checks for forks, pins, overloaded defenders, pawn structure, and king safety, so a mistake
  gets a real name and a real reason.
- **Drills come from your own games.** The Drills tab builds puzzles directly from the positions
  where you actually went wrong, ranked by a weakness profile that blends cost, frequency, and
  recency, with Leitner-style spaced repetition so fixed weaknesses stop eating practice time.
- **It's free because I think chess training should be**, and because it's open source (MIT) - if
  you want to check exactly how "accuracy" or "mistake" is computed instead of trusting a black box,
  the logic is a short, readable file.

One honest note on the build process, since it tends to come up: this was built with heavy use of
AI coding agents working in parallel on the same repo, gated the whole way by a real test suite (50
unit tests plus a headless-browser end-to-end suite). Wrote up the actual process on the blog if
you're curious: [dev.to link]. Happy to answer anything - both about the chess side and the build
side.

## Gallery shot list

Capture these from the actual running app (https://ragnarpitla.github.io/chess-local-learning/ or
a local `npm start`) once the UI is in its shipped state - these are real UI elements confirmed in
the current build, not mockups:

1. **Play tab, mid-game.** Board with a couple of moves played, the evaluation bar visibly non-
   neutral, the Elo slider showing a chosen strength, and the move list populated. Shows the core
   "play Stockfish at your level" loop.
2. **The "Out of theory" card.** Trigger a real deviation (have Stockfish, or a pasted PGN, leave a
   known line) so the deviation-card / "Out of theory" panel is visible with its explanation text.
   This is the single most differentiating screen - prioritize getting this one right.
3. **Review tab after analysing a game.** The summary stats block (accuracy, ACPL, counts) plus the
   Critical moments list showing at least one tagged mistake with its explanation and the better
   move.
4. **Drills tab, live drill.** A drill card showing the pattern chip, the prompt, and the "from your
   game, move N" origin line - make sure the origin text is legible, it's the proof this isn't a
   generic puzzle.
5. **Profile tab.** The weakness list with ranked patterns, and the ACPL sparkline/trend stats
   visible underneath - shows the "this adapts to me over time" claim concretely.
6. (Optional, if the coach pill area looks clean) A close crop on the header pills showing
   `engine: stockfish 18` and `coach: offline rules` (or `coach: llm` if a key is configured for the
   screenshot session) - a small, honest detail that shows the offline-first design.

Do not stage or fabricate any of these - every shot should be a real screenshot of the app actually
doing the thing described. If item 2 (the deviation card) is not yet reliably reproducible at
screenshot time, drop it from the gallery rather than simulating it.
