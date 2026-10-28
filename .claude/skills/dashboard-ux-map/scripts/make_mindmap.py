#!/usr/bin/env python3
"""Render a UX-map page (mind map + reference sections) from a JSON spec. Works for any dashboard.

usage: make_mindmap.py <spec.json> <out.html>

spec = {
  "title": "Bid 197 UX Map",                      # <title>, 2-4 words
  "heading": "Bid 197 dashboard · UX map",
  "intro": "One or two sentences.",
  "notice": "optional amber line (e.g. provisional data)",
  "links": [{"label": "Open the dashboard", "url": "https://claude.ai/artifact/…"}],
  "center": ["Bid 197", "dashboard · UX map"],
  "branches": [{"name": "Views", "color": "navy|sea|hb|vjo|ssf|green|#hex", "leaves": ["Overview", "…"]}],   # 4-10 branches
  "sections": [
    {"title": "Components", "table": {"heads": ["Component", "Made by"], "rows": [["Hero", "viewOverview"]]}},
    {"title": "Steps", "list": ["…"], "ordered": true},
    {"title": "Notes", "text": "plain paragraph"}
  ]
}
Cells and list items are escaped; wrap code in `backticks` to render it as <code>.
"""
import html, json, re, sys

if len(sys.argv) != 3: sys.exit(__doc__)
S = json.load(open(sys.argv[1], encoding="utf-8")); E = html.escape
def rich(t): return re.sub(r"`([^`]+)`", lambda m: "<code>%s</code>" % m.group(1), E(str(t)))
NAMED = {"navy": "var(--navy)", "sea": "var(--sea)", "hb": "var(--hb)", "vjo": "var(--vjo)", "ssf": "var(--ssf)", "green": "var(--green)"}
def col(c): return NAMED.get(c, c or "var(--navy)")

br = S["branches"]; half = (len(br) + 1) // 2
W = 1240; total_leaves = max(sum(len(b["leaves"]) + 1.2 for b in br[:half]), sum(len(b["leaves"]) + 1.2 for b in br[half:]))
H = max(520, int(total_leaves * 24 + 80)); cx, cy = W / 2, H / 2
def layout(items, xb, xl, anchor):
    out = []; total = sum(len(b["leaves"]) + 1.2 for b in items) or 1; y = 40; sc = (H - 80) / total
    for b in items:
        ys = [y + (i + .5) * sc for i in range(len(b["leaves"]))]; yb = sum(ys) / len(ys) if ys else y
        out.append((b, xb, yb, xl, ys, anchor)); y += (len(b["leaves"]) + 1.2) * sc
    return out
def curve(x1, y1, x2, y2, c, w):
    mx = (x1 + x2) / 2
    return '<path d="M%.1f %.1f C %.1f %.1f, %.1f %.1f, %.1f %.1f" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" opacity=".8"/>' % (x1, y1, mx, y1, mx, y2, x2, y2, c, w)
p = ['<svg viewBox="0 0 %d %d" role="img" aria-label="%s" style="width:100%%;max-width:100%%;height:auto;display:block">' % (W, H, E("Mind map: " + ", ".join(b["name"] for b in br)))]
for side in (layout(br[:half], 400, 190, "end"), layout(br[half:], W - 400, W - 190, "start")):
    for b, xb, yb, xl, ys, anchor in side:
        c = col(b.get("color")); dx = 12 if anchor == "end" else -12
        p.append(curve(cx, cy, xb, yb, c, 3))
        for lf, yl in zip(b["leaves"], ys):
            p.append(curve(xb, yb, xl + dx, yl, c, 1.5))
            p.append('<circle cx="%.1f" cy="%.1f" r="3.5" fill="%s"/>' % (xl + dx, yl, c))
            p.append('<text x="%.1f" y="%.1f" font-size="12.5" fill="var(--ink)" text-anchor="%s" dominant-baseline="middle">%s</text>' % (xl + (4 if anchor == "end" else -4), yl, anchor, E(lf)))
        tw = len(b["name"]) * 8 + 26
        p.append('<rect x="%.1f" y="%.1f" width="%d" height="30" rx="9" fill="%s"/>' % (xb - tw / 2, yb - 15, tw, c))
        p.append('<text x="%.1f" y="%.1f" font-size="13.5" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-family="var(--display)">%s</text>' % (xb, yb + 1, E(b["name"])))
c1, c2 = (S.get("center") or [S["heading"], ""]) + [""] * 0
p.append('<rect x="%.1f" y="%.1f" width="220" height="64" rx="14" fill="var(--navy-deep)"/>' % (cx - 110, cy - 32))
p.append('<text x="%.1f" y="%.1f" font-size="22" font-weight="800" fill="#fff" text-anchor="middle" font-family="var(--display)">%s</text>' % (cx, cy - 2, E(c1)))
if c2: p.append('<text x="%.1f" y="%.1f" font-size="12.5" fill="#fff" opacity=".85" text-anchor="middle">%s</text>' % (cx, cy + 18, E(c2)))
p.append("</svg>")

def section(sec):
    body = ""
    if "table" in sec:
        t = sec["table"]
        body = '<div class="tw"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % ("".join("<th>%s</th>" % E(h) for h in t["heads"]), "".join("<tr>%s</tr>" % "".join("<td>%s</td>" % rich(c) for c in r) for r in t["rows"]))
    elif "list" in sec:
        tag = "ol" if sec.get("ordered") else "ul"; body = "<%s>%s</%s>" % (tag, "".join("<li>%s</li>" % rich(i) for i in sec["list"]), tag)
    elif "text" in sec: body = '<p class="sub">%s</p>' % rich(sec["text"])
    return '<section><h2>%s</h2>%s</section>' % (E(sec["title"]), body)

CSS = """
/* Layout: one column of reference sections under a wide mind map; the map scrolls sideways on phones. */
:root { --bg:#EEF3F8; --surface:#FFFFFF; --surface-2:#F4F8FB; --ink:#0F2237; --muted:#56697D; --line:#D3DFEA; --navy:#015088; --navy-deep:#003A63; --sea:#E07B27; --hb:#C7485D; --vjo:#118B98; --ssf:#862985; --green:#4FAB47; --warn:#8A4E08; --warn-bg:#FCEBD2; --display:"Barlow Semi Condensed",Barlow,system-ui,sans-serif; --body:Barlow,system-ui,sans-serif }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#0B1726; --surface:#13243A; --surface-2:#182C44; --ink:#E8F0F7; --muted:#8FA4B8; --line:#2C4258; --navy:#2E8ACB; --navy-deep:#0D3C63; --hb:#E06A80; --ssf:#B566C4; --warn:#F0A24B; --warn-bg:#3E2A10; color-scheme:dark } }
:root[data-theme="dark"] { --bg:#0B1726; --surface:#13243A; --surface-2:#182C44; --ink:#E8F0F7; --muted:#8FA4B8; --line:#2C4258; --navy:#2E8ACB; --navy-deep:#0D3C63; --hb:#E06A80; --ssf:#B566C4; --warn:#F0A24B; --warn-bg:#3E2A10; color-scheme:dark }
body { margin:0; background:var(--bg); color:var(--ink); font-family:var(--body); font-size:14px; line-height:1.45 }
.wrap { max-width:1240px; margin:0 auto; padding-block:20px 48px; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); display:flex; flex-direction:column; gap:18px }
h1 { font-family:var(--display); font-weight:800; font-size:30px; margin:0; text-wrap:balance }
h2 { font-family:var(--display); font-weight:700; font-size:19px; margin:0 0 8px }
.sub { color:var(--muted); max-width:70ch; margin:0 }
.prov { background:var(--warn-bg); color:var(--warn); border-radius:10px; padding:10px 14px; font-weight:600 }
.links { display:flex; flex-wrap:wrap; gap:8px }
.links a { display:inline-flex; align-items:center; min-height:44px; padding:0 12px; border:1.5px solid var(--line); border-radius:10px; background:var(--surface); color:var(--navy); font-weight:700; text-decoration:none }
a:focus-visible { outline:3px solid var(--sea); outline-offset:2px }
.map { margin:0; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:10px; overflow-x:auto }
.map svg { min-width:900px }
section { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:14px 16px 16px; min-width:0 }
.grid2 { display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:14px }
.tw { overflow-x:auto }
table { border-collapse:collapse; width:100%; font-size:13px }
th, td { text-align:left; vertical-align:top; padding:7px 10px 7px 0; border-bottom:1px solid var(--line) }
th { font-size:12px; letter-spacing:.4px; text-transform:uppercase; color:var(--muted) }
code { font-family:var(--display); font-size:13px; background:var(--surface-2); padding:1px 5px; border-radius:5px }
ol, ul { margin:0; padding-left:20px } li { margin:3px 0 }
"""
secs = S.get("sections", []); wide = [s for s in secs if "table" in s and len(s["table"]["heads"]) > 2]; small = [s for s in secs if s not in wide]
page = ('<title>%s</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Semi+Condensed:wght@600;700;800&display=swap">\n'
        '<style>%s</style>\n<div class="wrap"><div><h1>%s</h1><p class="sub">%s</p></div>%s%s'
        '<figure class="map">%s</figure>%s%s</div>\n') % (
    E(S["title"]), CSS, E(S["heading"]), rich(S.get("intro", "")),
    '<div class="prov">%s</div>' % rich(S["notice"]) if S.get("notice") else "",
    '<div class="links">%s</div>' % "".join('<a href="%s">%s</a>' % (E(l["url"]), E(l["label"])) for l in S.get("links", [])) if S.get("links") else "",
    "".join(p), "".join(section(s) for s in wide), '<div class="grid2">%s</div>' % "".join(section(s) for s in small) if small else "")
open(sys.argv[2], "w", encoding="utf-8").write(page); print("wrote", sys.argv[2], len(page), "bytes")
