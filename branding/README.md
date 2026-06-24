# next — Brand assets & how to set the app icon

This folder has the **next.** logo as SVG (vector) files. App stores and Expo need
**PNG** images, so you (or a designer) export these SVGs to PNG at the right sizes and
drop them into each app's `assets/` folder.

## Files
- `next-icon.svg` — the square app icon (dark bg, "next." wordmark, green dot).
- `next-adaptive-foreground.svg` — Android adaptive-icon foreground (transparent;
  pair with background colour `#0F172A`).
- `next-wordmark.svg` — horizontal logo for the admin web header / website.

> The fonts are referenced by name (Inter/Arial). For a pixel-perfect logo, open the
> SVG in Figma/Illustrator and convert the text to outlines, or have your designer
> recreate it. This is a starting point that matches the brand colours
> (green `#00D16B`, ink `#0F172A`).

## Convert SVG → PNG (pick one)
- **Easiest:** open the SVG in a browser or Figma and export PNG at the sizes below.
- **Online:** any "SVG to PNG" converter.
- **Command line** (if you have it): `rsvg-convert -w 1024 -h 1024 next-icon.svg > icon.png`

## Required PNG sizes & where they go
For **each** app (`apps/customer`, `apps/merchant`, `apps/rider`), put PNGs in that
app's `assets/` folder (you can keep the same filenames already referenced in
`app.json`):

| File | Size | Notes |
|---|---|---|
| `icon.png` | 1024×1024 | Main app icon (no transparency for iOS) |
| `adaptive-icon.png` | 1024×1024 | Android foreground (transparent), from `next-adaptive-foreground.svg` |
| `splash-icon.png` | ~1024×1024 | Splash logo |

Play Store also needs a **512×512** icon and a **1024×500** feature graphic; the App
Store needs a **1024×1024** icon — export those from `next-icon.svg` too.

> Tip: you can give the customer, merchant and rider apps slightly different icon
> backgrounds (e.g. green vs dark) to tell them apart, but keep the same "next." mark.

## After replacing the PNGs
The icon is bundled into the native build, so you must **rebuild** (not just OTA):
```bash
cd apps/customer   # repeat per app
eas build --platform android --profile production
eas build --platform ios --profile production
```
