# Metrics - Ramify

What to measure, what not to measure, and honest targets. Pairs with CAMPAIGN.md (the plan) and
POSITIONING.md (the message). The numbers below are estimates based on typical outcomes for a
first-time, unfunded, solo-maintainer launch of a free developer-flavoured niche tool - not
internal data, because none exists yet for this product. Where CAMPAIGN.md already states a target,
this file uses the same number rather than inventing a second, slightly different one.

---

## 1. The one rule that shapes everything below: do not instrument the app itself

Ramify's core promise is "your games never leave your machine." That is a real, verified claim (see
POSITIONING.md's proof points table - board state lives in localStorage plus an optional local
folder; the only outbound network calls are opt-in: an LLM coach if the user supplies their own API
key, and a manual "pull an extra puzzle from Lichess" button). Adding any analytics script inside
public/index.html - even a privacy-respecting one, even if it only counts anonymous button clicks -
puts a network call in a page that currently makes none by default, and quietly narrows a claim this
whole campaign is built on.

So the rule is: **no analytics inside the trainer app itself.** Not now, not as a "just pageviews"
compromise. The absence of tracking in the tool is a feature, and it should be marketed as one, not
undermined by an analytics snippet the more technical part of the audience will find in three
seconds by opening devtools (this audience will look, and finding a tracker after reading "your
games never leave your machine" is worse for trust than not measuring in-app behaviour at all).

This means the funnel below cannot instrument "did they actually start a game" directly. It uses
external proxies instead (Section 4). That is a real limitation, stated plainly rather than worked
around with a script the audience would consider a broken promise.

**Reconciling this with docs/BUSINESS.md:** that document (owned by another workstream) has its own
"Anonymous, privacy-respecting analytics" section, which recommends the same category of tool
(Plausible/Fathom/GoatCounter/Cloudflare) and the same "counts only, never content" philosophy this
file uses - no disagreement there. Where it differs is scope: BUSINESS.md's event list
(`app_first_load`, `game_played`, `review_completed`, `upgrade_clicked`, `checkout_started`,
`license_verified`, and so on) is written for the *future*, paid-tier product, once accounts,
licenses, and Stripe checkout exist - at that point, checkout and license verification are already
server-mediated operations, so instrumenting them does not create a new privacy contradiction the
way instrumenting today's 100% local play/review/drill loop would. This file's stricter
no-in-app-analytics rule is specifically for the *current, free-only, v1 launch* this campaign is
for. Once the paid tier in BUSINESS.md actually ships, re-scope this section rather than treat the
two documents as conflicting - and even then, consider keeping the free core (play, review, drills)
untracked, since that is the differentiator worth protecting.

---

## 2. What we will measure, and where

### 2a. GitHub-native signals (free, zero setup, first choice for everything they cover)

GitHub already provides most of what actually matters for a repo-first launch, at zero cost and zero
engineering effort:

- **Stars** - the best available proxy for "a stranger thought this was worth bookmarking." Public,
  cumulative, visible on the repo page.
- **Forks** - a proxy for "a developer wants to read or build on the code," a different signal from
  a star.
- **Traffic (Insights > Traffic)** - unique visitors and views to the repo page itself, plus top
  referrers, over a rolling 14 days. Free, built in, no setup. Note the 14-day window: export or
  note the numbers weekly if a longer history matters.
- **Clones (Insights > Traffic)** - a proxy for "someone is actually going to run this locally," a
  stronger signal than a star for a project whose main value (per POSITIONING.md) is running
  entirely on your own machine.
- **Issues and PRs opened by people who are not the maintainer** - the highest-quality signal of
  all: someone used it enough to have an opinion.

All of these require nothing beyond a repo that exists. Check them weekly during launch month,
monthly after.

### 2b. Per-channel external metrics (already provided by each platform, no instrumentation needed)

- Hacker News: points and comment count on the Show HN post (via the post's own page).
- Reddit: upvotes, upvote ratio (if visible), and comment count on each post.
- Product Hunt: upvotes, comment count, and daily rank.
- X/Twitter: impressions, likes, reposts, replies on the launch thread (native analytics, visible to
  the poster).
- LinkedIn: impressions, reactions, comments (native post analytics).
- dev.to: views, reactions, comments (native, visible to the author).
- YouTube: views, average view duration, click-through rate on the demo video (native YouTube
  Studio).

These need no separate analytics tool - just check each platform's own dashboard on a schedule
(Section 5).

### 2c. The landing page only: one privacy-respecting, cookie-less analytics tool

public/landing.html is a separate, standalone marketing page (distinct from the trainer app at
public/index.html) whose only job is to explain the product and hand off to it via an "Open Ramify"
link. Unlike the app, a landing page whose entire purpose is being read by strangers before they
decide anything is a normal, disclosed place for aggregate, anonymous pageview and click analytics -
this is closer to "how many people read this page" than "what did you do with your data."

**Recommended tool: GoatCounter** (https://www.goatcounter.com), for these reasons:
- Free for a personal, non-commercial site on its hosted tier - matches this project's zero-budget
  reality.
- Open source itself (AGPL), consistent with the project's own values.
- No cookies, does not use fingerprinting, does not sell or share data - explicitly built to comply
  with GDPR without a cookie banner.
- Simple custom-event model: a `data-goatcounter-click` attribute on any link/button, or one JS call
  - enough for the events in Section 3 without adding real engineering weight.
- A tiny (about 3kb) single script tag; does not meaningfully affect the "loads instantly, no
  dependencies" feel of a static page.

**Reasonable alternative: Cloudflare Web Analytics** (free, also cookie-less, also privacy-focused,
backed by a large operator, slightly less flexible for custom events, better if the site ever sits
behind Cloudflare's CDN for other reasons). Either choice satisfies the same constraint; do not use
both.

**Explicitly not recommended:** Google Analytics (uses cookies/cross-site identifiers by default,
requires a cookie-consent flow to be compliant in the EU/UK, and is the single most recognisable
"this site is tracking you" signal to the exact developer audience this product targets - a bad
trade for a marginal reporting benefit). Plausible Cloud is a reasonable privacy-respecting choice
too, but has no permanently free tier (only a trial), which does not fit a zero-budget project;
self-hosting Plausible avoids the cost but adds a server to maintain, which contradicts the
project's own "runs with nothing to operate" positioning for anything the owner has to keep alive.

**Disclosure:** state in the landing page footer or a one-line privacy note that the landing page
(not the app) uses cookie-less, aggregate analytics, and name the tool. One sentence, not a policy
document - see POSITIONING.md's objection-handling table for why over-explaining a non-issue can
create a bigger one.

---

## 3. Specific events to instrument (landing page only)

All events are bare, anonymous, aggregate counts with no user-identifying properties and no game
content. None of these touch the app itself.

| Event | What it tells you |
|---|---|
| `pageview` (built into GoatCounter automatically) | Raw reach per referrer/UTM source - the main signal for "which channel actually sent people." |
| `click: open-app` | Clicks on the "Open Ramify" / hero CTA button - the landing page's entire job, in one number. |
| `click: github` | Clicks through to the GitHub repo from the landing page - a stronger intent signal than the app click for a developer audience (some will go straight to reading the code). |
| `click: how-it-works` / `click: explorer` (nav links) | Whether people who stay are reading the explanation or skipping straight to the CTA - useful for editing the page later, not for launch reporting. |
| `click: faq-item` (if FAQ items are collapsible) | Which objection people actually click open - a proxy for which objection-handling copy (POSITIONING.md Section 6) is pulling weight. |

Tag every outbound channel link with UTM parameters (`?utm_source=hn`, `?utm_source=reddit-chess`,
`?utm_source=twitter`, `?utm_source=linkedin`, `?utm_source=producthunt`, `?utm_source=devto`,
`?utm_source=youtube`, `?utm_source=email`, `?utm_source=discord`, `?utm_source=lichess-forum`) so
GoatCounter's referrer/campaign breakdown answers "which channel actually worked" directly, without
guessing from platform-native stats alone. This is the single most useful piece of instrumentation
in this whole document - most of the channel-effectiveness questions in CAMPAIGN.md Section 3 come
straight out of this one practice.

---

## 4. The funnel (with honest proxies where the app itself cannot be instrumented)

```
1. Awareness      -> impressions/points/upvotes on each channel post          (Section 2b)
2. Landing         -> pageviews on landing.html, by UTM source                (Section 2c/3)
3. Click-through   -> click:open-app events (landing.html -> index.html)      (Section 3)
4. Activation      -> PROXY ONLY: GitHub clones + qualitative signal          (Section 4a)
                       (people who actually run/use it - not directly counted)
5. Retention       -> PROXY ONLY: returning GitHub traffic, issues over time  (Section 4a)
6. Advocacy        -> stars, forks, unprompted mentions/shares, issues/PRs    (Section 2a)
```

### 4a. Why steps 4 and 5 are proxies, not direct counts

Because the app itself is not instrumented (Section 1), "did someone actually start a game" and
"did someone come back a second time" cannot be measured directly with any confidence. Two honest,
non-invasive proxies stand in:

- **GitHub clones** (Insights > Traffic) undercounts real usage (most people use the hosted version,
  not a local clone) but is a genuine signal that at least some visitors intend to run it themselves
  - which, for a project whose main pitch is local-first, is a meaningfully engaged subset.
- **Issues, discussions, and PRs from people who are not the maintainer** are a slower but far more
  reliable activation+retention signal: nobody files a bug against a pattern-detection edge case
  without having actually played several reviewed games.

If a more precise activation number becomes genuinely important later, the honest way to get it
without breaking the local-first promise is an **explicit, opt-in, disclosed** mechanism - for
example a visible "help improve this - share anonymous usage stats" toggle, off by default, that a
user turns on deliberately. That is a real feature to propose to whichever workstream owns the app,
not something to retrofit silently. It is out of scope for this marketing campaign to build, and is
noted here only so "we could measure this properly, on the user's terms, later" is on the record
rather than treated as impossible.

---

## 5. Reporting cadence

- **Launch week:** check all Section 2b per-channel dashboards and the GoatCounter landing-page
  numbers daily for the first 72 hours (this is when a Show HN or Product Hunt run lives or dies),
  then every 2-3 days through the rest of week 1.
- **Month 1:** check GitHub stars/forks/traffic and GoatCounter weekly.
- **Ongoing:** monthly GitHub check-in; no dedicated per-channel checking once the launch-week posts
  have aged out of any platform's front page/new queue.

---

## 6. Targets - week 1, month 1, month 3

These match CAMPAIGN.md Section 1, which is itself aligned with docs/LAUNCH.md's own "Success
metrics" section (written the same day the repo went public, from a real 0-stars/0-visitors
starting point - treat it as the authoritative source if any of these three documents ever drift).

### Week 1

- **50-150 unique visitors** to the hosted app (via landing.html click-through plus direct channel
  links that bypass the landing page). This is the single most likely number to swing hard in either
  direction depending on whether one channel - almost certainly Show HN or r/chess if either does
  well - actually catches on. A single HN front-page hour can plausibly beat the high end of this
  range by an order of magnitude for 24-48 hours; without that, expect the low end.
- **3-10 GitHub stars.** Realistic range for a first-time, no-existing-audience launch. Anything
  materially above 10 in week 1 specifically means a channel outperformed the typical outcome - a
  genuinely good result, not the plan to bank on.
- **10-30 people who actually play or import a game** (not just land on the page) - the
  `click:open-app` event plus direct-link visits inferred from GoatCounter referrer data for
  channels that link straight to index.html instead of the landing page is the closest available
  proxy for this (see Section 4a on why it is a proxy, not a direct count).
- **0-2 pieces of direct, unprompted feedback** (an issue, a comment, a DM) - deliberately a small
  number; this is real signal, not something to inflate expectations around.
- **HN and Reddit specifically:** points/upvotes in the tens to low hundreds is the realistic range
  for genuine engagement without guaranteeing a front page. A large fraction of Show HN posts never
  leave the "new" queue at all - see show-hn.md's own note on this. Plan for that outcome, not around
  it.

### Month 1

- **300-1,000 cumulative unique visitors; 50-150 people who reach "activated"** (finished at least
  one reviewed game).
- **20-50 GitHub stars total**, a handful of issues or PRs from real users who are not the
  maintainer. Treat anything past 100 as an upside case driven by one channel genuinely hitting (a
  Show HN front-page run, or a large subreddit thread landing unusually well), not as the plan.
- **5-15 structured feedback responses** - this is not passive; it assumes docs/LAUNCH.md's "First
  10 users" one-to-one outreach plan (personal network plus self-identifying threads, 6 structured
  questions, asynchronous) actually runs, not just inbound feedback arriving unprompted.
- **Maybe 1-3 organic, unprompted mentions elsewhere** by month 1's end.
- **A small number of newsletter/notify-me signups** if the "notify me" mechanism referenced in
  email.md exists by then - realistically low tens, not hundreds, for a page with no existing
  audience. If that mechanism does not exist yet, this number is simply zero and that is fine; do
  not report a fabricated figure in its place.
- **Forks in the single digits to low teens** - Ramify is a finished app people use, not a library
  others build on top of, so fork count should be read as "developers curious about the
  architecture," not as a health metric on its own.
- No paid tier should exist yet at this point per BUSINESS.md's own roadmap, so $0 revenue here is
  normal, not a warning sign.

### Month 3

- **1,000-4,000 cumulative unique visitors; 150-400 activated users.**
- **60-150 GitHub stars.** The AI-agent-fleet build story is the single biggest lever on the upside
  of this range, since dev.to/build-story content has a longer natural shelf life (it gets cited
  later in "how to use AI agents" roundups) than launch-day content does - see CAMPAIGN.md Section
  4. Durable, low-effort channels also compound here: search plus link shares rather than
  campaign-driven spikes, plus a possible second pickup (inclusion in an "awesome-chess"/"best free
  chess tools" list, or a chess YouTuber mention per CAMPAIGN.md Section 3's channel 6).
- **A measurable weekly-return rate among activated users** - target simply having a real number;
  10-20% would be a reasonable early signal, not a benchmark this space has established norms for.
- **2-5 unprompted mentions or shares** - people who talk about it without being asked to. This is
  deliberately a small number; it is also one of the only numbers in this document that cannot be
  gamed or rushed, which is exactly why it is worth tracking (search "chess-local-learning" or
  "Ramify chess" periodically on X/Reddit/HN search, or watch GitHub referrer traffic in Insights for
  unfamiliar domains).
- **If the monetisation seams from BUSINESS.md have shipped by this point** (not expected as part of
  this launch), a realistic, not hopeful, expectation would be 5-25 paying subscribers and roughly
  $20-150 MRR. Frame month 3 honestly as "a validated hobby project with early signal," not a
  business yet - real conclusions about revenue need 6-12 months of data, not 3.

---

## 7. What "success" looks like without a vanity number

Because this is a free tool with nothing to sell, the two metrics worth caring about most are not
in the tables above: whether the issues that get filed are about real product gaps (meaning people
engaged deeply enough to hit them), and whether anyone who was not asked to say something positive
says something positive anyway. Both of those are worth more than any single stars/upvotes number,
and neither can be rushed or bought.
