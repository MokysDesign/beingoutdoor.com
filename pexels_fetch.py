#!/usr/bin/env python3
"""Fetch Pexels photos by URL or photo-id and save them to ./images/.

Usage:
    # From a Pexels page URL (e.g. https://www.pexels.com/photo/...-21974072/)
    python pexels_fetch.py "https://www.pexels.com/photo/memorial-and-museum-sachsenhausen-21974072/"

    # From a bare numeric photo id
    python pexels_fetch.py 21974072

    # Multiple at once
    python pexels_fetch.py URL1 URL2 ...

The script uses Playwright (real headless Chromium) to load the page,
which gets past Cloudflare's bot challenge that a plain curl request hits.
It parses out the high-resolution download URL from the page and saves
the JPG into ./images/ with a slug derived from the caption.

Output: ./images/<slug>.jpg
"""
from __future__ import annotations

import os
import re
import sys
import json
from pathlib import Path
from urllib.request import Request, urlopen

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit(
        "playwright not installed. Activate the venv first:\n"
        "  source .venv/bin/activate && python pexels_fetch.py ..."
    )

ROOT = Path(__file__).resolve().parent
IMAGES_DIR = ROOT / "images"
IMAGES_DIR.mkdir(exist_ok=True)


def slugify(text: str, max_len: int = 80) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:max_len] or "pexels-photo"


def fetch_image_bytes(url: str) -> bytes:
    """Download via plain urllib (the URL is on images.pexels.com, no Cloudflare challenge)."""
    req = Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh)"})
    with urlopen(req, timeout=60) as resp:
        return resp.read()


def get_photo_metadata(page_url: str) -> dict:
    """Open the Pexels photo page in headless Chromium and pull title + image URL."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/126.0.0.0 Safari/537.36"
        )
        page = ctx.new_page()
        page.goto(page_url, wait_until="domcontentloaded", timeout=60000)
        # Wait for images on images.pexels.com to be present (avoid the
        # invisible 12x8 flag icon matching a bare "img" selector).
        page.wait_for_selector(
            "img[src*='images.pexels.com']", state="attached", timeout=30000
        )
        # Give the og:image meta a moment to populate on slow loads
        try:
            page.wait_for_selector(
                "meta[property='og:image']", state="attached", timeout=5000
            )
        except Exception:
            pass

        # Title for naming: prefer og:description (the actual caption /
        # landmark description). og:title on Pexels is just "Photo by
        # <photographer> on Pexels" which isn't useful for filenames.
        title = ""
        try:
            og_desc = page.locator('meta[property="og:description"]').first
            if og_desc.count() > 0:
                title = og_desc.get_attribute("content") or ""
        except Exception:
            pass
        if not title:
            try:
                og_title = page.locator('meta[property="og:title"]').first
                if og_title.count() > 0:
                    title = og_title.get_attribute("content") or ""
            except Exception:
                pass
        if not title:
            try:
                title = page.title().split(" · ")[0]
            except Exception:
                title = "pexels"

        # Highest-resolution image URL: og:image
        image_url = ""
        try:
            og = page.locator('meta[property="og:image"]').first
            if og.count() > 0:
                image_url = og.get_attribute("content") or ""
        except Exception:
            pass

        # Fallback: largest <img> on the page
        if not image_url:
            try:
                srcs = page.eval_on_selector_all(
                    "img",
                    "els => els.map(e => e.currentSrc || e.src).filter(s => s && s.includes('images.pexels.com'))",
                )
                # Prefer the largest-looking by URL heuristics (avoid tiny avatars)
                srcs = [s for s in srcs if "photos/" in s or "/photos/" in s]
                if srcs:
                    image_url = sorted(set(srcs), key=len, reverse=True)[0]
            except Exception:
                pass

        browser.close()

    if not image_url:
        raise RuntimeError(f"Could not find an image URL on {page_url}")

    return {"title": title.strip(), "image_url": image_url}


def normalize_to_page_url(arg: str) -> str:
    """Accept either a full Pexels URL, a numeric photo id, or anything else."""
    if arg.isdigit():
        # Bare id — we don't know the slug; use the search page to find it.
        return f"https://www.pexels.com/photo/{arg}/"
    if arg.startswith("http"):
        return arg
    if "/" not in arg:
        return f"https://www.pexels.com/photo/{arg}/"
    return arg


def fetch_one(arg: str) -> Path:
    page_url = normalize_to_page_url(arg)
    meta = get_photo_metadata(page_url)
    slug = slugify(meta["title"])
    dest = IMAGES_DIR / f"{slug}.jpg"

    if dest.exists() and dest.stat().st_size > 1024:
        print(f"[skip] already exists: {dest.relative_to(ROOT)}")
        return dest

    print(f"[fetch] {meta['title']}")
    print(f"        → {meta['image_url']}")
    data = fetch_image_bytes(meta["image_url"])
    dest.write_bytes(data)
    print(f"[saved] {dest.relative_to(ROOT)} ({len(data)/1024:.1f} KB)")
    return dest


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    for arg in sys.argv[1:]:
        fetch_one(arg)


if __name__ == "__main__":
    main()
