# Marketing campaign - Ramify

This directory is the complete, ready-to-use marketing campaign for Ramify (repository name and
package name: `chess-local-learning`; hosted free at
https://ragnarpitla.github.io/chess-local-learning/). Everything in here was written after reading
the actual source code and the product/build docs - not from the brief alone - and every claim is
traceable to a real file and line. Nothing in this directory has been committed to git.

Read this file first. It tells you what exists, what order to use it in, and the two things you
need to resolve before launch that are outside this directory's control.

---

## Before you launch: four things to resolve first

These were all discovered while researching this campaign, are outside marketing/'s ownership, and
should block or shape launch timing:

1. **Hardest gate: `docs/LAUNCH.md` says do not launch publicly yet.** It states explicitly: "Do not
   launch publicly before ui-integration lands (the live variation panel and the Learn, Library, and
   Progress tabs)... launching before that means showing off features nobody can find." This is not
   a marketing decision to make - re-check that dependency's status before executing anything in
   this campaign publicly. CAMPAIGN.md Phase 0 repeats this as its first checklist item.
2. **Naming is not yet consistent across the product.** A dedicated workstream (`landing-brand`)
   chose the public-facing name **Ramify** and it is fully live in `public/landing.html` and
   `public/assets/brand/` (favicon, OG card). This campaign has been written and rewritten to match.
   But as of this writing, `public/index.html` (the app itself), `package.json`, and
   `docs/PRODUCT.md`/`docs/BUSINESS.md`/`docs/LAUNCH.md` still say "Chess Local Learning" and have
   not picked up the rename. A visitor who reads the landing page ("Ramify") and clicks through to
   the app ("Chess Local Learning") will notice the mismatch. This needs a short reconciliation pass
   by whoever owns those files before any channel copy goes out - the fix is mechanical
   (find-and-replace, exactly as `docs/LAUNCH.md` itself anticipated when it wrote "if the name
   changes before launch, find-and-replace it below - the substance does not depend on the name").
   The repository/package technical name can stay `chess-local-learning`; only the human-facing
   product name needs to agree everywhere.
3. **The shipped piece art has a real license conflict.** Per `docs/CREDITS.md`, the board currently
   defaults to cm-chessboard's bundled `staunty.svg`, which is licensed CC BY-NC-SA 4.0
   (NonCommercial). Everything in this campaign says "free, MIT, do anything with it," and that is
   true of the code - it is not yet true of the default piece art. This is flagged prominently in
   `ASSETS/press-kit.md` and must be fixed (swap to the MIT-compatible piece set another workstream
   is building at `public/assets/pieces/`, or another compatible source) before any launch post goes
   out publicly. Do not launch with this unresolved - a NonCommercial-licensed asset in a repo being
   marketed as "free, MIT, use it however you like" is exactly the kind of claim this campaign was
   told to verify before writing, and it does not currently check out.
4. **Lower-severity: confirm the trademark check actually happened.** `docs/BUSINESS.md` itself
   recommends running any candidate name through a basic USPTO TESS search and a plain web/app-store
   check before committing. The `landing-name` workstream's own task description ("search web for
   candidate names, check .com/.app domains, npm, GitHub availability") covers domain/npm/GitHub
   availability but does not explicitly mention a trademark search. Worth a two-minute check before
   "Ramify" ships everywhere, not a blocker on its own.

Everything else below is ready to use as soon as those are closed out.

---

## Read in this order

1. **POSITIONING.md** - the messaging foundation. The one-liner, the 25-word and 100-word versions,
   the elevator pitch, three audience angles, the message hierarchy, the proof-points table (every
   claim mapped to the exact file/line that supports it), the objection-handling table, and the
   dropped-claims list (things that would have been good marketing but are not true yet). Everything
   else traces back to this file - if a channel's copy and this file ever disagree, this file wins.
2. **CAMPAIGN.md** - the actual plan. Goals and target numbers, a phased timeline (pre-launch,
   launch week, first month, ongoing), a channel-by-channel table with effort and expected return,
   a content calendar, and the specific sequencing logic for telling the "built by a fleet of AI
   agents" story alongside the product story without either one drowning out the other.
3. **METRICS.md** - what to measure, the privacy-respecting analytics choice (and why it deliberately
   does not touch the app itself), the specific events to instrument, the funnel, and honest
   week-1/month-1/month-3 targets.
4. **COPY/** - ready-to-paste copy, one file per channel. Not outlines - actual text.
5. **ASSETS/** - the visual assets (SVGs, press kit, rasterisation instructions).

## How to run the campaign, in practice

1. Resolve the two items above.
2. Work through CAMPAIGN.md's Phase 0 (pre-launch) checklist.
3. On launch day, post in the priority order given in CAMPAIGN.md Section 3 (short version: Show HN
   first since it is time-sensitive and unschedulable once it starts moving; Product Hunt same
   morning since it also runs on a 24-hour clock; r/chess and Twitter/X same day; LinkedIn and
   dev.to same day or the next, since they aren't time-boxed the same way; Lichess forum and Discord
   opportunistically and lower-key, per those files' own compliance notes; r/chessbeginners only if
   the stricter path in that file's own notes is followed).
4. Use the exact copy in COPY/ - each file already states which platform rule it complies with and
   why (see "Rules found and how the copy complies" below).
5. Track METRICS.md's events and targets from day one; do not wait until week 2 to start checking
   GitHub Insights and each platform's native dashboard.

---

## COPY/ - one file per channel

| File | What it is | Key compliance note |
|---|---|---|
| `show-hn.md` | Show HN title + body | Understated, technical, first-person; no marketing voice - matches HN's own stated cultural norms (see file for citation). |
| `reddit-chess.md` | r/chess post | Complies with r/chess Rule 6's explicit developer exemption for free, non-gambling chess software (quoted verbatim with source link in the file). |
| `reddit-chessbeginners.md` | r/chessbeginners post + a safer in-context reply template | This subreddit's rules are stricter with no developer exemption; file states the real removal risk and gives the lower-risk path first. |
| `twitter-x-thread.md` | Launch thread + 5 standalone posts | - |
| `linkedin.md` | Full post + shorter variant | Leads with the AI-agent-fleet build story since that is the angle that fits this specific audience (rbuild.ai's own network). |
| `product-hunt.md` | Product name, tagline, description, first comment, gallery shot list | Tagline kept under PH's enforced 60-character limit; gallery list sized to PH's actual recommended dimensions (see ASSETS/rasterise.md). |
| `youtube.md` | Title, description, tags, thumbnail concept, full 3-5 minute script with timestamps | - |
| `email.md` | Launch announcement + 3-email onboarding sequence | States plainly that no email capture mechanism exists yet in the shipped product - copy is ready for whenever one does. |
| `lichess-forum.md` | Game Analysis post draft (compliant path) | Deliberately avoids naming/pitching the product - Lichess forum etiquette explicitly discourages promotional posts; file quotes the actual etiquette page. |
| `discord.md` | Draft post + shorter variant, generic self-promo checklist | Discord rules live per-server and cannot be fetched; file is explicit about what is and is not independently verifiable. |
| `dev-to-blog-post.md` | Full technical build-story post | Numbers cross-checked against `docs/BUILT-WITH-AI.md`, which is cited as the primary/authoritative source throughout. |

## ASSETS/ - visual assets

| File | What it is |
|---|---|
| `og-image.svg` (1200x630) | Primary Open Graph card - generic link previews (Facebook, Slack, iMessage). |
| `og-image-x.svg` (1200x675) | X/Twitter `summary_large_image` card variant. |
| `og-image-linkedin.svg` (1200x627) | LinkedIn card variant, build-story-led. |
| `logo-lockup.svg` (720x160) | Icon + wordmark lockup for headers/README use. |
| `favicon.svg` (64x64) | Favicon concept - solid woodcut rook silhouette, legible at tiny sizes. |
| `social-trees-vs-graphs.svg` (1200x675) | The core positioning explainer: a tree with one bold path vs. a dense uniform graph. |
| `social-learning-loop.svg` (1200x675) | The play -> mistake -> pattern -> drill -> retest loop, as a diagram. |
| `social-feature-card.svg` (1200x675) | Feature card using 5 real pattern labels pulled from `public/js/patterns.js`. |
| `social-before-after.svg` (1200x675) | "Before your review / after your review" card, explicitly labeled as an illustrative (not captured) example. |
| `press-kit.md` | One-page press kit: boilerplate (short/medium/long), key facts, founder line, the piece-art licensing flag, asset links. |
| `rasterise.md` | Exact PNG sizes per platform (including Product Hunt's real 1270x760/240x240 requirements) and three conversion methods with commands. |

All SVGs are hand-authored, monochrome, and use only the specified design tokens (background
`#ffffff`, foreground `#0a0a0a`, primary `#171717`, muted `#f5f5f5`, muted-foreground `#737373`,
border `#e5e5e5`, radius 8px, system font stack). Every one was screenshotted via headless Chrome
over CDP and visually reviewed; see the final report delivered alongside this campaign for the
per-file verification results.

---

## Rules found and how the copy complies (summary - full citations live in each COPY/ file)

- **Hacker News:** no single hard "self-promo" rule, but a well-documented cultural norm (HN
  guidelines plus long-standing community practice) against hype language, exclamation marks, and
  vague claims - `show-hn.md` is written plainly and technically for exactly this reason.
- **r/chess:** Rule 6 explicitly permits developers to plug free, non-gambling chess software
  without the general 10-to-1 self-promotion ratio, provided it is not re-posted more than once per
  6 months without a noticeable update. Quoted from https://old.reddit.com/r/chess/wiki/rules in
  `reddit-chess.md`.
- **r/chessbeginners:** sidebar rules ban self-promotion materials outright with no software
  exemption. `reddit-chessbeginners.md` states this plainly and offers a lower-risk in-context reply
  template as the primary recommendation, with the direct post as a fallback only if
  modmail-approved.
- **Lichess forum:** forum etiquette explicitly asks that advertising stay off Lichess and that
  people share their own games in Game Analysis rather than pitch a product. `lichess-forum.md`
  follows this by drafting a genuine game-analysis post that mentions the tool once, briefly, in
  context - not a launch announcement.
- **Discord:** server rules are not publicly fetchable (they live inside each server). `discord.md`
  says so directly and gives a generic pre-posting checklist instead of inventing rules that cannot
  be verified.
- **Product Hunt:** tagline capped at the platform's enforced 60 characters; gallery images sized to
  PH's actual documented recommendation (1270x760, auto-cropped to a 240x180 thumbnail; separate
  240x240 square logo slot).

---

## Claims dropped for lack of evidence

Kept in full, with the code/doc reason for each, in POSITIONING.md's own "What we do not claim"
section. Repeated here as a short index only:

- No claim that the Explorer or Progress tabs are reachable in the shipped UI - `app.js` and
  `index.html` only wire up Play/Review/Drills/Profile; `explorer.js`/`progress.js` exist as code but
  are not imported into the running app as of this check.
- No specific user counts, testimonials, or quotes - none exist yet; none were invented.
- No claim that the product is unconditionally, entirely free of any non-free component - see the
  piece-art licensing flag above; the code is MIT, the default piece art currently is not.
- Stockfish's license is stated only as "GPL" (not a specific point version) in this campaign's own
  copy, since `docs/RESOURCES.md` states GPL-2.0 elsewhere in the repo while `docs/BUILT-WITH-AI.md`
  states GPL-3.0 - that discrepancy belongs to the docs workstream to resolve, not to this campaign.

---

## House style used throughout this directory

- Plain, specific, technical register. No "revolutionary," no "game-changer," no exclamation-point
  energy.
- ASCII only: straight quotes, `-` and `->` instead of em/en dashes and arrows, no curly quotes, no
  section-sign characters. Verified with a byte-level scan (see the final report).
- No fabricated social proof anywhere in this directory - no invented testimonials, quotes, or user
  counts.
