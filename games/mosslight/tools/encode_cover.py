"""Encode responsive covers from render_cover.gd's full-resolution PNG (Pillow)."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Image.open(root / "build/cover-source.png").convert("RGB")
if source.size != (3840, 1564):
    raise ValueError("Render the 3840×1564 source with render_cover.gd first")
for width, name in [(1920, "cover.webp"), (2560, "cover-2560.webp"), (3840, "cover-3840.webp")]:
    image = source if width == source.width else source.resize(
        (width, round(source.height * width / source.width)), Image.Resampling.LANCZOS
    )
    output = root / "web" / name
    image.save(output, quality=95, method=6)
    print(f"COVER_ENCODE: {name} {image.size} {output.stat().st_size} bytes")
