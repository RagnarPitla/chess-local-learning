# YouTube copy

## Title

Ramify: a free, open-source trainer that turns your own games into your own lessons

(Under 100 characters, no clickbait framing, names the product and the mechanism.)

Alternate: Why chess lessons don't transfer (and a free tool that tries to fix it)

## Description

Chess lessons teach trees: if they play X, you play Y. Real opponents play graphs - anything legal
- and the moment they deviate, the tree runs out and you're left with no plan. This is a walkthrough
of a free, open-source chess trainer built around that specific problem.

What it does:
- Plays you at a chosen strength (Stockfish 18, 1320-2850 Elo, running entirely in your browser)
- Tags every mistake with a real, named reason (hanging piece, missed fork, bad bishop, and more -
  23 patterns total) using a static-exchange evaluation, not just an engine score
- Builds your practice drills from your own games, ranked by a weakness profile that tracks what's
  actually costing you over time
- Explains it, with actual position facts and principles, when your opponent leaves known theory
- Paste in a PGN from Lichess or Chess.com to review any game the same way

It's free, MIT licensed, and runs entirely in your browser - no account, no upload. Your games never
leave your machine.

Live: https://ragnarpitla.github.io/chess-local-learning/
Source: https://github.com/RagnarPitla/chess-local-learning

Timestamps in the pinned comment / description (see below).

00:00 The actual problem: trees vs. graphs
00:35 Starting a game against Stockfish at a chosen strength
01:10 A mistake gets tagged with a real reason, not just a number
01:55 Reviewing a full game: accuracy, mistakes, better moves
02:40 Drills built from your own games
03:20 The weakness profile and spaced repetition
03:55 What happens when your opponent leaves theory
04:30 Free, open source, local-first - and where to find it

## Tags

chess, chess training, chess improvement, learn chess, chess opening theory, chess tactics, chess
puzzles, stockfish, open source, free chess tool, chess coach, chess analysis, chess engine, chess
patterns, spaced repetition, chess study, chess for beginners, chess app, browser chess, local first
software

## Thumbnail concept

Monochrome, matches the app's brand (white background, near-black ink, no color accents, no
photography). Two options, both buildable as inline SVG at 1280x720 for YouTube's required size:

**Option A - the trees vs. graphs diagram.** Left half: a clean branching tree of 3-4 nodes labeled
with short move notation, rendered in thin black strokes on white. Right half: the same start node
fanning out into a dense, tangled mesh of connections (a "graph"), same monochrome style. A single
bold line of text beneath: "Trees vs. graphs." This is the single most legible, most on-brand
thumbnail concept and should be the default choice.

**Option B - a single low-poly knight silhouette** (matching the faceted monochrome piece style
used elsewhere - see public/assets/pieces/ once available) on a plain white field with the text
"Your games. Your lessons." beneath it in the system sans-serif stack, bold weight.

Do not use engine evaluation bars, chess.com/Lichess board skins, or any copyrighted board/piece
artwork in the thumbnail - build it from the same hand-authored monochrome shapes as the rest of
the marketing assets (see marketing/ASSETS/).

## Full script (target 3:30-4:30 runtime)

Tone: same as the rest of the campaign - plain, technical, no hype. Spoken to camera or as voiceover
over screen capture; either works. "On screen" describes what the viewer sees; capture these from
the actual running app, not mockups.

---

**[00:00-00:35] Cold open - the problem**

*On screen: a plain white slide/title card, system font, the app's tagline in large text:
"Chess lessons teach trees. Opponents play graphs." Then cut to a real board position mid-game.*

> "Every chess lesson I've ever taken teaches a tree. If they play this, you play that. The problem
> is real opponents don't read the script - they play anything legal, and the moment they deviate,
> the tree runs out. You don't have 'the wrong response' at that point. You have no model of the
> position at all. This is a free, open-source tool I built to actually fix that, not to make you
> memorise more."

**[00:35-01:10] Starting a game**

*On screen: the Play tab. Select colour (White), drag the Elo slider to show the 1320-2850 range,
click Start game. First few moves play out on the board with the evaluation bar visibly updating.*

> "You play Stockfish at whatever strength you pick - anywhere from 1320 to 2850. It's running
> entirely in your browser through WebAssembly, so there's no account and no server-side game."

**[01:10-01:55] A mistake gets tagged**

*On screen: play (or fast-forward to) a move that hangs a piece or misses a tactic. Click Finish
and review, or show the in-game hint card if that's the cleaner demo path. Zoom on the explanation
text that names the specific pattern.*

> "When you make a mistake, it doesn't just show you a centipawn number. It runs a real static-
> exchange evaluation - the same math engines use to judge whether a piece is actually safe - plus
> a set of board-logic checks, and it names the reason. Hanging piece. Missed fork. Overloaded
> defender. Bad bishop. Twenty-four named patterns in total."

**[01:55-02:40] Reviewing a full game**

*On screen: switch to the Review tab, paste a sample PGN (or use the just-played game), click
Analyse this game, let the progress bar complete, then show the Summary stats block and the
Critical moments list with a tagged mistake expanded.*

> "You can review any finished game this way, including one you pasted in from Lichess or
> Chess.com. You get accuracy, average centipawn loss, and every real mistake explained with the
> reason and the better move."

**[02:40-03:20] Drills from your own games**

*On screen: switch to the Drills tab. Show a drill card with its origin line visible ("From your
game, move N...") and solve it or reveal the solution.*

> "Here's the part that's actually different from a puzzle app. These aren't generic puzzles rated
> near your level - they're built from the exact positions in your own games where you went wrong.
> You have to find, at your own pace, what you missed the first time."

**[03:20-03:55] Weakness profile and spaced repetition**

*On screen: switch to the Profile tab. Show the ranked weakness list and the ACPL sparkline/trend.*

> "Every mistake feeds a weakness profile that ranks what's actually costing you - not just what
> happened most, but what's expensive and recent. And it schedules drills back to you on a delay,
> so once you've started fixing something, it stops eating your practice time."

**[03:55-04:30] Deviation handling and close**

*On screen: trigger or show a recorded "Out of theory" card appearing after an opponent deviates
from a known line, with the explanation text visible. Then cut back to a plain white end card with
the two URLs.*

> "And when your opponent leaves known opening theory, instead of going quiet, it tells you what
> actually changed in the position - material, development, king safety, open files - and which
> principle to lean on. It's free, it's open source under MIT, and it runs entirely on your machine.
> Link's in the description if you want to try it or read the code."

*End card: https://ragnarpitla.github.io/chess-local-learning/ and
https://github.com/RagnarPitla/chess-local-learning, plain black text on white, system font.*
