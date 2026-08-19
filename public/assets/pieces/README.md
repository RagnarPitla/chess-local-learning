# Chess piece sprites

Two original SVG sprite sheets for the board, plus a standalone preview page.

- `faceted.svg` - the primary set. Faceted, low-poly, sculptural pieces (angular
  planes, chiselled geometry, no curves, no ornament), in the style of
  cast-concrete designer chess sets. White pieces are near-white with light
  grey facet shading; black pieces are charcoal with darker facet shading.
- `silhouette.svg` - a secondary set. Bold, solid-black woodcut-style
  silhouettes of the same twelve pieces, for icons, marketing and very small
  sizes where facet shading would just turn to noise.
- `preview.html` - open this directly from disk (double-click it, or drag it
  into a browser). No server needed. It shows both sets at 24, 45, 64 and
  128px on white and light-grey squares, plus a full starting position on a
  monochrome board.

## Style rationale

The brief called for faceted / low-poly / sculptural pieces: flat polygon
facets implying planes and light from the upper left, no gradients, no
filters, no blurs, so the art stays crisp at tiny sizes. Every piece is built
from an outer contour (the silhouette + a mid-tone "shadow" fill) plus a
left-half overlay polygon (a lighter tone, standing in for the lit face) and
one small highlight facet on the piece's most distinguishing feature (crown
point, mitre tip, snout ridge). The same contour, filled solid black with no
overlays, becomes the woodcut-style `silhouette.svg` piece.

Cut-in details - the king's cross arms, the queen's coronet valleys, the
bishop's mitre notch, the rook's crenellation gaps - are literal notches in
the contour rather than SVG holes, so there is no fill-rule / winding-order
bookkeeping; every notch is open to the piece's edge, never a fully enclosed
interior hole.

Palette (no hue anywhere in the pieces):

| role                        | white pieces | black pieces |
|-----------------------------|--------------|--------------|
| contour / shadow facet      | `#d4d4d4`    | `#0a0a0a`    |
| left-half / lit facet       | `#f5f5f5`    | `#171717`    |
| highlight facet             | `#ffffff`    | `#404040`    |
| outline stroke              | `#171717`    | `#0a0a0a`    |

All six values are from the product's monochrome palette
(`#ffffff #f5f5f5 #e5e5e5 #d4d4d4 #737373 #171717 #0a0a0a`); black pieces
additionally use `#404040` as their lightest facet, per the brief.

Piece-identifying features (each piece must read at 45px, the real rendered
board size, with no colour cue to lean on):

- **King** - tapered body, a small crenellated collar, a cross finial on top.
- **Queen** - tapered body, a three-point coronet (left horn / tall centre
  spike / right horn) with wide flat-floored valleys between the points.
  An earlier five-spike design was tried and rejected during authoring: too
  many thin points packed into 45px read as sawtooth noise rather than a
  crown. Fewer, wider, clearly separated points read far better at small
  sizes than more/finer ones.
- **Rook** - a plain tapered tower with four merlons and three gaps cut into
  the top edge.
- **Bishop** - a mitre (pointed hat) with an asymmetric diagonal notch cut
  into one side near the top, the classic bishop's-slit silhouette.
- **Knight** - a horse head in profile, facing left: a long wedge-shaped
  snout with a distinct jaw/mouth/muzzle break from the forehead, a small
  ear, one mane bump on the back of the neck, standing on the shared base.
  This was the hardest piece to get right; several redesigns were needed
  before the snout read as unmistakably a snout rather than an abstract
  point (see "Authoring notes" below).
- **Pawn** - a ball on a tapered cone base.

All six pieces share the same base geometry (plinth at y 33.5-37, skirt top
at y 29 in the 40x40 tile) so they visually stand on the same square at a
consistent scale.

## Licence and originality

This artwork is original. Every path in `faceted.svg` and `silhouette.svg`
was hand-authored for this project - no path data, control points or
silhouettes were copied, traced or derived from Staunty, Cburnett, Merida,
Wikimedia Commons chess sets, or any other existing chess piece set. Both
files are released under this repository's MIT licence (see `/LICENSE` at
the repo root), same as the rest of the codebase.

## How the board uses this sprite

The board is rendered by `public/js/board.js`, which points cm-chessboard at
this project's own faceted set:

```js
pieces: { file: new URL('../assets/pieces/faceted.svg', import.meta.url).href }
```

`cm-chessboard` resolves `style.pieces.file` against `assetsUrl` UNLESS the
path is itself absolute (starts with `/` or contains `://`), in which case
`assetsUrl` is ignored and the file is loaded from that path directly.

`new URL(..., import.meta.url)` is used rather than a root-absolute
`/assets/pieces/faceted.svg` on purpose: it produces a fully-qualified URL
resolved against the location of `board.js` itself, so the sprite still
loads when the site is deployed under a sub-path such as
`https://user.github.io/repo-name/`, where a root-absolute path would break.

This replaced the library's bundled `staunty.svg`, which is licensed
CC BY-NC-SA 4.0. That NonCommercial term is incompatible with this
repository's MIT licence, so `staunty.svg` is also excluded from the deploy
artifact by `scripts/build-static.mjs`, and `npm run build:check` fails the
build if any NonCommercial-licensed asset reaches `dist/`.

(or `'/assets/pieces/silhouette.svg'` for the icon-style set). No other
change is required: no `assetsUrl` edit, no `tileSize` override, no server
config, nothing in `server.js`. This has been verified against the real
`Chessboard` class from `cm-chessboard` 8.12.19 rendering a full starting
position with this exact absolute-path config, not just by opening the SVG
directly.

## Sprite contract (for adding a new piece style)

Both sprites match the exact contract `cm-chessboard` 8.12.19 expects,
verified against the library's own shipped sprites
(`node_modules/cm-chessboard/assets/pieces/staunty.svg` and `standard.svg`)
rather than assumed:

- One `<svg>` root: `width="40" height="40" viewBox="0 0 40 40"`.
- Exactly twelve `<g id="...">` elements, ids `wk wq wr wb wn wp bk bq br bb
  bn bp` (white/black x king/queen/rook/bishop/knight/pawn).
- Each group's artwork is positioned directly in the shared 40x40 coordinate
  space (no per-group transform is required, though the upstream sets use
  one; this project's sets draw every piece straight into the 0-40 box so
  all twelve groups line up on the same baseline without needing one).
- `cm-chessboard` renders a piece as `<use href="{spriteUrl}#{pieceName}">`
  scaled by `squareSize / piecesTileSize`, where `piecesTileSize` defaults to
  40 and is a pure JS config value (`style.pieces.tileSize`) - it is never
  read from the SVG itself. So a new style only needs to keep the 40-units-
  per-piece convention; it does not need to declare tileSize anywhere.
- No gradients, filters or embedded rasters - flat fills only, so pieces
  stay crisp at small sizes and the file stays small.

To add another style: create `public/assets/pieces/<name>.svg` with the same
root + twelve group ids, open `preview.html` (or copy its pattern) to check
legibility at 24/45/64/128px before shipping, then hand the UI agent the
one-line `board.js` change (`pieces: { file: '/assets/pieces/<name>.svg' }`).

For the next generated source set, use
`docs/CHESS-PIECE-RENDER-BRIEF.md`. It defines the Nano Banana master prompt,
the twelve source filenames, the 2048 x 2048 geometry targets and the exact
40 x 40 sprite contract used by this board.

## Authoring notes (how this was iterated)

The pieces were drafted, rendered with headless Chrome and visually
critiqued repeatedly rather than judged from the path data alone. King,
rook and pawn were legible from the first draft. The bishop's notch had to
be made asymmetric (rather than mirrored) to read as a genuine diagonal
slit instead of a barely-visible dent. The queen went through a five-spike
version that looked "flame"-like and noisy before landing on the current
three-point coronet. The knight took the most iterations: an initial
asymmetric-base bug, then a simplified mane, then a full snout rebuild so
the nose reads as a long wedge distinctly separated from the forehead
rather than a single smooth diagonal edge. The set was also checked
rendered by the real `cm-chessboard` `Chessboard` class (not just a
hand-rolled `<use>` test) in a full starting position, at 24/45/64/128px on
both white and light-grey squares, and in `preview.html` opened directly
via `file://` with no server.
