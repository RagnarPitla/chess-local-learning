# Credits and licence ledger

This is the complete ledger of everything this project stands on: every
runtime and build dependency, every dataset, every design asset, and every
external API it calls. Versions and licences below were read directly from
`package.json`, `package-lock.json`, and the `package.json`/`LICENSE` files
inside `node_modules`, not assumed from memory. Where a claim could not be
verified against the repository as it exists right now, it is marked
explicitly rather than asserted.

**If you read one section, read "Licence compliance gaps" near the bottom.**
There is a real one.

This project (`chess-local-learning`) is licensed **MIT** - see `LICENSE`.

## 1. Runtime dependencies

Read from `package.json` and cross-checked against `package-lock.json` and each
package's own `package.json`. `npm ls --all` confirms all three are leaf
packages - there are no transitive dependencies at all.

| Package | Version (locked) | Licence | Role |
|---|---|---|---|
| `stockfish` | 18.0.8 | **GPL-3.0** | Chess engine, compiled to WASM, loaded at runtime |
| `chess.js` | 1.4.0 | BSD-2-Clause | Move generation, legality, PGN/FEN parsing |
| `cm-chessboard` | 8.12.19 | MIT | Board rendering, move input, promotion dialog |

## 2. Build/dev dependencies

**None.** `package.json` has no `devDependencies` key, and `package-lock.json`
marks nothing as `dev: true`. Testing uses Node's built-in `node --test`
(`scripts/logic.test.js`) and a hand-written CDP client over Node's built-in
`WebSocket` (`scripts/smoke.mjs`) - no Jest, Mocha, Playwright, Puppeteer, or
any other package. This is a real, verifiable "zero automation dependency"
claim: `node_modules/` contains exactly three top-level directories
(`chess.js`, `cm-chessboard`, `stockfish`) and nothing else.

## 3. Stockfish - the one that needs care

Stockfish is **GPL-3.0** (confirmed in `node_modules/stockfish/package.json`,
in the bundled `node_modules/stockfish/Copying.txt`, and in the upstream
`stockfish.js` README, which states "Stockfish.js (c) 2026, Chess.com, LLC.
GPLv3"). It is authored upstream by the official Stockfish team, packaged as a
WASM build by Nathan Rugg (`nmrugg/stockfish.js`), with build sponsorship
credited to Chess.com.

**It ships as a separate compiled artifact, not linked into this MIT code.**
Concretely: `node_modules/stockfish/bin/` contains standalone `.js` + `.wasm`
pairs (the `lite-single` build used by default is about 7.0 MiB; the full
multi-threaded build is over 100 MiB). `server.js` mounts that directory at
`/vendor/stockfish/` and the browser loads it as an independent Web Worker
that talks to the app over the UCI text protocol
(`public/js/engine.js`) - none of this project's own JS `import`s Stockfish's
source, links its object code, or modifies it in any way.

**Why the distinction matters:** GPL's copyleft obligation is triggered by
distributing a *combined or derivative work*. Running an unmodified GPL
program as a separate process/worker and talking to it over an external
protocol (what the FSF's own GPL FAQ discusses under "mere aggregation") is
the long-standing convention that lets permissively-licensed chess GUIs and
web apps ship alongside Stockfish - this is exactly what `LICENSE` in this
repo already states: "This project loads Stockfish ... as an unmodified
runtime dependency from node_modules." That existing sentence is doing real
work and should not be weakened or removed.

**What this does NOT let you do:** modify Stockfish's source and ship your
fork without GPL-3.0 on the modified parts, or strip its licence text out of a
distribution that includes the binary. Both `node_modules/stockfish/Copying.txt`
and this repo's own `LICENSE` file already point at Stockfish's licence, which
is the correct baseline. **I am not a lawyer, and the aggregation-vs-derivative
line in GPL law is fact-specific** - if this project is ever sold rather than
given away under its current MIT-plus-bundled-GPL-runtime shape, get an actual
legal opinion before relying on the "separate program" reading above.

## 4. chess.js and cm-chessboard

Both are straightforward, permissive, and already correctly attributed in the
top-level `LICENSE` file.

- **chess.js** (BSD-2-Clause, Jeff Hlywa): requires only that the copyright
  notice and licence text be retained in redistributions. No further
  obligation.
- **cm-chessboard** (MIT, Stefan Haack / shaack): requires the MIT copyright
  notice be included in copies. This MIT grant covers the library's *code* -
  the JS and CSS. It does **not** automatically cover every asset the library
  bundles; see the next section.

## 5. cm-chessboard's bundled piece art - separate licences from the code

`node_modules/cm-chessboard/assets/pieces/` ships two SVG sprites, and each
carries its own licence header, distinct from cm-chessboard's MIT code
licence:

- `staunty.svg` - "The lila Staunty pieces set from
  `github.com/ornicar/lila/tree/master/public/piece/staunty`, modified by
  shaack for use in cm-chessboard." Header states:
  **License: Attribution-NonCommercial-ShareAlike 4.0 International
  (CC BY-NC-SA 4.0)**.
- `standard.svg` - "copies from Wikimedia Commons ... modified by shaack."
  Header states: **License: Attribution-ShareAlike 3.0 Unported
  (CC BY-SA 3.0)**, authors `en.wikipedia.org/wiki/User:Cburnett` and
  `User:Rfc1394`.

`public/js/board.js` now configures the board with this project's own
selected sprite - `pieces: { file: new URL('../assets/pieces/design-1.svg',
import.meta.url).href }`. **Neither vendored set above is rendered to users.**
`staunty.svg` is additionally excluded from the deploy artifact by
`scripts/build-static.mjs`. See "Licence compliance gaps" below.

## 6. Original design assets in this repository

- `public/assets/pieces/faceted.svg` and `public/assets/pieces/silhouette.svg`
  - hand-authored SVG polygon paths (a monochrome/grayscale "faceted low-poly"
    style; the file's own `<title>` reads "Faceted low-poly chess piece
    sprite"). This does not resemble either of the vendored sets above and is
    original work produced for this project. `public/assets/pieces/README.md`
    now exists and explicitly releases both files under this repository's MIT
    licence. They remain available as project-owned vector alternatives.
- `Resources/Design-1/*.png` and `public/assets/pieces/design-1.svg`
  - owner-directed, owner-provided AI-assisted artwork generated for Ramify,
    selected by Ragnar and included with the owner's approval. The source
    renders are preserved outside the deploy tree. The active SVG embeds
    transparent normalized tiles produced by
    `scripts/build-design1-sprite.py`.
- **White-theme design system / shadcn/ui palette:** the light restyle has
  since landed. `public/css/theme.css` defines the token layer and
  `public/css/styles.css` and `public/css/landing.css` both consume it, using
  the pure-neutral greyscale token values (`--background:#ffffff`,
  `--foreground:#0a0a0a`, `--primary:#171717`, `--muted-foreground:#737373`,
  `--border:#e5e5e5`, `--radius:0.5rem`) taken from the owner's own site at
  `rbuild.ai`. No shadcn package is installed and none appears in
  `package.json` or `node_modules` - shadcn/ui is used here purely as a
  design-token convention, not as a code dependency. shadcn/ui is itself
  MIT-licensed, so no attribution is legally required; it is named here for
  provenance only.
- **Marketing assets** (`marketing/ASSETS/`, referenced by the marketing
  campaign): no files found in that directory as of this writing.
- **No logo, favicon art credit needed beyond original work:**
  `public/assets/favicon.svg` exists; no separate licence header was found
  inside it, consistent with it being original project art rather than an
  imported asset. Flagged as unverified-provenance rather than asserted.

## 7. Data

| Source | Bundled or live? | Licence | Where |
|---|---|---|---|
| lichess-org/chess-openings (ECO TSVs) | **Bundled**, generated | CC0-1.0 | `public/data/openings-data.js` (generated by `scripts/build-eco.mjs`; raw cache at `data/eco-source-cache.json`, gitignored, build-time only) |
| Lichess Puzzle Database | **Live API**, not bundled | CC0 | Fetched via `fetchLichessPuzzle` in `public/js/puzzles.js` against the Lichess puzzle API |
| Lichess general API (game export for import) | Live API | Usage terms apply (see section 8); game data itself is the user's own | `public/js/import.js` calls `https://lichess.org/api/games/user/{name}` |
| Chess.com PubAPI (game archives for import) | Live API | Chess.com terms apply; game data is the user's own | `public/js/import.js` calls `https://api.chess.com/pub/player/{user}/games/archives` |

The `public/data/openings-data.js` file header states its own provenance
directly: "Produced by scripts/build-eco.mjs from the lichess-org/chess-openings
ECO TSVs ..., licensed CC0-1.0 (public domain dedication)." That is confirmed
accurate against the upstream project's own licensing.

No bundled copy of the Lichess Puzzle Database, the Lichess Open Database, or
any third-party PGN collection (TWIC, PGN Mentor, Caissabase, Lumbra's
Gigabase) was found anywhere in this repository. `docs/RESOURCES.md` catalogues
those sources for reference and is explicit that several of them (TWIC, PGN
Mentor) are personal-use-only and must not be bundled - correctly, that advice
has been followed; none of them are present.

## 8. APIs used at runtime

- **Lichess API** (`lichess.org/api/...`) - CORS-enabled, no auth required for
  the endpoints this app calls. Documented rate limits: roughly 20 req/s
  anonymous, best practice is one request at a time, and a 429 response should
  back off a full 60 seconds before retrying. Used for the puzzle API and for
  bulk game import of a user's own games.
- **Chess.com Published Data API** (`api.chess.com/pub/...`) - no auth
  required, but **no CORS support**, so calls must go through a server-side
  proxy rather than directly from the browser. Serial requests are the
  documented safe pattern; an identifying User-Agent is recommended for
  higher-volume use. Used for bulk import of a user's own game archive.

Both are used here only to pull a user's own data back to them (their own
games), not to bundle or redistribute Lichess's or Chess.com's proprietary
content (for example, Chess.com's own daily puzzle, which is explicitly
copyrighted and not reused here).

## 9. Licence compatibility with this project's MIT licence

| Dependency / asset | Licence | Compatible with MIT distribution? | Notes |
|---|---|---|---|
| chess.js | BSD-2-Clause | Yes | Permissive, notice-only obligation. Already credited in `LICENSE`. |
| cm-chessboard (code) | MIT | Yes | Same licence family. Already credited in `LICENSE`. |
| cm-chessboard bundled "staunty" piece SVG (**not used; excluded from `dist/`**) | CC BY-NC-SA 4.0 | **No, for commercial use** | NonCommercial term. Never rendered by this app and blocked from the deploy artifact by `scripts/build-static.mjs`, with a `build:check` assertion enforcing it. |
| cm-chessboard bundled "standard" (Wikimedia) piece SVG | CC BY-SA 3.0 | Yes, with conditions | Commercial use is allowed; requires attribution to Cburnett/Rfc1394 and that any adaptation stay CC BY-SA. Not the active default; retained only as the library's internal fallback. |
| `public/assets/pieces/design-1.svg` (**the active board sprite**) | Owner-provided AI-assisted project asset | Yes, with the owner's approval | Built from the owner-provided sources in `Resources/Design-1`. This provenance record is not a legal opinion about copyright in AI-assisted output. |
| `public/assets/pieces/faceted.svg` and `silhouette.svg` | MIT (this repo) | Yes | Original hand-authored vector artwork retained as alternative sets. |
| Stockfish (WASM engine) | GPL-3.0 | Yes, as an unmodified, separately-invoked runtime dependency | See section 3 in full. Do not statically link or modify it. Get a real legal opinion before any commercial distribution model changes. |
| lichess-org/chess-openings (ECO data) | CC0-1.0 | Yes, unconditionally | Public domain dedication. Attribution to Lichess is courteous, not required. |
| Lichess Puzzle Database | CC0 | Yes, unconditionally | Same as above; used live, not bundled. |
| Lichess API / Chess.com PubAPI | Provider terms, not a copyright licence | Yes, if terms/rate limits are followed | Applies to *usage*, not to this project's own code licence. Bundling Chess.com's own editorial content (as opposed to a user's own games) would not be compatible - this project does not do that. |

**Attribution text that must appear, and where it currently does:**

The top-level `LICENSE` file already states, correctly: MIT for this project;
Stockfish as an unmodified GPL-3.0 runtime dependency loaded from
`node_modules`; chess.js as BSD-2-Clause; cm-chessboard as MIT. `README.md`
repeats the same three under its own "Licence" heading. Both are accurate as
far as they go.

`README.md` points to this file as the full ledger. The NonCommercial Staunty
set is documented here because it remains present in the upstream dependency,
but it is neither rendered nor deployed. The active Design-1 provenance and
the CC0 opening/puzzle data are also recorded here so the product does not
depend on undocumented visual or data assets.

## 10. Licence compliance gaps

**Gap 1 - RESOLVED.** Previously, the chess piece artwork rendered to every
user of this app was `node_modules/cm-chessboard/assets/pieces/staunty.svg`,
licensed **CC BY-NC-SA 4.0 - NonCommercial**, which meant the default visual
identity of an MIT project intended to support commercial use was not itself
free for commercial use. `public/js/board.js` now renders the project-selected
`public/assets/pieces/design-1.svg`, the owner-provided sources and provenance
are recorded in `Resources/Design-1`, and
`scripts/build-static.mjs` both excludes `staunty.svg` from `dist/` and fails
`npm run build:check` if any file carrying a `BY-NC` / `NonCommercial` licence
string reaches the deploy artifact. Verified end to end: 40/40 headless-Chrome
checks pass with the new sprite rendering, and the build check reports
"no NonCommercial-licensed asset shipped in dist/".

`standard.svg` (CC BY-SA 3.0, Cburnett/Rfc1394) is deliberately still copied
into `dist/`, because it is cm-chessboard's own documented default and
removing it would break any fallback path inside the library. It permits
commercial use with attribution, which section 5 provides.

*The fix options, recorded as originally assessed:*

1. Render a project-supplied piece set instead of Staunty and record its
   provenance. **This is what was done:** Design-1 is active, while
   `faceted.svg` and `silhouette.svg` remain available as MIT-licensed vector
   alternatives.
2. Failing that, switch the default to cm-chessboard's other bundled sprite,
   `pieces/standard.svg` (CC BY-SA 3.0, Cburnett/Rfc1394 via Wikimedia), which
   does permit commercial use, and add the required attribution to `LICENSE`
   and `README.md`.
3. Do not ship `staunty.svg` as the default in any commercial context without
   a separate licence from the original artists, and do not use it in
   marketing screenshots for this project in the meantime.

**Gap 2 - RESOLVED.** `docs/RESOURCES.md` listed Stockfish as "GPL-2.0."
Stockfish is GPL-3.0, confirmed against the installed package's own metadata
and licence file (section 3). This does not change any actual compliance
posture - GPL-3.0 is the more restrictive of the two and the project already
treats Stockfish as an unmodified runtime dependency, which satisfies either
version's terms the same way - but the doc has now been corrected in all five
places so nobody copies the wrong SPDX identifier into a future notice file.

No other licence incompatibilities were found. The dependency tree is flat (3
runtime packages, 0 transitive, 0 dev dependencies), and every bundled dataset
found in the repository (the ECO TSV-derived data) is CC0.
