#!/usr/bin/env python3

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
EXTENSION_ASSETS_DIR = ROOT / "extension" / "assets"
STORE_ASSETS_DIR = ROOT / "store" / "assets"
DOCS_ASSETS_DIR = ROOT / "docs" / "assets"
SCREENSHOT_SOURCE = ROOT / "screenshots" / "03-google-my-activity-comments-page.png"

RED = "#dc2626"
RED_DARK = "#991b1b"
ORANGE = "#f59e0b"
SLATE_950 = "#0f172a"
SLATE_900 = "#111827"
SLATE_800 = "#1f2937"
SLATE_700 = "#334155"
SLATE_500 = "#64748b"
SLATE_300 = "#cbd5e1"
WHITE = "#ffffff"


def ensure_dirs() -> None:
  for directory in (EXTENSION_ASSETS_DIR, STORE_ASSETS_DIR, DOCS_ASSETS_DIR):
    directory.mkdir(parents=True, exist_ok=True)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
  candidates = []
  if bold:
    candidates.extend(
      [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttc",
      ]
    )
  else:
    candidates.extend(
      [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttc",
      ]
    )

  for candidate in candidates:
    path = Path(candidate)
    if path.exists():
      return ImageFont.truetype(str(path), size=size)

  return ImageFont.load_default()


def draw_vertical_gradient(size: tuple[int, int], top_color: str, bottom_color: str) -> Image.Image:
  image = Image.new("RGBA", size)
  draw = ImageDraw.Draw(image)
  width, height = size

  top = ImageColor(top_color)
  bottom = ImageColor(bottom_color)

  for y in range(height):
    ratio = y / max(height - 1, 1)
    red = int(top[0] * (1 - ratio) + bottom[0] * ratio)
    green = int(top[1] * (1 - ratio) + bottom[1] * ratio)
    blue = int(top[2] * (1 - ratio) + bottom[2] * ratio)
    draw.line((0, y, width, y), fill=(red, green, blue, 255))

  return image


def ImageColor(value: str) -> tuple[int, int, int]:
  value = value.lstrip("#")
  return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def add_noise_dots(image: Image.Image, opacity: int = 32, step: int = 28) -> None:
  draw = ImageDraw.Draw(image)
  width, height = image.size
  for x in range(step // 2, width, step):
    for y in range(step // 2, height, step):
      radius = 1 + ((x + y) // step) % 2
      draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(255, 255, 255, opacity))


def draw_brand_icon(size: int) -> Image.Image:
  image = draw_vertical_gradient((size, size), "#b91c1c", "#f97316")
  draw = ImageDraw.Draw(image)

  margin = int(size * 0.08)
  shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
  shadow_draw = ImageDraw.Draw(shadow)
  shadow_draw.rounded_rectangle(
    (margin, margin, size - margin, size - margin),
    radius=int(size * 0.22),
    fill=(8, 15, 32, 140),
  )
  shadow = shadow.filter(ImageFilter.GaussianBlur(radius=size * 0.025))
  image.alpha_composite(shadow)

  bubble_box = (int(size * 0.17), int(size * 0.18), int(size * 0.83), int(size * 0.72))
  draw.rounded_rectangle(bubble_box, radius=int(size * 0.17), fill=WHITE)
  draw.polygon(
    [
      (int(size * 0.34), int(size * 0.72)),
      (int(size * 0.44), int(size * 0.72)),
      (int(size * 0.29), int(size * 0.87)),
    ],
    fill=WHITE,
  )

  can_left = int(size * 0.36)
  can_top = int(size * 0.31)
  can_right = int(size * 0.64)
  can_bottom = int(size * 0.63)
  draw.rounded_rectangle(
    (can_left, can_top, can_right, can_bottom),
    radius=int(size * 0.04),
    fill=RED,
  )
  draw.rounded_rectangle(
    (int(size * 0.33), int(size * 0.26), int(size * 0.67), int(size * 0.33)),
    radius=int(size * 0.03),
    fill=RED_DARK,
  )
  draw.rectangle((int(size * 0.46), int(size * 0.21), int(size * 0.54), int(size * 0.27)), fill=RED_DARK)

  for offset in (0.43, 0.5, 0.57):
    draw.rounded_rectangle(
      (int(size * offset), int(size * 0.37), int(size * (offset + 0.03)), int(size * 0.56)),
      radius=int(size * 0.015),
      fill=WHITE,
    )

  sparkle = Image.new("RGBA", image.size, (0, 0, 0, 0))
  sparkle_draw = ImageDraw.Draw(sparkle)
  sparkle_draw.ellipse((int(size * 0.73), int(size * 0.11), int(size * 0.86), int(size * 0.24)), fill=(255, 255, 255, 90))
  sparkle = sparkle.filter(ImageFilter.GaussianBlur(radius=size * 0.02))
  image.alpha_composite(sparkle)

  return image


def fit_background(target_size: tuple[int, int]) -> Image.Image:
  background = Image.open(SCREENSHOT_SOURCE).convert("RGB")
  background = ImageOps.fit(background, target_size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.2))
  overlay = Image.new("RGBA", target_size, (12, 18, 34, 156))
  return Image.alpha_composite(background.convert("RGBA"), overlay)


def draw_chip(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], text: str, fill: str, text_fill: str = WHITE) -> None:
  draw.rounded_rectangle(box, radius=18, fill=fill)
  font = load_font(20, bold=True)
  draw.text((box[0] + 18, box[1] + 10), text, font=font, fill=text_fill)


def draw_popup_panel(
  image: Image.Image,
  *,
  title: str,
  subtitle: str,
  run_message: str,
  deleted: str,
  attempts: str,
  failed: str,
  debug: str,
  settings_preview: str,
  settings_mode: str,
  expanded_settings: bool,
) -> None:
  draw = ImageDraw.Draw(image)
  panel_box = (798, 92, 1186, 708)
  shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
  shadow_draw = ImageDraw.Draw(shadow)
  shadow_draw.rounded_rectangle(panel_box, radius=30, fill=(0, 0, 0, 180))
  shadow = shadow.filter(ImageFilter.GaussianBlur(radius=18))
  image.alpha_composite(shadow)

  draw.rounded_rectangle(panel_box, radius=30, fill=SLATE_900, outline="#263246", width=2)
  add_noise_dots(image.crop(panel_box), opacity=22, step=24)

  x0, y0, x1, y1 = panel_box
  draw.text((x0 + 28, y0 + 26), "Chrome extension", font=load_font(18, bold=True), fill="#fca5a5")
  draw.text((x0 + 28, y0 + 56), "YouTube Activity Cleaner", font=load_font(28, bold=True), fill=WHITE)
  draw.text((x0 + 28, y0 + 98), "Clean comments from the Google My Activity comments page.", font=load_font(16), fill=SLATE_300)

  section_box = (x0 + 22, y0 + 142, x1 - 22, y0 + 270)
  draw.rounded_rectangle(section_box, radius=18, fill=SLATE_800)
  draw.text((section_box[0] + 18, section_box[1] + 16), "Cleaner tab", font=load_font(15, bold=True), fill=SLATE_300)
  draw.text((section_box[0] + 18, section_box[1] + 42), title, font=load_font(22, bold=True), fill=WHITE)
  draw.text((section_box[0] + 18, section_box[1] + 74), subtitle, font=load_font(15), fill="#dbe4f0")
  draw.text((section_box[0] + 18, section_box[1] + 100), run_message, font=load_font(15), fill="#fcd34d")

  stats_box = (x0 + 22, y0 + 286, x1 - 22, y0 + 420)
  draw.rounded_rectangle(stats_box, radius=18, fill=SLATE_800)
  draw.text((stats_box[0] + 18, stats_box[1] + 16), "Cleaner status", font=load_font(15, bold=True), fill=SLATE_300)

  card_width = 100
  gap = 12
  cards = [
    ("Deleted", deleted),
    ("Attempts", attempts),
    ("Failed", failed),
  ]
  for index, (label, value) in enumerate(cards):
    left = stats_box[0] + 18 + index * (card_width + gap)
    box = (left, stats_box[1] + 44, left + card_width, stats_box[1] + 104)
    draw.rounded_rectangle(box, radius=14, fill=SLATE_950)
    draw.text((box[0] + 16, box[1] + 12), label, font=load_font(14), fill=SLATE_500)
    draw.text((box[0] + 16, box[1] + 30), value, font=load_font(24, bold=True), fill=WHITE)

  draw.text((stats_box[0] + 18, stats_box[1] + 112), debug, font=load_font(14), fill="#fde68a")

  settings_box = (x0 + 22, y0 + 438, x1 - 22, y0 + 584 if expanded_settings else y0 + 520)
  draw.rounded_rectangle(settings_box, radius=18, fill=SLATE_800)
  draw.text((settings_box[0] + 18, settings_box[1] + 16), "Settings", font=load_font(15, bold=True), fill=SLATE_300)
  draw.text((settings_box[0] + 18, settings_box[1] + 44), settings_preview, font=load_font(14), fill="#dbe4f0")

  mode_box = (settings_box[0] + 18, settings_box[1] + 72, settings_box[0] + 120, settings_box[1] + 108)
  draw_chip(draw, mode_box, settings_mode, RED if settings_mode == "Fast" else SLATE_700)

  if expanded_settings:
    fields = [
      "Delay between comments: 1.2 sec",
      "Wait after scroll/load: 1.2 sec",
      "Retry failed delete: 2 times",
      "Retry backoff: 1.2 sec",
      "Stop after failures in a row: 4 times",
    ]
    for index, field in enumerate(fields):
      top = settings_box[1] + 120 + index * 26
      draw.text((settings_box[0] + 18, top), field, font=load_font(14), fill=WHITE)

  start_box = (x0 + 22, y1 - 88, x0 + 180, y1 - 34)
  stop_box = (x0 + 192, y1 - 88, x0 + 338, y1 - 34)
  draw.rounded_rectangle(start_box, radius=18, fill=RED)
  draw.rounded_rectangle(stop_box, radius=18, fill=SLATE_700)
  draw.text((start_box[0] + 56, start_box[1] + 15), "Start", font=load_font(20, bold=True), fill=WHITE)
  draw.text((stop_box[0] + 60, stop_box[1] + 15), "Stop", font=load_font(20, bold=True), fill=WHITE)


def draw_store_screenshot(path: Path, heading: str, body: str, popup_variant: dict[str, str | bool]) -> None:
  image = fit_background((1280, 800))
  draw = ImageDraw.Draw(image)

  draw.rounded_rectangle((58, 72, 706, 304), radius=28, fill=(15, 23, 42, 224))
  draw.multiline_text((88, 108), heading, font=load_font(42, bold=True), fill=WHITE, spacing=8)
  draw.multiline_text((88, 220), body, font=load_font(20), fill="#dbe4f0", spacing=6)
  draw_chip(draw, (88, 256, 250, 302), "MV3 extension", fill=RED)
  draw_chip(draw, (264, 256, 384, 302), "Local-only", fill=SLATE_700)

  draw_popup_panel(image, **popup_variant)
  image.save(path)


def draw_promo_tile(path: Path, size: tuple[int, int], title: str, subtitle: str, show_badges: bool = True) -> None:
  image = draw_vertical_gradient(size, "#0f172a", "#1f2937")
  add_noise_dots(image, opacity=26, step=36)
  draw = ImageDraw.Draw(image)
  icon = draw_brand_icon(220).resize((148, 148), Image.Resampling.LANCZOS)
  image.alpha_composite(icon, (48, size[1] // 2 - 74))

  draw.text((228, 72), title, font=load_font(44 if size[0] > 500 else 32, bold=True), fill=WHITE)
  draw.text((228, 138), subtitle, font=load_font(20 if size[0] > 500 else 16), fill="#dbe4f0")

  if show_badges:
    draw_chip(draw, (228, 190, 390, 236), "Fast mode", fill=RED)
    draw_chip(draw, (402, 190, 604, 236), "Chrome Web Store", fill=SLATE_700)

  draw.rounded_rectangle((size[0] - 240, 44, size[0] - 42, size[1] - 44), radius=30, fill=(255, 255, 255, 18))
  draw.text((size[0] - 214, 74), "Deletes comments\nfrom Google My Activity", font=load_font(20, bold=True), fill=WHITE, spacing=6)
  draw.text((size[0] - 214, 168), "No account login,\nserver sync or cloud storage.", font=load_font(16), fill="#dbe4f0", spacing=6)

  image.save(path)


def generate_icons() -> None:
  master_icon = draw_brand_icon(1024)
  for size in (16, 32, 48, 128):
    icon = master_icon.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(EXTENSION_ASSETS_DIR / f"icon-{size}.png")

  store_icon = master_icon.resize((128, 128), Image.Resampling.LANCZOS)
  store_icon.save(STORE_ASSETS_DIR / "store-icon-128.png")
  store_icon.save(DOCS_ASSETS_DIR / "icon-128.png")


def generate_store_images() -> None:
  draw_promo_tile(
    STORE_ASSETS_DIR / "small-promo-tile-440x280.png",
    (440, 280),
    "YouTube Activity Cleaner",
    "Bulk-clean YouTube comments from Google My Activity.",
  )
  draw_promo_tile(
    STORE_ASSETS_DIR / "marquee-promo-tile-1400x560.png",
    (1400, 560),
    "YouTube Activity Cleaner",
    "Fast, local-first cleanup for the Google My Activity comments page.",
  )

  draw_store_screenshot(
    STORE_ASSETS_DIR / "screenshot-01-ready-overview-1280x800.png",
    "Clean old YouTube\ncomments faster",
    "Open the Google My Activity comments page,\nclick Start and let the cleaner repeat the delete flow.",
    {
      "title": "Ready on the YouTube comments page.",
      "subtitle": "Using the current tab for cleaner commands.",
      "run_message": "Fast mode • 1.2s pace • 2 retries",
      "deleted": "0",
      "attempts": "0",
      "failed": "0",
      "debug": "Keep-awake will be enabled automatically while cleaning is running.",
      "settings_preview": "Fast mode • 1.2s pace • 2 retries",
      "settings_mode": "Fast",
      "expanded_settings": False,
    },
  )
  draw_store_screenshot(
    STORE_ASSETS_DIR / "screenshot-02-fast-mode-1280x800.png",
    "Watch progress,\nretries and failures",
    "Use the popup to track counters, retry timing\nand the latest status while cleanup runs.",
    {
      "title": "Connected to a cleaner tab in another tab.",
      "subtitle": "Using: Your YouTube comments - Google My Activity",
      "run_message": "Deleted comments: 214",
      "deleted": "214",
      "attempts": "221",
      "failed": "7",
      "debug": "Retry 2 scheduled in 1.2s.",
      "settings_preview": "Fast mode • 1.2s pace • 2 retries",
      "settings_mode": "Fast",
      "expanded_settings": False,
    },
  )
  draw_store_screenshot(
    STORE_ASSETS_DIR / "screenshot-03-settings-1280x800.png",
    "Tune speed,\nretries and pacing",
    "Pick Fast or Safe mode and save your preferred\nsettings in Chrome before each run.",
    {
      "title": "Ready to start on the current tab.",
      "subtitle": "Start will attach the cleaner to this tab.",
      "run_message": "Settings loaded from Chrome storage.",
      "deleted": "0",
      "attempts": "0",
      "failed": "0",
      "debug": "No active retries or errors.",
      "settings_preview": "Fast mode • 1.2s pace • 2 retries",
      "settings_mode": "Fast",
      "expanded_settings": True,
    },
  )

  Image.open(STORE_ASSETS_DIR / "screenshot-01-ready-overview-1280x800.png").save(
    DOCS_ASSETS_DIR / "hero-preview.png"
  )


def main() -> None:
  ensure_dirs()
  generate_icons()
  generate_store_images()
  print("Generated extension icons and Chrome Web Store assets.")


if __name__ == "__main__":
  main()
