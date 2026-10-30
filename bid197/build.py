#!/usr/bin/env python3
"""Assemble dist/bid197.html from src/ (pristine Bid 196 parts) + build/ (patched by patch.py) + cycle.js.

Order inside the page (do not reorder; later scripts depend on earlier globals):
  head.html  ->  <style> fonts.css + app.css </style>  ->  shell.html  ->
  <script> cycle.js, data.js, prev195.js, icons.js, sprite insert, lib.js, baymap.js, app.js </script>
Checks: data.js is byte-identical to the recorded upstream hash (scheduled crew updates edit that block in the
maintained Bid 196 artifact; refresh it with sync-data.py, never by hand), and node --check passes on every script.
"""
import os, sys, hashlib, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src"); BUILD = os.path.join(HERE, "build"); DIST = os.path.join(HERE, "dist")
os.makedirs(DIST, exist_ok=True)

def read(p): return open(p, encoding="utf-8").read()
def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()

import argparse, re as _re
ap = argparse.ArgumentParser(); ap.add_argument("--cycle", default="cycle.js"); ap.add_argument("--out", default=None); a = ap.parse_args()
CYCLE_FILE = os.path.abspath(os.path.join(HERE, a.cycle)); STEM = os.path.splitext(os.path.basename(CYCLE_FILE))[0]
BUILD = os.path.join(HERE, "build", STEM)
OUT_NAME = a.out or ("bid197.html" if STEM == "cycle" else STEM.replace("cycle", "bid") + ".html")
subprocess.run([sys.executable, os.path.join(HERE, "patch.py")], check=True, env=dict(os.environ, CYCLE_FILE=CYCLE_FILE, BUILD_DIR=BUILD))

# data.js must still be the upstream block
recorded = dict(line.split()[::-1] for line in read(os.path.join(SRC, "UPSTREAM.sha256")).strip().splitlines())
assert sha(os.path.join(SRC, "data.js")) == recorded["data.js"], "src/data.js differs from the recorded upstream hash — run sync-data.py and re-record"

scripts = [("cycle.js", CYCLE_FILE), ("data.js", os.path.join(SRC, "data.js")), ("prev195.js", os.path.join(SRC, "prev195.js")),
           ("icons.js", os.path.join(SRC, "icons.js")), ("lib.js", os.path.join(BUILD, "lib.js")), ("baymap.js", os.path.join(SRC, "baymap.js")), ("app.js", os.path.join(BUILD, "app.js"))]
for name, p in scripts:
    r = subprocess.run(["node", "--check", p], capture_output=True, text=True)
    if r.returncode: sys.exit("node --check failed for %s:\n%s" % (name, r.stderr))

head = read(os.path.join(BUILD, "head.html"))
style = "<style>" + read(os.path.join(SRC, "fonts.css")) + read(os.path.join(BUILD, "app.css")) + "</style>"
shell = read(os.path.join(BUILD, "shell.html"))
sprite = 'document.body.insertAdjacentHTML("afterbegin", window.Icons.sprite());'
blocks = []
for name, p in scripts:
    blocks.append("<script>" + read(p) + "</script>")
    if name == "icons.js": blocks.append("<script>" + sprite + "</script>")
page = head + style + shell + "\n".join(blocks) + "\n\n</body>\n</html>\n"
out = os.path.join(DIST, OUT_NAME)
open(out, "w", encoding="utf-8").write(page)
print("built %s: %d bytes, %d scripts" % (out, len(page.encode("utf-8")), len(blocks)))
