# Email copy

Honesty note: as of this writing, the shipped product has no email capture mechanism (no signup
form in public/index.html, no newsletter tool wired up). This copy is written and ready for whenever
one exists - a simple "notify me" form, a GitHub Discussions subscription, or a basic mailing list
tool. Do not claim an email list exists in other channel copy until one actually does. See
CAMPAIGN.md's channel table, row 10.

Voice: same as everywhere else - plain, specific, no exclamation-point energy. Emails are allowed to
be a little warmer/more personal than a Show HN post, since the reader opted in directly.

---

## Launch announcement (send once, to anyone who signed up before launch)

**Subject:** Chess Local Learning is live

Hi,

Chess Local Learning is live: https://ragnarpitla.github.io/chess-local-learning/

Quick recap of why this exists: chess lessons teach trees (if they play X, you play Y), and real
opponents play graphs (anything legal). The moment someone deviates from a memorised line, the tree
runs out and you're left with no plan. This tool plays you at a strength you choose, tags every
mistake with a real, named reason instead of a bare centipawn number, builds practice drills from
your own games, and explains what changed in the position when your opponent leaves known theory.

It's free, open source (MIT), and runs entirely in your browser - no account, no upload.

Two things worth doing on your first visit:
1. Play one game against the engine at a strength close to your own rating.
2. Click "Finish and review" and read the Critical moments list - that's the part most people find
   most useful the first time.

Source, if you want to read how any of it works or file an issue:
https://github.com/RagnarPitla/chess-local-learning

I read everything that comes in - reply to this email or open a GitHub issue with anything that's
confusing, wrong, or missing.

---

## Onboarding sequence (3 emails, for anyone who subscribes going forward)

### Email 1 - Day 0 (sent immediately on signup): the first game

**Subject:** Play your first game

The fastest way to see what this does differently: play one game.

Go to https://ragnarpitla.github.io/chess-local-learning/, pick your colour, set the opponent
strength close to your own rating (the slider runs 1320-2850), and play it out. When it ends, click
"Finish and review."

Skip straight to the Critical moments list in the Review tab. Each mistake there has a reason
attached - not "the engine prefers Nf3," but the actual pattern: a hanging piece, a missed fork, a
king left in the centre too long. That's the core idea: understanding why, not memorising what.

If nothing gets flagged because you played a clean game, good - try importing an old game instead
(paste a PGN from Lichess or Chess.com into the Review tab) and see what turns up there.

Next email in a couple of days: what to do with the mistakes it finds.

### Email 2 - Day 3: drills and the weakness profile

**Subject:** What happens to the mistakes it finds

Once you've reviewed a game or two, two more tabs start to matter.

**Drills** turns your own tagged mistakes into puzzles - the exact position where you went wrong,
not a generic puzzle rated near your level. You have to find what you missed the first time.

**Profile** tracks every pattern across every game you've reviewed and ranks what's actually costing
you - blending how expensive a mistake is, how often it shows up, and how recently. Patterns you
keep drilling successfully get spaced further apart (Leitner-style spaced repetition) automatically,
so fixed weaknesses stop eating your practice time.

The honest way to use this: review a handful of real games (your own recent ones, not games played
specifically to test the tool) before judging the weakness profile - it needs a few data points to
say anything meaningful, the same way you would.

### Email 3 - Day 7: the parts people miss, and how to help

**Subject:** The opening-deviation panel, and how to point out what's wrong

One feature that's easy to miss because it only appears when it's relevant: if you leave the
checkbox "Alert me when the opponent leaves theory" on during a game, the moment your opponent plays
something outside known theory, a panel explains what changed in the position - material,
development, king safety, open files - and which principle to reach for. It's deliberately
conservative about when it interrupts, so if you don't see it in a given game, that likely means the
game stayed in book, or the deviation happened on your move rather than the opponent's.

This is a small, one-person, open-source project (MIT licensed), and it's genuinely better with
real feedback. The most useful thing you can do if something feels off: open an issue on GitHub with
the specific position or game where it happened. https://github.com/RagnarPitla/chess-local-learning

That's the end of the onboarding sequence - no further scheduled emails unless you hear about a
specific update.
