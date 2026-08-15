# How to use Ramify

A practical, step-by-step guide to the app. For the reasoning behind what
you are looking at on each screen, see [HOW-IT-WORKS.md](HOW-IT-WORKS.md).

Ramify needs no install and no account. Open the link, and you are using it.
Nothing about your games or your progress leaves your browser unless you
explicitly pull a game history from Chess.com or Lichess, in which case your
browser talks directly to their public API - never to a server of ours.

## Before you start

Open the live site. The address you land on is the marketing landing page,
which explains the product and links through to the trainer itself.

![The Ramify landing page, describing the product and linking through to
the app.](screenshots/landing-1440.png)
*The landing page: the pitch, then a clear way in - "Open Ramify, it's
free."*

Click through to the app (or go straight to the `/app/` address if you
already have it) and you land on the trainer, with the Play tab open by
default and the board in the middle.

## Your first session, step by step

**1. Get past the welcome tour.** The first time you open the app, a short
three-step overlay walks through importing a game, playing one directly, and
seeing your first review. Read it or skip it with the Skip button - either
way it only shows once per browser.

**2. Start a game.** On the Play tab, choose which colour you want to play,
set the opponent's strength with the slider (a wide range from a beatable
starter opponent up to a strong Stockfish, so pick something that will
actually test you without wrecking your confidence every game), and press
"Start game." Leave "Alert me when the opponent leaves theory" checked - it
is the deviation feature described in HOW-IT-WORKS.md and it is worth having
on while you are learning to read positions for yourself.

**3. Play, and watch the panel beside the board.** Every move you or the
engine makes updates the variation panel live: what this position is
called (if it has a name), how many replies are worth knowing at your
current Training level, and a one-line reason for each. If you are unsure
what to play, use the level selector to see more or fewer options, or check
"Show every legal move" to see literally everything.

![The Play tab mid-game: the board, the opponent controls, and the live
variation panel.](screenshots/tab-play-1440.png)
*The Play tab a few moves into a real game (1. e4 d6 2. Nf3 c5 here): the
live evaluation bar beside the board, "Finish and review" now active, and
the variation panel already reading the new position - note the "off book"
badge, since this exact move order has stepped outside recorded theory.*

**4. Ask for a hint if you get stuck.** Press Hint once for a nudge about
what to think about; press it again and the engine's own suggested move is
drawn as an arrow on the board.

**5. Finish and review.** When the game ends (or once you have played
enough of it to want feedback), press "Finish and review." This takes you
to the Review tab with the game already loaded, ready to analyse.

## Importing your games

You do not have to play inside the app to use it - most of the value comes
from reviewing games you already played elsewhere. There are two different
ways in, for two different purposes.

**Quick, one-off review (Review tab).** If you just want to review a single
game right now without saving it anywhere, go to the Review tab, paste the
PGN (the standard plain-text move-list format any chess site can export)
into the "Import a game" box, choose which colour you played, and press
"Load PGN." This does not add the game to your library - it is a one-time
load for analysis.

**Your whole history, kept (Library tab).** If you want your games kept and
counted toward your weakness profile over time, use the Library tab:

- **Drop a file.** Drag a `.pgn` export from Lichess, Chess.com, or anywhere
  else onto the drop zone, or choose the file manually. A single file can
  contain many games at once and they are all imported together.
- **Pull from Chess.com.** Switch the source toggle to Chess.com, type a
  Chess.com username, choose how many months of history to pull, and import.
  This calls Chess.com's own public API directly from your browser.
- **Pull from Lichess.** Same idea, with a Lichess username and a maximum
  number of games instead of a month count.

If a network pull fails (a rate limit, or the API being unreachable from
your connection), the app tells you plainly and points you at downloading
your own export file and dropping it in instead, rather than failing
silently.

Every game imported into the Library stays in your browser's own storage
(specifically IndexedDB, which comfortably holds a large history, unlike
the much smaller localStorage most sites use). From the Library list you can
open any saved game and send it to the reviewer, which is what actually
feeds your weakness profile, drills, and progress.

![The Library tab with the import controls and a list of saved
games.](screenshots/tab-library-1440.png)
*The Library tab: pull a whole history from Chess.com or Lichess, or drop a
PGN file, and everything lands in a list you can send to the reviewer.
(The two games shown here are historical PGNs used only to populate the
screenshot with real data - Legall's 1750 mate and the 1851 "Immortal
Game" - not sample content built into the app.)*

## Reading a review

Once a game is loaded (played, pasted, or opened from the Library), go to
the Review tab and pick an analysis depth: Fast is a quick estimate, deep
enough for a rough pass; Balanced is the sensible default; Deep takes longer
per move but is worth it for a game you actually want to study closely,
especially a sharp or tactical one. Press "Analyse this game."

What comes back:

- **Summary stats**: your accuracy percentage for the game and your average
  centipawn loss per move (see HOW-IT-WORKS.md if "centipawn" is new to
  you - in short, it is the engine's scoring unit, and a lower average loss
  means you played closer to the engine's own best moves), plus counts of
  how many of your moves were blunders, mistakes, and inaccuracies.
- **Coach**: a plain-English explanation of the single pattern that cost you
  the most in this game, with a suggestion for what to drill. The chip next
  to "Coach" tells you whether that text came from the built-in offline
  writer or, if the site has one configured, a language model - either way
  it is meant to be read as "what actually went wrong," not raw engine
  numbers.
- **Critical moments**: a clickable list of your costliest individual moves.
  Click one and you get the position before the move, what you played,
  what the engine preferred instead, and why it matters.

![The Review tab showing a completed analysis: summary stats, the coach's
explanation, and a list of critical moments to click
through.](screenshots/tab-review-1440.png)
*A completed review. Start with the summary for the big picture, read the
coach card for the one thing to focus on, then work through the critical
moments list for the specifics. (The game shown is the 1858 "Opera Game" -
used here only because it is a real, public-domain PGN with real mistakes
to find, not one of the app's own examples.)*

## Using Drills

Go to the Drills tab after you have reviewed at least one game. Every
review hands its real mistakes into a drill queue, ordered by what is
actually costing you the most right now (your heaviest tracked weaknesses,
and anything due for spaced review, come first).

Each drill puts you back in the exact position from one of your own games,
tells you what went wrong there, and asks you to find the correct move.
Use "Show solution" if you are stuck - it reveals the engine's actual
suggestion and its line - and "Next drill" to move on. If you run out of
your own mistakes to drill (a good problem to have), the "Extra practice"
card can fetch a themed puzzle from the public Lichess puzzle API matched
to your current weakest pattern, so you are never left with nothing to do.

![The Drills tab presenting a puzzle taken from one of the user's own
games.](screenshots/tab-drills-1440.png)
*A drill: the actual position from a real game, with the real mistake
behind it, waiting to be solved again correctly.*

## The Learn tab: lessons ranked to you

Learn opens by default on "Recommended for you" - lessons chosen and
ordered directly from your own weakness profile, each with a plain-English
reason drawn from your actual games (for example, that a pattern has shown
up in a certain number of your reviewed games, or how often you are
currently landing drills on it). Before you have reviewed any games, this
view instead gives you a sensible fixed path through the fundamentals, so
it is never empty.

Use the Track selector to browse a specific area instead - fundamentals,
tactics, positional play, opening families, or endgames - or choose "All
lessons" to see the whole curriculum in order.

Open any lesson and you get the idea in plain language, then a short series
of real positions to actually play through: read the prompt, make your
move, use "Show the answer" if needed, and "Next position" to continue.
Common pitfalls for the idea are listed below the exercises, and finished
lessons suggest where to go next.

![The Learn tab with a lesson open, showing the idea, a position to solve,
and the answer/next controls.](screenshots/tab-learn-1440.png)
*A lesson in progress: the idea stated plainly, then a real position to
apply it to, not just a diagram to memorise.*

## Interpreting Progress and Profile

The **Progress** tab is the "am I actually getting better, and at what"
view. At the top, a "Do this next" card recommends a specific action - drill
a weakness, open a lesson, or just go play - with a stated reason. Below
that are streak, best streak, days active in the last 30, level, and XP:
useful for keeping up a habit, but bookkeeping, not a skill measurement.
Further down, each tracked pattern is shown at a mastery level - unseen,
weak, improving, solid, or mastered - and the app is deliberately
conservative here: it will not call anything better than "weak" until it
has at least a handful of real observations behind it, so one lucky solve
does not get labelled "mastered."

The same tab charts accuracy and average centipawn loss across your
reviewed games, oldest to newest, under "Are you improving?" **This is
the part to read honestly rather than skim past:** with only a handful of
games recorded, there is nothing earlier for the app to compare the recent
ones against, and it says exactly that in plain text instead of drawing a
trend line out of too little data. A real trend only appears once there is
enough history for one to mean anything - that is a deliberate choice, not
a bug, and it is worth checking back on this tab again once you have
reviewed more games rather than trusting an early, thin read of it.

![The Progress tab, showing the recommended next action, streak and XP
summary, mastery breakdown, and the improvement
charts.](screenshots/tab-progress-1440.png)
*Progress: a recommended next step, habit-tracking numbers, per-pattern
mastery, and an honest trend section that says so plainly when there is not
yet enough history to chart.*

The **Profile** tab is the aggregate view: the same trend chart, your full
weakness list ranked by cost, frequency and recency, and, at the bottom,
buttons to export or reset your profile. Since nothing is stored on any
server, exporting is the only backup you have if you want to move your
history to another browser or machine, or simply keep a copy - it is worth
doing occasionally if you care about the history you are building.

![The Profile tab, showing the trend summary and the ranked weakness
list.](screenshots/tab-profile-1440.png)
*Profile: the aggregate view of the same evidence, plus the export/reset
controls that are your only way to back up or clear your local
history.*

## A few practical notes

- Everything is kept in your browser's own storage. Clearing your
  browser's site data for this address clears your history along with it -
  use "Export profile" first if you want a copy.
- After the first load, the app works fully offline. The only features that
  need a live connection are pulling a game history from Chess.com or
  Lichess, fetching an extra themed puzzle, and (only if the site operator
  has configured one) natural-language coaching - everything else, Stockfish
  included, runs locally in your browser.
- The app also works on a phone-sized screen, though it is happiest on a
  larger one for actually reading the board and the panels side by side.

![The landing page rendered at a mobile screen size, stacked into a single
column.](screenshots/landing-375.png)
*The landing page on a phone-sized viewport - the same pitch, stacked into
one column instead of a side-by-side layout.*

![The trainer's Play tab rendered at a mobile screen size, board on top and
controls stacked below.](screenshots/app-375.png)
*The app on a phone-sized viewport - usable, but a larger screen makes it
easier to read the board and the panel at the same time.*
