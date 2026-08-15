# Product Definition

Chess Local Learning is a chess training app that runs Stockfish 18 in your browser, watches every
move you make (in play, in imported games, or in your whole game history), names the concrete
tactical or positional pattern behind every mistake, and turns those specific mistakes into your
personal curriculum: spaced-repetition drills, ranked weaknesses, and plain-English coaching. It
needs no account and no upload to a server to do any of this - the analysis, the pattern detection,
and the weakness profile all run on the user's own machine.

**Positioning statement:** Chess lessons teach trees - if they play X, you play Y. Opponents play
graphs - anything. The moment your opponent deviates from the line you memorised, the script breaks
and you are left with no model of the position at all. This product does not teach you lines. It
teaches the principles and pattern recognition that survive deviation, it builds your curriculum out
of your own games instead of a generic course, and at any position it shows you every variation
available with an explanation of what each one is actually for - so when memory runs out,
understanding takes over.

This is verified against the code, not aspirational copy: `public/js/patterns.js` already tags 23
distinct patterns (hanging pieces, forks, pins and skewers, overloaded defenders, bad bishops, pawn
structure, king safety, and a pattern literally named `panic-out-of-book` for the exact moment the
thesis describes), `public/js/profile.js` already runs EWMA severity scoring and Leitner spaced
repetition on top of that, and `public/js/puzzles.js` already turns a student's own blunders into
drills. All of this was confirmed working end to end by running the project's own test suite while
writing this document (50/50 unit tests, 25/25 headless-browser checks, see the Feature Inventory
below for exactly what that covers).

---

## The three jobs

The owner named three jobs. Each is served by a distinct, already-partly-shipped feature set.

### LEARN - understand principles and see every option, not one memorised line

- The pattern library (`public/js/patterns.js`): 23 named patterns with a plain-English "why" and a
  "drill" cue for each, covering tactics (forks, pins, skewers, hanging pieces, overloaded
  defenders), structure (isolated/doubled/passed pawns, bad bishops, IQP play), king safety, and
  opening principles (development, centre, early queen, moving a piece twice).
- Deviation handling (`public/js/openings.js`): the moment an opponent leaves known theory, the app
  does not say "you are now in a sideline" - it reports what actually changed (material,
  development, centre control, open files) and hands back the four-question principle checklist
  (`PRINCIPLES`) instead of a memorised reply. This is the thesis made concrete: `panic-out-of-book`
  is a real, tagged, tested pattern in the code.
- A 33-entry hand-written opening plan book today, being replaced in-flight by a full ECO variation
  tree (see Roadmap) so the "every variation available, with what it is for" promise covers the
  whole opening space, not a curated slice of it.
- A lesson curriculum (30-45 lessons across fundamentals, tactics, structure, openings and endgames)
  is being written now against the same `PATTERN_LIBRARY` ids, so a lesson and a live in-game
  mistake use the same vocabulary.

### TRAIN - drill your own weaknesses until they stop recurring

- Puzzle generation from the student's own mistakes (`public/js/puzzles.js`, `puzzlesFromGame`):
  every reviewed game hands back positions the student actually got wrong, not a generic puzzle
  set, with a fallback to themed Lichess puzzles when a game was too clean to supply enough.
- A weakness profile (`public/js/profile.js`): EWMA-weighted severity per pattern (recent mistakes
  dominate, old ones fade), ranked by cost, frequency, recency and drill resistance, with Leitner
  box scheduling (`LEITNER_INTERVALS_DAYS = [0, 1, 3, 7, 21]`) so a fixed weakness stops eating
  practice time.
- Sparring against Stockfish at a chosen strength (Elo 1320-2850, `UCI_LimitStrength`/`UCI_Elo`, see
  `public/index.html`), with a two-stage hint system (principle first, then the move).
- A progress dashboard (streaks, mastery, XP, trend lines) is in flight to make "am I actually
  getting better" answerable at a glance rather than only from the raw weakness list.

### REVIEW - understand your games and see whether you are improving

- Full Stockfish 18 WASM analysis of every position (`public/js/analysis.js`): centipawn loss, a
  Lichess-style win-probability model, per-move accuracy, and blunder/mistake/inaccuracy/good/best
  classification that also accounts for win-probability swings, not raw centipawns alone (a 120cp
  slip near equality is a blunder; the same 120cp in a won endgame is not).
- Mistake clustering by pattern, not just by size: the coach layer (`public/js/coach.js`,
  `lib/coach-prompts.js`) names the single most costly recurring pattern in a game, with a real LLM
  explanation when a provider key is configured and a full offline rule-based fallback (built from
  the same pattern library) when it is not - the app never depends on the network to explain a
  mistake.
- PGN import today is single-game paste; bulk file upload plus direct import by Lichess/Chess.com
  username into a persistent local games library is in flight.
- A weakness trend line (`trend()` in `profile.js`) already compares recent average centipawn loss
  against the previous window, so "is this working" has a real, computed answer, not a vibe.

---

## Target user

**The adult improver stuck around 800-1600 who has bounced off memorisation.** They learned the
Italian and the London from a YouTube video or a Chessable course, they can rattle off the first
eight moves, and then their opponent - who has never watched that video - plays move 4 differently
and the plan evaporates. They have tried "just do more puzzles," which helps their tactics rating
but not their opening panic or their tendency to leave a knight hanging when they are excited about
an attack. They play on Lichess or Chess.com, they have looked at their own Game Review at least
once, found it either too generic ("Suboptimal - best was Nf3") or too expensive to use on every
game, and quietly stopped looking.

**Short narrative:** Priya is 1250 on Lichess. She has bought one Chessable course (an e4
repertoire) and finished about 40% of the drills before losing momentum. Twice a week she plays a
handful of 10-minute games, loses two of them to the same pattern - a piece left hanging while she
was calculating something else three moves ahead - and has no system for noticing that this is
literally the same mistake as last Tuesday. She does not want a course. She wants something that
looks at the games she actually played and tells her, specifically, what to fix next.

**Top 5 jobs-to-be-done:**

1. When my opponent plays a move I never studied, I want to understand what changed in the
   position, so I do not freeze or fall back on a guess dressed up as a plan.
2. When I lose a game, I want to know the one thing that actually cost it, not a wall of engine
   numbers, so I know what to work on first.
3. Once I know a weakness, I want to drill that specific thing until it stops recurring, so my
   improvement compounds instead of resetting every game.
4. When I import my games from Lichess or Chess.com, I want one place that tracks my mistakes and
   my progress over time, so I can tell whether I am actually getting better, not just playing more.
5. When I sit down to study and have twenty minutes, I want the app to tell me what to study based
   on my own games, not a generic course, so I do not waste limited time on material I do not need.

---

## Feature inventory

Status is verified against the code and the project's own task tracker as of this writing, not the
aspirational description in any README draft.

| Feature | Status today | Job it serves | Free or Paid |
| --- | --- | --- | --- |
| Stockfish 18 WASM analysis (centipawn loss, win %, move classification) | Shipped | REVIEW | Free |
| Pattern detection library (23 patterns: SEE, forks, pins, skewers, overloads, bad bishops, king safety, opening principles) | Shipped | LEARN, REVIEW | Free |
| Weakness profile: EWMA severity + Leitner spaced repetition | Shipped | TRAIN | Free |
| Puzzle generation from the student's own mistakes | Shipped | TRAIN | Free |
| Themed puzzle fallback via the public Lichess puzzle API | Shipped | TRAIN | Free |
| Offline rule-based coach (works with zero network calls) | Shipped | LEARN, TRAIN, REVIEW | Free |
| LLM coach (game review, move explain, deviation, puzzle explain, lesson) when a provider key is set | Shipped (needs a key) | LEARN, TRAIN, REVIEW | Free today; the paid seam is *unlimited hosted* access - see BUSINESS.md |
| Bring-your-own-key header support in the coach API (`x-coach-key`) | Shipped server-side, no UI yet to enter a key | REVIEW | Free (lets a user avoid ever needing the paid tier) |
| Single-game PGN import (paste) | Shipped | REVIEW | Free |
| Play vs Stockfish, adjustable strength (Elo 1320-2850), two-stage hints | Shipped | TRAIN | Free |
| Deviation detection ("panic-out-of-book") against a 33-entry curated opening plan book | Shipped | LEARN | Free |
| Local profile persistence (localStorage, optional local server mirror) | Shipped | TRAIN, REVIEW | Free |
| Test coverage (50 unit tests, 25 headless-browser end-to-end checks) | Shipped, all passing (verified by running both suites while writing this doc) | quality bar, not a feature | N/A |
| Full ECO variation explorer (complete lichess-org/chess-openings tree, "every variation from here, named, with where it leads") | In flight | LEARN | Free |
| Structured lesson curriculum (30-45 lessons: fundamentals, tactics, structure, openings, endgames) | In flight | LEARN | Free |
| Bulk PGN upload + import by Lichess/Chess.com username + persistent games library | In flight | REVIEW | Free |
| Progress dashboard: mastery, streaks, XP, weakness trend over time | In flight | TRAIN, REVIEW | Free |
| Public landing page and product branding (name not yet finalised) | In flight | acquisition | N/A |
| Static hosting build, CI, and serverless coach functions for Cloudflare Pages / Vercel | In flight | distribution | N/A |
| Live "every variation from this position" panel wired into the Play tab | Planned, not yet started (depends on the explorer above) | LEARN | Free |
| Cloud sync of profile and games across devices | Planned (v2) | TRAIN, REVIEW | Paid |
| Personal opening repertoire trainer: the ECO tree filtered to the lines *you* actually reach, weighted by what you get wrong | Planned (v2) | LEARN, TRAIN | Free basic version; Paid premium version |
| Deep multi-game analysis and rollup reports (month-over-month, opponent-strength-adjusted) | Planned (v2) | REVIEW | Paid |
| Study PDF / export | Planned (v2) | REVIEW | Paid |
| Installable, responsive PWA | Planned (v2) | all | Free |
| Maia-based human-like sparring at the student's exact rating band | Planned (v3) | TRAIN | Paid |
| Coach / club seats (one dashboard, many students) | Planned (v3) | new job: teach | Paid |
| Native mobile apps | Planned (v3), contingent on the PWA proving demand first | all | Free (distribution) |

---

## Roadmap

**v1 - launch now.** Everything marked Shipped above, plus the six items already actively in flight
by the team as this document is written: the full ECO variation explorer, the 30-45 lesson
curriculum, bulk game import (file + Lichess/Chess.com username) with a persistent library, the
progress/mastery/streak dashboard, the public landing page and branding, and static hosting with CI.
Launch means: a first-time visitor can, with no signup, play or import a game, get a real reason for
their worst mistake, see it turned into a drill, and see every opening variation available from any
position they reach - end to end, offline-capable, on free hosting.

**v2 - next 3 months.** The monetisation seams (see BUSINESS.md): an entitlements module, Stripe
Checkout, signed license tokens, and usage metering, shipped ahead of turning any paid feature on.
On top of that seam: cloud sync across devices, unlimited hosted LLM coaching on a stronger model
than the offline fallback, a genuine **personal opening repertoire trainer** - not just browsing the
ECO tree, but the tree filtered and ordered by the lines the student actually reaches and the moves
they actually get wrong, which is the ECO explorer and the weakness profile combined into something
neither is alone - deep multi-game analysis rollups, study PDF export, and an installable responsive
PWA. Continued lesson-content growth past the initial 30-45, since content depth compounds the same
way it does for Chessable.

**v3 - the ambitious bets.** Maia-based human-like sparring at the student's exact rating band:
today's "Play" mode weakens Stockfish with `UCI_LimitStrength`, which plays worse but not
*human-like* - a strength-limited engine does not reproduce the specific blunder patterns a real
1200 makes, while Maia is trained directly on millions of human games at each rating band and does.
Coach/club seats: one dashboard showing several students' weakness profiles and progress, a real
second buyer (coaches, chess clubs, school programs) with a completely different budget than an
individual subscriber. Native mobile apps, sequenced after the PWA validates that people actually
want this on a phone rather than assumed up front.

---

## What we will NOT build

Scope discipline is what makes this launchable as a two-person-plus-agents project rather than a
pitch deck. Explicitly out of scope:

- **No in-house chess engine.** Stockfish is already free, open source, and the strongest engine
  that exists. There is no version of "build our own engine" that is a good use of time.
- **No live human-vs-human matchmaking, ladders, or a social/friends graph.** That is Lichess's and
  Chess.com's entire business. This product plays a bot so you can train; it does not try to become
  a place people go to play each other.
- **No tournament hosting or broadcast tooling.**
- **No attempt to out-scale Lichess's opening or master-game database.** Lichess has billions of
  games. The ECO explorer here wins on explanation and personalisation - what each variation is for,
  and which ones matter to *you* - not on raw data volume.
- **No video-course marketplace and no stable of paid instructor-authored courses.** That is
  Chessable's model and its moat (real GM authors, real production cost). This product's edge is
  curriculum generated from the student's own games, not licensed video content.
- **No forced account creation to use the free tier, ever.** The moment "you must sign up to play"
  appears, the local-first privacy pitch is gone and so is the reason to pick this over Chess.com.
- **No ad-supported free tier.** Ads would contradict "your games never leave your machine, we make
  money from people who want more, not from your attention" - and this audience notices and dislikes
  ads more than most.
- **No cryptocurrency, NFTs, or gamified-token gimmicks.**
- **No full learning-management/school-administration system.** A simple coach/club dashboard is a
  v3 bet; attendance tracking, billing-for-schools, and grading are a different product entirely and
  are not a commitment here.
- **No native mobile app before the responsive web PWA has proven people actually want mobile.**
  Sequence this; do not build it speculatively.
