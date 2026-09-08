#!/usr/bin/env python3
"""Paced batch researcher for terminal-web-research.
Runs a list of queries with anti-throttle pacing, saving structured results to
JSON. One problem per run. This is the technique that ran a 30-query / 6-problem
research series with ZERO DDG CAPTCHAs (9s cadence beats the 5s/retry pattern).

Usage:
  python batch_research.py <out_json> <query1> [query2 ...]
  - sleep 9s between queries (prevents DDG CAPTCHA wall)
  - alternates DDG GET/POST, falls back to Bing (see research.py)
  - a query starting with 'FETCH:' is treated as a URL and routed to fetch()

Requires: research.py in the same directory (imported).
"""
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import research as R


def main():
    out = sys.argv[1]
    queries = sys.argv[2:]
    results = {}
    for i, q in enumerate(queries):
        if q.startswith("FETCH:"):
            url = q.split(":", 1)[1].strip()
            r = R.fetch(url)
            results[f"fetch:{url}"] = r
            print(f"[{i+1}/{len(queries)}] FETCH {url} -> {'ok' if r else 'FAIL'}")
        else:
            res = R.search(q, 6)
            results[q] = res
            print(f"[{i+1}/{len(queries)}] SEARCH '{q}' -> {len(res)} hits")
        time.sleep(9)  # anti-throttle pace — keep >=8s
    with open(out, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"SAVED {out}")


if __name__ == "__main__":
    main()
