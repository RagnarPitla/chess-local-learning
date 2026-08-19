# Design-1 source renders

These twelve 816 x 816 PNG files are the owner-provided source renders for
Ramify's Design-1 chess set. They were generated from the Ramify piece brief
with Google Nano Banana and selected by Ragnar for use in the product.

The files intentionally retain the neutral grey studio background. Do not
manually erase it. `scripts/build-design1-sprite.py` fits that background,
removes it while preserving the compact contact shadow, normalizes every
piece to the shared board baseline and writes the deployable
`public/assets/pieces/design-1.svg` sprite.

## Required filenames

`wk.png wq.png wr.png wb.png wn.png wp.png`

`bk.png bq.png br.png bb.png bn.png bp.png`

All twelve files must remain 816 x 816. White and black pieces are normalized
by piece type during the sprite build, so their original canvas placement
does not need to be edited.

This is owner-directed, owner-provided AI-assisted artwork included with the
owner's approval for this MIT-licensed project. No third-party chess asset was
intentionally provided as an input or copied into these source files. This is
a provenance record, not a legal opinion about copyright in AI-assisted
output.
