#!/usr/bin/env python3
"""Split a saved ferry-bid dashboard artifact (the HTML the Artifact `read` action saves) into its parts.

usage: split_artifact.py <saved-artifact.html> <out-dir>

Writes head.html, fonts.css, app.css, shell.html and the scripts in page order
(data.js, prev<N>.js, icons.js, lib.js, baymap.js, app.js; the one-line sprite insert is dropped because
build.py re-adds it), plus UPSTREAM.sha256 with a hash of every part. Strips the publish wrapper
(first line `<!doctype html><html><head><meta charset=utf8>…<body>` and the trailing `</body></html>`).
Fails loudly if the page does not have the expected 7 script blocks.
"""
import hashlib, os, re, sys

if len(sys.argv) != 3: sys.exit(__doc__)
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
s = open(src, encoding="utf-8").read()

# 1. publish wrapper
if s.startswith("<!doctype html><html><head><meta charset=utf8>"):
    s = s[s.find("\n") + 1:]
s = s.rstrip()
if s.endswith("</body></html>"): s = s[: -len("</body></html>")]

# 2. head / css / shell
st = s.find("<style>"); assert st > 0, "no <style> block"
head = s[:st]
en = s.find("</style>", st); css = s[st + 7:en]
fi = css.rfind("@font-face"); fe = css.find("}", css.find('format("woff2")', fi)) + 1 if fi >= 0 else 0
fonts, app_css = css[:fe], css[fe:]
first_script = s.find("<script", en)
shell = s[en + len("</style>"):first_script]

# 3. scripts in order
blocks = []
for m in re.finditer(r"<script[^>]*>", s):
    a = m.end(); b = s.find("</script>", a); blocks.append(s[a:b])
blocks = [b for b in blocks if "insertAdjacentHTML(\"afterbegin\", window.Icons.sprite())" not in b]
assert len(blocks) == 6, "expected 6 code scripts (data, prev, icons, lib, baymap, app), found %d" % len(blocks)
prev = re.search(r"Bid (\d+) reference data", blocks[1])
prev_name = "prev%s.js" % (prev.group(1) if prev else "")
names = ["data.js", prev_name, "icons.js", "lib.js", "baymap.js", "app.js"]

parts = {"head.html": head, "fonts.css": fonts, "app.css": app_css, "shell.html": shell}
parts.update(dict(zip(names, blocks)))
lines = []
for name, body in parts.items():
    p = os.path.join(out, name); open(p, "w", encoding="utf-8").write(body)
    lines.append("%s  %s" % (hashlib.sha256(body.encode("utf-8")).hexdigest(), name))
open(os.path.join(out, "UPSTREAM.sha256"), "w").write("\n".join(lines) + "\n")
title = re.search(r"<title>(.*?)</title>", head)
print("split %s -> %s (%s)" % (src, out, title.group(1) if title else "no title"))
for name, body in parts.items(): print("  %-12s %8d bytes" % (name, len(body)))
