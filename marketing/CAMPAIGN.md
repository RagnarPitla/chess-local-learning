# Campaign Plan - Ramify

This is the actual plan: what happens, in what order, on which channel, with what effort, and what
"working" looks like. Pairs with POSITIONING.md (the message) and METRICS.md (the numbers and
instrumentation). Copy referenced below lives in marketing/COPY/; assets in marketing/ASSETS/.

This is a solo-maintainer, zero-budget, nights-and-weekends launch for a free niche developer tool.
The plan is sized for that reality, not for a funded team. See METRICS.md for why the targets are
deliberately modest.

---

## 1. Goals

Primary goal: get the tool in front of people who have the exact "memorised a line, opponent
deviated, had nothing" problem, and get honest feedback that improves it. This is a training tool
launch, not a fundraising or acquisition event - there is nothing to sell, so "success" is usage,
issues filed, and stars/forks as a proxy for "someone thought this was worth bookmarking."

Secondary goal: tell the "built by a fleet of AI agents working in parallel" story well enough that
it earns rbuild.ai credibility with an AI-engineering audience, without it overshadowing the first
goal or reading as a stunt.

Numeric targets below are aligned with docs/LAUNCH.md's own "Success metrics" section (written the
same day the repo went public, from a real 0-stars/0-visitors starting point) so this campaign and
that plan do not quote two different numbers for the same launch. METRICS.md repeats and expands on
these with the funnel and instrumentation detail; treat docs/LAUNCH.md as the source if the two ever
drift.

- Week 1: 50-150 unique visitors to the hosted app; 10-30 people who actually play or import a game
  (not just land on the page); 3-10 GitHub stars; 0-2 pieces of direct, unprompted feedback. A
  genuinely front-page Show HN or Reddit hit would beat the high end of this by an order of
  magnitude for 24-48 hours - that is a real possible outcome, not the plan to bank on.
- Month 1: 300-1,000 cumulative unique visitors; 50-150 people who reach "activated" (finished at
  least one reviewed game); 20-50 GitHub stars; 5-15 structured feedback responses (see docs/
  LAUNCH.md's "First 10 users" plan - a concrete one-to-one outreach method, not just waiting for
  inbound); treat anything past 100 stars in month 1 as an upside case (a channel genuinely hitting),
  not the plan.
- Month 3: 1,000-4,000 cumulative unique visitors; 150-400 activated users; 60-150 GitHub stars; a
  measurable weekly-return rate among activated users (10-20% would be a reasonable early signal,
  not an established benchmark); 2-5 unprompted mentions/shares from people who were not asked to
  post.

---

## 2. Phased timeline

### Phase 0 - Pre-launch (the week before)

Goal: everything works cold, for a stranger, with no context, on the first try.

- [ ] **Hard gate, per docs/LAUNCH.md: do not launch publicly before "ui-integration" lands** (the
      live variation panel and the Learn, Library, and Progress tabs actually wired into the UI a
      visitor sees, not just present as backend modules). Launching before that means promoting
      features nobody can find, and directly conflicts with POSITIONING.md's own dropped-claims
      list, which already excludes the Explorer/Progress tabs for exactly this reason. Re-check this
      dependency's status immediately before executing anything else in this checklist.
- [ ] Also per docs/LAUNCH.md: before any public post, work through its "First 10 users" plan
      (one-to-one outreach with the 6 listed questions, via personal network and existing
      self-identifying threads) - a broken first impression with 5 people you know is a bug to fix;
      a broken first impression on Hacker News or Reddit is very hard to undo.
- [ ] Confirm the hosted build at https://ragnarpitla.github.io/chess-local-learning/ loads, plays
      a full game, reviews a pasted PGN, generates a drill, and shows the profile - with nothing
      but the empty-state copy already in `public/index.html` guiding a first-time user.
- [ ] Run `npm test` and `npm run test:e2e` clean (owned by other workstreams - confirm, don't fix).
- [ ] Confirm README.md's Quick Start actually matches the hosted experience (no "clone this repo"
      step is needed if the whole point is a hosted link - the README's `npm install && npm start`
      instructions are for self-hosting / development, and copy should be clear about which path
      it's recommending for which audience).
- [ ] Take real screenshots/recording of the actual running app for the YouTube script, the
      Product Hunt gallery, and social cards - do this last, after any final UI changes land, so
      visuals match what a visitor actually sees. (The SVG assets in ASSETS/ are illustrative
      diagrams, not screenshots, and don't depend on this.)
- [ ] Have the dev.to post and README's architecture section reviewed by someone who did not build
      it, for the "does this actually make sense to a stranger" check.
- [ ] Decide and lock the repo's public visibility and the About/social-preview image on GitHub
      (use `marketing/ASSETS/og-image.svg`, rasterised per `marketing/ASSETS/rasterise.md`).
- [ ] Personalize marketing/COPY/show-hn.md in the owner's own words before posting - Hacker News'
      guidelines explicitly ask that HN not be used for posted/edited AI-generated text ("Don't
      post generated text or AI-edited text. HN is for conversation between humans." -
      news.ycombinator.com/newsguidelines.html). Treat every file in COPY/ as a strong first draft
      written with full product context, not a copy-paste final for HN specifically. This
      instruction is repeated at the top of show-hn.md itself.
- [ ] Pre-register analytics per METRICS.md so day 1 traffic is actually captured.

### Phase 1 - Launch week

Sequencing matters more than volume. Order below is deliberate - see Section 4 for why.

| Day | Action |
|---|---|
| Mon | Post to the Lichess forum (Off-Topic or a relevant study/analysis-adjacent board per its rules - see marketing/COPY/lichess-forum.md) and the r/chess weekly "free talk"/simple-questions thread if one is running, low-key, as a first real-world signal before the bigger swings. |
| Tue (early, ~12:01am PT per HN norms) | Show HN post (marketing/COPY/show-hn.md). Stay on the thread all day, answer everything, do not paste canned replies. |
| Tue | Product Hunt launch (marketing/COPY/product-hunt.md) same day as HN so the two audiences cross-pollinate instead of splitting attention across two separate days. |
| Tue | X/Twitter launch thread goes out once the HN post is up (marketing/COPY/twitter-x-thread.md), linking the Show HN thread rather than duplicating the pitch, so HN gets the primary conversation. |
| Wed | r/chess post once the account has had a day of normal participation on the sub if it hasn't already (see reddit-chess.md for the exact rule this satisfies). |
| Thu | LinkedIn post from the owner (marketing/COPY/linkedin.md) - this is where the AI-build story leads, aimed at the rbuild.ai audience. |
| Fri | dev.to technical post goes live (marketing/COPY/dev-to-blog-post.md), cross-posted to the X thread as a reply, not a new thread. |
| Throughout | r/chessbeginners only if modmail approval is obtained first (see reddit-chessbeginners.md - this subreddit's rule is stricter than r/chess's, and the plan assumes it may not run at all in week 1). |
| Throughout | Discord: post in relevant chess Discord servers' own "show and tell" / resources channels only, never general chat (see discord.md). |

### Phase 2 - First month

- Week 2: reply to every GitHub issue within a day or two; ship at least one visible fix or
  improvement that came directly from launch-week feedback, and say so when you ship it (in the
  issue, not as a new marketing push).
- Week 2-3: the email sequence (marketing/COPY/email.md) goes out to anyone who signed up during
  launch week - the launch announcement first, then the 3-part onboarding sequence spaced a few
  days apart.
- Week 3: a short "what changed based on your feedback" update, posted only where the original
  post lives (a comment/edit on the Show HN thread, a GitHub release note) - not a new round of
  posts on every channel. Re-posting the same launch across channels reads as spam; a follow-up
  that references real feedback reads as engagement.
- Week 4: re-assess. If a channel produced nothing (see METRICS.md funnel), do not repeat it
  identically in month 2 - change the angle or drop it.

### Phase 3 - Ongoing

- Treat the dev.to post and README as the permanent front door for organic/search traffic - keep
  them accurate as the product changes; this is the highest-leverage low-effort channel long-term.
- Any future feature (the Explorer/Learn tab once wired - see POSITIONING.md's dropped-claims
  section - is the obvious next one) gets its own small, single-channel announcement, not a full
  re-run of launch week.
- No recurring ad spend, no growth-hacking loops - this is a free tool for a niche audience;
  the plan is to be genuinely useful and let word of mouth (coaches recommending it to students in
  particular) compound slowly. See METRICS.md month-3 targets for why this is the honest framing.

---

## 3. Channel-by-channel strategy

Ordered by priority (expected return per unit of effort for a solo, zero-budget launch). This is a
different axis from *posting order* - Phase 1's day-by-day table already sequences the quieter,
community-embedded channels (Lichess forum, r/chess low-key participation) before the loud Show HN
moment, which matches docs/LAUNCH.md's own risk-ordered channel list ("your own network first,
quietly" then r/chess/r/chessbeginners, then Lichess forum/Discord, then Hacker News, then Product
Hunt) even though that document ranks by launch-day sequence rather than by expected-value-per-effort
the way the table below does. Read the two together: docs/LAUNCH.md answers "what do I post first,"
this table answers "what matters most if I can only do a few things well."

| Priority | Channel | Effort | Expected return | Why |
|---|---|---|---|---|
| 1 | Hacker News (Show HN) | Low to write, high to sustain (a full day of thread replies) | High variance: most Show HNs get little traction, but the audience match (developers who care about local-first, open source, testable architecture) is the best of any channel, and a front-page day can be the single biggest traffic event of the launch | POSITIONING.md section 5.3 audience lives here |
| 2 | r/chess | Low effort, rule-compliant thanks to the software-developer exemption (Rule 6 - see reddit-chess.md) | Medium-high: large, relevant, chess-literate audience; the subreddit explicitly welcomes free chess software from its developers | Directly the target audience (section 5.1) |
| 3 | dev.to | Medium effort (a real technical post, not a rehash) | Medium, compounding: technical posts on dev.to have long organic tails via search, and this is the natural home for the AI-build story | Serves both 5.3 and the AI-build amplification goal |
| 4 | Product Hunt | Low-medium effort, needs a maker account with some history and gallery assets ready | Medium: PH traffic is often shallow (browsers, not necessarily chess players) but a placement adds a durable, linkable page and some signal for rbuild.ai | Good for asset reuse (og-image, gallery), lower priority than HN/reddit for this specific audience |
| 5 | LinkedIn | Low effort (one real post from the owner) | Medium for the rbuild.ai brand goal specifically, low for direct product usage - LinkedIn is not where chess improvers hang out | This is the AI-and-engineering angle channel, not a chess-audience channel - success here looks like rbuild.ai credibility, not app traffic |
| 6 | X/Twitter | Low effort once POSITIONING.md exists (thread is mostly assembly) | Low-medium, very audience-dependent (depends entirely on whether the owner's existing following includes any developers/chess players) | Cheap to run in parallel with HN, low downside |
| 7 | Lichess forum | Very low effort, narrow scope by design | Low reach but very high relevance and goodwill if done inside the rules (must not read as an ad - see lichess-forum.md) | Small, safe, first real-world signal before bigger launches |
| 8 | dev communities' Discords | Low effort per server, must be done manually per-server rules | Low-medium, highly variable by server culture | Only worth it in servers with an explicit self-promo/showcase channel |
| 9 | r/chessbeginners | Low effort to write, real risk of removal (strict no-self-promo rule, no developer exemption like r/chess has) | Low expected direct return relative to risk; potentially good fit for the audience if it survives | Gated on modmail approval first - see reddit-chessbeginners.md; treat as optional, not core to the plan |
| 10 | Email list | None at launch (no list exists yet) | Deferred - this is an onboarding/retention channel for whoever opts in during launch, not an acquisition channel | Sequence is ready (email.md) for whenever a signup mechanism exists; do not treat "build an email list" as a pre-launch blocker |
| 11 | YouTube | High effort (filming, editing) relative to a text-only launch | Low-medium short term, potentially the best long-term search asset for "how to actually improve at chess" style queries | Script is ready (youtube.md); realistic to ship in month 1, not launch week, given the effort |

---

## 4. Sequencing the "built by an AI agent fleet" story

The brief is explicit that this is a real, interesting story worth telling. It is also explicit
that the product's own positioning spine (trees vs. graphs) must lead. Here is why, and exactly
how the two are sequenced so the AI story amplifies instead of distracting or - worse - triggering
the skepticism that AI-built software currently attracts in some technical communities (security
and "is this sustainable" concerns are a live, documented sentiment on Hacker News and elsewhere
around "vibe coded" software in 2025-2026; see the research note in METRICS.md's assumptions).

**Rule: the product's usefulness is the headline everywhere a chess audience is present. The build
story is the headline only where the audience came specifically for an AI/engineering story.**

- **r/chess, r/chessbeginners, Lichess forum, YouTube:** the build process is not mentioned in the
  primary pitch at all, or gets one restrained sentence at most ("built with a lot of AI-assisted
  coding, more on that on the blog if you're curious"). Chess players came for chess help; leading
  with "an AI fleet built this" answers a question they did not ask and invites "so no human
  actually checked this?" as the first reaction instead of "does this fix my actual problem?"
- **Show HN:** the product leads (per HN's own guidelines - Show HN is for something people can try,
  not a process story), but the build process is fair game as an honest answer *in the comments*
  when asked - and on a thread full of engineers, it will be asked. show-hn.md's body includes one
  factual, unhyped line about the build process near the end, positioned as texture, not the pitch,
  with the caveat that the source and test suite are the actual proof, not the AI-built claim itself.
- **dev.to:** the build story is the whole post. This is the one channel where "how we built this
  with a fleet of AI agents working in parallel" is the primary headline, because the audience
  opted into a technical deep-dive and the AI-native build process is itself the most interesting
  technical fact about this particular project.
- **LinkedIn:** the build story leads, explicitly framed through rbuild.ai's own positioning
  (enterprise AI adoption, agent-driven workflows) - this is the one channel where the story is
  doing double duty for the company, not just the product.
- **X/Twitter:** two separate threads, not one. The launch thread (product-first, links the Show
  HN post) and a second, later-in-the-week standalone thread specifically about the build process,
  written to stand alone and link to the dev.to post. Do not merge them - a thread that tries to be
  both a product launch and an "AI built this" reveal undersells both.
- **Product Hunt:** the tagline and description are product-first; the first comment (which is
  where makers naturally tell an origin story on PH) includes one paragraph on the build process,
  because PH's audience expects and rewards a maker's-story first comment.

---

## 5. Content calendar (launch month, at a glance)

| When | What | Where | File |
|---|---|---|---|
| T-7 to T-1 | Pre-launch checklist (Section 2, Phase 0) | Internal | this file |
| T-3 | Soft post, low-key | Lichess forum | COPY/lichess-forum.md |
| T-0 (Mon) | Weekly-thread mention if timing allows | r/chess weekly thread | COPY/reddit-chess.md (adapt to thread format) |
| T-1 (Tue, 12:01am PT) | Show HN | Hacker News | COPY/show-hn.md |
| T-1 (Tue) | Launch | Product Hunt | COPY/product-hunt.md |
| T-1 (Tue) | Launch thread | X/Twitter | COPY/twitter-x-thread.md |
| T-2 (Wed) | Full post | r/chess | COPY/reddit-chess.md |
| T-3 (Thu) | AI-build angle post | LinkedIn | COPY/linkedin.md |
| T-4 (Fri) | Technical deep-dive | dev.to | COPY/dev-to-blog-post.md |
| T-4 (Fri) | Build-story thread | X/Twitter | COPY/twitter-x-thread.md (standalone posts) |
| T-5 to T-7 | Discord posts, as appropriate per server | 2-4 chess/dev Discords | COPY/discord.md |
| Week 2 | Modmail request, then post only if approved | r/chessbeginners | COPY/reddit-chessbeginners.md |
| Week 2-3 | Onboarding sequence to launch-week signups | Email | COPY/email.md |
| Week 3 | "What changed" follow-up on the original threads only | HN comment, GitHub release | n/a - not a new post |
| Month 1 (flexible) | Demo video | YouTube | COPY/youtube.md |

This calendar is a plan, not a promise - see Section 2's note on re-assessing channels that produce
nothing rather than mechanically repeating them.

---

## 6. What "done" looks like for this campaign

Not "went viral." Specifically:

1. Every piece of copy in COPY/ has actually been posted, or a documented reason exists for
   skipping it (e.g., r/chessbeginners modmail declined).
2. METRICS.md's instrumentation is live before T-1, so week 1 numbers are real, not reconstructed.
3. At least one piece of unsolicited, real feedback (an issue, a PR, a comment that goes beyond
   "nice") has changed something in the product within the first month.
4. The AI-build story landed on dev.to/LinkedIn without derailing any of the chess-audience threads
   into a debate about AI coding instead of a discussion about the tool.
