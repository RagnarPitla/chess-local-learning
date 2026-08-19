# Ramify chess piece render brief

Use this brief to generate the source artwork for the next Ramify chess
piece set. The final board uses one SVG sprite, but the source renders should
be delivered as twelve separate images so they can be cleaned, vectorized and
assembled into the sprite without losing consistency.

## Recommended workflow

1. Generate the master contact sheet first.
2. Use that contact sheet as the reference image for every individual piece.
3. Render each piece at 2048 x 2048 using the filenames below.
4. Deliver both the original render and any background-removed version.
5. Do not resize, crop or rotate individual files after generation.

Nano Banana does not reliably produce transparent backgrounds. Use the exact
flat mid-grey background in the prompt. The background will be removed during
asset preparation.

## Master contact sheet prompt

```text
Create a strict orthographic product-design contact sheet for a complete,
original chess set for Ramify, a premium black-and-white chess learning app.
Show exactly 12 pieces in a precise 6-column by 2-row grid. Top row, left to
right: white king, white queen, white rook, white bishop, white knight, white
pawn. Bottom row: the exact same six silhouettes in black. White and black
counterparts must use identical geometry; only the material colour changes.

Style: contemporary sculptural tournament pieces, simplified and unmistakable
at 45 pixels, matte cast-stone finish, restrained low-poly facets, clean
symmetry except for the left-facing knight, shared stepped plinth and shared
baseline. Original design only. Do not copy, trace or imitate any existing
commercial or open-source chess set.

White material: warm ivory #f5f5f3 with light-grey facets and a crisp charcoal
outline. Black material: matte charcoal #171717 with restrained #404040 rim
highlights and a near-black outline. Outline thickness should equal about 2.5
percent of piece width so the silhouette remains readable on both white and
grey board squares.

Lighting: soft studio key from upper left. Add one compact oval contact shadow
directly under each base, about 70 percent of the base width and 5 percent of
the piece height, at 12 to 16 percent opacity. No long cast shadows, glow,
reflections, gradients, neon colours or AI visual effects.

Camera: straight-on orthographic front view, no perspective, no tilt. Every
piece centered in its cell with equal padding. Solid flat #808080 background,
no floor line, no texture, no labels, no text, no board and no extra objects.
Ultra-sharp edges, professional product render, 4K, 16:9.
```

Suggested command:

```bash
nbimg "<paste the master prompt>" --pro --16:9 -r 4K --dry-run
```

Remove `--dry-run` only when the estimate is acceptable.

## Individual piece prompt template

Attach the approved master contact sheet as the reference image, then replace
the bracketed values:

```text
Using the attached Ramify chess set contact sheet as the exact style and
geometry reference, render only the [COLOUR] [PIECE]. Do not redesign it.
Preserve the same silhouette, proportions, shared stepped plinth, outline,
faceted planes, upper-left lighting and material treatment shown in the
reference.

Canvas: exactly 2048 x 2048, square, sRGB. Straight-on orthographic front view,
no perspective and no tilt. Center x = 1024. Place the shared baseline at
y = 1840. Keep at least 160 pixels of clear space above and on both sides.
The complete piece, including its contact shadow and outline, must remain
inside the canvas.

Use a crisp contour approximately 2.5 percent of piece width. Add one compact
oval contact shadow directly beneath the base, 70 percent of the base width,
5 percent of the piece height, 12 to 16 percent opacity. Solid flat #808080
background, no floor line, no texture, no board, no text, no labels, no extra
objects, no glow and no long cast shadow. Ultra-sharp professional product
render.

[PIECE-SPECIFIC SILHOUETTE]
```

Suggested command for each piece:

```bash
nbimg "<paste the individual prompt>" --pro --1:1 -r 2K --ref master.png --dry-run
```

## Shape and dimension targets

All coordinates below refer to the 2048 x 2048 source canvas. These are target
proportions rather than pixel-perfect generation guarantees.

| Piece | Top y | Maximum width | Piece-specific silhouette |
|---|---:|---:|---|
| King | 150 | 1120 | Tapered body, broad collar and a thick cross finial with clear negative space between the arms. |
| Queen | 180 | 1240 | Three broad crown points with deep, wide valleys. The centre point is tallest. Avoid thin sawtooth spikes. |
| Rook | 300 | 1120 | Strong tapered tower, four broad merlons and three deep gaps. Flat, architectural top. |
| Bishop | 220 | 1080 | Tall pointed mitre with one bold asymmetric diagonal slit that remains visible at 45 pixels. |
| Knight | 180 | 1420 | Left-facing horse head, long wedge-shaped muzzle, clear jaw break, one ear and one restrained mane ridge. |
| Pawn | 430 | 880 | Simple sphere, narrow neck, tapered body and the shared stepped plinth. |

The base of every piece must end at y = 1840. White and black versions must
have the same top y, maximum width and silhouette.

## Material prompts

Use this text for `[COLOUR]`:

- White: `white, warm ivory #f5f5f3 with #d4d4d4 facets, restrained white highlights and a crisp #171717 contour`
- Black: `black, matte charcoal #171717 with #404040 rim highlights and a crisp #050505 contour`

Use the matching row from the shape table for
`[PIECE-SPECIFIC SILHOUETTE]`.

## Delivery filenames

| File | Asset |
|---|---|
| `wk.png` | White king |
| `wq.png` | White queen |
| `wr.png` | White rook |
| `wb.png` | White bishop |
| `wn.png` | White knight |
| `wp.png` | White pawn |
| `bk.png` | Black king |
| `bq.png` | Black queen |
| `br.png` | Black rook |
| `bb.png` | Black bishop |
| `bn.png` | Black knight |
| `bp.png` | Black pawn |

Also include the approved master contact sheet.

## Acceptance checklist

- All twelve files are exactly 2048 x 2048.
- Every black piece is the same geometry as its white counterpart.
- All pieces use the same camera, baseline, lighting direction and plinth.
- King, queen, rook, bishop, knight and pawn are distinguishable at 45 pixels.
- White pieces retain a dark outline on white squares.
- Black pieces retain a restrained rim highlight on grey squares.
- Contact shadows stay tight to the base and never become a second object.
- The background is one flat #808080 colour with no floor or horizon.
- There is no text, watermark, board, extra piece, glow or coloured light.
- The design is original and does not trace another chess set.

## Final board sprite contract

The delivered PNGs are source material. The replacement board asset will be
assembled as `public/assets/pieces/sculpted-v2.svg` with:

- one `40 x 40` SVG root and `viewBox="0 0 40 40"`
- exactly twelve groups: `wk wq wr wb wn wp bk bq br bb bn bp`
- a common baseline at y = 37
- artwork centered in the shared 40-unit coordinate space
- a compact flat contact-shadow shape behind each base

The app can then switch sets with one line in `public/js/board.js`.
