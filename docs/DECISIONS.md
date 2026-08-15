# Decisions

Choices made while building this project that a future reader would otherwise
have to reverse-engineer from the code. Each entry records what was decided,
why, and what would have to change to undo it.

This is a decision log, not documentation. For what the product does, see
`PRODUCT.md`. For dependencies and licences, see `CREDITS.md` and
`RESOURCES.md`.

---

## 1. The product is called Ramify; the repository is not renamed

**Decided:** the product name, used in the interface, the landing page and all
marketing copy, is **Ramify**. The GitHub repository, the npm package name and
the deploy base path stay `chess-local-learning`.

**Why:** "ramify" means to branch, which is the entire thesis of the product -
lessons teach one line, real games branch. A launchable product needs a name,
and the marketing material cannot be written without one. The repository slug
was left alone because it is load-bearing: it is the GitHub Pages base path,
it appears in the CI workflow, and renaming it invalidates every existing link
for a purely cosmetic gain. A product name differing from a repository slug is
normal and costs nothing.

**Not done:** no trademark clearance has been run. A search found no obvious
conflict for chess or developer software, but note that an unrelated French
financial-services company also uses the name. Classes differ, so this is
probably fine, but **this is not legal advice and no clearance search was
performed.** Do a proper search before spending money on the brand or filing
anything.

**To undo:** rename the repository on GitHub (it will redirect), update
`--base` in `.github/workflows/pages.yml`, and update `name` in
`package.json`.

---

## 2. The landing page is the site root; the trainer lives at `/app/`

**Decided:**

```
/               the landing page
/app/           the trainer
/landing.html   alias, kept so older links resolve
```

**Why:** a visitor arriving at the bare domain was getting an unlabelled
chessboard with no indication of what it was or why it existed. The
explanation existed but was parked where nobody would find it.

**The important part:** the development server and the static build implement
the *same* shape. An earlier plan reshaped only the deploy artifact, which
would have meant every internal link had to be written and tested twice -
exactly how a broken link reaches production. `server.js` serves
`landing.html` at `/` when it exists, and `/app/` resolves through the
pre-existing extensionless SPA fallback, so no new route was needed.

The landing page's call-to-action links are authored as `./index.html` so they
work in development. The build rewrites them to a base-aware `/app/` and hard
fails if it finds zero such links before the rewrite (the app would be
unreachable from the home page) or any remaining after it.

**To undo:** remove the routing step in `scripts/build-static.mjs`, revert the
root-document selection in `server.js`, and point `APP_URL` in
`scripts/smoke.mjs` back at the origin.

---

## 3. The board renders original artwork, not the bundled piece set

**Decided:** `public/js/board.js` renders this repository's own
`public/assets/pieces/faceted.svg`, released under this project's MIT licence.

**Why:** cm-chessboard's bundled `staunty.svg` is licensed **CC BY-NC-SA 4.0**.
The NonCommercial term is incompatible with an MIT project intended to support
commercial use. This does not endanger the surrounding code - a Creative
Commons licence on an image does not infect a codebase that merely loads it -
but it did mean the default visual identity of the product could not legally
be used commercially, including in paid screenshots or advertising.

**Enforced, not just fixed:** `scripts/build-static.mjs` excludes
`staunty.svg` from `dist/`, and `npm run build:check` fails if any file
carrying a `BY-NC` or `NonCommercial` licence string reaches the deploy
artifact. The fix cannot silently regress.

**Deliberately kept:** `standard.svg` (CC BY-SA 3.0, Cburnett/Rfc1394) still
ships. It permits commercial use with attribution, which `CREDITS.md`
provides, and it is cm-chessboard's own documented default - removing it risks
breaking a fallback path inside the library.

**Detail worth keeping:** the sprite is referenced as
`new URL('../assets/pieces/faceted.svg', import.meta.url).href` rather than a
root-absolute `/assets/pieces/faceted.svg`. cm-chessboard uses a path verbatim
when it is absolute and otherwise joins it to `assetsUrl`; resolving against
`import.meta.url` produces a fully-qualified URL that also survives a sub-path
deploy such as `https://user.github.io/repo-name/`, where a root-absolute path
would 404.

---

## 4. The opening book is bundled at build time, not fetched from an API

**Decided:** `scripts/build-eco.mjs` compiles the Lichess ECO tables into
`public/data/openings-data.js` (3,810 named lines, 8,653 nodes, max depth 36,
around 348 KB, roughly 13 ms to import). Live opening statistics are a
progressive enhancement.

**Why:** `explorer.lichess.ovh` returns **HTTP 401** from this machine and from
many networks - an upstream block, not a real authentication requirement. The
variation explorer is the headline feature, so it cannot depend on an endpoint
that is unreachable for an unknown fraction of users. Bundling also makes the
feature work offline and removes a per-keystroke network round trip.

**Cost:** the book is a build-time snapshot and goes stale. Re-run
`npm run build:eco` to refresh it.

---

## 5. Cloudflare Pages is the recommended free host, not Vercel

**Decided:** Cloudflare Pages, with Vercel config retained as an alternative.

**Why:** Vercel's Hobby tier is contractually limited to non-commercial use.
The owner intends to monetise this eventually, so recommending Hobby as the
default would set up a terms violation the moment that happens. Cloudflare
Pages' free tier has no equivalent restriction. GitHub Pages also works and is
wired up in CI, but cannot run the coaching function.

---

## 6. Light is the only automatic theme

**Decided:** the product is light-only. Dark tokens are retained but only
apply under an explicit `:root[data-theme="dark"]`, which nothing currently
sets.

**Why:** measured in a real browser reporting a dark colour-scheme
preference, the landing page computed to white while the trainer computed to
black - one product rendering as two in a single session, because the theme
layer had an automatic `prefers-color-scheme` inversion and the landing
stylesheet did not. The product must also match `rbuild.ai`, which is
light-only. The owner's instruction was explicit: "use the same white clean
theme."

**To undo:** set `data-theme="dark"` on the root element and add a control for
it. The token values are already written.

---

## 7. Coaching is bring-your-own-key

**Decided:** `/api/coach` accepts a caller-supplied key via `x-coach-key`, with
`x-coach-provider`, `x-coach-model` and an SSRF-guarded `x-coach-base-url`.
Server-side environment keys are a fallback, not the primary path. Without any
key the product falls back to an offline rules-based coach and stays fully
usable.

**Why:** it keeps the hosted product free to run at any scale, since users who
want language-model coaching pay their own provider directly, and it keeps the
core product working with no account and no network.

**Guards:** 512-character key cap, 32 KB body cap, 20 second timeout, https
only.

---

## 8. File drop is the promoted import path

**Decided:** PGN file drop and paste are presented first; Chess.com and
Lichess username fetch are offered alongside.

**Why:** measured from a real browser, the Chess.com public API is fully
CORS-open and parsed 923 real games with zero errors. Lichess's
`/api/games/user/{username}` returned **HTTP 404** for verified accounts from
this environment, most likely a datacentre-IP mitigation. An import flow whose
headline path fails for some users is worse than one that leads with the path
that always works. A PGN file works regardless of site, network or account.

---

## 9. Stockfish is used unmodified, as a runtime dependency

**Decided:** ship the lite single-threaded WebAssembly build, unmodified, and
credit it as GPL-3.0.

**Why:** GPL-3.0 obligations attach to distributing modified Stockfish or
linking it into a derived work. Loading an unmodified engine binary at runtime
and communicating over UCI does not make this codebase a derivative work, so
the MIT licence on this repository stands. Do not patch the engine without
revisiting this.

**Corrected along the way:** `RESOURCES.md` originally recorded Stockfish as
GPL-2.0 in five places. It is GPL-3.0, confirmed against the installed
package's own licence file.

---

## 10. Full builds are excluded from the deploy artifact by allowlist

**Decided:** `scripts/build-static.mjs` copies Stockfish files by explicit
allowlist and never mirrors the engine's `bin/` directory.

**Why:** that directory also contains multi-threaded full builds totalling
around 113 MB. An accidental directory copy would produce an artifact far past
every host's practical limit. The allowlist, the per-file size ceiling and the
total-size ceiling exist to make that failure loud at build time rather than
at deploy time.
