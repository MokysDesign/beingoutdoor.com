# DESIGN_RULES — Page building conventions for beingoutdoor.com

These are binding rules for every new trip page. They were set in conversation with Inga (Moky) on 2026-08-10.

## Maps

- **Always** use the `.map-embed` wrapper with a click-to-interact overlay.
- The pattern matches the homepage (`/index.html`):
  - Wrap the iframe in `<div class="map-embed">`
  - Add a click overlay div with `role="button"` and `tabindex="0"`
  - Include the JS handler that toggles `.active` on click / Enter / Space
- The CSS classes (`.map-embed`, `.map-overlay`, `.active`) are global in `/styles.css` — no extra CSS needed
- Source-of-truth iframe URL when embedding a Google My Maps: `https://www.google.com/maps/d/embed?mid=<MID>&ehbc=2E312F&w=1200&h=600`
- Optional extra parameter: `&wheel=0` if scroll-zoom hijack is a problem

## Image placeholders

- When an image is needed but not yet provided: **gray square placeholder**, `#e8e8e8` background, label centered in the middle, rounded corners to match production tiles
- Gray squares use this pattern:
  ```html
  <span style="flex:0 0 calc(33.333% - 11px);display:block;background:#e8e8e8;border-radius:8px;aspect-ratio:1/1;display:flex;align-items:center;justify-content:center">
    <span style="font-weight:700;color:#888;font-size:.95em;text-align:center;padding:8px">Label Here</span>
  </span>
  ```
- Never leave a `<img>` tag pointing at a placeholder file. Always use the gray-square span.

## Hike trail tiles

- **Always** use a hiking-boot / hiking-context image when a trail is named.
- Available on-disk hiking images (use these in order; ask Inga for new ones if all are used):
  - `/images/2026/07/hikes-tying-boots.png`
  - `/images/2026/07/hikes-boots-log.png`
  - `/images/2026/07/hikes-boots-sky.png`
  - `/images/2026/07/hikes-boot-tread.png`
  - `/images/2026/07/hikes-granite-boulder.png`
  - `/images/2026/07/hikes-forest-floor.png`
  - `/images/2026/07/hikes-boots-sky.png` (alt angle)
- If Inga provides more than 7 named trails, tell her the stock is exhausted and ask for new boot/hiking images.
- The grayscale+brightness CSS filter (`filter:grayscale(100%) brightness(1.15)`) is the established visual style on VOF/Calico trails — keep it.

## Trail description format

- Use the AllTrails-style format: `length · elev gain · difficulty · route type · optional time`
- Example: `15.1 mi · 2,293 ft · easy · point to point`
- Source length/elev data from AllTrails screenshots when possible (anti-bot blocks scraping)

## Page chrome

- All trip pages share the same `<header class="site-header">` and `<footer class="site-footer">` blocks
- The teal accent color is `#2a8a8a` — used for primary buttons, headings on plain-text headers, and the map overlay
- Hero cover blocks aren't required if no image — a teal `<header>` banner works as a substitute
