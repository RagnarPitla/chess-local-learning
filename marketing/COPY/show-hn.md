# Show HN copy

## Rules this complies with (verified 2026-08-15)

Source: https://news.ycombinator.com/showhn.html and https://news.ycombinator.com/newsguidelines.html

- "Show HN is for something you've made that other people can play with... Please make it easy for
  users to try your thing out, ideally without barriers such as signups or emails." -> the hosted
  link requires no signup, no email, no install.
- "The project must be something you've worked on personally and which you're around to discuss." ->
  plan (see CAMPAIGN.md) is to stay on the thread all day and answer everything personally.
- "Please don't ask friends to upvote or comment. That's not ok on HN." -> do not do this, ever.
- "Please don't do things to make titles stand out, like using uppercase or exclamation points, or
  saying how great an article is." -> title below is plain, no hype words.
- "If the title includes the name of the site, please take it out, because the site name will be
  displayed after the link." -> this rule is about the linked site's name (e.g. "on GitHub"), not
  about naming your own project, which is the Show HN convention; the title below names the
  project once, plainly, and does not also append "chess-local-learning.github.io" or similar.
- **"Don't post generated text or AI-edited text. HN is for conversation between humans."** ->
  IMPORTANT: the body below is a strong, fully-informed first draft written with complete product
  context. Before posting to HN specifically, read it over and rewrite it in your own words/voice.
  This is the one channel with an explicit rule against posting AI-authored or AI-edited text, and
  it is exactly the audience most likely to notice and object if the post itself reads as
  generated. Comments during the thread must also be written by you, live, not pasted.
- Don't lead with the AI-build story - see CAMPAIGN.md Section 4. It's true and it's fine to
  mention if asked, but the pitch is the tool, not the process.

---

## Title

Show HN: Ramify - a free, open-source chess trainer that runs on your own games

(Alternative, more literal to the positioning spine, if the above feels like it undersells the
mechanism:)

Show HN: An open-source chess trainer that builds your curriculum from your own games, not a script

---

## URL

https://ragnarpitla.github.io/chess-local-learning/

(Submit the live app, not the GitHub repo or a blog post about it - Show HN is for something people
can try immediately. Link the repo from within the app/README, and from the first comment.)

---

## Body text (post as the first comment, since HN Show HN posts are link + your own top comment)

I built this because every chess lesson I've ever taken teaches a tree: if they play X, you play Y.
Real opponents play graphs - anything legal - and the moment someone deviates from the line you
memorised, the tree runs out and you're left with no model of the position at all. Drilling deeper
into openings doesn't fix that, because the tree is infinite and your opponent isn't reading from
it either.

So this doesn't try to make you memorise more. It plays you at a chosen strength (Stockfish 18 via
WASM, running in a Web Worker, so nothing leaves your browser), and when you make a mistake it
doesn't just tell you the centipawn loss - it runs a static-exchange evaluation and a set of board-
logic checks and tells you the actual reason: a hanging piece, an overloaded defender, a missed
fork, a bad bishop, one of 23 named patterns. Those mistakes become your own drill set: puzzles
built from the exact positions where you went wrong, not a generic puzzle rated at your level that
has nothing to do with your habits. A weakness profile ranks what's actually costing you, blending
how expensive a mistake pattern is, how often it recurs, and how recently, and a Leitner-style
spaced-repetition schedule brings it back until it stops being a problem.

The other piece I cared about: when an opponent leaves known opening theory, most tools go quiet or
just say "out of book." This one tells you what actually changed in the position - material,
development, king safety, open files - and which of five general principles to reach for, using a
plan book layered on top of the full public lichess-org/chess-openings corpus (about 3,800 named
lines, CC0). It's deliberately conservative about when it interrupts you, so it doesn't cry wolf
every third move.

Technical notes for the "how" crowd: zero build step - the browser loads ES modules directly
through an import map, and the same modules run under `node --test` because the engine is injected
as a callback rather than imported directly, so the entire scoring/pattern/spaced-repetition
pipeline is unit tested (50 tests) without ever booting Stockfish. There's also a headless-Chrome
end-to-end suite driven over the raw DevTools Protocol with no automation framework dependency.
MIT licensed. No account, no upload - your games live in localStorage and, if you self-host, a
local data folder; nothing is sent anywhere unless you explicitly turn on an LLM coach with your
own API key or press the button to pull an extra themed puzzle from Lichess's public API.

Repo: https://github.com/RagnarPitla/chess-local-learning

Known rough edges: it's a young project, single maintainer, and there's a longer list of things I'd
still like to add (a full "browse every legal move from any position with an explanation of what
each one is for" panel is built underneath but not fully wired into the UI yet). Happy to answer
anything, including "why did you make X decision" - I'll be here all day.

---

## Anticipated questions and honest answers (prep for the thread, not for the post itself)

- **"Isn't this just a Stockfish wrapper?"** The engine is unmodified Stockfish, yes - that's not
  the claim. The pattern library, weakness profile, spaced repetition, and deviation handling are
  the actual work; happy to point to the specific files.
- **"Did you write this or did AI?"** Be straightforward if asked - this is a case where an honest,
  specific answer about the AI-assisted build process, backed by the visible test suite and open
  source code, works far better on this audience than dodging the question or leading with it
  unprompted. Point to the dev.to post for the full story rather than re-explaining it in a comment.
- **"Why not just use Lichess/Chess.com's built-in review?"** See POSITIONING.md's objection table
  for the honest, specific answer - don't disparage either product, both are good at what they do.
- **"What happens to my data?"** LocalStorage plus a local data folder if self-hosting; nothing
  transmitted unless you opt in. Say this plainly if asked; it's the actual answer.
