#!/usr/bin/env python3
"""Bing RSS search helper for terminal-web-research (real URLs, no cloaking).
Usage:
  python scripts/bingrss.py "query" [n]
  python scripts/bingrss.py FETCH <url>
Writes structured JSON to stdout or a file with --out.
"""
import sys, os, re, json, time, subprocess, html as htmllib

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

def curl(url, out, timeout=25, tries=3):
    for i in range(tries):
        try:
            r = subprocess.run(
                ["curl", "-sS", "-m", str(timeout), "--ssl-no-revoke", "-A", UA,
                 "-e", "https://www.google.com/", "-L", "-o", out, url],
                capture_output=True, text=True)
            if r.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 300:
                return True
        except Exception:
            pass
        time.sleep(2)
    return False

def search(query, n=8):
    import urllib.parse
    url = "https://www.bing.com/search?q=%s&format=rss&count=%d" % (
        urllib.parse.quote(query), max(n, 10))
    out = "_brss.xml"
    if not curl(url, out):
        return []
    xml = open(out, encoding="utf-8", errors="ignore").read()
    items = re.findall(r"<item>(.*?)</item>", xml, re.S)
    results = []
    for it in items:
        m = re.search(r"<link>(.*?)</link>", it, re.S)
        t = re.search(r"<title>(.*?)</title>", it, re.S)
        d = re.search(r"<description>(.*?)</description>", it, re.S)
        if not m or not t:
            continue
        link = htmllib.unescape(m.group(1).strip())
        if "bing.com" in link:
            continue
        results.append({
            "title": htmllib.unescape(t.group(1).strip())[:200],
            "url": link,
            "snippet": htmllib.unescape(d.group(1).strip())[:300] if d else "",
        })
    return results[:n]

def fetch(url):
    out = "_bf.html"
    if not curl(url, out, timeout=30):
        return None
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(open(out, encoding="utf-8", errors="ignore").read(), "lxml")
    for t in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        t.decompose()
    txt = re.sub(r"\n{3,}", "\n\n", soup.get_text("\n", strip=True))
    return {"url": url, "text": txt[:6000]}

if __name__ == "__main__":
    args = sys.argv[1:]
    out = None
    if "--out" in args:
        i = args.index("--out")
        out = args[i + 1]
        args = args[:i] + args[i + 2:]
    q = args[0]
    n = int(args[1]) if len(args) > 1 and args[1].isdigit() else 8
    if q.upper().startswith("FETCH:"):
        res = {"fetch:" + q.split(":", 1)[1].strip(): fetch(q.split(":", 1)[1].strip())}
    else:
        res = {q: search(q, n)}
    js = json.dumps(res, ensure_ascii=False, indent=1)
    if out:
        open(out, "w", encoding="utf-8").write(js)
        print("SAVED", out)
    else:
        print(js)
