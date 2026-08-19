# Design system: Chess Local Learning

This document records the design system introduced when the app moved from a
dark theme to a clean, white, monochrome theme matching `rbuild.ai`. It is
the reference for anyone adding a new screen, component, or piece of copy so
the app keeps reading as one coherent product instead of drifting theme by
theme.

Owned files: `public/css/theme.css` (tokens, reset, base type, focus rings,
reduced motion), `public/css/styles.css` (every component rule), and this
file. `public/css/landing.css`, `public/index.html`, `public/js/**` and
`public/assets/**` belong to other work and are only referenced here for
context.

ASCII only throughout this file, by policy: no em dashes, no curly quotes, no
arrow glyphs (`->` is used instead).

## 1. Design intent

The brief: this app is going to sit inside `rbuild.ai`, so it must use that
site's exact shadcn/ui neutral palette, contain no "AI aesthetic" colour
(no purple, blue, teal, gradients or glows), and read as calm, editorial and
usable by everyone from the first load. White background, near-black text,
generous whitespace, 1px hairline borders, restrained type, minimal shadows.

The one deliberate exception is a small, tightly scoped set of five chess
feedback colours (good, inaccuracy, mistake, blunder, brilliant), used only
as small dots, chips, labels and thin border accents - never as a
background fill, never as decoration.

## 2. Palette

All values below are reproduced exactly from the compiled CSS of
`https://rbuild.ai` (a shadcn/ui site on the stock "neutral" theme). Nothing
here is invented; this is the non-negotiable source of truth for the
greyscale.

### 2.1 Light (default)

| Token | Hex | HSL | Role |
|---|---|---|---|
| `--background` | `#ffffff` | `hsl(0 0% 100%)` | Page background |
| `--foreground` | `#0a0a0a` | `hsl(0 0% 3.9%)` | Body text |
| `--card` | `#ffffff` | `hsl(0 0% 100%)` | Card / panel surface |
| `--card-foreground` | `#0a0a0a` | `hsl(0 0% 3.9%)` | Text on cards |
| `--popover` | `#ffffff` | `hsl(0 0% 100%)` | Popover / overlay surface |
| `--popover-foreground` | `#0a0a0a` | `hsl(0 0% 3.9%)` | Text on popovers |
| `--primary` | `#171717` | `hsl(0 0% 9%)` | Primary action fill (buttons, active tab, focus emphasis) |
| `--primary-foreground` | `#fafafa` | `hsl(0 0% 98%)` | Text on primary fill |
| `--secondary` | `#f5f5f5` | `hsl(0 0% 96.1%)` | Secondary surface (inputs, chips, hover fills) |
| `--secondary-foreground` | `#171717` | `hsl(0 0% 9%)` | Text on secondary surface |
| `--muted` | `#f5f5f5` | `hsl(0 0% 96.1%)` | Muted background tint |
| `--muted-foreground` | `#737373` | `hsl(0 0% 45.1%)` | Secondary / caption text |
| `--accent` | `#f5f5f5` | `hsl(0 0% 96.1%)` | Hover / highlight tint |
| `--accent-foreground` | `#171717` | `hsl(0 0% 9%)` | Text on accent tint |
| `--destructive` | `#ef4444` | `hsl(0 84.2% 60.2%)` | Reserved shadcn danger token (see 6.3 - not used as text this pass) |
| `--destructive-foreground` | `#fafafa` | `hsl(0 0% 98%)` | Reserved (see 6.3) |
| `--border` | `#e5e5e5` | `hsl(0 0% 89.8%)` | Hairline dividers, card borders |
| `--input` | `#e5e5e5` | `hsl(0 0% 89.8%)` | Form field borders |
| `--ring` | `#0a0a0a` | `hsl(0 0% 3.9%)` | Keyboard focus ring |
| `--radius` | `0.5rem` | - | Base corner radius |

Font stacks (dependency-free, no `@font-face`, no CDN):

```
--font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
```

### 2.2 Chess feedback colours (the only colour outside the neutral scale)

The owner's brief supplied a starting swatch and required every colour to
clear WCAG AA at the text sizes actually used. Three of the five needed to be
darkened one step to clear it; the other two already cleared it and are
unchanged. See section 7 for the measured numbers.

| Token | Brief value | Shipped value | HSL (shipped) | Changed? |
|---|---|---|---|---|
| `--good` | `#16a34a` | `#15803d` | `hsl(142.4 71.8% 29.2%)` | Darkened for AA |
| `--inaccuracy` | `#d97706` | `#b45309` | `hsl(26.0 90.5% 37.1%)` | Darkened for AA |
| `--mistake` | `#ea580c` | `#c2410c` | `hsl(17.5 88.3% 40.4%)` | Darkened for AA |
| `--blunder` | `#dc2626` | `#dc2626` | `hsl(0 72.2% 50.6%)` | Unchanged, already AA |
| `--brilliant` | `#0a0a0a` | `#0a0a0a` | `hsl(0 0% 3.9%)` | Unchanged (identical to `--foreground` on purpose, see 6.2) |

Each is a single Tailwind step darker than the brief's reference (e.g.
`amber-600` -> `amber-700`), which keeps the same hue and "family" so they
still read as the same semantic colour, just legible as text on white.

### 2.3 Dark mode: preserved, but opt-in only, not automatic

An earlier pass of this document shipped the dark values below behind
`@media (prefers-color-scheme: dark)`, on the reasoning that an automatic,
still-monochrome inversion was a harmless courtesy for a user whose OS asks
for dark. That reasoning was wrong in practice and was corrected after a
real measured defect: `landing.css` (the marketing page this app is linked
from and must match) has no dark-mode block of its own, so a visitor whose
OS/browser reports `prefers-color-scheme: dark` measured as *two different
products in one session* - a white landing page at `/`, followed by a black
trainer at `/app/` the moment they clicked through. `rbuild.ai` is
light-only with no dark mode; a product that silently turns black for
roughly half of all visitors is not "the same white clean theme", so the
automatic activation was a bug, not a feature, regardless of what this
document said about it before.

**The fix**: the media query was replaced with an explicit opt-in selector.
Nothing was deleted - every dark token value below is untouched - only the
*trigger* changed, from "the OS asked for dark" to "something sets
`data-theme="dark"` on the root element":

```
:root[data-theme="dark"] { /* ...same values as before... */ }
```

No component in this codebase sets that attribute. There is no toggle, no
persisted preference, and no automatic activation of any kind as of this
pass - light is the only theme that ever applies. The block exists so a
future, deliberate "dark mode" feature (with its own toggle UI, owned by
whoever builds that) has a complete, already-AA-checked value set ready to
wire up, rather than starting from nothing.

**Measured, not just reasoned about**: real headless Chrome over CDP, with
`prefers-color-scheme: dark` forced via `Emulation.setEmulatedMedia`
(deterministic regardless of the host OS's own appearance setting),
`getComputedStyle(document.body)` on both routes, before and after this
fix:

| Route | Before (media query) | After (opt-in attribute) |
|---|---|---|
| `/` (landing) | background `rgb(255, 255, 255)`, color `rgb(10, 10, 10)` (white - `landing.css` has no dark block, so it never changed) | background `rgb(255, 255, 255)`, color `rgb(10, 10, 10)` (white, unchanged) |
| `/app/` (trainer) | background `rgb(10, 10, 10)`, color `rgb(250, 250, 250)` (black - the defect) | background `rgb(255, 255, 255)`, color `rgb(10, 10, 10)` (white, fixed) |

And, confirming the dark work is preserved and functional rather than
deleted, `/app/` with `data-theme="dark"` set explicitly on `<html>`
measures background `rgb(10, 10, 10)`, color `rgb(250, 250, 250)` - the
exact same dark values as before, now reachable only by deliberate opt-in.

| Token | Value |
|---|---|
| `--background` | `#0a0a0a` |
| `--foreground` | `#fafafa` |
| `--card` / `--popover` | `#171717` |
| `--primary` | `#fafafa` (inverted) |
| `--primary-foreground` | `#171717` |
| `--secondary` / `--muted` / `--accent` / `--border` / `--input` | `#262626` |
| `--muted-foreground` | `#a3a3a3` |
| `--ring` | `#d4d4d4` |
| `--good` | `#4ade80` |
| `--inaccuracy` | `#fbbf24` |
| `--mistake` | `#fb923c` |
| `--blunder` | `#f87171` |
| `--brilliant` | `#fafafa` |

The five feedback colours still move to lighter tints of the same hues so
they keep AA on the dark background if this is ever switched on (numbers
in section 7.2, unchanged by this fix - only the trigger mechanism moved).

## 3. Type scale

A small, named scale so every new label picks from the same set instead of
an arbitrary pixel value.

| Token | Size | Typical use |
|---|---|---|
| `--text-xs` | 12px | Fine print, uppercase micro-labels (stat captions, table headers) |
| `--text-sm` | 13px | Meta text, captions, table cells, form labels |
| `--text-base` | 15px | Body copy, buttons, default UI text |
| `--text-md` | 16px | Card titles, sub-headings |
| `--text-lg` | 17px | Emphasised body, drill prompts |
| `--text-xl` | 20px | Page title |
| `--text-2xl` | 24px | Large numerals, empty-state headings |
| `--text-3xl` | 30px | Reserved for marketing-scale moments |

Line heights: `--leading-tight: 1.25` (headings), `--leading-normal: 1.5`
(default body), `--leading-relaxed: 1.65` (long prose, e.g. coach text).

## 4. Spacing, radius, border and shadow

Spacing is a 4px base grid, named so every `gap`/`padding`/`margin` in
`styles.css` comes from the same set:

`--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px,
`--space-5` 20px, `--space-6` 24px, `--space-8` 32px, `--space-10` 40px,
`--space-12` 48px.

Radius, derived from the brief's single `--radius: 0.5rem` (8px), the same
way shadcn derives its own scale:

`--radius-sm` = radius - 4px (4px), `--radius-md` = radius - 2px (6px),
`--radius-lg` = radius (8px), `--radius-xl` = radius + 4px (12px),
`--radius-full` = 999px (pills, dots, chips).

Borders are always `1px solid var(--border)` (`#e5e5e5`) unless a rule
specifically needs a heavier or coloured accent border (see section 6).
This is a deliberately low-contrast hairline (1.26:1 against white, see
section 7) - by design, the same way `rbuild.ai` and most shadcn products
use it: a divider that groups content is not required to hit the 3:1
non-text-contrast threshold, because it is not the only way to perceive or
operate anything (the content on either side of it already has full text
contrast on its own). Anywhere a border is the *only* signal for an
interactive boundary, the keyboard focus state upgrades it to `--ring`
(`#0a0a0a`, 19.8:1), which is unambiguous.

Shadows are two tokens, used nowhere except a card floating a hair off the
page:

```
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.04);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
```

Neither is used by any rule in this pass; they exist so a future component
that genuinely needs to lift off the page (a menu, a modal) has a
pre-approved, restrained value instead of someone reaching for a heavier
default shadow.

## 5. The hard constraint: preserving every existing name

Several other agents were building DOM against the class names and custom
property names already in `styles.css` while this retheme was happening, so
the rule for this pass was: change values, add new rules and new tokens,
never rename or delete an existing selector or custom property.

This was verified programmatically, not just by eye: every custom property
(49) and every class-shaped token (146) that existed in the file before this
retheme is still present, unchanged in name, in the shipped file. Nothing
was renamed and nothing was deleted.

The one genuine naming conflict was `--muted` and `--accent`, which existed
before the retheme but meant something different in the old dark theme than
the new shadcn tokens of the same name:

- `--muted` used to be a *text* colour (secondary/caption text). shadcn's
  `--muted` is a *background* tint. Aliasing the old name straight to the
  new token of the same name would have rendered every "muted" caption in
  the app nearly invisible (secondary-fill-grey text on a white card).
  `--muted` is aliased to shadcn's `--muted-foreground` instead, which is
  the token that actually plays the old role.
- `--accent` used to be the app's single vivid interactive colour (primary
  buttons, the active tab, the focus ring, progress fills). shadcn's
  `--accent` is a pale neutral hover tint with an unrelated job. `--accent`
  is aliased to shadcn's `--primary` instead (near-black), which is the
  token that plays "the one emphasised colour" in the new palette.

Every other legacy name maps 1:1 by role: `--bg -> --background`,
`--bg-raised -> --card`, `--bg-input -> --secondary`, `--line -> --border`,
`--text -> --foreground`, `--warn -> --mistake`, `--bad -> --blunder`,
`--mono -> --font-mono`. `--good` and `--radius` keep their old names with
literal duplicate values (a custom property cannot reference itself under
the same name, so these two get the number written twice - once in
`theme.css` as the canonical token, once in the legacy alias block in
`styles.css` - rather than a `var()` self-reference, which resolves to
nothing).

This alias block is load-bearing, not cosmetic: `public/js/progress.js`
sets inline styles like `color: 'var(--muted)'` and
`border-left: '3px solid var(--bad)'` directly, by name, from a JS colour
map. If those variable names stopped resolving to sensible colours, that
module's UI would silently break without a single line of its own code
changing.

## 6. Component patterns

### 6.1 Generic primitives added this pass

New markup landing from other agents uses new class-name prefixes
(`pgr-*` for `progress.js`, `imp-*` for `import.js`, `lib-*` for
`library.js`). Rather than hand-styling every one of those in isolation,
this pass added a set of generic, reusable primitives so any future
component built from ordinary HTML elements looks native immediately,
without needing bespoke CSS:

- **Tables**: bare `table`/`thead th`/`tbody td`/`tbody tr:hover` rules -
  hairline row dividers, uppercase small caption headers, a subtle hover
  tint, no vertical rules. `.card` (which every table sits inside) has
  `overflow-x: auto`, and `.lib-table` sets `min-width: 640px`, so a wide
  games-library table degrades to a horizontally scrollable region on a
  375px phone instead of squeezing ten columns into an unreadable width.
- **`.empty-state`**: a new primitive (`.empty-state`, with
  `.empty-icon` / `.empty-title` / `.empty-hint` children) for "no games
  yet", "nothing due right now" and similar states - centred, muted, with
  room for one action underneath.
- **`.chip` on a table cell**: the existing pill-shaped tag component
  (originally built for engine/coach status pills in the topbar) is reused
  as-is for a table's "reviewed: yes/no" column; no new rule was needed.
- **`.mistakes` reused for `progress.js`'s due-drill list**: `progress.js`
  deliberately gives its `<ul>` both `class="mistakes pgr-due-list"`, so it
  inherits the existing row/dot/loss styling for free. `pgr-due-item` (its
  `<li>`) only adds a border - everything else (the coloured dot, the
  monospace loss figure pinned to the right) comes from rules that already
  existed before this retheme.
- **Cards, forms, buttons, progress bars**: `.card`, `.form-row`,
  `select`/`textarea`, `button`/`button.primary`/`button.ghost`/
  `button.danger`, `.progress`/`.progress-fill` are all pre-existing
  primitives, retheme'd once and reused by every new module rather than
  redefined per module.

### 6.2 New sections added to `styles.css`

- `pgr-*` (progress/mastery dashboard): dashboard layout, hero card, a
  mastery grid of tiles (see 6.4), curriculum track rows with a reused
  `.progress` bar, and the due-drills list described above.
- `imp-*` (game import): a dashed dropzone with a `:hover`/`.is-dragover`
  state, a Lichess/Chess.com toggle built from the existing `.tab`
  component, a reused `.progress` bar, and an error list styled with
  `--bad` text (this is a real WCAG-passing text colour, unlike
  `--destructive`, see 6.3).
- `lib-*` (games library): a toolbar of filters (reusing `.form-row`), the
  generic `table` styling described above, and pagination controls built
  from the existing `.ghost.small` button variant.
- `cm-chessboard` vendor overrides and the marker/arrow monochrome
  language, covered in full in section 6.4.

### 6.3 Why `--destructive` is defined but not used as text

`--destructive` (`#ef4444`) and `--destructive-foreground` (`#fafafa`) are
shipped in `theme.css` exactly as given, because they are part of the
non-negotiable shadcn token set and a future screen may need them. They are
deliberately not used as a text or button colour anywhere in this pass:
measured against this exact palette, `--destructive-foreground` on
`--destructive` is 3.61:1, and `--destructive` on white is 3.76:1 - both
fail AA for normal text (see section 7). This is a known, real gap in
shadcn's own stock "neutral" default destructive button, not a mistake
introduced here. Every place this app needs a "this is dangerous / this
went wrong" colour (`button.danger`, `.imp-error-list`, the caution/danger
board markers), it reuses the already-AA-verified `--bad` (`--blunder`,
`#dc2626`, 4.83:1 on white) instead.

Tinted/rgba alert backgrounds (a pale red card with red text on top) were
tried and rejected for the same reason: even an 8-10% tint of `--blunder`
over white still lands around 4.2-4.4:1 for the text sitting on it - close
enough to look "almost fine" and fail a real AA check. Rather than chase
that fragile math per colour, every alert/verdict pattern in this app
(`.card.alert`, `.verdict`, `.verdict.ok`, `.verdict.no`) uses a plain white
or card background with a 3px coloured left border plus coloured text -
the border carries the colour, the background never does, and the text
contrast is simply "colour on white", already measured and always safe.

### 6.4 The monochrome board: a real design problem

The brief's hard constraint - move highlights, last-move markers, check
markers, legal-move dots and arrows must all read clearly with zero hue,
using fills/rings/opacity/dashes instead - is a genuine design problem
because two of these can be visually active on the same square at the same
time. During a review, the engine's suggested best move and the move the
student actually played are shown as two simultaneous arrows; a student
must be able to tell them apart at a glance without colour.

**The system**: every marker and arrow in `styles.css` is built from a
single colour, `--foreground` (`#0a0a0a`), and differentiated purely by
stroke-width, opacity and dash pattern, arranged as a four-step ladder:

| Step | Weight / opacity / dash | Used for |
|---|---|---|
| Ambient | Thin, opacity ~0.25-0.5, solid | Last move, a generic legal-move square/dot |
| Emphasis | Heavier, opacity ~0.55-0.9, solid | Current selection, the engine's best move, a correct drill answer |
| Caution | Medium weight, sparse dash (`1 2`) | A secondary warning state |
| Danger | Heavier, dense dash (`3 2` / `4 3`) | The move actually played, when flagged; reserved for a future "in check" marker |

Concretely, in `styles.css`'s cm-chessboard override block: `arrow-success`
(the engine's suggestion) is solid, opacity 0.75, full-strength head -
"emphasis". `arrow-danger` (the move actually played, when it was a
mistake) is dashed (`4 3`), opacity 0.55 - "danger". `arrow-info` (a soft
hint arrow) is a light dash (`1 3`) at opacity 0.35 - the lightest touch in
the system, so it never competes with either of the above. `arrow-warning`
sits between info and danger (dash `2 2`, opacity 0.5). `arrow-secondary`
is the one arrow that uses `--muted-foreground` instead of `--foreground`,
for a genuinely tertiary/optional annotation that should recede behind all
of the above even in grayscale terms.

This was verified in a real rendered screenshot, not just reasoned about on
paper: loading a sample game and running a review produces a board where
the played move (Nxd5, a mistake) renders as a lighter, dashed grey arrow,
and the engine's suggested move (b5) renders as a solid, heavy black arrow
- both visible on the board at once, immediately distinguishable by weight
and dash alone.

Squares and frame use the same restraint: light square `#fafafa`, dark
square `#d4d4d4`, a `1px #e5e5e5` frame and border, coordinate labels in
`--muted-foreground`. The vendor stylesheet
(`node_modules/cm-chessboard/assets/*.css`) ships seven coloured theme
presets (wood, green, blue, etc.), each scoped to a preset class name
chosen by `board.js` (owned by another agent, changeable at any time).
Rather than chase that selector shape defensively across all seven presets,
this pass pins six universal selectors with `!important` - a narrow,
explicit, documented use of it for exactly the textbook justified case:
overriding third-party CSS regardless of load order or preset choice, so
the board is monochrome no matter which of the seven preset names ends up
active.

The same ladder extends to the new `pgr-mastery-tile` component
(`progress.js`'s pattern-mastery grid): unseen is faded/muted, weak is a
solid `--blunder`-coloured border, improving is a dashed `--mistake`
coloured border, solid is a near-black border, and mastered is a fully
inverted tile (black fill, white text) - the same "weight and fill, not
hue" idea applied to a card instead of a board marker. (`progress.js` also
sets a `3px solid <colour>` inline `border-left` on this tile by variable
name; this pass matches that same colour on the other three sides instead
of fighting it, so the tile reads as one consistent border, not two
different hues stitched together.)

### 6.5 The "brilliant" collision

`--brilliant` is defined as identical to `--foreground` (`#0a0a0a`) on
purpose - a brilliant move is not a colour on the good/inaccuracy/
mistake/blunder severity ladder, it is "the most notable kind of good",
and the brief's palette gives it the same value as body text. Applying it
as plain `color: var(--brilliant)` would be invisible (it would just look
like unstyled text), so the two places this token is used both use a
shape/fill treatment instead of colour:

- `.movelist .brilliant`: an inverted mini chip (`--brilliant` background,
  `--background` text, small radius and padding) - the same "invert,
  don't recolour" idea as the mastered mastery tile.
- `.dot.brilliant`: a halo ring built from two stacked `box-shadow`
  layers (a `--card`-coloured gap ring, then a thin `--brilliant`-coloured
  outer ring) around a solid dot - visually distinct from a plain dot
  without needing a second colour.

Neither is exercised by any real move yet (no code path classifies a move
"brilliant" today, only `best`/`good`/`inaccuracy`/`mistake`/`blunder` are
in use), but the token is in the brief's palette, so both treatments are
shipped ready and documented rather than left to be invented later.

## 7. Accessibility: measured contrast ratios

All ratios below are computed directly from the shipped hex values (WCAG
2.1 relative luminance formula), not estimated. "Normal text AA" is the
4.5:1 threshold; "large text / UI component AA" is the 3:1 threshold used
for >=18.66px/bold text and for non-text UI boundaries (WCAG 1.4.11).

### 7.1 Light mode (default)

| Pair | Ratio | Normal-text AA | Notes |
|---|---|---|---|
| `--foreground` on `--background` | 19.80:1 | Pass | Body text |
| `--foreground` on `--card` | 19.80:1 | Pass | Card text |
| `--muted-foreground` on `--background` | 4.74:1 | Pass | Captions, labels, secondary text on white |
| `--muted-foreground` on `--secondary`/`--muted` | 4.35:1 | **Fail** (large/UI only) | Not used for normal-size text in this pass - see guidance below |
| `--primary-foreground` on `--primary` | 17.18:1 | Pass | Primary button text |
| `--secondary-foreground` on `--secondary`/`--accent` | 16.44:1 | Pass | Chips, secondary buttons, form field text |
| `--good` on `--background` | 5.02:1 | Pass | |
| `--inaccuracy` on `--background` | 5.02:1 | Pass | |
| `--mistake` on `--background` | 5.18:1 | Pass | |
| `--blunder` on `--background` | 4.83:1 | Pass | |
| `--brilliant` on `--background` | 19.80:1 | Pass | Identical to foreground; see 6.5 for why plain colour is not how it is used |
| `--good` on `--secondary` (`#f5f5f5`) | 4.60:1 | Pass | e.g. a semantic label inside a filled chip |
| `--mistake` on `--secondary` | 4.75:1 | Pass | |
| `--inaccuracy` on `--secondary` | 4.61:1 | Pass | |
| `--blunder` on `--secondary` | 4.43:1 | **Fail** (large/UI only) | Avoid normal-size `--blunder` text directly on a `--secondary` fill; on `--background`/`--card` it passes at 4.83:1 |
| `--destructive-foreground` on `--destructive` | 3.61:1 | **Fail** | Shipped as tokens only, not used as text (see 6.3) |
| `--destructive` on `--background` | 3.76:1 | **Fail** | Shipped as tokens only, not used as text (see 6.3) |
| `--border` on `--background` | 1.26:1 | Fail (by the non-text 3:1 test) | Deliberate hairline divider, not a required-for-understanding boundary; see section 4 |
| `--ring` on `--background` | 19.80:1 | Pass | Focus ring, far exceeds the 3:1 non-text threshold |

**Guidance for new components**: `--muted-foreground` is safe on
`--background`/`--card` (white) at 4.74:1, but drops under AA
(4.35:1) on a `--secondary`/`--muted` fill (`#f5f5f5`). No shipped rule
currently places muted text on that fill, but keep this in mind before
adding one - use `--secondary-foreground` (near-black, 16.44:1) for text
that has to sit on a filled `#f5f5f5` surface instead.

### 7.2 Dark mode (opt-in via `data-theme="dark"`, see 2.3)

These ratios are unchanged by the section 2.3 fix - only the activation
trigger moved from automatic to opt-in, not any colour value.

| Pair | Ratio | Normal-text AA |
|---|---|---|
| `--foreground` on `--background` | 18.97:1 | Pass |
| `--muted-foreground` on `--background` | 7.85:1 | Pass |
| `--good` on `--background` | 11.36:1 | Pass |
| `--inaccuracy` on `--background` | 11.86:1 | Pass |
| `--mistake` on `--background` | 8.75:1 | Pass |
| `--blunder` on `--background` | 7.16:1 | Pass |
| `--brilliant` on `--background` | 18.97:1 | Pass |
| `--border` on `--card` | 1.18:1 | Same deliberate hairline-divider case as light mode |

### 7.3 Focus visibility

`:focus-visible` uses a 2px `--ring` outline with a 2px offset, and never
fires on mouse/touch interaction (`:focus { outline: none }`, then
`:focus-visible` re-adds it) - so clicking a button never flashes an
outline, but tabbing through the app always shows one, at 19.8:1 against
the page background in light mode. Two pre-existing rules that had
silently disabled this ring for `textarea`/`select` specifically (an old
`element:focus { outline: none }` rule with higher specificity than the
new global `:focus-visible` rule) were corrected during this pass so the
global ring reaches every focusable element, including those two.

## 8. Rejected directions

- **Glowing blue AI wireframes, glass pieces, blue-and-orange painterly
  art** - explicitly rejected by the owner; not attempted.
- **Any gradient** - the brief bans gradients outright. One pre-existing
  rule used a `linear-gradient(90deg, var(--warn), var(--bad))` for a
  weakness-severity bar; replaced with a solid `--foreground` fill.
- **Text-shadow glow on the eval bar label** - replaced with a solid
  card-coloured chip (background + hairline border) that reads correctly
  whether it sits over the filled or unfilled part of the bar, with no
  glow effect at all.
- **Tinted/rgba alert backgrounds** (pale-red card with red text) -
  measured and rejected; see section 6.3 for the exact numbers. Replaced
  with a white/card background plus a coloured left border bar.
- **`--destructive` as a text or button colour** - shipped as a token
  because it is part of the given palette, but not used as text anywhere
  in this app; see section 6.3.
- **Matching all seven cm-chessboard theme presets defensively** -
  rejected in favour of six universal `!important` overrides; see 6.4.
- **A distinct hue per marker/arrow type** - the brief requires zero hue
  beyond the five chess-feedback colours (which are not used on the board
  itself); the marker/arrow system is 100% `--foreground` at different
  weights, opacities and dash patterns instead (section 6.4).

## 9. How to add a new component so it matches

1. **Reach for an existing primitive first.** `.card`, `.stats`/`.stat`,
   `.chip`, `.mistakes` (row + dot + move + loss), `.progress`/
   `.progress-fill`, `.empty-state`, `button`/`.ghost`/`.primary`/
   `.danger`/`.small`/`.wide`, and the generic `table` rules cover most
   shapes (a card, a metric grid, a status tag, a list row with a
   severity dot, a progress bar, a table, an empty state, a button
   variant). Compose these before writing new CSS.
2. **Only add new rules for what is genuinely new**, scoped under your
   module's own prefix (the existing convention is `pgr-*` / `imp-*` /
   `lib-*` per module - pick a short, distinct prefix for a new module
   too, so it can never collide with another module's classes).
3. **Never introduce colour for decoration.** The only colours allowed
   outside the neutral scale are `--good`/`--inaccuracy`/`--mistake`/
   `--blunder`/`--brilliant`, and only as a small dot, a chip, a label,
   or a thin border accent - never a background fill, never a gradient,
   never a glow.
4. **If you need "danger" text or a border**, use `--bad` (aliased to
   `--blunder`), not `--destructive` - see section 6.3 for why.
5. **If two states can be visible at once** (like the two review arrows),
   do not reach for two colours - reach for two points on the
   weight/opacity/dash ladder in section 6.4, all built from
   `--foreground`.
6. **Pick sizes from the scales**, not arbitrary pixels: `--text-*` for
   type, `--space-*` for gaps/padding/margin, `--radius-*` for corners.
7. **Check contrast before shipping a new colour-on-background pair**,
   the same way section 7 does: WCAG relative luminance, 4.5:1 for normal
   text, 3:1 for large text and non-text UI boundaries. Do not assume a
   token is safe on every surface - `--muted-foreground` is the one
   documented exception in this palette (safe on white, not on the
   `#f5f5f5` fill; see 7.1).
8. **Test at 375px.** The layout rule for this app is: side panel content
   stacks below the board under 940px, and density/spacing tightens
   further under 768px and 480px. A new card-shaped component that
   behaves like the existing ones inherits this for free; a table needs
   `.card`'s `overflow-x: auto` fallback and, if its columns cannot
   reasonably compress, a `min-width` the same way `.lib-table` does.
9. **Keep `--muted-foreground`-style text short in a `.stat .v` slot.**
   That slot is sized and mono-spaced for a short number or word; a long
   string (e.g. a date range) will wrap rather than overflow, but will
   look visually heavier than its neighbours. Prefer a short label, or a
   separate line of text outside the stats grid, for anything longer than
   a few characters.

## 10. Design credits

- **Palette source**: the full neutral greyscale token set (background,
  foreground, card, primary, secondary, muted, accent, destructive,
  border, input, ring, and the radius base) is reproduced from the
  compiled CSS of `https://rbuild.ai`, a shadcn/ui site running the stock
  "neutral" theme. shadcn/ui is used here purely as a design-token
  convention; no shadcn package is installed and none appears in this
  repository's dependencies.
- **Visual references**: the owner supplied two reference directions.
  The winning direction - faceted, low-poly, sculptural chess pieces in
  white and charcoal on a clean board, with soft grey shadows - informed
  the monochrome board treatment in this document (section 6.4). It is now
  realised by the owner-selected Design-1 source renders and the active
  `public/assets/pieces/design-1.svg` sprite. The first hand-authored
  implementation remains available at `public/assets/pieces/faceted.svg`.
  The secondary reference - bold,
  solid-black woodcut-style piece silhouettes for icons and marks - is
  realised at `public/assets/pieces/silhouette.svg`. The vector sets are
  original hand-authored work produced for this project; Design-1 is
  owner-directed, owner-provided AI-assisted artwork. See
  `public/assets/pieces/README.md` and `docs/CREDITS.md` for the full
  provenance and licence record.
- **Rejected references**: glowing blue AI wireframes, glass pieces, and
  blue-and-orange painterly art were supplied as contrast/rejected
  examples by the owner and are recorded here only as the "do not do
  this" boundary for future contributors (section 8).

## 11. Notes for the UI-owning agent

A few things discovered while building this system that are useful context
for whoever wires up `index.html`/`public/js/**` next:

- `styles.css` loads `theme.css` via `@import url("theme.css")` at its own
  top. `index.html` only needs a `<link>` to `styles.css`; it does not
  need a separate `<link>` for `theme.css`.
- `progress.js`'s inline colour styles (`var(--muted)`, `var(--good)`,
  `var(--bad)`, `var(--warn)`, `var(--accent)`) all resolve correctly
  through the legacy alias block described in section 5 - this is
  intentional and should keep working as long as those five alias names
  stay defined, even if their targets change again later.
- Sparkline/chart strokes (`.spark polyline` / `.spark circle`) are
  pinned to `var(--accent)` (near-black) regardless of any inline
  `stroke`/`fill` a module sets on the SVG itself, because a CSS class
  rule always wins over an SVG presentation attribute. This is
  deliberate - a decorative trend line is not one of the "dots, chips,
  labels" the brief allows colour for - not a bug if a chart renders in
  ink rather than a colour a module tried to set inline.
- The board caption text in `app.js` (shown under the board during
  review) currently reads literally `"...you played Nxd5 (red). The
  engine prefers b5 (green)."` - that wording predates this retheme and
  no longer matches reality: the board has no red or green on it anymore,
  only weight/dash-differentiated black arrows (section 6.4). Worth a
  copy update to something like "...the move you played, dashed. The
  engine's suggestion, solid." the next time that string is touched.
- `.lib-row-reviewed` / `.lib-row-unreviewed` (on `library.js`'s table
  rows) exist as hooks but are intentionally left unstyled this pass -
  the "Reviewed" column's chip already states yes/no clearly, and adding
  a second, whole-row treatment felt like exactly the kind of decoration
  the brief warns against. If a future pass wants a scan-friendly row
  treatment (e.g. de-emphasising already-reviewed rows), those two class
  names are ready to use.
