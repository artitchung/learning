  // ===================== Bid 197 additions (injected by patch.py before render) =====================
  // Everything below runs inside the app IIFE and can use state, h, ic, go, toast, render, bids, byN, schedMap, D, I, RC, RL.

  // ---------- theme: auto / light / dark, remembered per device ----------
  var THEMES = ["auto", "light", "dark"];
  function applyTheme() {
    var t = state.theme || "auto", root = document.documentElement;
    if (t === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
    var dark = t === "dark" || (t === "auto" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute("content", dark ? "#0D3C63" : "#015088");
    var btn = document.getElementById("theme"); if (btn) { btn.innerHTML = I.svg(dark ? "moon" : "sun"); btn.setAttribute("aria-label", "Theme: " + t + ". Tap to change"); btn.title = "Theme: " + t; }
  }
  function cycleTheme() { var i = THEMES.indexOf(state.theme || "auto"); state.theme = THEMES[(i + 1) % THEMES.length]; save("theme", state.theme); applyTheme(); toast("Theme: " + state.theme); }

  // ---------- provisional banner (only while the sheet for this cycle is not issued) ----------
  function renderBanner() {
    var el = document.getElementById("provo"); if (!el) return;
    if (!CY.provisional || !CY.banner) { el.hidden = true; return; }
    var open = !state.provSeen;
    el.hidden = false; el.innerHTML = "";
    el.className = "provo" + (open ? " open" : "");
    el.appendChild(h("button", { class: "provo-h", "aria-expanded": open ? "true" : "false", onclick: function () { state.provSeen = !state.provSeen; save("provSeen", state.provSeen); renderBanner(); } },
      ic("info"), h("span", null, h("b", null, "Provisional"), " ", CY.banner.short), ic("down", { cls: "tog" })));
    if (open) el.appendChild(h("div", { class: "provo-b" }, h("p", null, CY.banner.long), h("div", { class: "provo-acts" },
      h("button", { class: "btn primary", onclick: function () { state.provSeen = true; save("provSeen", true); renderBanner(); } }, "Got it"),
      PREV ? h("button", { class: "btn", onclick: function () { go("changes"); } }, ic("swap"), "What the last cycle changed") : null)));
  }

  // ---------- charts that respond to the finger ----------
  function chartBox(cls, svg, onKey, label) {
    var box = h("div", { class: cls, html: svg });
    if (onKey) {
      box.classList.add("tappable");
      box.addEventListener("click", function (e) { var t = e.target.closest("[data-k]"); if (t) onKey(t.dataset.k, t); });
      box.addEventListener("keydown", function (e) { if (e.key !== "Enter" && e.key !== " ") return; var t = e.target.closest("[data-k]"); if (t) { e.preventDefault(); onKey(t.dataset.k, t); } });
      if (label) box.appendChild(h("div", { class: "chart-hint" }, label));
    }
    return box;
  }
  // bids whose crew is underway in a half-hour bin on day d (same counting as DashLib.loadCurve)
  function binBids(d, i) {
    var G0 = 4 * 60, s = G0 + i * 30, out = [];
    bids.forEach(function (b) {
      var sc = schedMap[b.n]; if (!sc) return;
      D.linesForDay(b, sc, d).forEach(function (L) {
        if (/sports\/event nights/i.test(L.header)) return;
        var hit = false;
        if (L.type === "route") L.legs.forEach(function (g) { if (g.type !== "sailing" || !g.stops[0].dep || !g.stops[g.stops.length - 1].arr) return; var a = mins(g.stops[0].dep), z = mins(g.stops[g.stops.length - 1].arr); if (s < z && s + 30 > a) hit = true; });
        else if (L.type === "shuttle" || L.type === "seachange") { var w = D.shiftWindow(b, L); if (w && s < w.end && s + 30 > w.start) hit = true; }
        if (hit && out.indexOf(b.n) < 0) out.push(b.n);
      });
    });
    return out.sort(function (a, b) { return a - b; });
  }
  function loadChartBox(curves, days) {
    var box = h("div", { class: "chart-wrap lc-box", html: D.loadChartSVG(curves) }), svg = box.querySelector("svg"), cur = svg.querySelector(".lc-cur"), curLine = cur && cur.querySelector("line");
    var read = h("div", { class: "lc-read" }, h("b", null, "Touch the chart"), h("span", null, " to read it half hour by half hour. Tap to list who is on the water.")), list = h("div", { class: "chips lc-list" });
    var L = +svg.dataset.l, R = +svg.dataset.r, W = +svg.dataset.w, n = +svg.dataset.n, lastI = -1;
    function binAt(e) { var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W; return Math.max(0, Math.min(n - 1, Math.floor((px - L) / (W - L - R) * n))); }
    function show(i, tapped) {
      if (cur) { var x = L + (i + 0.5) / n * (W - L - R); cur.removeAttribute("hidden"); curLine.setAttribute("x1", x.toFixed(1)); curLine.setAttribute("x2", x.toFixed(1)); }
      var t = fmt(pad(4 * 60 + i * 30));
      read.innerHTML = ""; add(read, [h("b", null, t + "–" + fmt(pad(4 * 60 + i * 30 + 30))), curves.map(function (c, k) { return h("span", { class: "lc-v", style: "--c:" + c.color }, h("i"), c.bins[i] + " " + days[k].short); })]);
      if (tapped) { list.innerHTML = ""; days.forEach(function (dd, k) { var ns = binBids(dd.d, i); list.appendChild(h("span", { class: "lc-day" }, dd.short + ":")); if (!ns.length) list.appendChild(h("span", { class: "muted" }, "nobody underway")); ns.forEach(function (nn) { list.appendChild(h("button", { class: "chip", onclick: function () { go("bid-" + nn); } }, "#" + nn)); }); }); }
      lastI = i;
    }
    svg.addEventListener("pointermove", function (e) { var i = binAt(e); if (i !== lastI) show(i, false); });
    svg.addEventListener("pointerdown", function (e) { show(binAt(e), true); });
    svg.addEventListener("pointerleave", function () { /* keep the last reading so a tap on phones stays legible */ });
    svg.setAttribute("tabindex", "0"); svg.setAttribute("role", "slider"); svg.setAttribute("aria-label", "Boats underway by half hour; use left and right arrow keys");
    svg.addEventListener("keydown", function (e) { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); show(Math.max(0, Math.min(n - 1, (lastI < 0 ? 0 : lastI) + (e.key === "ArrowRight" ? 1 : -1))), true); } });
    box.appendChild(read); box.appendChild(list);
    return box;
  }
  function ganttBox(g, d) {
    var box = h("div", { class: "scrollx gantt-box", html: g.svg });
    box.addEventListener("click", function (e) { var t = e.target.closest("[data-n]"); if (t) go("bid-" + t.dataset.n); });
    box.addEventListener("keydown", function (e) { if (e.key !== "Enter" && e.key !== " ") return; var t = e.target.closest("[data-n]"); if (t) { e.preventDefault(); go("bid-" + t.dataset.n); } });
    return box;
  }
  function nowMins() { var dd = new Date(); return dd.getHours() * 60 + dd.getMinutes(); }
  function todayIdx() { return (new Date().getDay() + 6) % 7; }

  // ---------- bids list filters live in the URL so a link carries them ----------
  var QKEYS = { sess: "sess", off: "offF", base: "baseF", route: "routeF", sort: "sort" };
  function applyQuery(qs) {
    var m = {}; qs.split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) m[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, " ")); });
    if (m.sess && ["All", "AM", "PM", "V"].indexOf(m.sess) >= 0) state.sess = m.sess;
    if (m.off) state.offF = m.off === "wkend" ? "wkend" : "all";
    if (m.base) state.baseF = ["CB", "NB"].indexOf(m.base) >= 0 ? m.base : "all";
    if (m.route) state.routeF = ROUTES.indexOf(m.route) >= 0 ? m.route : "all";
    if (m.sort && ["n", "tt", "sail", "light"].indexOf(m.sort) >= 0) state.sort = m.sort;
    if ("fav" in m) state.favOnly = m.fav === "1";
    if ("q" in m) state.q = m.q;
  }
  function syncBidsHash() {
    var parts = [];
    if (state.sess !== "All") parts.push("sess=" + state.sess);
    if (state.offF === "wkend") parts.push("off=wkend");
    if (state.baseF !== "all") parts.push("base=" + state.baseF);
    if (state.routeF !== "all") parts.push("route=" + state.routeF);
    if (state.sort !== "n") parts.push("sort=" + state.sort);
    if (state.favOnly) parts.push("fav=1");
    if (state.q.trim()) parts.push("q=" + encodeURIComponent(state.q.trim()));
    var want = "#bids" + (parts.length ? "?" + parts.join("&") : "");
    if (location.hash !== want && (location.hash || "#bids").split("?")[0] === "#bids") { try { history.replaceState(null, "", want); } catch (e) { } }
  }

  // ---------- keyboard, swipe, share ----------
  var pendingFocus = null;
  function stepBid(dir) { var b = byN[state.bid], i = bids.indexOf(b); if (i < 0) return; var j = i + dir; if (j < 0 || j >= bids.length) { toast(dir > 0 ? "That is the last bid" : "That is the first bid"); return; } go("bid-" + bids[j].n); }
  function focusSearch() {
    var id = state.view === "crew" ? "crewq" : "bidq", el = document.getElementById(id);
    if (el) { el.focus(); el.select(); return; }
    if (state.view !== "bids") { pendingFocus = "bidq"; go("bids"); }
  }
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) { if (e.key === "Escape") t.blur(); return; }
    var k = e.key;
    if (k === "/") { e.preventDefault(); focusSearch(); }
    else if (k === "[" || k === "]") { if (state.view === "bid") { e.preventDefault(); stepBid(k === "]" ? 1 : -1); } }
    else if (/^[1-5]$/.test(k)) { var n = NAV[+k - 1][0]; go(n === "day" ? "day-" + state.day : n); }
    else if (k === "s" && state.view === "bid") { toggleFav(state.bid); render(true); }
    else if (k === "c" && state.view === "bid") { toggleCmp(state.bid); render(true); }
    else if (k === "t") cycleTheme();
    else if (k === "?") toast("Keys: / search · 1–5 tabs · [ ] previous / next bid · s star · c compare · t theme");
  });
  function swipeable(el) {
    var x0 = null, y0 = null;
    el.addEventListener("touchstart", function (e) { var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    el.addEventListener("touchend", function (e) { if (x0 == null) return; var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = y0 = null; if (Math.abs(dx) > 64 && Math.abs(dy) < 40) stepBid(dx < 0 ? 1 : -1); }, { passive: true });
    return el;
  }
  function bidText(b) {
    var sc = schedMap[b.n], lines = sc ? sc.lines : [];
    var out = [TN + " #" + b.n + (CY.provisional ? " (provisional — " + BN + " line)" : ""), "Off " + tc(b.off) + " · " + (b.s === "V" ? "varies" : b.s) + " · report " + (b.tt === "Varies" ? "varies" : fmt(b.tt)) + (baseOf(b) ? " · " + baseOf(b) : "")];
    b.runs.forEach(function (r) { out.push(r); });
    lines.forEach(function (L) { if (L.type === "route") { var st = lineStats(L); out.push(lineDay(L) + ": " + st.n + " sailings" + (st.first ? " " + fmt(st.first) + "–" + fmt(st.last) : "")); } });
    var crew = b.crew.map(function (c, i) { return c === null ? null : (i === 0 ? "Capt " : "DH" + i + " ") + (c === "OPEN" ? "open" : c); }).filter(Boolean);
    if (crew.length) out.push(crew.join(" · "));
    out.push(location.href.split("#")[0] + "#bid-" + b.n);
    return out.join("\n");
  }
  function shareBid(b) {
    var txt = bidText(b);
    if (navigator.share) { navigator.share({ title: TN + " #" + b.n, text: txt }).catch(function () { }); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast("Bid #" + b.n + " copied as text"); }, function () { toast("Could not copy on this device"); });
    else toast("Sharing is not available on this device");
  }

  // ---------- Changes: this cycle's sheet is not out yet ----------
  function provChangesCard() {
    return h("div", { class: "card lead" },
      h("div", { class: "card-h" }, h("h2", { class: "card-t" }, BN + " → " + TN), pill("warn", "sheet not issued")),
      h("div", { class: "card-s" }, "The " + TN + " sheet has not been issued, so there is nothing to compare yet. This section fills in automatically when the " + TN + " data replaces the provisional " + BN + " lines. Until then the last cycle, " + PN + " → " + BN + ", is kept below as the working reference: the lessons to re-check and the sheet checks still apply to every line that carries over."),
      h("div", { class: "jl-stats c4" },
        h("div", { class: "jl-s" }, h("b", null, String(bids.length)), h("span", null, BN + " bids"), h("small", null, "carried into this preview")),
        h("div", { class: "jl-s" }, h("b", null, "—"), h("span", null, TN + " bids"), h("small", null, "unknown until the sheet posts")),
        h("div", { class: "jl-s" }, h("b", null, CY.start ? D.pad ? String(Math.max(0, Math.round((BID_START - new Date().setHours(0, 0, 0, 0)) / 864e5))) : "—" : "—"), h("span", null, "days to expected start"), h("small", null, CY.startNote || "")),
        h("div", { class: "jl-s" }, h("b", null, String((window.AUDIT_NOTES || []).length)), h("span", null, "sheet checks"), h("small", null, "still worth re-reading"))));
  }
