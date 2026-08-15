# r/chess copy

## The rule this complies with (verified 2026-08-15, primary source)

Source: https://old.reddit.com/r/chess/wiki/rules (Rule 6)

> **Rule 6 - Do not use r/chess primarily to promote your own content.** Users are expected to
> interact with the community at large, not just their own content. Limited self-promotion is
> allowed based upon Reddit's old 10-to-1 guideline. Accounts with no history of participation in
> the r/chess community will not be allowed to self-promote...
>
> **Developers of chess software may plug their work on the subreddit without adhering to the
> 10-to-1 guideline and without being an active member of r/Chess if the following conditions are
> met:**
> - The software is strictly chess-related and is of interest to the greater chess community.
> - The software is free to use.
> - The software does not include in-app purchases or micro-transactions.
> - The software does not include any betting/gambling features.
> - Re-promotion of the same piece of software may only occur after a cooldown period of 6 months,
>   and only if the software has been noticeably updated in that period.

This project meets every condition in the developer exemption: it is chess software, free to use
with no account or paywall, has no in-app purchases or micro-transactions of any kind, and has no
betting or gambling features. That means this post does not need to satisfy the general 10-to-1
active-participation guideline the way an unrelated self-promo post would. It still needs to read
like a genuine, useful post and not an advertisement - the exemption covers whether you're allowed
to post, not an excuse to write ad copy.

Also note the six-month cooldown before posting about this software again on r/chess, and only
then if there's a real update to point to. Do not post a second time "just to bump it."

Also relevant: Rule 3 (no low-quality submissions - "low effort" content is explicitly listed as
against the rules), so the post below leads with substance, not a one-line link drop.

---

## Suggested flair

"Miscellaneous" or "Software" if the subreddit's flair options include one - check current flair
list at post time, since these change.

## Title

I built a free, open-source chess trainer that turns your own games into your own lessons (no
account, runs in your browser)

## Post body

Quick context on why I built this: I kept running into the same wall as an improver. Every course
and every opening line I studied was a tree - "if they play X, you play Y" - and the second an
opponent played something slightly off the main line, I had nothing. Not "the wrong response," just
*nothing*, no model of what was actually happening in the position. I don't think that's a "study
harder" problem. It's a "the format only teaches scripts" problem.

So I built something that does the opposite of memorisation. (Ended up calling it Ramify - the
name is about branching, not memorising a single line.)

- You play Stockfish at a strength you pick (1320-2850 Elo, using Stockfish's own UCI_Elo limiter),
  running entirely in your browser via WASM. No server-side game, no account.
- When you make a mistake, it doesn't just show you a centipawn number - it runs a real static-
  exchange evaluation and a set of board-logic checks and names the actual reason: a hanging piece,
  a missed or allowed fork, an overloaded defender, a bad bishop, one of 23 named patterns.
- Those mistakes become your drill set. Not a generic puzzle rated near your level - the exact
  position from your own game where you went wrong, and you have to find what you missed the first
  time.
- A weakness profile ranks what's actually costing you across games (blends cost, frequency, and
  recency), and a Leitner-style spaced-repetition schedule brings a pattern back on a delay once
  you've started fixing it, so it stops eating your practice time.
- When an opponent leaves known theory, instead of going quiet it tells you what changed in the
  position - material, development, king safety, open files - and which general principle applies,
  using a plan book layered on the full public lichess-org/chess-openings corpus (about 3,800 named
  lines, CC0 licensed). It's deliberately conservative about when it interrupts, so it doesn't
  nag you every third move.
- You can also paste a PGN from a Lichess or Chess.com game to get the same review: accuracy,
  average centipawn loss, and every mistake explained with the better move.

It's free (MIT licensed) and there's no catch - no account, no upload, your games stay on your own
machine (localStorage, plus a local folder if you run it yourself). The only things that ever leave
your browser are opt-in: an LLM coach if you add your own API key for natural-language explanations
(there's a built-in offline coach with zero setup that works without one), and a button to pull an
extra themed puzzle from Lichess's own public puzzle API when you want more practice on a specific
pattern.

Live: https://ragnarpitla.github.io/chess-local-learning/
Source: https://github.com/RagnarPitla/chess-local-learning

It's a young, one-person project, so there's plenty I'd still like to add - I'd genuinely like
feedback, especially from anyone who's tried to fix a specific recurring habit (I have a soft spot
for "I keep hanging pieces when I get low on time" reports, since that's exactly the case this was
built for). Happy to answer questions about how any of it works.

---

## Notes for whoever posts this

- Post from an account with some existing r/chess history if possible - even though the developer
  exemption removes the participation requirement, a post from a brand-new or all-promo account
  still reads worse and is more likely to get extra mod scrutiny.
- Keep the tone in comments the same as the post: specific, not defensive, quick to say "good point,
  filed as an issue" rather than arguing.
- Do not crosspost the identical text to r/chessbeginners same-day - see reddit-chessbeginners.md,
  that subreddit's rule is materially stricter and needs its own approach.
