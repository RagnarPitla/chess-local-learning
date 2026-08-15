# Business Model

All prices in this document were checked on 2026-08-15. Chess pricing pages change without notice;
re-verify before publishing this document anywhere permanent, and treat anything marked "unverified"
as a placeholder to confirm, not a fact to repeat.

## Competitor teardown

| Product | Does well | Charges | Source (checked 2026-08-15) |
| --- | --- | --- | --- |
| Chess.com | Massive install base, Game Review + Insights, bot ladder, huge puzzle/lesson library, brand recognition | Free tier is metered (about 1 analysis/day). Gold $6.99/mo (~$49/yr). Platinum $10.99/mo (~$80/yr) unlocks unlimited Game Review and Insights. Diamond $16.99/mo (~$120/yr) adds unlimited AI move explanations | chess.com/blog/instructor-diego/which-chess-com-subscription-is-actually-worth-it; cross-checked against support.chess.com and f6s.com |
| Lichess | 100% free, no ads, open source (AGPL), funded by donations ("Patrons") and a non-profit association, full analysis board and opening explorer free and unmetered | $0 for every feature. Optional voluntary donation ("Patron") for a cosmetic badge, nothing is gated | en.wikipedia.org/wiki/Lichess; general public knowledge, widely and consistently reported. Exact current suggested-donation copy on lichess.org/patron could not be rendered by the fetch tool used for this research - treat specific donation-page wording as unverified |
| Chessable | MoveTrainer spaced repetition purpose-built for chess notation and transpositions, strong GM-authored course catalogue, free "Short & Sweet" trailers | Free tier exists. Individual courses $20-100 one-time. Chessable Pro subscription $11.99/mo, annual figure reported between $74.99 and $79/yr across sources (minor discrepancy, likely promo pricing) | chessdir.app/apps/chessable ($11.99/mo, $74.99/yr, courses $20-100); mychessplan.com states "$79/year, often discounted" - both checked 2026-08-15, treat the exact annual figure as approximate |
| Aimchess | Automated post-game analysis across your whole account, opening/blunder/endgame reports, low price | Free tier. Pro around $7.99-8/mo or about $57.99/yr | Synthesised from third-party review aggregators (spellingjoy.com, raindropchess.com), 2026-08-15; official aimchess.com pricing page did not render for direct verification - mark exact figure as best-available, not vendor-confirmed |
| DecodeChess | Explainable-AI style plain-language reasoning per move, similar goal to this product's pattern layer but as a paid product | Free tier limited to 1 decoded game/day. Unlimited plan about $8.25/mo or $84/yr | Synthesised from third-party sources (spellingjoy.com, chessnboards.com, chessvia.ai), 2026-08-15; official decodechess.com pricing page did not render for direct verification - mark exact figure as best-available, not vendor-confirmed |
| ChessTempo | Largest curated tactics problem set on the open web (200,000+), a real calibrated tactics rating, cheapest structured tier in the category | Free tier. Silver $3/mo ($20/yr). Gold $4/mo ($35/yr). Diamond $9/mo ($79/yr) | chesstempo.com/memberships, cross-checked against mychessplan.com which independently cites "$35/year" for the mid tier, 2026-08-15 |
| Listudy | Free, open source spaced-repetition trainer for openings/endgames/tactics from your own PGNs - closest existing free/open-source analogue to this product's TRAIN job | $0, no paid tier at all | listudy.org, chessdir.app, 2026-08-15 |
| Noctie (Maia-based human-like sparring) | The only mainstream product built specifically around Maia-style human-like play - practising against something that blunders the way a real player at your level does, not a weakened engine | No permanent free tier, only a 7-day free trial. EUR 14/month, or EUR 96/year (about EUR 8/month, "40% less" per their own FAQ) | noctie.ai/pricing, fetched directly, 2026-08-15 |

**A note on Maia itself:** Maia is the open research model Noctie's category is built on - a set of
neural nets trained on millions of human Lichess games to predict what a human of a given rating
would actually play, including their mistakes. It is not itself a commercial product; it ships as
free bots on Lichess (maia1 through maia9) and as an open research release. Building "Maia-based
sparring" (this product's v3 bet) means integrating an existing open model, not licensing anything
from Noctie.

### The gap this product exploits

Every paid competitor above monetises by metering or gating the thing that actually teaches you
something: Chess.com meters Game Review itself, DecodeChess meters "decodes," Chessable charges per
course, ChessTempo and Aimchess meter volume. Lichess is the one competitor that does not meter
anything, and it wins on trust and price (free) but loses on personalisation - its analysis board
tells you the engine's move, not why your specific recurring mistake keeps happening, and it has no
memory of your weaknesses across games. Listudy is the closest thing to this product's TRAIN job
and is genuinely good, but it is a spaced-repetition drill tool for content you supply yourself; it
does not analyse your games, detect patterns, or generate a curriculum from your own mistakes.

The gap: nobody in this list combines (a) unmetered, free, local engine analysis, (b) a named
pattern - not just a centipawn number - behind every mistake, (c) a curriculum generated from your
own games rather than a course you bought, and (d) an explanation of what to do the moment
memorised theory runs out. That combination is this product's wedge.

## The wedge

Why would someone pick this over free Lichess analysis, honestly? Lichess's analysis board is
excellent and this product's engine layer is not better than it - it is the same class of tool
(Stockfish, in the browser). The reason to pick this instead is that Lichess tells you the best
move; this tells you the pattern behind why your move was not the best move, and it remembers that
pattern across every game you play so the fifth time you hang a piece to the same kind of overload,
the app already knows that is your problem before you finish reviewing the game. That is a real,
narrow, defensible difference - not a bigger one.

Why pick this over Chess.com Game Review, honestly? Chess.com's free Game Review is limited to
about one analysis a day and its explanations, while improving, are still fundamentally "the engine
prefers X." This product's Game Review is unmetered because it runs locally, and its explanation is
built from a real pattern detector (static exchange evaluation, fork/pin/skewer geometry, overloaded
defenders) rather than only an engine's numeric preference. The honest tradeoff in the other
direction: Chess.com has a vastly bigger opponent pool, a mobile app today, and a brand a beginner
has already heard of. This product does not compete on any of that. It competes on being free without
a daily limit, on privacy (nothing leaves your machine unless you choose to add an LLM key), and on
turning your specific mistakes into your specific curriculum instead of a generic one.

Be equally honest about the limits: this is a training tool, not a place to find opponents, watch
titled players, or follow tournaments. Someone whose main want is "play more people" should stay on
Lichess or Chess.com. This product is for the narrower moment of "I just want to understand why I
keep losing the same way, and fix it."

## Business model: open core plus a hosted tier

The repository is MIT and the app is local-first by design. That combination points at one shape:
**open core**. The core product stays free and runs entirely on the user's machine forever; a
hosted tier sells the things that genuinely cost money to run or genuinely compound in value across
devices and time, on top of the free core, never instead of it.

### What stays free forever

- The entire local-first app: play, review, patterns, weakness profile, drills, deviation handling,
  the opening explorer, the lesson curriculum.
- Your own data. Nothing is required to leave your machine to use any core feature.
- Offline Stockfish analysis, unmetered, with no daily cap - this is the single biggest structural
  difference from Chess.com and DecodeChess and it must never be compromised for revenue.
- The lessons and the variation explorer.
- The offline rule-based coach (works with zero network calls, zero cost to the site owner, and
  zero dependency on a subscription).

Free is the acquisition engine and the privacy story: *no signup, your games never leave your
machine* unless you explicitly turn on a paid, opt-in cloud feature.

### What people pay for

Only things that cost real money to run, or that only make sense with a server in the loop:

- **Cloud sync** across devices - requires server-side storage, by definition.
- **Unlimited hosted LLM coaching** on a strong model, for people who do not want to find or manage
  their own API key. (People who do want to manage their own key can already do this for free - see
  Technical Seams below - which is an intentional pressure release valve, not a leak.)
- **Deep multi-game analysis and rollup reports** - if these run as server-side batch jobs rather
  than in the user's own browser tab, the compute cost is real and server-mediated, so it can
  legitimately be paid.
- **A personal opening repertoire book** generated from the student's own games plus the ECO tree -
  a hosted, compiled, always-up-to-date artifact is worth more than a one-time export.
- **Human-like sparring** (Maia-based), if implemented as a hosted inference call.
- **Exports and study PDFs.**
- **Coach/club seats** - a dashboard across several students, sold to the coach or club, not the
  individual student.

### Pricing

| Plan | Price | Anchor and justification |
| --- | --- | --- |
| Monthly | $4.99/month | Below every direct competitor's mid-tier (Chess.com Platinum $10.99, Chessable Pro $11.99, DecodeChess $8.25, Aimchess ~$8, Noctie EUR14), close to ChessTempo's cheapest paid step (Gold $4). This has to sit at the low end, not the middle, because - unlike every competitor above - the core analysis and review experience here is already free and unmetered. Competitors charge for the ability to review a game at all; this product only charges for convenience layered on top of a review experience that was never gated. The willingness to pay is real but structurally smaller, and the price has to reflect that honestly. |
| Annual | $39/year (about $3.25/mo, roughly 35% off monthly) | Deliberately undercuts every bundled/coaching competitor's annual price (Chess.com Platinum ~$80/yr, Chessable Pro ~$75-79/yr, DecodeChess ~$84/yr, Aimchess ~$58/yr, Noctie ~EUR96/yr) and sits close to ChessTempo's absolute floor ($35/yr for a narrower, tactics-only tool). The free tier here is more generous than any competitor's, so the paid upgrade has to be an easy, low-friction yes, not a considered household budget decision. |
| Lifetime | $79 one-time | About 2x the annual price, a standard multiple for an indie/open-core lifetime deal, and deliberately framed against Chessable's own per-course pricing: less than a single grandmaster-authored course ($20-100), forever, with no recurring billing relationship. This specifically targets the segment of this exact audience - people who read an MIT repo before trusting it - who are more likely to distrust a subscription than they are to distrust a one-time Stripe charge. |

Coach/club seats are a distinct, later SKU (directionally $15-25/month per coach covering a small
roster of students) and are not priced precisely here, because no product exists yet to sell - price
it once the v3 dashboard is real and talk to 5-10 actual coaches first.

### Unit economics

All figures below are estimates built from explicit, stated assumptions so they can be corrected.
Verified inputs (checked 2026-08-15): Anthropic Claude Sonnet 4.5 API pricing is $3 per million
input tokens and $15 per million output tokens; OpenAI gpt-4o-mini is $0.15 per million input tokens
and $0.60 per million output tokens - about 20x cheaper. These are the two models `lib/coach-prompts.js`
already defaults to (Anthropic preferred when both keys are present, gpt-4o-mini as the fallback).

Assumptions: about 1.3 tokens per English word; the system + per-kind instruction prompt in
`lib/coach-prompts.js` runs roughly 250-400 tokens; the JSON data payload sent with each request is
deliberately small because `gameReviewPayload()` in `public/js/coach.js` already caps itself to the
top 3 mistakes and top 4 pattern-summary entries rather than sending a whole game; output length is
bounded by the explicit word caps written into each prompt (for example "Maximum 260 words" for a
game review), not by the 1200-token ceiling passed to the provider.

| Coach call type | Est. input tokens | Est. output tokens (word cap in prompt) | Cost on Claude Sonnet 4.5 | Cost on gpt-4o-mini |
| --- | --- | --- | --- | --- |
| game-review | ~1,800 | ~340 (260 words) | $0.0105 | $0.00047 |
| move-explain | ~500 | ~170 (130 words) | $0.0041 | $0.00018 |
| deviation | ~700 | ~195 (150 words) | $0.0050 | $0.00022 |
| puzzle-explain | ~500 | ~155 (120 words) | $0.0038 | $0.00016 |
| lesson | ~800 | ~285 (220 words) | $0.0067 | $0.00029 |

Blended average: roughly **$0.006 per coaching call on Claude Sonnet 4.5**, roughly **$0.0003 per
call on gpt-4o-mini**.

Monthly cost per subscriber at different usage levels (Claude Sonnet 4.5, the more expensive
default):

| Usage level | Calls/month | Monthly LLM cost |
| --- | --- | --- |
| Light | 10 | $0.06 |
| Typical engaged user | 40 | $0.24 |
| Heavy (daily study) | 200 | $1.20 |
| Automated abuse (not a plausible human pattern) | 5,000 | $30.00 |

**At what point does a subscriber become unprofitable?** At $4.99/month, Stripe's fee (2.9% + $0.30,
verified 2026-08-15) takes about $0.44 + $0.30 = $0.74, leaving roughly $4.25 to cover LLM cost and
hosting before this one subscriber is a loss. At $0.006/call on Claude Sonnet 4.5 that is about
**708 coach calls in a month (about 24/day, every day)** before a single subscriber stops being
profitable. No plausible human study pattern reaches that; a person reviewing games and asking for
lessons 24 times a day, every day, is not a real usage pattern. On gpt-4o-mini the breakeven is
roughly 20x higher and effectively unreachable by a human.

**The real risk is not the median user, it is automated abuse of a shared platform key.** The
existing rate limiter (`createRateLimiter` in `lib/coach-prompts.js`) is explicitly documented in
its own code comment as a best-effort, per-warm-instance sliding window, not a hard guarantee across
serverless regions or cold starts. Before turning on "unlimited hosted coaching" as a paid feature,
this needs a persistent, license-scoped hard usage ceiling (see Technical Seams below) - not because
real subscribers will hit it, but because a single leaked license token or scripted client could
otherwise run up real cost with no backstop.

### Funnel and what would have to be true

Rough, honestly-labelled assumptions for a free, self-serve, no-signup niche tool:

| Stage | Assumption | Note |
| --- | --- | --- |
| Visit -> Try (actually plays or imports a game) | 20-35% | Realistic for a genuinely free, no-signup tool with a clear demo, not for a typical marketing landing page |
| Try -> Active (finishes a reviewed game) | 40-60% | The core loop is short; most people who start one game finish it |
| Active -> Repeat (returns within 7 days) | 15-25% | No retention loop exists yet (no email, no push, no streak nudge) until the progress system ships; expect the low end until it does |
| Repeat -> Paid | 1-4% | Deliberately wide and on the low side. A generous free tier is good for acquisition and bad for monetisation - this is a real, known tension (it is the same reason Lichess, with the most generous free tier in the category, does not charge for features at all and relies on donations instead) |

**What would have to be true to make a meaningful amount of money.** Working backward from a
modest goal of $10,000 MRR at roughly $4/mo blended net revenue per payer (after the annual/lifetime
mix and payment fees), that needs about 2,500 paying subscribers. At a 2% repeat-to-paid conversion,
that needs 125,000 monthly repeat users; working back through the funnel above (20% visit-to-try,
50% try-to-active, 20% active-to-repeat) that needs on the order of **six million visitors**. That
is not a realistic outcome from steady organic growth alone for a niche open-source chess tool - it
requires one or more of: a genuine viral distribution event (a large chess YouTuber or streamer
adopting it, a Hacker News or Reddit front page that actually sticks), years of compounding
SEO/content growth the way Chessable's course catalogue itself doubles as a growth engine, or a
successful pivot of meaningful revenue weight onto the B2B coach/club seat, which has a completely
different and better unit economics story (one paying coach can be worth 10-20 individual
subscribers and is a sale, not a self-serve conversion).

**The honest assessment:** this is a genuinely hard market to make significant money in as a small
project. Lichess sets a free-forever bar for the entire category and is well-funded by donations
with no investor pressure to monetise. Chess.com has an enormous, entrenched user base and brand
recognition nobody else in this list can match. This product's own free tier, by design, is more
generous than any competitor's, which caps the monetisable wedge to genuinely incremental
convenience rather than core value. The realistic base case is a small, sustainable side income (low
hundreds to low thousands of dollars a month, reached over one to two years) rather than a
venture-scale outcome, unless a real distribution event happens or the coach/club B2B motion
develops real traction. That is not a reason not to build it - the free tool is valuable and worth
shipping regardless - it is a reason not to plan a budget or a team around subscription revenue
materialising quickly.

## The technical seams for monetisation

This is written for engineering to implement. The starting constraint: the client is a static app
with no build step - every file in `public/js/` is plain, readable ES module source served as-is
(confirmed by reading the code and the README). Nothing in client JavaScript can be trusted to gate
a paid feature, because any check like `if (isPro) { ... }` is trivially removed by editing
localStorage or the source in devtools. Gating must happen wherever the expensive or server-mediated
work actually occurs.

### An `entitlements` concept

A small module, most naturally alongside `lib/coach-prompts.js` since it already runs identically
across `server.js`, the Vercel functions, and the Cloudflare functions:

```
// lib/entitlements.js (concept, not yet implemented)
export const FEATURES = {
  CLOUD_SYNC: 'cloud_sync',
  LLM_COACH_UNLIMITED: 'llm_coach_unlimited',
  DEEP_MULTI_GAME_ANALYSIS: 'deep_multi_game_analysis',
  REPERTOIRE_BOOK: 'repertoire_book',
  MAIA_SPARRING: 'maia_sparring',
  STUDY_EXPORT: 'study_export',
  COACH_SEATS: 'coach_seats',
}

// Every feature defaults to off/free. A missing or invalid license token
// must resolve to exactly this, never to an error that blocks the free path.
export function defaultEntitlements() {
  return Object.fromEntries(Object.values(FEATURES).map((f) => [f, false]))
}

// licenseClaims comes only from a verified, signed token - see the flow below.
// Never trust a client-supplied "tier" field on its own.
export function resolveEntitlements(licenseClaims) {
  if (!licenseClaims) return defaultEntitlements()
  const next = defaultEntitlements()
  for (const f of licenseClaims.features || []) if (f in next) next[f] = true
  return next
}
```

### Why gating must happen server-side, and which features can therefore be paid at all

Local Stockfish analysis can never be a paid feature in this architecture, full stop. It is WASM
running in the user's own browser tab with no server involved; trying to paywall it client-side is
both technically futile (the MIT-licensed source is right there to fork and run for free) and a
betrayal of the local-first pitch this product is built on. The same is true of the pattern library,
the weakness profile maths, and the offline coach - all pure client-side logic today, all
unpaywallable, and none of them should be paywalled even if it were possible.

What *can* be paid is anything where the expensive step happens on a server this project controls:

- **The LLM coach proxy.** The API key already never reaches the browser (`server.js`, `api/coach.js`,
  `functions/api/coach.js` all keep it server-side); the server can simply refuse to call the
  provider - or fall back to a lower call budget - when no valid paid entitlement is presented.
- **Cloud sync.** The sync endpoint is server-side storage by definition; the server can refuse to
  store or return data without a valid entitlement.
- **Hosted deep multi-game analysis, the repertoire book compiler, and Maia sparring** - but only if
  they are built as server-mediated calls from day one. If Maia sparring is instead implemented as
  an in-browser model (an ONNX/WASM port running client-side, mirroring how Stockfish already runs),
  it becomes exactly as unpaywallable as the engine is today. This is a real, easy-to-miss
  architecture decision: build these v3 features so the compute happens server-side specifically so
  they *can* be monetised, rather than discovering after the fact that they were built the local-first
  way and can't be.

### License-key / signed-token flow (no forced accounts)

This extends a pattern the codebase already has half of: `lib/coach-prompts.js` already accepts a
caller-supplied credential over a request header (`x-coach-key` for bring-your-own-key), validates
it, and falls back gracefully when it is absent or invalid. A license token is a sibling to that,
not a new pattern:

1. User clicks "Upgrade" in the app, which redirects to a Stripe Checkout session for the chosen
   plan. No card data ever touches this project's own server.
2. On successful checkout, a Stripe webhook hits a small serverless function that mints a signed,
   stateless token (an HMAC-signed or JWT payload: `{ id, tier, features, expiresAt, iat }`) using a
   server-held secret. No account or database row is required for the free-to-paid conversion to
   work - the token itself is the credential, matching the app's existing zero-signup ethos.
3. The token is handed back once on the Checkout success redirect and stored client-side in
   localStorage, next to the existing free profile.
4. The client presents it as a header (e.g. `x-license-token`) on paid-gated calls (`/api/coach` for
   unlimited coaching, a future `/api/sync`). The server verifies the signature and expiry before
   doing any expensive work. Missing, invalid, or expired -> the exact same graceful fallback already
   used today for "no coach key configured": drop to the free/offline behaviour, never a hard error.
5. Recovery without a password: a "resend my license" action keyed off the Stripe customer's email,
   looked up via Stripe's own API and re-issued as a fresh signed token. This avoids needing a full
   user/auth database while still giving people a way back in if they clear their browser storage.

### Usage metering and abuse limits

Already shipped and worth keeping: a request body size cap (`MAX_BODY_BYTES`), a provider call
timeout (`COACH_TIMEOUT_MS`), and the per-instance sliding-window rate limiter described above.
Needed before any paid "unlimited" claim goes live: a **persistent**, license-scoped counter (for
example Cloudflare KV or a small Redis instance such as Upstash, since a serverless function's
memory does not survive between cold starts or regions) enforcing a generous but hard monthly fair
use ceiling per paid seat - a few hundred calls a month comfortably covers real study, while stopping
a leaked or scripted token from becoming an open bill. Return a clear, specific message ("fair use
limit reached, resets on [date]") rather than a silent failure, and log call counts (never call
content) for anomaly detection.

### Anonymous, privacy-respecting analytics

Use a cookie-free, no-persistent-identifier analytics tool (Plausible, Fathom, GoatCounter, or
Cloudflare's own Web Analytics) so no consent banner is legally required and the "your data stays
yours" claim stays true for analytics too. Track counts only, never content:

- `landing_page_view`, `app_first_load`
- `game_played`, `game_imported`
- `review_completed`
- `drill_attempted`, `drill_correct`
- `coach_call` (dimensions: offline vs llm, kind - never the FEN, PGN, or response text)
- `upgrade_clicked`, `checkout_started`, `checkout_completed` (the funnel)
- `license_verified` (catches "paid but never actually used the paid feature," a common drop-off)

Never send to any analytics vendor: FEN strings, PGNs, move lists, weakness profile contents, or any
coach prompt/response text. That data either stays local or, if sync ships, lives only in the sync
store covered by the Privacy Policy - never in an analytics pipeline.

### What moves to a server for sync, and the privacy commitments that follow

Today, nothing syncs anywhere by default. Exactly two things leave the machine, both opt-in: an LLM
coach call, when a provider key is configured, sends that specific request's structured position
data (FEN, moves, evaluations, pattern tags - see `gameReviewPayload()`) to Anthropic or OpenAI for
that call only, with nothing stored by this project; and a Lichess puzzle fetch sends only a theme
name. If cloud sync ships, the data that would need to move is the profile-equivalent data already
stored locally today (`data/profile.json`, `data/games.json`): weakness scores, EWMA history, drill
records, and game summaries. This implies real commitments once it exists: encryption at rest,
sync as an explicit opt-in per device (never silently automatic), an export path covering synced
data (the local "Export" button on the Profile tab already exists and should extend to this), a
real delete-my-data path, and a plain Privacy Policy sentence that a key holder's move data leaves
the machine per LLM call today, before any sync feature is even built.

## Legal and licensing

The whole repository is MIT today (`LICENSE`, and `package.json`'s `"license": "MIT"`). That grant
is irrevocable for anyone who has already cloned or forked it - open core here means the free,
local-first app (everything that exists in the public repo today, and everything that ships as part
of "v1 launch" in PRODUCT.md) stays MIT permanently, not a bait-and-switch relicense later.

Recommended structure going forward: keep any new server-only code that exists purely to sell the
paid tier - the entitlements/license-verification module, the Stripe webhook handler, the persistent
usage-metering store, and the coach/club multi-seat backend - in a **separate, private repository or
service** that the public MIT app calls through a documented API contract, rather than mixing
licenses inside one repository. This is a direct extension of the pattern `server.js`, `api/*`, and
`functions/api/*` already use (the public client talks to a small server-side surface it does not
itself contain), and it avoids any ambiguity about which files in one repo are under which license.

Stockfish is GPLv3 and is used here as an unmodified external engine invoked over UCI, not linked
into or derived from this project's own code - the README's framing of it as "an unmodified runtime
dependency" matches how essentially every chess GUI, including Chess.com and Lichess, embeds
Stockfish without the GUI itself becoming GPL. This stays true for the paid tier too, since nothing
planned touches or redistributes a modified engine; if that ever changed, the modified engine itself
would need to be GPLv3 with source available.

The bundled opening data (`lichess-org/chess-openings`) is CC0-1.0, a public domain dedication, so
no attribution is legally required. The code already voluntarily credits the source in comments,
which is good practice worth keeping; a short credits note in the project's public documentation
(owned by the docs-publish/research-sources work already in flight, not this document) is a
reasonable courtesy on top of what the license requires.

Trademark: the product's final name has not been chosen yet (branding work is in flight as this is
written). Whatever name is picked, run it through a basic USPTO TESS search and a plain web/app-store
check before committing, and avoid anything confusingly close to Chess.com, Chessable, Lichess, or
Maia Chess branding - Chess.com in particular actively defends its mark. A name built from generic
words plus "chess" is weak to defend as a trademark but low-risk and fast to ship; a coined name is
stronger to defend later. This is worth a deliberate half-hour decision, not an accident of whatever
the repository happened to be called first - and note that "chess-local-learning" itself is purely
descriptive and not meaningfully registrable as-is.

Terms of Service and a Privacy Policy become mandatory the moment either is true: money moves through
Stripe (Stripe itself requires a live account to have both linked), or any account, sync identifier,
or analytics identifier exists. Draft both before Stripe Checkout goes live, not after, covering:
local-first data handling, the opt-in LLM data transmission to a third-party provider described
above, opt-in cloud sync, a plain "we do not sell your data" commitment, a clear refund policy (a
generous window, for example 14 days, is worth it for the lifetime tier specifically to earn trust
from a skeptical open-source audience), and a plain-language note on the third-party components
(Stockfish/GPLv3, chess.js/BSD-2, cm-chessboard/MIT, the CC0 opening data) already disclosed in the
README's license section.

**A hosting note that touches licensing-adjacent terms of service:** Vercel's own documentation
states plainly, in its own words, "the Hobby plan restricts users to non-commercial, personal use
only" (vercel.com/docs/plans/hobby, fetched directly and quoted verbatim, checked 2026-08-15) - the
moment Stripe Checkout goes live, any deployment still on Vercel's free Hobby tier needs to move to
a paid Vercel plan, since the product would no longer be a personal, non-commercial project by
Vercel's own definition. Cloudflare Pages' free tier, by contrast, is confirmed usable for
commercial projects with no such restriction (cross-referenced via Cloudflare's own community
forum, 2026-08-15). If the static-deploy work in flight ships to Cloudflare Pages as the primary
target, this is a non-issue; if Vercel is the primary target, budget for a paid Vercel plan before
the paid tier goes live, not after.
