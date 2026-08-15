# How Ramify works

Ramify is a static site. There is no account, no server-side database, and no
game of yours ever leaves your browser unless you explicitly ask it to (for
example, pulling a game history from Chess.com or Lichess, which talks
directly to their public APIs, not to any server of ours). Everything else -
the chess engine, the pattern detection, your weakness profile, your
progress - runs and stays on your own machine.

This document is the mental model: why the product is built the way it is,
what each screen is actually computing, and where it honestly leans on a
shortcut instead of real analysis. For step-by-step instructions, see
[HOW-TO-USE.md](HOW-TO-USE.md).

## The problem: lessons teach a tree, opponents play a graph

Every opening course, every "if they play this, you play that" video, teaches
you a tree: a fixed sequence of moves with a small number of planned replies
at each branch. That works exactly as long as your opponent stays inside the
tree. A real opponent is not a tree. They can play any legal move at any
point, which means the position in front of you is really a graph - every
node connects to far more replies than any course covers - and the instant
your opponent steps off the branch you memorised, the script has nothing
left to say. You are not slightly off-book, you have no model of the
position at all.

This is not just a slogan for the marketing page. It shows up directly in
the code: the pattern library that tags your mistakes after a review
includes a pattern literally named `panic-out-of-book`, because "I had
nothing to fall back on the moment my prep ran out" is a specific, recurring,
nameable mistake, not a vague excuse.

Ramify's answer is to stop teaching lines and start showing you the branch
itself, live, from whatever position is actually on your board, and to teach
the principles that still apply once the branch runs out.

## The variation fan: what you are actually looking at

The variation panel sits next to the board on the Play tab. At any position,
it lists a curated set of replies worth knowing, not the single "book move"
a course would hand you.

Every row in the list is labelled honestly by what it actually is:

- The **main line** - the most common, best-tested continuation from this
  exact position.
- A **known alternative** or **sideline** - a real, named line from
  published opening theory, shown with its ECO code (the standard three-
  character code, such as C60, that chess databases use to classify an
  opening) and how much of recorded theory actually goes this way.
- A move **beyond recorded theory** - still completely legal, but not a
  named line. These rows carry the badge "beyond the book" (or "off book" if
  the position itself was never recorded theory to start with), plus a
  "not in the book" note in the row's detail line, so you can always tell
  the difference between "theory says this" and "nobody has written this
  down, here is why it is still reasonable."

Every row also gets a one-line "why this one" explanation: what it is
called, roughly how often it is actually played, and what the plan behind it
is - or, for a move beyond the book, which opening principle it satisfies
(fighting for the centre, getting a piece into the game, tucking the king
away) so an unnamed move never just sits there unexplained.

Two more signals sit above and inside the list itself. The count above the
rows is not just a number: the moment a short list mixes real theory with
topped-up moves, it reads as something like "7 lines - 4 theory, 3 past
book", so you know the split before reading a single row. And when the list
happens to be theory-first-then-not, with no interleaving, the panel draws a
plain divider labelled "End of theory" at the exact row where recorded
theory runs out, instead of leaving you to notice the badges have changed by
yourself. If theory and past-book rows end up mixed together, which can
happen once ranking starts favouring a topped-up move over a rarely-played
book one, the divider is left out entirely rather than drawn in a
misleading place.

![The variation panel showing a full fan of replies from a played-out
position, each row labelled with its notation, name where one exists, a
badge, and a one-line reason it made the list.](screenshots/variation-panel-closeup.png)
*The variation fan for a real position reached by actually playing moves on
the board. Each entry carries its own explanation - this is the panel doing
its actual job, not a mocked-up list.*

**The book itself is a snapshot, not a live lookup.** It is compiled once,
at build time, from Lichess's public domain (CC0) opening database and
shipped as part of the site, specifically so the feature keeps working
offline and never depends on a network call per keystroke. That also means
it is exactly as current as the last time it was rebuilt - it will not
silently include a brand-new sideline that started trending on Lichess
yesterday.

**Never empty, never thin.** If the recorded book at a given position has
fewer named continuations than the panel is supposed to show (a real
situation - some positions only have a handful of named replies), the
remaining rows are filled in from the strongest legal moves that are not in
the book, ranked by the same checks-first, captures-next, castling-next
logic a player is taught to calculate in, plus a bonus for moves that
clearly fight for the centre, develop a piece, or get the king safe. Those
topped-up rows are marked the same way as any other move beyond the book, so
the panel is always honest about what is theory and what is a reasonable
suggestion filling a gap.

### The "sharp" heuristic - and its honest limit

Some entries are flagged as sharp: sacrifices and gambits, the kind of
critical, forcing theory worth memorising precisely because playing it
wrong is expensive. Be clear about how that flag is actually computed: it is
a **name match**, not an engine judgement. If an opening's published name
contains the word "gambit" or "sacrifice", it is flagged sharp; if not, it
isn't. This is a deliberately narrow, transparent proxy, not a search of the
resulting positions for real tactical danger - a real engine-graded
"sharpness" score is a much harder problem this feature does not attempt.
It also means the flag can miss lines that are sharp in practice but not in
name, and it will not currently flag a slow-sounding "Attack" as sharp even
where one might be - see the honesty ledger at the end of this document for
the full list of places a shortcut stands in for real analysis.

## Training level: why a beginner sees 3 lines and an expert sees 9

The "Training level" selector maps directly onto how many rows the panel
shows:

| Level | Variations shown |
| --- | --- |
| Beginner | 3 |
| Intermediate | 5 |
| Advanced | 7 |
| Expert | 9 |

This is not a rough guideline, it is exact - the panel is built to return
precisely that count whenever the position has at least that many legal
moves.

The count is only half of what changes. The level also biases which moves
fill those slots:

- The main line always gets a slot, at every level - a beginner is never
  shown a panel without the actual most-played continuation in it.
- At **Beginner**, sharp (gambit/sacrifice) lines are pushed down the
  ranking, so the short list you see leans toward calm, principled options
  while the ideas are still new.
- At **Advanced** and especially **Expert**, sharp lines are pushed up the
  ranking instead, and Expert specifically guarantees that if the position
  has even one sharp, critical try available, it gets a slot rather than
  being left to chance.
- In between, the panel also tries not to waste two slots on lines that
  transpose into the same pawn structure, so a short list still covers
  distinct plans rather than near-duplicates.

![The variation panel set to Beginner, showing three replies with the
sharpest theory pushed out of the short list.](screenshots/variation-panel-beginner.png)
*Beginner: three lines, main line included, gambits and sacrifices
de-prioritised.*

![The variation panel set to Expert, showing nine replies including at
least one sharp, critical line.](screenshots/variation-panel-expert.png)
*Expert at the same kind of position: nine lines, with the critical,
sharper tries included rather than filtered out.*

## Play: sparring, hints, and the moment you are on your own

The Play tab pits you against Stockfish 18, the same open-source engine used
for the review, running in your browser via WebAssembly. Its strength is
adjustable across a wide Elo range so it can be a genuine opponent whether
you are just starting out or already fairly strong, rather than either
crushing you every game or being no test at all.

Two features worth understanding:

**The deviation alert.** When your opponent leaves known theory - and not on
the very first move that happens to be unusual, only once they have left a
reasonably established line - Ramify does not pretend to still be following
a script. It reports **what actually changed on the board**: the material
balance, how many minor pieces each side has developed, who controls more of
the four central squares, and which files have opened up. That is a
geometric read of the position, not a fresh engine search, paired with a
short, fixed checklist of the same five questions a strong player falls back
on once memory runs out (who controls the centre, whose piece is doing the
least work, are both kings safe, what does the pawn structure promise or
threaten, and where is the weakest point in the opponent's position). If a
language-model coaching key is configured on the server, that data gets
turned into natural-language commentary; if not, the same facts are written
up by a built-in offline rule-based writer, so the alert never depends on
the network to say something useful.

**The two-stage hint.** Press Hint once and you get principle-level guidance
about the position - what to be thinking about - without the engine simply
handing you a move. Press it again and it draws the engine's actual
suggested move as an arrow on the board. The first press is meant to make
you think it through yourself; the second is there for when you are
genuinely stuck.

## Review: turning a finished game into numbers you can trust

This is where two terms matter, so here they are defined once, plainly:

- **FEN** (Forsyth-Edwards Notation) is the standard short text format for a
  single chess position - one line of letters and numbers that records
  where every piece stands, whose turn it is, and castling rights. Every
  position in a reviewed game has one; it is how the engine and the app pass
  positions around internally.
- A **centipawn** is 1/100th of a pawn, the unit chess engines use to score
  a position. +100 centipawns (written +1.00) is an edge worth about one
  pawn; -300 is an edge worth about three pawns to the other side. "Loss" of
  N centipawns on a move means the position got worse for the mover by that
  much, compared to the engine's own best continuation.

The review works like this: every position in the game is searched by
Stockfish exactly once. Because the engine's evaluation of a position
already accounts for the best reply, the "loss" on the move actually played
is simply the difference between the evaluation before it and the
evaluation after it, from the mover's own point of view.

Two numbers come out of that difference:

1. **Centipawn loss**, the raw engine-score drop described above.
2. **Win probability**, a Lichess-style conversion of the centipawn score
   into an estimated chance of winning from here. This matters because raw
   centipawns behave oddly at the extremes - dropping from +900 to +600 is a
   huge centipawn swing but barely changes who is winning, while dropping
   from +50 to -50 near equality changes the outcome much more than the
   centipawn number alone suggests. Win probability is also what the
   per-move accuracy percentage you see in the summary is built from.

Every move is then classified from that combination, not from centipawns
alone: **best** (the engine's own top choice), **good**, **inaccuracy**,
**mistake**, or **blunder**. A move can be marked a mistake or a blunder
either because the centipawn loss crossed a threshold, or because the win
probability swung sharply even when the centipawn number looks tame - which
is deliberate: a 120-centipawn slip near equality is a real blunder, while
the same 120-centipawn slip inside an already-won endgame is not, and the
classifier is built to tell those apart rather than trusting the raw number
on its own.

The coach layer then explains **why**, not just how much. Every tagged
mistake is matched against a library of 23 named patterns - hanging pieces,
missed and allowed forks, pins and skewers, overloaded defenders, bad
bishops, pawn-structure issues, king safety, and opening-principle slips
including that same `panic-out-of-book` pattern - and the single most
costly recurring pattern in the game is called out by name with a plain-
English reason and a concrete thing to drill. As with the deviation alert,
this text comes from an offline, rule-based writer unless the site operator
has configured a language-model API key; the review card is labelled
"offline rules" or "language model" so you always know which one produced
the text you are reading, and the app never depends on the network to
produce a review.

![The Review tab after analysing a real game, showing the summary stats,
the coach's explanation of the costliest pattern, and the list of critical
moments.](screenshots/tab-review-1440.png)
*A finished review: accuracy and average centipawn loss at the top, the
coach's plain-English explanation of what actually cost the game, and the
worst individual moments below it, each one clickable for detail. (Shown
here on the 1858 "Opera Game," a real public-domain PGN, so the screenshot
reflects an actual analysed game rather than a mocked-up one.)*

## From a lost game to a lesson to a drill: the loop

This is the part that makes the product adaptive rather than just an
analysis board.

**Game to drills.** Every reviewed game hands its real mistakes into the
drill queue: moves that lost 100 centipawns or more are used directly; if a
game was clean enough that nothing crossed that bar, the worst few moves
that still lost at least 40 centipawns are used instead, so a good game
still produces something to practise rather than an empty queue. Each drill
is literally the exact position you had on the board, with your actual
played move as the wrong answer and the engine's real suggestion as the
solution - not a generic tactics puzzle about someone else's game.

**Drills to a weakness profile.** Every pattern that costs you points across
your games is tracked with an exponentially weighted severity score - recent
occurrences count for more than old ones, so a mistake you have genuinely
stopped making fades out of your ranking instead of haunting it forever.
Patterns are ranked by a blend of how expensive they have been, how often
they recur, and how recently they last showed up, and each one is scheduled
with Leitner-style spaced repetition: get it right and it moves to a box
reviewed further in the future (the schedule runs 0, 1, 3, 7, then 21 days
out); get it wrong and it comes back sooner. A weakness you have actually
fixed gradually stops eating your practice time; one you have not keeps
reappearing.

**Weakness profile back to lessons.** The Learn tab's default view is
literally titled "Recommended for you," and it is built directly from the
same weakness profile: the patterns that have actually cost you points in
your own games are surfaced first, each with a plain-English reason quoting
your own evidence (for example, that a specific pattern has shown up in a
certain number of reviewed games, or that drills on it are only landing some
percentage of the time so far). Before you have any tracked evidence, it
falls back to a fixed, sensible beginner path through the fundamentals
instead of showing an empty list.

The loop closes on itself: play or import a game, the engine finds what
actually went wrong, the coach names the pattern, the pattern feeds both a
drill and a lesson recommendation, and the next game you play or review
updates all of it again.

## Progress: what it will tell you, and what it will honestly refuse to

The Progress and Profile tabs report streaks, XP, a level, and per-pattern
mastery - but two things are deliberately conservative rather than
flattering.

**Mastery needs evidence, not one lucky guess.** A pattern is only ever
called better than "weak" once it has at least four combined observations
(mistakes seen in real games plus drill attempts). Solve one drill correctly
and the app will not call that pattern "mastered" off the back of it - it
will keep saying "weak" until there is enough evidence either way, and the
detail text says so explicitly rather than showing an optimistic label with
nothing behind it.

**A trend needs something to compare against.** The "Are you improving?"
section charts accuracy and average centipawn loss across your reviewed
games, oldest to newest - once there are enough of them. With only a
handful of games recorded, there is nothing earlier to compare the recent
ones to, and the app says exactly that in plain text rather than drawing a
trend line out of too little data. See
[HOW-TO-USE.md](HOW-TO-USE.md#interpreting-progress-and-profile) for what
this actually looks like on a fresh profile.

## The honesty ledger: heuristic vs real analysis, in one place

Everything below is a genuine, working shortcut, not a placeholder - but
each one is a heuristic standing in for a harder problem, and you should
know which is which:

- **"Sharp" line detection** is a case-insensitive name match for "gambit"
  or "sacrifice" in the opening's published name. It is not an engine
  judgement of how tactically dangerous a line actually is, and it will miss
  sharp lines that happen to be named something calmer.
- **The deviation alert's "what changed" text** is computed directly from
  the position on the board - material count, developed minor pieces,
  central-square control, open files - not a fresh engine search. An actual
  engine evaluation is layered on only when you ask for a hint, which does
  run a real search.
- **The opening book is a build-time snapshot** of Lichess's public domain
  ECO data, not a live lookup. It is thorough (thousands of named lines,
  tens of thousands of positions, dozens of plies deep) but it goes stale
  the moment theory moves on, until the data is rebuilt.
- **Coaching text is offline and rule-based by default.** Both the deviation
  alert and the post-game review write their explanations from a built-in
  template system driven by the same pattern library, every time, unless the
  person hosting the site has configured a language-model API key. Either
  way the app tells you which one produced the text in front of you.

None of this is a defect to be quietly fixed later without telling you - it
is the actual, considered shape of the product: cheap, transparent,
explainable heuristics wherever a full engine search would be too slow or
simply is not the right tool, and a real Stockfish search everywhere the
tool actually calls for one.
