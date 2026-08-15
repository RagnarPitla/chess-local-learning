# Launch Plan

Written the same day the repository went public (2026-08-15), with 0 stars and a handful of
in-flight features still landing. Treat everything below as a plan for the next few weeks, not a
retrospective - re-check the "in flight" dependencies before executing any item that needs them.

## Pre-launch checklist

| Item | Owner | Rough effort | Depends on |
| --- | --- | --- | --- |
| Final product name + domain purchase | Ragnar / landing-brand work | S (name decision ~30 min deliberate exercise per BUSINESS.md's trademark note; domain purchase ~15 min, ~$10-15/yr for a .dev/.app, more for a taken .com) | Nothing blocking; do this first, everything else references the name |
| Finish static hosting build + CI (GitHub Actions, Cloudflare Pages / Vercel deploy) | static-deploy work (in flight) | M | Nothing; this is already underway |
| Pick the primary hosting target and confirm its commercial-use terms | Ragnar | S | See BUSINESS.md - Cloudflare Pages' free tier allows commercial use; Vercel's own docs state the Hobby tier "restricts users to non-commercial, personal use only," which matters the moment Stripe goes live, not at free launch |
| Cookie-free analytics (Plausible / Fathom / GoatCounter / Cloudflare Web Analytics) | landing-brand or docs-publish work | S (a few hours) | Domain decided |
| Lightweight error tracking (client `window.onerror` + `unhandledrejection` counts, anonymised) | docs-publish or a small follow-up task | S-M | Nothing blocking |
| Feedback path | Ragnar | S | GitHub Issues already exists and is the right default for an OSS repo; also add one visible in-app link ("Found a bug or have an idea? -> GitHub Issues") once ui-integration lands |
| README rewrite + real screenshots | docs-publish work (in flight, pending) | S-M | Needs the variation panel (ui-integration, currently pending) wired in before a screenshot is representative of the real product |
| Demo GIF of the core loop (play/import -> review -> tagged mistake -> drill -> profile updates) | Ragnar, reusing the scripts/smoke.mjs CDP screenshot technique | S | README screenshots |
| First-time-visitor onboarding | landing-brand work (`shouldShowOnboarding` / `mountOnboarding`, in flight) | M | ui-integration |
| Seed content complete enough to demo honestly | lessons-module work (in flight) | depends on lessons-module finishing at least the FUNDAMENTALS track | Nothing blocking, already underway |
| Confirm GitHub's license detector shows MIT cleanly | Ragnar | trivial | Nothing; low priority, purely cosmetic (`gh repo view` currently reports "Other" for license despite a standard MIT `LICENSE` file - likely just detection lag on a brand-new public repo, worth a 2-minute check before launch day, not a blocker) |

Do not launch publicly before **ui-integration** lands (the live variation panel and the Learn,
Library, and Progress tabs). Right now those backend modules exist as pieces (or are being built)
but are not wired into the UI a visitor actually sees - launching before that means showing off
features nobody can find.

## Launch channels, ranked by expected return

1. **Your own network first, quietly.** Before any public post, run the "first 10 users" plan
   below. A broken first impression on Reddit or Hacker News is very hard to undo; a broken first
   impression with five people you know is just a bug you fix before anyone else sees it.
2. **r/chess and r/chessbeginners.** The right audience exists here in volume, but both subreddits
   restrict self-promotion - r/chessbeginners generally expects you to be an established, active
   community member and often wants tool posts framed as "I made this, here's what I learned"
   rather than an announcement, and r/chess routes pure self-promotion toward specific threads or
   requires enough account history/karma to post at all. Participate genuinely first (answer a few
   "how do I get better" threads honestly, without linking your own tool), check each subreddit's
   current pinned rules before posting, and when you do post, frame it as solving your own problem,
   not marketing.
3. **The Lichess forum and Discord.** A strongly aligned audience - the same people this product is
   built for - and an extra reason to belong here: the ECO explorer and puzzle fallback are built
   directly on Lichess's own open data and API, which is worth stating plainly and gratefully, not
   just in small print. The same self-promotion caution applies; use the general/off-topic or
   projects channel, not a hard pitch, and expect (correctly) that low-effort promotion gets removed.
4. **Hacker News, Show HN.** A strong fit for the engineering story even among people who do not
   play chess: local-first, MIT, zero build step, Stockfish compiled to WASM running client-side,
   an offline-first LLM fallback. HN's own norms require the poster to be the actual builder, a
   fast-loading working link, and real engagement in the comments with zero marketing language.
   Post on a US weekday morning for the best shot at visibility, and expect the honest, most likely
   outcome to be modest traffic rather than the front page - that is normal, not a failure.
5. **Product Hunt.** Reasonable fit, weaker overlap with the specific ICP than Reddit or the Lichess
   community. Needs a "hunter," a gallery of real screenshots and the demo GIF, a maker comment on
   launch day, and by convention a midnight-Pacific Sunday/Monday launch slot.
6. **Chess YouTube and streamers.** The highest-variance channel - a single mid-tier chess
   improvement YouTuber mentioning a free, open-source tool can outproduce every other channel on
   this list combined, but it cannot be scheduled or guaranteed. The honest approach: a short,
   specific, no-strings email or DM to a handful of *mid-tier* improvement-focused creators (not
   only the biggest names, who get pitched constantly), offering full editorial control and asking
   for nothing in return but their honest opinion.
7. **GitHub trending and awesome-chess lists.** Slow and passive, but durable, high-quality traffic
   with no risk of looking promotional. Submit the project to the relevant curated "awesome-chess" /
   open-source-chess-tools lists via a normal PR, and make sure the repository's own topics (already
   reasonably well set) and README keep working in GitHub's own search and trending surfaces.

## Launch copy, ready to paste

The name "Chess Local Learning" is the current, verified repository and package name; branding work
choosing a final public-facing name is still in flight as this is written. If the name changes
before launch, find-and-replace it below - the substance does not depend on the name.

### Show HN (Hacker News)

**Title:**

```
Show HN: Chess Local Learning - Stockfish in your browser, your own games as your curriculum
```

**Body:**

```
I built a chess trainer that runs entirely in the browser: Stockfish 18 compiled to WASM analyses
every move, a pattern detector (static exchange evaluation, forks, pins, skewers, overloaded
defenders, pawn structure, king safety) works out *why* a move was a mistake instead of just
reporting a centipawn number, and a weakness profile with Leitner spaced repetition turns your own
blunders into drills. No signup, no upload - your games never leave your machine unless you
explicitly add your own LLM key for natural-language coaching, and even then it falls back to a
full offline rule-based coach built on the same pattern library.

The problem I kept hitting: chess lessons and courses teach you a tree (if they play X, you play
Y), but real opponents play a graph - anything. The moment someone deviates from a memorised line,
the plan breaks and you're guessing. So instead of teaching lines, this tries to teach the
principles that survive deviation, and generates the curriculum from your own games rather than a
generic course.

It's MIT licensed, zero build step (the server maps node_modules straight into an import map, no
bundler), and has 50 unit tests plus 25 headless-Chrome end-to-end tests, all passing. A full ECO
opening explorer, a 30-45 lesson curriculum, bulk import from Lichess/Chess.com, and a progress
dashboard are actively being built right now - the core review/pattern/drill loop works today, some
of the surrounding polish is still landing.

Feedback, especially from people currently stuck in the 800-1600 range who have bounced off
memorising openings, would genuinely help. Repo: https://github.com/RagnarPitla/chess-local-learning
```

### Reddit (r/chess or r/chessbeginners - adapt tone to whichever's current rules)

**Title:**

```
I kept losing to the same mistake over and over, so I built a free tool that finds the pattern in
your own games and drills it
```

**Body:**

```
Quick context: I'm not a strong player, I got tired of chess lessons that teach "if they play this,
you play that" because real opponents never stick to the line I memorised. So I built something
that looks at my own games instead.

It runs Stockfish in the browser (nothing uploaded anywhere), tags every mistake with an actual
reason - hanging piece, missed fork, overloaded defender, bad bishop, that kind of thing - not just
"inaccuracy, -0.8." Then it builds drills out of your own blunders and tracks which patterns keep
costing you games over time, with spaced repetition so the ones you've fixed stop showing up.

It's free, open source (MIT), no account needed, and works offline once loaded. Still actively
building out a full opening explorer and a structured lesson set, so some parts are rougher than
others right now, but the core "play or paste a PGN -> get told what actually went wrong -> drill
it" loop works today.

Would love brutally honest feedback, especially from anyone in the 800-1600 range - that's exactly
who I built this for. Link: https://github.com/RagnarPitla/chess-local-learning
```

### X / LinkedIn (short)

```
Chess lessons teach trees: if they play X, you play Y.
Opponents play graphs: anything.

The moment they deviate, the script breaks and you're guessing.

I built a free, open-source trainer that teaches the principles that survive deviation instead -
and builds your curriculum from your own games, not a course.

Stockfish in your browser. Nothing uploaded. MIT licensed.
https://github.com/RagnarPitla/chess-local-learning
```

## Success metrics

Numbers below are realistic ranges for a free, niche, self-serve open-source tool starting from
zero (0 GitHub stars, 0 visitors, as of 2026-08-15), not targets to hit at all costs. A single lucky
Hacker News front page or a mid-tier YouTuber mention could beat the high end of any of these by an
order of magnitude; a quiet launch could land under the low end, and that alone would not mean the
product is wrong.

**Week 1:** 50-150 unique visitors from the direct launch push (a genuinely front-page HN or Reddit
hit would spike well past this for 24-48 hours, but the modal first-time outcome is more modest);
10-30 people who actually play or import a game; 3-10 GitHub stars; 0-2 pieces of direct, unprompted
feedback (an issue, a comment, a DM).

**Month 1:** 300-1,000 cumulative unique visitors; 50-150 people who reach the "activated" moment
(finished at least one reviewed game); 20-50 GitHub stars; 5-15 structured feedback responses from
the deliberate first-10-users outreach below; maybe 1-3 organic, unprompted mentions elsewhere. No
paid tier should be expected to exist yet at this point per the roadmap in BUSINESS.md, so $0 revenue
here is normal, not a warning sign.

**Month 3:** 1,000-4,000 cumulative unique visitors; 150-400 activated users; 60-150 GitHub stars; a
measurable weekly-return rate among activated users (target simply having a real number, 10-20%
would be a reasonable early signal, not a benchmark this space has established norms for yet). If
the monetisation seams from BUSINESS.md have shipped by this point, a realistic - not hopeful -
expectation is 5-25 paying subscribers and roughly $20-150 MRR. Frame month 3 honestly as "a
validated hobby project with early paying signal," not a business yet; real conclusions about
revenue need 6-12 months of data, not 3.

## First 10 users plan

**Where to find them:** places adult improvers already self-identify as stuck and looking for help -
"what should I study" threads in r/chessbeginners, Lichess forum posts asking for study partners or
advice, chess-improvement Discord communities, and personal network (colleagues, friends, anyone who
mentions playing casually). Offer a link directly to individuals in the comments of a relevant
existing thread rather than posting a new top-level self-promotion thread, and be upfront that you
built it and want honest feedback, not a review.

**How to run it:** one-to-one, asynchronously - send a link plus the six questions below by DM or
email, ask for about 15 minutes, and leave room for follow-up questions rather than running it as a
detached survey. Offer a genuine thank-you and, if they want it, a credit/shoutout; do not pay for
feedback, it biases the answers. Write the answers down somewhere durable (a simple spreadsheet or
doc) so patterns across the 10 responses are visible side by side, not scattered across chat logs.

**What to actually ask them:**

1. What is your current rating and where do you play (Lichess, Chess.com, over the board)? -
   confirms whether this specific person is actually in the target 800-1600 segment.
2. Play one full game against the built-in engine, or paste in a recent real game of yours, then hit
   Finish and review. Before you saw the engine's suggested move, did the *reason* given for your
   worst mistake make sense in your own words? - the single most important question; it tests
   whether the pattern explanation, not just the move, actually lands.
3. If the opponent left the opening book during your game, did the message that appeared help you,
   confuse you, or did you not notice it at all? - tests the deviation-handling feature specifically,
   which is the product's core thesis in practice.
4. Did you understand what the Drills tab was showing you, and why those specific positions?
5. What is the one thing that made you want to close the tab, if anything?
6. Would you come back and use this again this week, without me asking you to? - deliberately blunt;
   this is the real retention signal, not politeness.
