#!/usr/bin/env python3
"""Download all WordPress-hosted images and rewrite HTML/CSS to use local copies."""
import os
import re
import time
from urllib.parse import urlparse, urlunparse
from urllib.request import urlopen, Request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IMAGES_DIR = ROOT / "images"
BASE_URL = "https://beingoutdoor.wordpress.com"
URL_RE = re.compile(r"https://beingoutdoor\.wordpress\.com/wp-content/uploads/[^\s\"'\)]+")

# mapping: canonical url (no query) -> local relative path
url_map = {}

def canonical(url: str) -> str:
    p = urlparse(url)
    # strip query/fragment for download path
    return urlunparse((p.scheme, p.netloc, p.path, '', '', ''))

def local_path(canonical_url: str) -> Path:
    p = urlparse(canonical_url)
    # path like /wp-content/uploads/2015/09/filename.jpg
    parts = Path(p.path).parts
    # drop leading slash and wp-content/uploads
    rel = Path(*parts[3:]) if len(parts) > 3 else Path(parts[-1])
    return IMAGES_DIR / rel

def download_one(url: str) -> tuple[str, bool]:
    c = canonical(url)
    dest = local_path(c)
    rel = dest.relative_to(ROOT).as_posix()
    if dest.exists():
        return (c, True)
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = Request(c, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=30) as resp:
            data = resp.read()
        dest.write_bytes(data)
        return (c, True)
    except Exception as e:
        print(f"FAIL {c}: {e}")
        return (c, False)

def rewrite_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8", errors="ignore")
    found = set(URL_RE.findall(text))
    if not found:
        return 0
    changed = 0
    def repl(m):
        nonlocal changed
        url = m.group(0)
        c = canonical(url)
        if c in url_map:
            local = url_map[c]
        else:
            local = local_path(c).relative_to(ROOT).as_posix()
        changed += 1
        return local
    new_text = URL_RE.sub(repl, text)
    path.write_text(new_text, encoding="utf-8")
    return changed

def main():
    start = time.time()
    IMAGES_DIR.mkdir(exist_ok=True)

    # collect unique canonical image URLs from all HTML/CSS
    files = list(ROOT.rglob("*.html")) + list(ROOT.rglob("*.css"))
    all_urls = set()
    for f in files:
        text = f.read_text(encoding="utf-8", errors="ignore")
        for u in URL_RE.findall(text):
            all_urls.add(canonical(u))

    print(f"Found {len(all_urls)} unique images across {len(files)} files")

    # build url_map by downloading
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(download_one, u): u for u in all_urls}
        for fut in as_completed(futures):
            c, ok = fut.result()
            if ok:
                url_map[c] = local_path(c).relative_to(ROOT).as_posix()

    # rewrite files
    total_replacements = 0
    for f in files:
        total_replacements += rewrite_file(f)

    downloaded = sum(1 for v in url_map.values() if (ROOT / v).exists())
    print(f"Downloaded {downloaded}/{len(all_urls)} images, rewrote {total_replacements} references in {len(files)} files")
    print(f"Done in {time.time()-start:.1f}s")

if __name__ == "__main__":
    main()
