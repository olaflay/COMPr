#!/usr/bin/env python3
"""Reusable web research toolkit for grounded research when web_search is absent.
Works on the Windows host: curl --ssl-no-revoke + Referer + retry loop, bs4 parsing.
Verified 2026-08-19: DDG URL decoding, Bing ck-redirect skipping, fetch()
cleaning all PASS deterministically (network stubbed). Live search is best-effort
(CAPTCHA-prone) and not a hard gate.

2026-08-20: `_curl` now sends a Referer (`-e https://www.google.com/`) by default,
because some WordPress/business sites (businesselitesafrica.com, gobeyondlocal.com)
return empty/blocked HTML to a bare curl even on HTTP 200.

Usage:
  python research.py search "query" [n]
  python research.py fetch "url"
"""
import sys, subprocess, time, os, re
import urllib.parse
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
REFERER = "https://www.google.com/"

def _curl(url, out, timeout=25, tries=4):
    for i in range(tries):
        try:
            r = subprocess.run(
                ["curl","-sS","-m",str(timeout),"--ssl-no-revoke","-A",UA,
                 "-e",REFERER,"-L","-o",out,url],
                capture_output=True, text=True)
            if r.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 500:
                return True
        except Exception:
            pass
        time.sleep(2)
    return False

def _parse_ddg(html):
    with open(html, encoding="utf-8", errors="ignore") as f:
        soup = BeautifulSoup(f.read(), "lxml")
    results = []
    for a in soup.select("a.result__a")[:10]:
        title = a.get_text(strip=True)
        href = a.get("href", "")
        m = re.search(r"uddg=([^&]+)", href)
        url = urllib.parse.unquote(m.group(1)) if m else href
        snippet_el = a.find_parent("div", class_="result") or a.parent
        snip = ""
        if snippet_el:
            s = snippet_el.select_one(".result__snippet")
            if s: snip = s.get_text(strip=True)
        results.append({"title": title, "url": url, "snippet": snip})
    return results

def _parse_bing(html):
    with open(html, encoding="utf-8", errors="ignore") as f:
        soup = BeautifulSoup(f.read(), "lxml")
    results = []
    for item in soup.select("li.b_algo")[:10]:
        h = item.select_one("h2 a")
        if not h: continue
        url = h.get("href", "")
        if "bing.com/ck" in url:  # bot-detection cloaked redirect, skip
            continue
        title = h.get_text(strip=True)
        snip = ""
        s = item.select_one(".b_caption p") or item.select_one("p")
        if s: snip = s.get_text(strip=True)
        results.append({"title": title, "url": url, "snippet": snip})
    return results

def _ddg_post(query, html):
    """DDG HTML accepts a POST with q= ; more resistant to rate limits."""
    try:
        r = subprocess.run(
            ["curl","-sS","-m","25","--ssl-no-revoke","-A",UA,"-L","-o",html,
             "-e","https://html.duckduckgo.com/",
             "--data-urlencode", f"q={query}",
             "https://html.duckduckgo.com/html/"],
            capture_output=True, text=True)
        return r.returncode == 0 and os.path.exists(html) and os.path.getsize(html) > 500
    except Exception:
        return False

def search(query, n=8):
    html = "_s.html"
    # DDG GET, then DDG POST, then Bing fallback
    if _curl(f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}", html):
        res = _parse_ddg(html)
        if res:
            return res[:n]
    if _ddg_post(query, html):
        res = _parse_ddg(html)
        if res:
            return res[:n]
    if _curl(f"https://www.bing.com/search?q={urllib.parse.quote(query)}", html):
        res = _parse_bing(html)
        if res:
            return res[:n]
    print("SEARCH FAILED")
    return []

def fetch(url):
    html = "_f.html"
    if not _curl(url, html, timeout=30, tries=5):
        return None
    with open(html, encoding="utf-8", errors="ignore") as f:
        soup = BeautifulSoup(f.read(), "lxml")
    for t in soup(["script","style","nav","footer","header","noscript"]):
        t.decompose()
    text = re.sub(r"\s+", " ", soup.get_text(" ")).strip()
    title = soup.title.get_text(strip=True) if soup.title else ""
    return {"title": title, "text": text[:8000], "url": url}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    if cmd == "search":
        q = sys.argv[2]
        n = int(sys.argv[3]) if len(sys.argv) > 3 else 8
        for r in search(q, n):
            print(f"- {r['title']}\n  {r['url']}\n  {r['snippet']}\n")
    elif cmd == "fetch":
        u = sys.argv[2]
        r = fetch(u)
        if r:
            print(f"TITLE: {r['title']}\nURL: {r['url']}\n\n{r['text']}")
        else:
            print("FETCH FAILED")
