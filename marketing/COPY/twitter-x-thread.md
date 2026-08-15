# X / Twitter copy

Format notes: numbered tweets are sized to fit the classic 280-character limit so the thread works
for any follower regardless of a Premium/long-post subscription. Post the launch thread once the
Show HN thread is live (link it instead of re-pitching from scratch - see CAMPAIGN.md Section 2).
No hashtags stuffed in - one, at most, if it fits naturally. No emoji required; the ones used below
are optional and can be deleted without losing meaning.

---

## Launch thread

**1/**
Chess lessons teach trees: if they play X, you play Y.
Real opponents play graphs: anything legal.
The moment they deviate, the tree runs out and you have no model of the position left - just a
broken script.

I built a free tool that fixes the actual problem instead of asking you to memorise more.

**2/**
Chess Local Learning plays you at a strength you pick (1320-2850), running Stockfish 18 in your
own browser via WASM. No account, no server-side game.

When you make a mistake, it doesn't just show a centipawn number. It names the actual reason.

**3/**
Under the hood: a real static-exchange evaluation plus board-logic checks tag every mistake with
one of 24 named patterns - hanging piece, overloaded defender, bad bishop, missed fork, and more.
Every blunder gets an explanation, not just a number.

**4/**
Those mistakes become your drills. Not a generic puzzle set - the exact position from your own
game where you went wrong. A weakness profile ranks what's actually costing you, and spaced
repetition (Leitner-style) brings a pattern back until it stops being a problem.

**5/**
When an opponent leaves known theory, most tools go quiet. This one tells you what changed in the
position - material, development, king safety, open files - and which principle applies, backed by
the full public lichess-org/chess-openings corpus (~3,800 named lines, CC0).

**6/**
Free. MIT licensed. No signup, no upload - your games stay on your machine. The only things that
ever leave your browser are opt-in: your own LLM key for natural-language coaching (there's a free
offline coach with zero setup either way), or pulling an extra puzzle from Lichess's public API.

**7/**
Live: https://ragnarpitla.github.io/chess-local-learning/
Source: https://github.com/RagnarPitla/chess-local-learning

On Hacker News today if you want the longer technical thread: [insert Show HN link]

Feedback genuinely wanted, especially from anyone who's felt exactly this "memorised a line, then
nothing" problem.

---

## 5 standalone posts

Each stands alone - use any time, in any order, independent of the launch thread.

### Standalone 1 - the hook, no product pitch attached

Chess lessons teach trees: if they play X, you play Y.
Opponents play graphs: anything legal.
The moment they deviate, you don't have "the wrong response" - you have no model of the position
at all. That gap is the actual problem, and it's not a memorisation problem.

### Standalone 2 - the pattern engine detail

"You lost 180 centipawns" tells you nothing. "You left the knight on d4 defended only once, so it
was just taken" tells you what to fix.
Chess Local Learning tags every mistake with one of 24 named patterns using a real static-exchange
evaluation, not a vague "engine prefers X."
Free, open source: [repo link]

### Standalone 3 - the deviation/opening feature

Most training tools go silent the moment your opponent leaves book. This one explains what actually
changed in the position (material, development, king safety, open files) and which principle
applies, using the full public lichess-org/chess-openings corpus (~3,800 named lines, CC0) layered
with hand-written plans. [link]

### Standalone 4 - privacy / local-first angle

No account. No upload. No "we value your privacy" banner, because there's nothing to value - your
games never leave your browser unless you explicitly turn on an optional LLM coach with your own
API key. Free chess training that stays on your machine: [link]

### Standalone 5 - the build story (works as its own mini-thread; run separately from the launch
### thread per CAMPAIGN.md, later in launch week, linking the dev.to post)

**5a/**
Second story about this project, separate from the chess pitch: it was designed, built, tested and
shipped by a fleet of AI coding agents working in parallel on the same repo.

**5b/**
Not "I typed a prompt and got an app." Multiple agents working different modules against a shared
test suite (50 unit tests, a headless-Chrome end-to-end suite over the raw DevTools Protocol) so
changes had to keep passing, not just look plausible.

**5c/**
Wrote up the actual process, what worked, what didn't, and where I still had to step in - on the
blog, not as a marketing claim: [dev.to link]

The product doesn't ask you to trust that story - it's MIT licensed, so read the source yourself:
[repo link]
