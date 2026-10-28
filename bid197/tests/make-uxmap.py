#!/usr/bin/env python3
"""Generate dist/ux-map.html: a mind map of the Bid 197 dashboard (SVG, laid out by this script) plus the
component, playbook and data-swap tables from ux-map.json. Run after editing ux-map.json."""
import json, os, html
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
M = json.load(open(os.path.join(ROOT, "ux-map.json")))
E = html.escape

# ---------- mind map: centre + 8 branches, each with leaves; left/right halves ----------
branches = [
  ("Views", "var(--navy)", ["Overview", "Bids (+URL filters)", "Bid page", "Day", "Crew · Captains", "Compare", "Water shuttle", "Changes"]),
  ("Shell", "var(--navy)", ["Provisional strip", "Header + theme", "5 tabs", "Jump rail", "Toast"]),
  ("New in 197", "var(--sea)", ["Tappable hero facts", "Stat tile buttons", "Bar + gantt taps", "Load-chart cursor", "Filters in URL", "Compare best-of-row", "Share as text", "Swipe + keys", "Grid name → search", "Theme toggle"]),
  ("Data", "var(--vjo)", ["CYCLE (cycle.js)", "DATA + SCHED (upstream)", "PREV + CHG (prev195)", "AUDIT_NOTES · NOV2_LOG", "BAY_GEO"]),
  ("Build", "var(--vjo)", ["src/ pristine 196", "patch.py anchors", "extra.js · extra.css", "build.py → dist", "tests/sweep.js"]),
  ("Design tokens", "var(--hb)", ["Navy brand", "6 route colours", "Semantic ok/warn/bad", "Barlow + Semi Condensed", "12 px floor · 44 px taps"]),
  ("State + storage", "var(--hb)", ["state{} in app IIFE", "b197.* only", "render() rebuilds #main", "hash router"]),
  ("Playbook", "var(--ssf)", ["Wording → cycle.js", "Style → extra.css", "Behaviour → patch.py", "Data → resync upstream", "Publish same URL"]),
]
W, H = 1240, 920; cx, cy = W / 2, H / 2
left = branches[:4]; right = branches[4:]
def col_layout(items, x_branch, x_leaf, anchor):
    out = []; total = sum(len(b[2]) + 1.2 for b in items); y = 40; scale = (H - 80) / total
    for name, color, leaves in items:
        y0 = y; ys = []
        for i, lf in enumerate(leaves): ys.append(y + (i + 0.5) * scale)
        yb = sum(ys) / len(ys)
        out.append((name, color, leaves, x_branch, yb, x_leaf, ys, anchor)); y += (len(leaves) + 1.2) * scale
    return out
L = col_layout(left, 300, 70, "end"); R = col_layout(right, W - 300, W - 70, "start")
p = ['<svg viewBox="0 0 %d %d" role="img" aria-label="Mind map of the Bid 197 dashboard: views, shell, new interactions, data, build, design tokens, state and the revision playbook" style="width:100%%;max-width:100%%;height:auto;display:block">' % (W, H)]
def curve(x1, y1, x2, y2, color, w=2):
    mx = (x1 + x2) / 2; return '<path d="M%.1f %.1f C %.1f %.1f, %.1f %.1f, %.1f %.1f" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" opacity=".8"/>' % (x1, y1, mx, y1, mx, y2, x2, y2, color, w)
for side in (L, R):
    for name, color, leaves, xb, yb, xl, ys, anchor in side:
        p.append(curve(cx, cy, xb, yb, color, 3))
        for lf, yl in zip(leaves, ys):
            p.append(curve(xb, yb, xl + (12 if anchor == "end" else -12), yl, color, 1.5))
            p.append('<circle cx="%.1f" cy="%.1f" r="3.5" fill="%s"/>' % (xl + (12 if anchor == "end" else -12), yl, color))
            p.append('<text x="%.1f" y="%.1f" font-size="12.5" fill="var(--ink)" text-anchor="%s" dominant-baseline="middle">%s</text>' % (xl + (4 if anchor == "end" else -4), yl, anchor, E(lf)))
        tw = len(name) * 8 + 26
        p.append('<rect x="%.1f" y="%.1f" width="%d" height="30" rx="9" fill="%s"/>' % (xb - tw / 2, yb - 15, tw, color))
        p.append('<text x="%.1f" y="%.1f" font-size="13.5" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-family="var(--display)">%s</text>' % (xb, yb + 1, E(name)))
p.append('<rect x="%.1f" y="%.1f" width="200" height="64" rx="14" fill="var(--navy-deep)"/>' % (cx - 100, cy - 32))
p.append('<text x="%.1f" y="%.1f" font-size="22" font-weight="800" fill="#fff" text-anchor="middle" font-family="var(--display)">Bid 197</text>' % (cx, cy - 2))
p.append('<text x="%.1f" y="%.1f" font-size="12.5" fill="#fff" opacity=".85" text-anchor="middle">dashboard · UX map</text>' % (cx, cy + 18))
p.append('</svg>')
mindmap = "".join(p)

def table(rows, heads):
    return '<div class="tw"><table><thead><tr>' + "".join('<th>%s</th>' % E(h) for h in heads) + '</tr></thead><tbody>' + "".join('<tr>' + "".join('<td>%s</td>' % c for c in r) + '</tr>' for r in rows) + '</tbody></table></div>'
comp_rows = [[ '<b>%s</b>' % E(c["name"]), '<code>%s</code>' % E(c.get("fn", "")), '<code>%s</code>' % E(c.get("file", "")), '<code>%s</code>' % E(c.get("css", "")), E(" · ".join(c.get("interactions", [])) or (c.get("rule") or (" · ".join("%s %s" % (k, v) for k, v in c.get("keys", {}).items()))))] for c in M["components"]]
play_rows = [[E(k), '<code>%s</code>' % E(v)] for k, v in M["playbook"].items()]
swap = "".join('<li>%s</li>' % E(s) for s in M["dataSwap"])
store = ", ".join('<code>%s</code>' % E(k) for k in M["storage"]["keys"])
routes = "".join('<tr><td><code>%s</code></td><td>%s</td></tr>' % (E(k), E(v)) for k, v in M["routes"].items())

page = '''<title>Bid 197 UX Map</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Semi+Condensed:wght@600;700;800&display=swap">
<style>
/* Layout: one column of reference sections under a wide mind map; the map scrolls sideways on phones. */
:root { --bg:#EEF3F8; --surface:#FFFFFF; --surface-2:#F4F8FB; --ink:#0F2237; --muted:#56697D; --line:#D3DFEA; --navy:#015088; --navy-deep:#003A63; --sea:#E07B27; --hb:#C7485D; --vjo:#118B98; --ssf:#862985; --warn:#8A4E08; --warn-bg:#FCEBD2; --display:"Barlow Semi Condensed",Barlow,system-ui,sans-serif; --body:Barlow,system-ui,sans-serif }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#0B1726; --surface:#13243A; --surface-2:#182C44; --ink:#E8F0F7; --muted:#8FA4B8; --line:#2C4258; --navy:#2E8ACB; --navy-deep:#0D3C63; --hb:#E06A80; --ssf:#B566C4; --warn:#F0A24B; --warn-bg:#3E2A10; color-scheme:dark } }
:root[data-theme="dark"] { --bg:#0B1726; --surface:#13243A; --surface-2:#182C44; --ink:#E8F0F7; --muted:#8FA4B8; --line:#2C4258; --navy:#2E8ACB; --navy-deep:#0D3C63; --hb:#E06A80; --ssf:#B566C4; --warn:#F0A24B; --warn-bg:#3E2A10; color-scheme:dark }
body { margin:0; background:var(--bg); color:var(--ink); font-family:var(--body); font-size:14px; line-height:1.45 }
.wrap { max-width:1240px; margin:0 auto; padding-block:20px 48px; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); display:flex; flex-direction:column; gap:18px }
h1 { font-family:var(--display); font-weight:800; font-size:30px; margin:0; letter-spacing:-.2px; text-wrap:balance }
h2 { font-family:var(--display); font-weight:700; font-size:19px; margin:0 0 8px }
.sub { color:var(--muted); max-width:70ch; margin:0 }
.prov { background:var(--warn-bg); color:var(--warn); border-radius:10px; padding:10px 14px; font-weight:600 }
.links { display:flex; flex-wrap:wrap; gap:8px }
.links a { display:inline-flex; align-items:center; min-height:40px; padding:0 12px; border:1.5px solid var(--line); border-radius:10px; background:var(--surface); color:var(--navy); font-weight:700; text-decoration:none }
.links a:focus-visible, button:focus-visible { outline:3px solid var(--sea); outline-offset:2px }
.map { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:10px; overflow-x:auto }
.map svg { min-width:900px }
section { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:14px 16px 16px }
.tw { overflow-x:auto }
table { border-collapse:collapse; width:100%%; font-size:13px }
th, td { text-align:left; vertical-align:top; padding:7px 10px 7px 0; border-bottom:1px solid var(--line) }
th { font-size:12px; letter-spacing:.4px; text-transform:uppercase; color:var(--muted) }
code { font-family:var(--display); font-size:13px; background:var(--surface-2); padding:1px 5px; border-radius:5px }
ol, ul { margin:0; padding-left:20px } li { margin:3px 0 }
.grid2 { display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:14px }
.kbd { display:inline-block; font:700 12px var(--display); background:var(--surface-2); border:1px solid var(--line); border-bottom-width:2px; border-radius:5px; padding:1px 6px; margin-right:4px }
.pipe { display:flex; flex-wrap:wrap; gap:6px; align-items:center }
.pipe span { background:var(--surface-2); border:1px solid var(--line); border-radius:999px; padding:5px 10px; font-family:var(--display); font-weight:700; font-size:13px }
.pipe i { color:var(--muted); font-style:normal }
</style>
<div class="wrap">
  <div>
    <h1>Bid 197 dashboard · UX map</h1>
    <p class="sub">The map used when revising the IBU Bid 197 dashboard: what each piece is, where it is made, what it responds to, and the order to change and test things in. The full text version is <code>bid197/UX-MAP.md</code> in the repo.</p>
  </div>
  <div class="prov">Provisional: the dashboard shows Bid 196 lines until the Bid 197 sheet is issued. <code>cycle.js</code> is the one switch; the data-swap steps are at the bottom.</div>
  <div class="links"><a href="%(dash)s">Open the dashboard</a><a href="%(canvas)s">Design revisions canvas</a><a href="%(t196)s">Bid 196 template</a></div>
  <figure class="map" style="margin:0">%(map)s<figcaption style="color:var(--muted);font-size:12.5px;margin-top:6px">Centre: the page. Left: what the viewer sees and what is new. Right: what it is built from and how to change it.</figcaption></figure>
  <section><h2>Build pipeline</h2><div class="pipe">%(pipe)s</div><p class="sub" style="margin-top:8px">Script order inside the page: %(order)s. Never edit <code>build/</code> or <code>dist/</code>; <code>patch.py</code> asserts every anchor so an upstream change fails loudly.</p></section>
  <section><h2>Components, where they are made, what they do</h2>%(comps)s</section>
  <div class="grid2">
    <section><h2>Routes</h2><div class="tw"><table><thead><tr><th>Hash</th><th>View</th></tr></thead><tbody>%(routes)s</tbody></table></div></section>
    <section><h2>State and storage</h2><p class="sub">Per-device keys, all under <code>b197.</code> (never <code>b196.</code>): %(store)s.</p><p class="sub" style="margin-top:8px">Keyboard: <span class="kbd">/</span>search <span class="kbd">1–5</span>tabs <span class="kbd">[</span><span class="kbd">]</span>previous / next bid <span class="kbd">s</span>star <span class="kbd">c</span>compare <span class="kbd">t</span>theme <span class="kbd">?</span>help</p></section>
    <section><h2>Revision playbook</h2>%(play)s</section>
    <section><h2>When the Bid 197 sheet posts</h2><ol>%(swap)s</ol></section>
  </div>
  <section><h2>Design rules carried from Bid 196</h2><ul><li>Hue has two jobs only: route identity and status. Session is a text label.</li><li>Barlow body, Barlow Semi Condensed display and numbers, tabular digits on every time.</li><li>Nothing under 12 px; every tap target at least 44 px under 900 px.</li><li>Shadow only on the lead card, the hero and the bid hero. Few cards, no tiles inside cards inside cards.</li><li>Glance rows count exactly like the phone guide. Crew slots are what the data says; never invent names.</li></ul></section>
</div>
''' % dict(dash=M["artifacts"]["dashboard"], canvas=M["artifacts"]["designCanvas"], t196=M["artifacts"]["template196"], map=mindmap,
           pipe=' <i>→</i> '.join('<span>%s</span>' % E(s) for s in M["pipeline"]), order=" → ".join('<code>%s</code>' % E(s) for s in M["scriptOrder"]),
           comps=table(comp_rows, ["Component", "Made by", "File", "CSS", "Responds to"]), routes=routes, store=store, play=table(play_rows, ["Ask", "Touch"]), swap=swap)
out = os.path.join(ROOT, "dist", "ux-map.html"); open(out, "w", encoding="utf-8").write(page); print("wrote", out, len(page))
