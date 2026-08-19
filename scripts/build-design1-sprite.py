#!/usr/bin/env python3
"""Build the raster-backed Design-1 cm-chessboard SVG sprite.

This is an authoring tool, not a runtime dependency. It removes the generated
grey studio background, normalizes the twelve owner-provided renders to a
shared 40-unit board tile, and embeds optimized transparent PNGs inside the
SVG sprite groups expected by cm-chessboard.

Requirements: Python 3, Pillow and NumPy.
"""

from __future__ import annotations

import base64
import io
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "Resources" / "Design-1"
OUTPUT_FILE = ROOT / "public" / "assets" / "pieces" / "design-1.svg"

PIECE_IDS = ("wk", "wq", "wr", "wb", "wn", "wp", "bk", "bq", "br", "bb", "bn", "bp")
TILE_SIZE = 256

# Target bounds in the 40-unit cm-chessboard coordinate system. Each source
# is contained inside its box without distortion and aligned to the same
# visual baseline. The compact contact shadow reaches the lower bound.
TARGET_BOXES = {
    "k": (8.0, 1.5, 32.0, 38.5),
    "q": (8.0, 2.0, 32.0, 38.5),
    "r": (7.5, 5.0, 32.5, 38.5),
    "b": (8.5, 2.0, 31.5, 38.5),
    "n": (5.5, 2.5, 34.5, 38.5),
    "p": (10.5, 8.5, 29.5, 38.5),
}


def estimate_background(rgb: np.ndarray) -> np.ndarray:
    """Fit the smooth studio background from border pixels."""

    height, width, _ = rgb.shape
    yy, xx = np.mgrid[0:height, 0:width]
    x = xx / (width - 1)
    y = yy / (height - 1)

    # The tallest pieces reach into the top-centre of the canvas. Use the
    # side strips plus the outer top/bottom corners so piece pixels never
    # contaminate the background model.
    border = (
        (xx < 45)
        | (xx >= width - 45)
        | (((yy < 45) | (yy >= height - 45)) & ((xx < 160) | (xx > width - 160)))
    )
    basis = np.stack([np.ones_like(x), x, y, x * y, x * x, y * y], axis=-1)
    coefficients = np.linalg.lstsq(basis[border], rgb[border], rcond=None)[0]
    return basis @ coefficients


def remove_background(path: Path) -> Image.Image:
    """Return a tightly cropped RGBA piece with its contact shadow."""

    source = Image.open(path)
    if source.size != (816, 816):
        raise ValueError(f"{path.name}: expected 816x816, got {source.width}x{source.height}")

    rgb = np.asarray(source.convert("RGB"), dtype=np.float32)
    background = estimate_background(rgb)
    difference = np.sqrt(np.sum((rgb - background) ** 2, axis=2))

    # The fitted border residual is below 3 RGB-distance units on these
    # sources. A 47-unit ramp removes the background while retaining the
    # deliberately soft contact shadow and anti-aliased contour.
    alpha = np.clip((difference - 3.0) / 47.0, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)

    # Remove the grey matte from partially transparent edge pixels. This is
    # standard alpha unmatting: observed = alpha*foreground + (1-alpha)*bg.
    safe_alpha = np.maximum(alpha[..., None], 0.02)
    foreground = (rgb - (1 - alpha[..., None]) * background) / safe_alpha
    foreground = np.clip(foreground, 0, 255)
    foreground[alpha < 0.02] = 0

    rgba = np.dstack([foreground, alpha[..., None] * 255]).astype(np.uint8)
    image = Image.fromarray(rgba, "RGBA")
    significant = Image.fromarray((alpha > 0.08).astype(np.uint8) * 255, "L")
    box = significant.getbbox()
    if box is None:
        raise ValueError(f"{path.name}: no foreground detected")
    return image.crop(box)


def place_on_tile(cutout: Image.Image, piece_type: str) -> Image.Image:
    """Contain the cutout in its piece-specific target box."""

    unit = TILE_SIZE / 40
    left, top, right, bottom = TARGET_BOXES[piece_type]
    target_width = (right - left) * unit
    target_height = (bottom - top) * unit
    scale = min(target_width / cutout.width, target_height / cutout.height)
    resized = cutout.resize(
        (max(1, round(cutout.width * scale)), max(1, round(cutout.height * scale))),
        Image.Resampling.LANCZOS,
    )

    x = round((TILE_SIZE - resized.width) / 2)
    y = round(bottom * unit - resized.height)
    tile = Image.new("RGBA", (TILE_SIZE, TILE_SIZE))
    tile.alpha_composite(resized, (x, y))
    return tile


def png_data_uri(image: Image.Image) -> str:
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def build_sprite() -> None:
    actual = {path.stem for path in SOURCE_DIR.glob("*.png")}
    expected = set(PIECE_IDS)
    if actual != expected:
        missing = ", ".join(sorted(expected - actual)) or "none"
        extra = ", ".join(sorted(actual - expected)) or "none"
        raise ValueError(f"Design-1 sources mismatch: missing={missing}; extra={extra}")

    groups = []
    for piece_id in PIECE_IDS:
        cutout = remove_background(SOURCE_DIR / f"{piece_id}.png")
        tile = place_on_tile(cutout, piece_id[1])
        groups.append(
            f'  <g id="{piece_id}"><image x="0" y="0" width="40" height="40" '
            f'preserveAspectRatio="none" href="{png_data_uri(tile)}"/></g>'
        )

    svg = "\n".join(
        [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">',
            "  <title>Ramify Design-1 sculpted chess piece sprite</title>",
            "  <metadata>Owner-directed and owner-provided AI-assisted artwork. "
            "Source renders are preserved in Resources/Design-1.</metadata>",
            *groups,
            "</svg>",
            "",
        ]
    )
    OUTPUT_FILE.write_text(svg, encoding="utf-8")
    print(f"wrote {OUTPUT_FILE.relative_to(ROOT)} ({OUTPUT_FILE.stat().st_size:,} bytes)")


if __name__ == "__main__":
    build_sprite()
