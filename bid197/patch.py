#!/usr/bin/env python3
"""Derive a dashboard build (Bid 197 preview, Bid 196 R2, …) from the pristine Bid 196 parts in src/ and a cycle file.

usage: CYCLE_FILE=cycle196r2.js python3 patch.py   (default cycle.js; output build/<cycle stem>/)

Every edit is anchored on a unique string and asserted, so the script fails loudly when the upstream
Bid 196 artifact changes under it. Output goes to build/ (never edit build/ by hand):
  build/head.html, build/app.css (+ extra.css), build/shell.html, build/lib.js, build/app.js (+ extra.js)
data.js, prev195.js, icons.js, baymap.js and fonts.css are used untouched.
"""
import os, re, sys, json, hashlib, html

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
# which cycle to build: CYCLE_FILE (default cycle.js) -> build/<stem>/
CYCLE_FILE = os.path.abspath(os.environ.get("CYCLE_FILE", os.path.join(HERE, "cycle.js")))
STEM = os.path.splitext(os.path.basename(CYCLE_FILE))[0]
OUT = os.environ.get("BUILD_DIR", os.path.join(HERE, "build", STEM))
os.makedirs(OUT, exist_ok=True)
import subprocess as _sp
CY = json.loads(_sp.run(["node", "-e", "var window={};" + open(CYCLE_FILE, encoding="utf-8").read() + ";process.stdout.write(JSON.stringify(window.CYCLE))"], capture_output=True, text=True, check=True).stdout)
TITLE = CY.get("title") or "IBU Bid %d Dashboard" % CY["bid"]
BRAND = CY.get("brand") or "Bid %d" % CY["bid"]
BRAND_SUB = CY.get("brandSub") or ""

def read(p): return open(p, encoding="utf-8").read()
def write(p, s): open(p, "w", encoding="utf-8").write(s)

def rep(s, old, new, count=1, label=""):
    n = s.count(old)
    assert n == count, "anchor %r found %d times (expected %d) %s" % (old[:80], n, count, label)
    return s.replace(old, new)

# ---------------------------------------------------------------- head
head = read(os.path.join(SRC, "head.html"))
head = rep(head, "<title>IBU Bid 196 Dashboard</title>", "<title>%s</title>" % html.escape(TITLE))
write(os.path.join(OUT, "head.html"), head)

# ---------------------------------------------------------------- shell
shell = read(os.path.join(SRC, "shell.html"))
shell = rep(shell, '<div class="brand-t">Bid 196 <small>IBU DECKHAND</small></div>', '<div class="brand-t">%s <small>%s</small></div>' % (BRAND, html.escape(CY.get("brandTag") or "IBU DECKHAND")))
shell = re.sub(r'<div class="brand-s">.*?</div>', lambda m: '<div class="brand-s" id="brand-s">%s</div>' % BRAND_SUB, shell, count=1)
assert 'id="brand-s"' in shell
shell = rep(shell, '<div class="status-pill"><i></i><span>Crew not posted</span></div>',
            '<div class="status-pill"><i></i><span>Crew not posted</span></div>\n    <button class="theme" id="theme" type="button" aria-label="Theme"></button>')
shell = rep(shell, '  <header class="topbar">', '  <div class="provo" id="provo" hidden></div>\n  <header class="topbar">')
write(os.path.join(OUT, "shell.html"), shell)

# ---------------------------------------------------------------- css
css = read(os.path.join(SRC, "app.css")) + "\n" + read(os.path.join(HERE, "extra.css"))
write(os.path.join(OUT, "app.css"), css)

# ---------------------------------------------------------------- lib.js: charts carry keys, gantt rows are groups, load chart has a cursor
lib = read(os.path.join(SRC, "lib.js"))
lib = rep(lib, "/* Shared renderers for the Bid 196 dashboard (browser) and the PDF (node). Pure string output. */",
          "/* Shared renderers for the bid dashboard (browser) and the PDF (node). Pure string output. Bid 197 build: keyed bars, gantt row groups, load-chart cursor. */")
# bar chart
lib = rep(lib, """    items.forEach(function (it, i) {
      var y = i * RH + 3, w = (it.v / max) * (W - L - 34);
      p.push('<text x="' + (L - 6) + '" y="' + (y + 12) + '" font-size="10" fill="' + C.ink + '" text-anchor="end" font-weight="600">' + esc(it.label) + '</text>');
      p.push('<rect x="' + L + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + (RH - 6) + '" rx="3" fill="' + (it.color || C.navy) + '"/>');
      p.push('<text x="' + (L + w + 5).toFixed(1) + '" y="' + (y + 12) + '" font-size="10" fill="' + C.muted + '" font-family="var(--font-display)">' + it.v + (it.suffix || "") + '</text>');
    });""",
"""    items.forEach(function (it, i) {
      var y = i * RH + 3, w = (it.v / max) * (W - L - 34), keyed = it.k != null;
      if (keyed) p.push('<g class="bar" data-k="' + esc(String(it.k)) + '" tabindex="0" role="button" aria-label="' + esc(it.label) + ': ' + it.v + (it.suffix || "") + '"><title>' + esc(it.label) + ': ' + it.v + (it.suffix || "") + '</title><rect class="bar-hit" x="0" y="' + (y - 2) + '" width="' + W + '" height="' + (RH - 2) + '" rx="4" fill="transparent"/>');
      p.push('<text x="' + (L - 6) + '" y="' + (y + 12) + '" font-size="10" fill="' + C.ink + '" text-anchor="end" font-weight="600">' + esc(it.label) + '</text>');
      p.push('<rect x="' + L + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + (RH - 6) + '" rx="3" fill="' + (it.color || C.navy) + '"/>');
      p.push('<text x="' + (L + w + 5).toFixed(1) + '" y="' + (y + 12) + '" font-size="10" fill="' + C.muted + '" font-family="var(--font-display)">' + it.v + (it.suffix || "") + '</text>');
      if (keyed) p.push('</g>');
    });""")
# gantt rows
lib = rep(lib, """      var y = TOP + i * RH, b = r.bid, L = r.line, si = sessInfo(b.s);
      if (i % 2 === 0) p.push('<rect x="0" y="' + y + '" width="' + W + '" height="' + RH + '" fill="var(--surface-2)"/>');""",
"""      var y = TOP + i * RH, b = r.bid, L = r.line, si = sessInfo(b.s);
      p.push('<g class="gr" data-n="' + b.n + '" tabindex="0" role="button" aria-label="Open bid ' + b.n + '"><title>#' + b.n + ' · ' + esc(L.header) + '</title>');
      if (i % 2 === 0) p.push('<rect x="0" y="' + y + '" width="' + W + '" height="' + RH + '" fill="var(--surface-2)"/>');
      p.push('<rect class="gr-hit" x="0" y="' + y + '" width="' + W + '" height="' + RH + '" fill="transparent"/>');""")
lib = rep(lib, """        p.push('<text x="' + (LBL + 4) + '" y="' + (y + RH - 4) + '" font-size="7.5" fill="' + C.muted + '" font-style="italic">' + (typeLbl || "varies") + ' — report time varies, any location</text>');
      }
    });
    p.push('</svg>');
    return { svg: p.join(""), rows: rows.length, height: H };""",
"""        p.push('<text x="' + (LBL + 4) + '" y="' + (y + RH - 4) + '" font-size="7.5" fill="' + C.muted + '" font-style="italic">' + (typeLbl || "varies") + ' — report time varies, any location</text>');
      }
      p.push('</g>');
    });
    if (opts.now != null && opts.now >= G_START && opts.now <= G_END) { var nx = x(opts.now); p.push('<line class="g-now" x1="' + nx.toFixed(1) + '" y1="' + TOP + '" x2="' + nx.toFixed(1) + '" y2="' + (H - 6) + '" stroke="var(--r-sea)" stroke-width="1.5" stroke-dasharray="3 2"/><text x="' + (nx + 3).toFixed(1) + '" y="' + (TOP - 2) + '" font-size="8.5" font-weight="800" fill="var(--r-sea)" font-family="var(--font-display)">now</text>'); }
    p.push('</svg>');
    return { svg: p.join(""), rows: rows.length, height: H };""")
# load chart cursor + geometry
lib = rep(lib, """    var p = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="chart" role="img" aria-label="Boats underway by time of day">'];""",
"""    var p = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="chart" role="img" aria-label="Boats underway by time of day" data-l="' + L + '" data-r="' + R + '" data-w="' + W + '" data-n="' + n + '">'];""")
lib = rep(lib, """    var lx = W - R - 4;
    curves.slice().reverse().forEach(function (c, k) { p.push('<text x="' + lx + '" y="' + (T + 10 + k * 12) + '" font-size="9" font-weight="700" fill="' + c.color + '" text-anchor="end">' + esc(c.label) + '</text>'); });
    p.push('</svg>');""",
"""    var lx = W - R - 4;
    curves.slice().reverse().forEach(function (c, k) { p.push('<text x="' + lx + '" y="' + (T + 10 + k * 12) + '" font-size="9" font-weight="700" fill="' + c.color + '" text-anchor="end">' + esc(c.label) + '</text>'); });
    p.push('<g class="lc-cur" hidden><line x1="0" y1="' + T + '" x2="0" y2="' + (H - B) + '" stroke="var(--ink)" stroke-width="1" stroke-dasharray="3 2"/></g>');
    p.push('</svg>');""")
write(os.path.join(OUT, "lib.js"), lib)

# ---------------------------------------------------------------- app.js
app = read(os.path.join(SRC, "app.js"))
app = rep(app, "/* Bid 196 dashboard — runs in the browser on top of DATA, SCHED, DashLib, Icons and BayMap. */",
          "/* IBU bid dashboard (Bid 197 build) — runs in the browser on top of CYCLE, DATA, SCHED, DashLib, Icons and BayMap. Derived from the Bid 196 dashboard by patch.py. */")

# 1. cycle metadata, dates, storage namespace
app = rep(app, """  var BID_START = new Date(2026, 10, 2), BID_END = new Date(2027, 1, 28);""",
"""  var CY = window.CYCLE || { bid: 196, sheet: 196, prevSheet: 195, provisional: false, start: "2026-11-02", end: "2027-02-28", sheetStart: "2026-11-02", sheetEnd: "2027-02-28" };
  var TN = "Bid " + CY.bid, BN = "Bid " + CY.sheet, PN = "Bid " + CY.prevSheet;
  function dateOf(s, d) { var m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : d; }
  var BID_START = dateOf(CY.start, new Date(2026, 10, 2)), BID_END = dateOf(CY.end, null);
  var SHEET_START = dateOf(CY.sheetStart, new Date(2026, 10, 2)), SHEET_END = dateOf(CY.sheetEnd, new Date(2027, 1, 28));""")
app = rep(app, 'localStorage.getItem("b196." + k)', 'localStorage.getItem((CY.store || "b" + CY.bid) + "." + k)')
app = rep(app, 'localStorage.setItem("b196." + k, JSON.stringify(v))', 'localStorage.setItem((CY.store || "b" + CY.bid) + "." + k, JSON.stringify(v))')
app = rep(app, 'pk: load("pk", { cb: true, sf: true, wk: false }), pkAll: false };',
          'pk: load("pk", { cb: true, sf: true, wk: false }), pkAll: false, theme: load("theme", "auto"), provSeen: load("provSeen", false) };')
app = rep(app, "wkB = Math.round((BID_END - BID_START) / 864e5 / 7 + 1 / 7);", "wkB = Math.round((SHEET_END - SHEET_START) / 864e5 / 7 + 1 / 7);")

# 2. overview hero: this cycle's name, data-driven subtitle, tappable facts
app = rep(app, """h("div", { class: "hero-t" }, "IBU Deckhand ", h("span", null, "Bid 196")), h("div", { class: "hero-s" }, "Nov 2, 2026 – Feb 28, 2027, from the IBU Deckhand Bid 196 Final-Final sheet."),""",
"""h("div", { class: "hero-t" }, "IBU Deckhand ", h("span", null, TN)), h("div", { class: "hero-s" }, CY.heroSub || (CY.sheetDates + ", from the IBU Deckhand " + BN + " Final-Final sheet.")),""")
app = rep(app, """h("div", { class: "hero-cd" }, h("div", { class: "cd" }, h("b", null, dtg > 0 ? String(dtg) : dtg === 0 ? "Today" : "Live"), h("span", null, dtg > 0 ? "days until it starts" : "Bid 196 is underway")), h("div", { class: "cd" }, h("b", null, String(bids.length)), h("span", null, "bids")), h("div", { class: "cd" }, h("b", null, String(wkoff)), h("span", null, "with weekends off")))),""",
"""h("div", { class: "hero-cd" }, h("div", { class: "cd", title: CY.provisional ? CY.startNote : null }, h("b", null, dtg > 0 ? String(dtg) : dtg === 0 ? "Today" : "Live"), h("span", null, dtg > 0 ? "days until it starts" + (CY.provisional ? " (expected)" : "") : TN + " is underway")), h("button", { class: "cd", onclick: function () { go("bids"); } }, h("b", null, String(bids.length)), h("span", null, "bids")), h("button", { class: "cd", onclick: function () { state.offF = "wkend"; go("bids"); } }, h("b", null, String(wkoff)), h("span", null, "with weekends off")))),""")
app = rep(app, """h("div", { class: "stats" }, stat("bids", bids.length, "bids", bySess.AM + " AM · " + bySess.PM + " PM · " + bySess.V + " varies"), stat("crew", cc.filled + "/" + cc.slots, "seats filled", cc.open ? cc.open + " open" : "all assigned"), stat("audit", DATA.sen.length, "on seniority list", noBid + " haven't bid yet"), stat("oa", legs, "sailings per weekday set", implied + " implied returns")),""",
"""h("div", { class: "stats" }, stat("bids", bids.length, "bids", bySess.AM + " AM · " + bySess.PM + " PM · " + bySess.V + " varies", function () { go("bids"); }), stat("crew", cc.filled + "/" + cc.slots, "seats filled", cc.open ? cc.open + " open" : "all assigned", function () { state.crewTab = "dh"; state.gridOpen = true; go("crew"); }), stat("audit", DATA.sen.length, "on seniority list", noBid + " haven't bid yet", function () { state.crewTab = "dh"; go("crew"); }), stat("oa", legs, "sailings per weekday set", implied + " implied returns", function () { state.sort = "sail"; go("bids"); })),""")
app = rep(app, """  function stat(icon, v, lbl, sub) { return h("div", { class: "stat" }, ic(icon), h("div", null, h("div", { class: "stat-v" }, String(v)), h("div", { class: "stat-l" }, lbl), sub ? h("div", { class: "stat-s" }, sub) : null)); }""",
"""  function stat(icon, v, lbl, sub, fn) { return h(fn ? "button" : "div", { class: "stat", onclick: fn || null, type: fn ? "button" : null }, ic(icon), h("div", null, h("div", { class: "stat-v" }, String(v)), h("div", { class: "stat-l" }, lbl), sub ? h("div", { class: "stat-s" }, sub) : null)); }""")
# charts on the overview: keyed bars, cursor load chart, tappable gantt
app = rep(app, """var perDay = D.DAYS.map(function (d, i) { var n = 0; bids.forEach(function (b) { var sc = schedMap[b.n]; if (sc && D.linesForDay(b, sc, i).length) n++; }); return { label: D.DAY_LONG[i].slice(0, 3), v: n, color: i >= 5 ? "var(--am)" : "var(--navy)" }; });""",
"""var perDay = D.DAYS.map(function (d, i) { var n = 0; bids.forEach(function (b) { var sc = schedMap[b.n]; if (sc && D.linesForDay(b, sc, i).length) n++; }); return { label: D.DAY_LONG[i].slice(0, 3), v: n, color: i >= 5 ? "var(--am)" : "var(--navy)", k: i }; });""")
app = rep(app, """h("div", null, h("div", { class: "sub-lbl" }, "Crews working each day"), h("div", { class: "chart", html: D.barChartSVG(perDay, { labelW: 40 }) })),""",
"""h("div", null, h("div", { class: "sub-lbl" }, "Crews working each day"), chartBox("chart", D.barChartSVG(perDay, { labelW: 40 }), function (k) { go("day-" + k); }, "Tap a day to see every shift on it.")),""")
app = rep(app, """h("div", null, h("div", { class: "sub-lbl" }, "Sailings by route, implied returns included"), h("div", { class: "chart", html: D.barChartSVG(Object.keys(routeCount).sort(function (a, b) { return routeCount[b] - routeCount[a]; }).map(function (r) { return { label: RL[r] || r, v: routeCount[r], color: RC[r] }; }), { labelW: 120 }) }))),""",
"""h("div", null, h("div", { class: "sub-lbl" }, "Sailings by route, implied returns included"), chartBox("chart", D.barChartSVG(Object.keys(routeCount).sort(function (a, b) { return routeCount[b] - routeCount[a]; }).map(function (r) { return { label: RL[r] || r, v: routeCount[r], color: RC[r], k: r }; }), { labelW: 120 }), function (k) { if (ROUTES.indexOf(k) >= 0) { state.routeF = k; go("bids"); } }, "Tap a route to list its bids."))),""")
app = rep(app, """card("Boats underway by time of day", "Crews on the water each half hour, Wednesday against Saturday. South SF is counted although it is suspended in November.", h("div", { class: "chart-wrap", html: D.loadChartSVG([{ bins: wk.bins, color: "var(--navy)", label: "Wed (" + wk.crews + " crews)" }, { bins: we.bins, color: "var(--am)", label: "Sat (" + we.crews + " crews)" }]) })),""",
"""card("Boats underway by time of day", "Crews on the water each half hour, Wednesday against Saturday. South SF is counted although it is suspended in November.", loadChartBox([{ bins: wk.bins, color: "var(--navy)", label: "Wed (" + wk.crews + " crews)" }, { bins: we.bins, color: "var(--am)", label: "Sat (" + we.crews + " crews)" }], [{ d: 2, short: "Wed" }, { d: 5, short: "Sat" }])),""")
app = rep(app, """h("div", { class: "scrollx", html: D.ganttSVG(bids, schedMap, state.day, { width: 720 }).svg }),""",
"""ganttBox(D.ganttSVG(bids, schedMap, state.day, { width: 720, now: state.day === todayIdx() ? nowMins() : null }), state.day),""")
# day view gantt
app = rep(app, """var d = state.day, g = D.ganttSVG(bids, schedMap, d, { width: 720 }), rows = [];""",
          """var d = state.day, g = D.ganttSVG(bids, schedMap, d, { width: 720, now: d === todayIdx() ? nowMins() : null }), rows = [];""")
app = rep(app, """h("div", { class: "fold-b" }, h("div", { class: "scrollx", html: g.svg }), h("div", { class: "legend" }, ROUTES.map(function (r) { return lgSwatch(RC[r], RL[r]); }))))""",
          """h("div", { class: "fold-b" }, ganttBox(g, d), h("div", { class: "legend" }, ROUTES.map(function (r) { return lgSwatch(RC[r], RL[r]); }), h("span", { class: "hint", style: "margin:0 0 0 auto" }, "Tap a row to open that bid"))))""")

# 3. route accent on number tiles (bid rows, day rows)
app = rep(app, """    return h("div", { class: "bidrow" + (inCmp(b.n) ? " cmp" : ""), role: "button", tabindex: "0", onclick: function (e) { if (e.target.closest(".iconbtn")) return; go("bid-" + b.n); }, onkeydown: function (e) { if (e.key === "Enter" && !e.target.closest(".iconbtn")) go("bid-" + b.n); } },
      h("div", { class: "bn" }, h("b", null, String(b.n)), h("small", null, b.s === "V" ? "VAR" : b.s)),""",
"""    var rc0 = routesOf(b)[0];
    return h("div", { class: "bidrow" + (inCmp(b.n) ? " cmp" : ""), role: "button", tabindex: "0", onclick: function (e) { if (e.target.closest(".iconbtn")) return; go("bid-" + b.n); }, onkeydown: function (e) { if (e.key === "Enter" && !e.target.closest(".iconbtn")) go("bid-" + b.n); } },
      h("div", { class: "bn r", style: rc0 && RC[rc0] ? "--rc:" + RC[rc0] : null }, h("b", null, String(b.n)), h("small", null, b.s === "V" ? "VAR" : b.s)),""")
app = rep(app, """        return h("div", { class: "bidrow", role: "button", tabindex: "0", onclick: function () { go("bid-" + r.b.n); }, onkeydown: function (e) { if (e.key === "Enter") go("bid-" + r.b.n); } },
          h("div", { class: "bn" }, h("b", null, String(r.b.n)), h("small", null, r.b.s === "V" ? "VAR" : r.b.s)),""",
"""        var rc0 = r.L.type === "route" ? (r.L.legs.filter(function (g) { return g.type === "sailing"; })[0] || {}).route : r.L.type === "shuttle" ? "WS" : null;
        return h("div", { class: "bidrow", role: "button", tabindex: "0", onclick: function () { go("bid-" + r.b.n); }, onkeydown: function (e) { if (e.key === "Enter") go("bid-" + r.b.n); } },
          h("div", { class: "bn r", style: rc0 && RC[rc0] ? "--rc:" + RC[rc0] : null }, h("b", null, String(r.b.n)), h("small", null, r.b.s === "V" ? "VAR" : r.b.s)),""")

# 4. bids list: filters in the URL
app = rep(app, """    var wsBids = bids.filter(function (b) { var sc = schedMap[b.n]; return sc && sc.lines.some(function (L) { return L.type === "shuttle"; }); });
    var panel = !state.fOpen ? null : h("div", { class: "fpanel", id: "fpanel" },""",
"""    var wsBids = bids.filter(function (b) { var sc = schedMap[b.n]; return sc && sc.lines.some(function (L) { return L.type === "shuttle"; }); });
    syncBidsHash();
    var panel = !state.fOpen ? null : h("div", { class: "fpanel", id: "fpanel" },""")
app = rep(app, """    var hsh = (location.hash || "#overview").slice(1), m;
    if ((m = hsh.match(/^bid-(\\d+)$/)))""",
"""    var hsh = (location.hash || "#overview").slice(1), m, qi = hsh.indexOf("?"), qs = null;
    if (qi >= 0) { qs = hsh.slice(qi + 1); hsh = hsh.slice(0, qi); }
    if (hsh === "bids" && qs) applyQuery(qs);
    if ((m = hsh.match(/^bid-(\\d+)$/)))""")

# 5. compare: mark the lightest of the picked bids
app = rep(app, """      ["Sailings / day", function (b) { var L = L0(b); return L && L.type === "route" ? String(lineStats(L).n) : "—"; }],""",
          """      ["Sailings / day", function (b) { var L = L0(b); return L && L.type === "route" ? String(lineStats(L).n) : "—"; }, function (b) { var L = L0(b); return L && L.type === "route" ? -lineStats(L).n : null; }],""")
app = rep(app, """      ["Time underway", function (b) { var L = L0(b); if (!L || L.type !== "route") return "—"; var w = lineStats(L).wat; return Math.floor(w / 60) + "h " + (w % 60) + "m"; }],""",
          """      ["Time underway", function (b) { var L = L0(b); if (!L || L.type !== "route") return "—"; var w = lineStats(L).wat; return Math.floor(w / 60) + "h " + (w % 60) + "m"; }, function (b) { var L = L0(b); return L && L.type === "route" ? -lineStats(L).wat : null; }],""")
app = rep(app, """      ["Open slots", function (b) { var o = b.crew.filter(function (c) { return c === "OPEN"; }).length; return o ? pill("open", o + " open") : pill("ok", "full"); }],""",
          """      ["Open slots", function (b) { var o = b.crew.filter(function (c) { return c === "OPEN"; }).length; return o ? pill("open", o + " open") : pill("ok", "full"); }, function (b) { return b.crew.filter(function (c) { return c === "OPEN"; }).length; }],""")
app = rep(app, """      h("tbody", null, rows.map(function (r) { return h("tr", null, h("th", null, r[0]), cs.map(function (b) { return h("td", null, r[1](b)); })); })))),""",
"""      h("tbody", null, rows.map(function (r) { var sc = r[2] ? cs.map(r[2]) : null, ok = sc ? sc.filter(function (x) { return x != null; }) : [], best = ok.length ? Math.max.apply(null, ok) : null, tie = ok.length && ok.every(function (x) { return x === best; }); return h("tr", null, h("th", null, r[0]), cs.map(function (b, i) { return h("td", { class: sc && !tie && sc[i] != null && sc[i] === best ? "best" : null }, r[1](b)); })); })))),
      h("div", { class: "cmp-key" }, h("i"), "Outlined = the easiest of these bids on that row (fewest sailings, least time underway, most open seats)."),""")

# 6. bid page: share button, swipe between bids, keyboard hint
app = rep(app, """        idx > 0 ? h("button", { class: "btn ghost", onclick: function () { go("bid-" + bids[idx - 1].n); } }, ic("left"), "#" + bids[idx - 1].n) : null, idx < bids.length - 1 ? h("button", { class: "btn ghost", onclick: function () { go("bid-" + bids[idx + 1].n); } }, "#" + bids[idx + 1].n, ic("right")) : null),
      hero,""",
"""        h("button", { class: "iconbtn share", "aria-label": "Share this bid as text", title: "Share or copy as text", onclick: function () { shareBid(b); } }, ic("link")),
        idx > 0 ? h("button", { class: "btn ghost", "aria-label": "Previous bid, #" + bids[idx - 1].n, onclick: function () { go("bid-" + bids[idx - 1].n); } }, ic("left"), "#" + bids[idx - 1].n) : null, idx < bids.length - 1 ? h("button", { class: "btn ghost", "aria-label": "Next bid, #" + bids[idx + 1].n, onclick: function () { go("bid-" + bids[idx + 1].n); } }, "#" + bids[idx + 1].n, ic("right")) : null),
      swipeable(hero),""")

# 7. crew grid: a name opens the seniority list on that person
app = rep(app, """      return h("span", { class: "gc ok", title: c }, h("span", { class: "gc-n" }, last), tag ? h("span", { class: "gc-t" }, tag) : null);""",
"""      return h("button", { class: "gc ok", type: "button", title: c + " — find on the seniority list", "aria-label": c + ", find on the seniority list", onclick: function (e) { e.stopPropagation(); state.crewQ = nm; state.rowMenu = null; state.crewTab = "dh"; if ((location.hash || "") === "#crew") { render(); var el = document.getElementById("crewq"); if (el) el.scrollIntoView({ block: "start", behavior: "smooth" }); } else go("crew"); } }, h("span", { class: "gc-n" }, last), tag ? h("span", { class: "gc-t" }, tag) : null);""")

# 8. changes: this cycle has no sheet yet
app = rep(app, """    return h("div", null,
      h("div", { class: "card" },
        h("div", { class: "card-h" }, h("h2", { class: "card-t" }, "What changed from Bid 195"), pill("info", "Final-Final sheets")),
        h("div", { class: "card-s" }, "Bid 195 as worked (Aug 17 – Nov 1) against the IBU and Masters Bid 196 Final-Final sheets (Nov 2 – Feb 28, issued Oct 13). Bid numbers moved, so match by the work, not the number."),""",
"""    return h("div", null,
      CY.provisional ? provChangesCard() : null,
      h("div", { class: "card" },
        h("div", { class: "card-h" }, h("h2", { class: "card-t" }, (CY.provisional ? "Last cycle: " : "") + "What changed from Bid 195"), pill("info", "Final-Final sheets")),
        h("div", { class: "card-s" }, "Bid 195 as worked (" + (PREV.dates || "") + ") against the IBU and Masters Bid 196 Final-Final sheets (" + (CY.sheetDates || "") + "). Bid numbers moved, so match by the work, not the number."),""")

# 9. status pill + brand line + banner + theme in renderNav / init
app = rep(app, """    if (st) st.textContent = !cc.filled ? "Crew not posted" : cc.open ? cc.filled + " of " + cc.slots + " seats filled" : "Crew posted";
  }""",
"""    if (sp) sp.classList.toggle("prov", !!CY.provisional);
    if (st) st.textContent = CY.provisional && CY.banner ? CY.banner.pill : !cc.filled ? "Crew not posted" : cc.open ? cc.filled + " of " + cc.slots + " seats filled" : "Crew posted";
  }""")
app = rep(app, """  parseHash(); render();
})();""",
"""  applyTheme(); renderBanner();
  var themeBtn = document.getElementById("theme"); if (themeBtn) themeBtn.addEventListener("click", cycleTheme);
  if (window.matchMedia) { try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme); } catch (e) { } }
  parseHash(); render();
})();""")

# 10. every "Bid 196" / "Bid 195" literal follows the cycle metadata (so the Bid 197 data swap needs no code change)
single_quoted = ["aria-label=\"Which Bid 195 number became which Bid 196 number\"", "(side === \"a\" ? \"Bid 195\" : \"Bid 196\")"]
# renumSVG builds its SVG with single-quoted JS strings: handle those two spots first
app = rep(app, "aria-label=\"Which Bid 195 number became which Bid 196 number\"", "aria-label=\"Which ' + PN + ' number became which ' + BN + ' number\"")
n196 = app.count("Bid 196"); n195 = app.count("Bid 195")
app = app.replace("Bid 196", '" + BN + "').replace("Bid 195", '" + PN + "')
# tidy the empty-string joins the blanket replace leaves behind ("" + BN + "" -> BN)
app = re.sub(r'"" \+ (BN|PN|TN) \+ ""', r'\1', app)
app = re.sub(r'"" \+ (BN|PN|TN) \+ "', r'\1 + "', app)
app = re.sub(r'" \+ (BN|PN|TN) \+ ""', r'" + \1', app)
assert "Bid 196" not in app and "Bid 195" not in app, "a bid label survived"
# the one place the UI must say which cycle THIS dashboard is for: the countdown ("Bid 197 is underway") already uses TN above.

# 11a. render: focus a control requested by a keyboard shortcut once the view exists
app = rep(app, """    renderNav(); renderRail(); renderCmpBar();
    if (keepFocus && aid)""", """    renderNav(); renderRail(); renderCmpBar();
    if (pendingFocus) { var pf = document.getElementById(pendingFocus); pendingFocus = null; if (pf) { pf.focus(); if (pf.select) pf.select(); } }
    if (keepFocus && aid)""")
# 11. inject the new behaviours before render()
extra = read(os.path.join(HERE, "extra.js"))
app = rep(app, "  // ---------- render ----------\n  function render(keepFocus) {", extra + "\n  // ---------- render ----------\n  function render(keepFocus) {")
write(os.path.join(OUT, "app.js"), app)

print("patched: %d 'Bid 196' and %d 'Bid 195' literals now follow CYCLE; app.js %d bytes, lib.js %d bytes" % (n196, n195, len(app), len(lib)))
