/* Bid 196 dashboard — runs in the browser on top of DATA, SCHED, DashLib, Icons and BayMap. */
(function () {
  "use strict";
  var D = window.DashLib, DATA = window.DATA, S = window.SCHED, I = window.Icons, BM = window.BayMap, esc = D.esc, fmt = D.fmt, mins = D.mins, pad = D.pad;
  var schedMap = {}; S.bids.forEach(function (b) { schedMap[b.n] = b; });
  var bids = DATA.bids, byN = {}; bids.forEach(function (b) { byN[b.n] = b; });
  var LOG = window.NOV2_LOG || [], logBy = {}; LOG.forEach(function (x) { (logBy[x.bid] = logBy[x.bid] || []).push(x); });
  var NAME = BM.names, SHORT = BM.short, RC = BM.colors, RL = BM.labels, RI = I.ROUTE_ICON;
  var main = document.getElementById("main"), nav = document.getElementById("nav"), railEl = document.getElementById("rail"), toastEl = document.getElementById("toast");
  var BID_START = new Date(2026, 10, 2), BID_END = new Date(2027, 1, 28);
  var ROUTES = ["OAKALA", "SEA", "HB", "RCH", "SSF", "VJO"];

  // ---------- per-viewer conveniences (safe when storage is blocked) ----------
  function load(k, d) { try { var v = localStorage.getItem("b196." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem("b196." + k, JSON.stringify(v)); } catch (e) { } }
  var state = { view: "overview", day: (new Date().getDay() + 6) % 7, sess: "All", q: "", crewQ: "", offF: "all", baseF: "all", routeF: "all", sort: "n", line: 0, open: {},
    fav: load("fav", []), cmp: load("cmp", []), me: load("me", null), skip: load("skip", []), incUnknown: load("incUnknown", true), lineQ: "", sysOff: {},
    lastPin: load("lastPin", null), chgF: "chg", chgOpen: null, chgLine: null, prevPick: null, favOnly: false, fOpen: false, rowMenu: null, bidTab: "list", moreOpen: false, ganttOpen: false, gridOpen: false,
    crewTab: "dh", capQ: "", capMenu: null, capLine: null, capOpenOnly: false, capPin: load("capPin", null), capSkip: load("capSkip", []), capCount: load("capCount", []), pk: load("pk", { cb: true, sf: true, wk: false }), pkAll: false };

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { var v = attrs[k]; if (v == null || v === false) return; if (k === "class") el.className = v; else if (k === "html") el.innerHTML = v; else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v); else el.setAttribute(k, v); });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, kid) { if (kid == null || kid === false) return; if (Array.isArray(kid)) { kid.forEach(function (k) { add(el, k); }); return; } el.appendChild(kid && kid.nodeType ? kid : document.createTextNode(String(kid))); }
  function ic(name, o) { return h("span", { class: "icw", html: I.svg(name, o) }).firstChild; }
  function go(hash) { location.hash = hash; }
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove("show"); }, 1800); }
  function parseHash() {
    var hsh = (location.hash || "#overview").slice(1), m;
    if ((m = hsh.match(/^bid-(\d+)$/))) { state.view = "bid"; state.bid = +m[1]; state.line = -1; }
    else if ((m = hsh.match(/^day-(\d)$/))) { state.view = "day"; state.day = +m[1]; }
    else if (hsh === "notes") state.view = "changes";
    else if (hsh === "captains") { state.view = "crew"; state.crewTab = "capt"; }
    else if (hsh === "crew") { state.view = "crew"; state.crewTab = "dh"; }
    else if (["overview", "day", "bids", "compare", "shuttle", "crew", "changes"].indexOf(hsh) >= 0) state.view = hsh;
    else state.view = "overview";
  }
  function isFav(n) { return state.fav.indexOf(n) >= 0; }
  function toggleFav(n) { var i = state.fav.indexOf(n); if (i >= 0) state.fav.splice(i, 1); else state.fav.push(n); save("fav", state.fav); toast(i >= 0 ? "Removed #" + n + " from your shortlist" : "Bid #" + n + " added to your shortlist"); }
  function inCmp(n) { return state.cmp.indexOf(n) >= 0; }
  function toggleCmp(n) { var i = state.cmp.indexOf(n); if (i >= 0) state.cmp.splice(i, 1); else { if (state.cmp.length >= 4) { toast("Compare up to 4 bids — remove one first"); return; } state.cmp.push(n); } save("cmp", state.cmp); }

  // ---------- derived facts ----------
  var OFFTOK = { MON: 0, TUE: 1, TUES: 1, WED: 2, WEDS: 2, THU: 3, THUR: 3, THURS: 3, FRI: 4, SAT: 5, SUN: 6 };
  function offDays(s) { var out = {}; String(s || "").toUpperCase().split("/").forEach(function (part) { var r = part.split("-").map(function (x) { return OFFTOK[x.trim()]; }); if (r.length === 2 && r[0] != null && r[1] != null) { for (var i = r[0], k = 0; k < 7; k++) { out[i] = 1; if (i === r[1]) break; i = (i + 1) % 7; } } else if (r[0] != null) out[r[0]] = 1; }); return out; }
  function wkOff(b) { var o = offDays(b.off); return !!(o[5] && o[6]); }
  function baseOf(b) { var sc = schedMap[b.n]; var bs = sc && sc.base ? sc.base.replace("*", "") : ""; return bs === "P41" ? "Pier 41" : bs; }
  function baseLabel(code) { var B = (S.bases || {})[code]; if (code === "CB/NB") return "Central Bay or North Bay base (varies by assignment)"; if (code === "NB*") return "North Bay base (assumed — TT@ blank on sheet)"; return B ? B.short : "base not listed on sheet"; }
  function routesOf(b) { var sc = schedMap[b.n], out = []; if (!sc) return out; sc.lines.forEach(function (L) { if (L.type === "route") L.legs.forEach(function (g) { if (g.type === "sailing" && out.indexOf(g.route) < 0) out.push(g.route); }); else if (L.type === "shuttle" && out.indexOf("WS") < 0) out.push("WS"); else if (L.type === "seachange" && out.indexOf("SEACHANGE") < 0) out.push("SEACHANGE"); }); return out; }
  function lineStats(L) {
    var sails = L.legs.filter(function (g) { return g.type === "sailing"; }), wat = 0, first = null, last = null;
    sails.forEach(function (g) { var s = g.stops, a = s[0].dep, z = s[s.length - 1].arr; if (a && !first) first = a; if (z) last = z; if (a && z) wat += (mins(z) - mins(a) + 1440) % 1440; });
    return { n: sails.length, implied: sails.filter(function (g) { return g.implied; }).length, wat: wat, first: first, last: last };
  }
  function rankOf(name) { if (!name) return null; var n = name.replace(/\(.*?\)/g, "").trim().toLowerCase(); for (var i = 0; i < DATA.sen.length; i++) if (DATA.sen[i][0].toLowerCase() === n) return i + 1; return null; }
  var BIDOFF = DATA.bidOff || [];
  function crewCounts() { var filled = 0, open = 0, slots = 0; bids.forEach(function (b) { b.crew.forEach(function (c) { if (c === null) return; slots++; if (c === "OPEN") open++; else filled++; }); }); BIDOFF.forEach(function (c) { slots++; if (c === "OPEN") open++; else filled++; }); return { filled: filled, open: open, slots: slots }; }
  function hours(b, sc) { var hs = {}; (sc ? sc.lines : []).forEach(function (L) { var m = L.header.match(/\((\d+)\)/); if (m) hs[m[1]] = 1; }); var k = Object.keys(hs); return k.length ? k.join("/") + "h" : "—"; }
  function daysToGo() { var now = new Date(); now.setHours(0, 0, 0, 0); return Math.round((BID_START - now) / 864e5); }

  // ---------- quiet mode: say "crew not posted" once, not on every row ----------
  var POSTED = bids.some(function (b) { return b.crew.some(function (c) { return c && c !== "OPEN"; }); }) || BIDOFF.some(function (c) { return c && c !== "OPEN"; }) || DATA.sen.some(function (p) { return /^Bid (#|off)/.test(p[2] || ""); });
  function tc(s) { return String(s || "").toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }).replace("Tues", "Tue").replace("Thurs", "Thu").replace("Thur", "Thu").replace("Weds", "Wed"); }
  function bidFilled(b) { return b.crew.some(function (c) { return c && c !== "OPEN"; }); }
  function crewLine(b) { var seats = b.crew.filter(function (c) { return c !== null; }), open = seats.filter(function (c) { return c === "OPEN"; }).length, names = b.crew.map(function (c, i) { return c === null || c === "OPEN" ? null : h("span", null, h("em", null, i === 0 ? "Capt" : "DH" + i), c); }).filter(Boolean);
    if (!names.length) return h("span", { class: "muted" }, seats.length === 1 ? "seat open" : "all " + seats.length + " seats open");
    return names.concat(open ? [h("span", { class: "open" }, open + " open")] : []); }
  function lineDay(L) { return tc(L.header.replace(/\s*\(.*$/, "").replace(/\s*—.*$/, "")); }
  function shiftLabel(b) { var sc = schedMap[b.n], ls = sc ? sc.lines : []; if (b.tt === "Varies" || !/^\d{4}$/.test(b.tt) || !ls.length) return "Varies"; var w = D.shiftWindow(b, ls[0]), end = ls[0].shiftEnd || (w ? pad(w.end) : null); return fmt(b.tt) + (end ? "–" + fmt(end) : ""); }
  function lineDays(sc) { return (sc ? sc.lines : []).filter(function (L) { return !/^sports/i.test(L.header); }).map(function (L) { return lineDay(L) + (L.type === "extra" ? " Extra" : L.tt ? " " + fmt(L.tt) : ""); }).join(" · "); }
  function underway(st) { return Math.floor(st.wat / 60) + "h " + (st.wat % 60 < 10 ? "0" : "") + (st.wat % 60) + "m"; }
  function isPhone() { return window.innerWidth < 960; }

  // ---------- small renderers ----------
  function card(title, sub, body, acts) { return h("div", { class: "card" }, h("div", { class: "card-h" }, h("h2", { class: "card-t" }, title), acts || null), sub ? h("div", { class: "card-s" }, sub) : null, body); }
  function stat(icon, v, lbl, sub) { return h("div", { class: "stat" }, ic(icon), h("div", null, h("div", { class: "stat-v" }, String(v)), h("div", { class: "stat-l" }, lbl), sub ? h("div", { class: "stat-s" }, sub) : null)); }
  function pill(cls, txt) { return h("span", { class: "pill " + cls }, txt); }
  function routeIcons(b, withSum) {
    var rs = routesOf(b);
    return h("div", { class: "routes" }, rs.map(function (r) { return h("span", { html: I.svg(RI[r] || "oa", { color: RC[r], title: RL[r] }) }).firstChild; }), withSum ? h("span", { class: "sum" }, rs.map(function (r) { return RL[r]; }).join(" · ")) : null);
  }

  // ---------- run summary: what a line actually does, as pictograms ----------
  var RSHORT = { OAKALA: "Oakland/Alameda", SHORTHOP: "Short Hop", SEA: "Seaplane", HB: "Harbor Bay", RCH: "Richmond", SSF: "South SF", VJO: "Vallejo" };
  var LTYPE = { shuttle: ["ws", "Water shuttle", "var(--r-ws, #3E9B5A)"], seachange: ["h2", "Sea Change", "var(--r-h2, #015088)"], dock: ["dock", "Dock labor", "var(--r-dh, #7A8794)"], extra: ["extra", "Extra Board", "var(--r-dh, #7A8794)"] };

  // ---------- glance row: the phone-guide pictogram line, same rule on every surface ----------
  // printed sailings only · a printed return right after its run is the same trip · repeats collapse to "3×"
  // · special events = ticket · light runs left out · ends "→ base" (Extra Board has no base tail)
  var GLAB = { shuttle: "Water Shuttle", seachange: "Sea Change", extra: "Extra Board", dock: "Dock labor" };
  function workLines(b) { var sc = schedMap[b.n]; return sc ? sc.lines.filter(function (L) { return !/^sports/i.test(L.header); }) : []; }
  function glanceSeq(L) {
    var seq = [], prev = null;
    (L.legs || []).forEach(function (g) {
      if (g.type === "sailing") {
        if (g.implied) return;
        var s = g.stops, a = s[0].c, z = s[s.length - 1].c, r = g.route;
        if (prev && prev[0] === r && prev[1] === z && prev[2] === a && a !== z) { prev = null; return; }
        if (seq.length && seq[seq.length - 1].k === r) seq[seq.length - 1].n++; else seq.push({ k: r, n: 1 });
        prev = [r, a, z];
      } else if (g.type === "special") { seq.push({ k: "EVENT", n: 1 }); prev = null; }
    });
    return seq;
  }
  function glanceDays(L) {
    var hd = String(L.header || "").replace(/\s*—.*$/, ""), stars = (hd.match(/\*+/) || [""])[0];
    var d = hd.replace(/\(.*?\)/g, "").replace(/\*/g, "").trim().toLowerCase().replace(/(^|[^a-z])([a-z])/g, function (m, p, c) { return p + c.toUpperCase(); })
      .replace(/Tues/g, "Tue").replace(/Thurs/g, "Thu").replace(/Thur/g, "Thu").replace(/Weds/g, "Wed").replace(/-/g, "–");
    return { days: d, stars: stars };
  }
  function glanceTT(b, L) { var t = L.tt || (b.tt && b.tt !== "Varies" ? b.tt : null); return t ? fmt(t) : null; }
  function glanceBase(b) { var sc = schedMap[b.n]; return ((sc && sc.base) || "CB").replace(/\*/g, ""); }
  function glanceRow(b, L, cls) {
    var items = [], base = glanceBase(b);
    if (L.type === "route") glanceSeq(L).forEach(function (t) {
      var ev = t.k === "EVENT", lab = ev ? "special event" : (RSHORT[t.k] || RL[t.k] || t.k), tip = (t.n > 1 ? t.n + "× " : "") + lab;
      items.push(h("span", { class: "g", title: tip },
        t.n > 1 ? h("b", { class: "n" }, String(t.n), h("i", null, "×")) : null,
        h("span", { class: "gi", html: I.svg(ev ? "event" : (RI[t.k] || "oa"), { color: ev ? "var(--r-dh, #7A8794)" : RC[t.k], title: tip }) })));
    });
    else { var lt = LTYPE[L.type] || ["extra", "Extra Board", "var(--r-dh, #7A8794)"]; items.push(h("span", { class: "g" }, h("span", { class: "gi", html: I.svg(lt[0], { color: lt[2], title: GLAB[L.type] || lt[1] }) }), h("b", { class: "lb" }, GLAB[L.type] || lt[1]))); }
    if (L.type !== "extra") items.push(h("span", { class: "gt" }, h("span", { class: "ar", "aria-hidden": "true" }, "→"), h("span", { class: "bs", title: "Back to " + baseLabel(schedMap[b.n] ? schedMap[b.n].base : base) }, h("span", { class: "gi", html: I.svg("base") }), base)));
    return h("span", { class: "gl" + (cls ? " gl-" + cls : "") }, items);
  }
  function glanceDT(b, L) { var d = glanceDays(L), tt = glanceTT(b, L); return h("span", { class: "gdt" }, d.days, d.stars ? h("sup", null, d.stars) : null, h("span", null, " · " + (tt ? "TT " + tt : "TT varies"))); }
  function glanceDD(b, L) { var d = glanceDays(L), tt = glanceTT(b, L); return h("span", { class: "gdd" }, h("b", null, d.days, d.stars ? h("sup", null, d.stars) : null), h("span", null, tt || "varies")); }
  // bid list rows: one glance row (single pattern) or one "days TT + glance" line per workday pattern
  function rowRuns(b, ws) {
    ws = ws || workLines(b); if (!ws.length) return null;
    if (ws.length === 1) return glanceRow(b, ws[0], "row");
    return h("span", { class: "glrs" }, ws.map(function (L) { return h("span", { class: "glr" }, glanceDD(b, L), glanceRow(b, L, "row")); }));
  }
  function legTime(g) { var s = g.stops || []; return s.length ? (s[0].dep || s[0].printedTime || null) : null; }
  function runTally(L) {
    if (!L) return [];
    if (L.type !== "route") { var t = LTYPE[L.type] || ["oa", L.header, RC.OAKALA]; return [{ icon: t[0], color: t[2], label: t[1], n: null, sub: L.tt ? "report " + fmt(L.tt) : "" }]; }
    var by = {}, order = [];
    L.legs.forEach(function (g) {
      var k = g.type === "sailing" ? g.route : g.type === "deadhead" ? "DH" : g.type === "special" ? "EVENT" : null; if (!k) return;
      if (!by[k]) { by[k] = { k: k, n: 0, imp: 0, first: null, last: null }; order.push(k); }
      var o = by[k]; o.n++; if (g.implied) o.imp++;
      var t = legTime(g); if (t) { if (!o.first) o.first = t; o.last = t; }
    });
    return order.map(function (k) {
      var o = by[k];
      if (k === "DH") return { icon: "dh", color: RC.DH || "var(--r-dh, #7A8794)", label: o.n === 1 ? "light run" : "light runs", n: o.n, sub: "no passengers" };
      if (k === "EVENT") return { icon: "event", color: "var(--r-dh, #7A8794)", label: o.n === 1 ? "special event" : "special events", n: o.n, sub: "as directed" };
      var sub = o.first ? (o.first === o.last ? fmt(o.first) : fmt(o.first) + "–" + fmt(o.last)) : "";
      if (o.imp) sub += (sub ? " · " : "") + o.imp + " implied";
      return { icon: RI[k] || "oa", color: RC[k], label: (RSHORT[k] || RL[k] || k) + (o.n === 1 ? " trip" : " trips"), n: o.n, sub: sub };
    });
  }
  function heroRuns(b, L, lines, onPick) {
    if (!L) return null;
    var work = lines.filter(function (x) { return !/^sports/i.test(x.header); }), multi = work.length > 1;
    var rows = h("div", { class: "hg-rows" }, work.map(function (Lx) {
      var kids = [glanceRow(b, Lx, "hero"), glanceDT(b, Lx)];
      if (!multi) return h("div", { class: "hg on" }, kids);
      return h("button", { class: "hg" + (Lx === L ? " on" : ""), "aria-pressed": Lx === L ? "true" : "false", onclick: function () { if (onPick) onPick(Lx); else { state.line = lines.indexOf(Lx); state.open = {}; render(); } } }, kids);
    }));
    var seq = null, anyImp = false;
    if (L.type === "route") {
      var items = [];
      L.legs.forEach(function (g) {
        if (g.type === "base") { items.push(h("li", { class: "ms", title: g.phase === "start" ? "Report" : "End of shift" }, h("span", { class: "sb", html: I.svg(g.phase === "start" ? "report" : "end", { title: g.phase === "start" ? "Report at base" : "End of shift" }) }), h("time", null, g.time ? (g.phase === "end" ? "~" : "") + fmt(g.time) : g.phase === "start" ? "report" : "end"))); return; }
        if (g.type === "sailing") { var s = g.stops, imp = !!g.implied; if (imp) anyImp = true; var lab = (RL[g.route] || g.route) + ": " + s.map(function (x) { return x.c === "AO" ? "AMS" : x.c; }).join(" → ") + (imp ? " (implied)" : "");
          items.push(h("li", { class: imp ? "imp" : "", title: lab }, h("span", { class: "sb", html: I.svg(RI[g.route] || "oa", { color: RC[g.route], title: lab }) }), h("time", null, legTime(g) ? fmt(legTime(g)) : "—"))); return; }
        if (g.type === "deadhead") { items.push(h("li", { class: "ms", title: g.text || "Light run" }, h("span", { class: "sb", html: I.svg("dh", { title: "Light run" }) }), h("em", null, "light"))); return; }
        if (g.type === "special") { items.push(h("li", { class: "ms", title: g.text || "Special event" }, h("span", { class: "sb", html: I.svg("event", { title: "Special event" }) }), h("em", null, "event"))); return; }
      });
      if (items.length) seq = h("ol", { class: "bh-seq", "aria-label": "Run order" }, items);
    }
    var trips = L.type === "route" ? L.legs.filter(function (g) { return g.type === "sailing"; }).length : 0;
    return h("div", { class: "bh-runs" }, rows,
      seq ? h("div", { class: "bh-rl" }, "Run order" + (multi ? " · " + glanceDays(L).days : "") + " · " + trips + " sailing" + (trips === 1 ? "" : "s")) : null, seq,
      seq ? h("div", { class: "bh-key" }, h("span", null, "Run order, left to right · times are departures"), anyImp ? h("span", null, h("i"), "implied from the public timetable") : null) : null);
  }
  function dayChips(onPick) {
    return h("div", { class: "days", role: "tablist" }, D.DAYS.map(function (d, i) { return h("div", { class: "day" + (state.day === i ? " on" : "") + (i >= 5 ? " wk" : ""), role: "tab", tabindex: "0", "aria-selected": state.day === i ? "true" : "false", onclick: function () { state.day = i; onPick(i); }, onkeydown: function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); state.day = i; onPick(i); } } }, h("b", null, d.slice(0, 1) + d.slice(1).toLowerCase()), h("small", null, D.DAY_LONG[i].slice(0, 3))); }));
  }
  function miniStrip(L) {
    var G0 = 4 * 60, G1 = 24 * 60 + 30, W = 300, x = function (m) { return ((m - G0) / (G1 - G0) * W).toFixed(1); };
    var p = ['<svg viewBox="0 0 ' + W + ' 14" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="5" width="' + W + '" height="4" rx="2" fill="var(--surface-3)"/>'];
    var w = D.shiftWindow({ tt: "" }, L); if (w) p.push('<rect x="' + x(w.start) + '" y="4" width="' + (x(Math.min(w.end, G1)) - x(w.start)).toFixed(1) + '" height="6" rx="3" fill="var(--line)"/>');
    (L.legs || []).forEach(function (g) { if (g.type !== "sailing") return; var s = g.stops; if (!s[0].dep || !s[s.length - 1].arr) return; var a = mins(s[0].dep), z = mins(s[s.length - 1].arr); p.push('<rect x="' + x(a) + '" y="1" width="' + Math.max(2, x(z) - x(a)).toFixed(1) + '" height="12" rx="2" fill="' + (RC[g.route] || "var(--navy)") + '" opacity="' + (g.implied ? ".55" : "1") + '"/>'); });
    return p.join("") + '</svg>';
  }

  // ---------- shell: rail + nav ----------
  function renderRail() {
    var show = state.view === "bids" || state.view === "bid" || state.view === "compare";
    railEl.hidden = !show; railEl.innerHTML = ""; if (!show) return;
    var wrap = h("div", { class: "rail-s", role: "list" }, bids.map(function (b) {
      var on = state.view === "bid" && state.bid === b.n;
      return h("button", { class: "bt" + (on ? " on" : "") + (isFav(b.n) ? " fav" : "") + (inCmp(b.n) ? " cmp" : ""), role: "listitem", "aria-label": "Bid " + b.n + ", " + (b.s === "V" ? "varies" : b.s) + ", off " + b.off, "aria-current": on ? "true" : null, onclick: function () { go("bid-" + b.n); } }, String(b.n));
    }));
    railEl.appendChild(h("div", { class: "rail-in" }, h("div", { class: "rail-l" }, "Jump to bid"), wrap));
    var on = wrap.querySelector(".on"); if (on) requestAnimationFrame(function () { on.scrollIntoView({ block: "nearest", inline: "center", behavior: "auto" }); });
  }
  var NAV = [["overview", "Overview", "home"], ["bids", "Bids", "bids"], ["day", "Day", "day"], ["crew", "Crew", "crew"], ["changes", "Changes", "swap"]];
  function renderNav() {
    nav.innerHTML = "";
    NAV.forEach(function (n) { var on = state.view === n[0] || (n[0] === "bids" && (state.view === "bid" || state.view === "compare" || state.view === "shuttle")); nav.appendChild(h("a", { class: "tab" + (on ? " on" : ""), href: "#" + (n[0] === "day" ? "day-" + state.day : n[0]), "aria-current": on ? "page" : null }, ic(n[2]), h("span", null, n[1]))); });
    var cc = crewCounts(), sp = document.querySelector(".status-pill"), st = sp && sp.querySelector("span");
    if (sp) sp.classList.toggle("ok", !cc.open);
    if (st) st.textContent = !cc.filled ? "Crew not posted" : cc.open ? cc.filled + " of " + cc.slots + " seats filled" : "Crew posted";
  }
  function renderCmpBar() {
    var old = document.querySelector(".cmp-bar"); if (old) old.remove();
    if (!state.cmp.length || state.view === "compare") return;
    document.body.appendChild(h("div", { class: "cmp-bar", role: "region", "aria-label": "Compare bids" }, h("b", null, state.cmp.length), h("span", null, state.cmp.length === 1 ? "bid picked — add another to compare" : "bids to compare"),
      h("button", { class: "btn", onclick: function () { go("compare"); } }, ic("compare"), "Compare"),
      h("button", { class: "btn ghost icon", "aria-label": "Clear comparison", onclick: function () { state.cmp = []; save("cmp", []); render(); } }, ic("x"))));
  }

  // ---------- overview ----------
  var sysApi = null;
  function viewOverview() {
    var cc = crewCounts(), dtg = daysToGo();
    var bySess = { AM: 0, PM: 0, V: 0 }; bids.forEach(function (b) { bySess[b.s]++; });
    var routeCount = {}, routeBids = {}, legs = 0, implied = 0;
    S.bids.forEach(function (sb) { sb.lines.forEach(function (L) { if (L.type !== "route") return; L.legs.forEach(function (g) { if (g.type === "sailing") { legs++; routeCount[g.route] = (routeCount[g.route] || 0) + 1; (routeBids[g.route] = routeBids[g.route] || {})[sb.n] = 1; if (g.implied) implied++; } }); }); });
    var perDay = D.DAYS.map(function (d, i) { var n = 0; bids.forEach(function (b) { var sc = schedMap[b.n]; if (sc && D.linesForDay(b, sc, i).length) n++; }); return { label: D.DAY_LONG[i].slice(0, 3), v: n, color: i >= 5 ? "var(--am)" : "var(--navy)" }; });
    var wk = D.loadCurve(bids, schedMap, 2), we = D.loadCurve(bids, schedMap, 5);
    var noBid = DATA.sen.filter(function (p) { return /no bid/i.test(p[2]); }).length, wkoff = bids.filter(wkOff).length;
    // system map: one line per route; tapping a chip or a line picks that route and lists its bids
    var mapEl = h("div", { class: "sysmap" }), listEl = h("div", { class: "route-bids" }), sel = null;
    var SYS = { OAKALA: ["FB", "JLS", "AO", "FB"], SEA: ["FB", "SP"], HB: ["FB", "HB"], RCH: ["FB", "RICH"], SSF: ["SSF", "JLS"], VJO: ["FB", "VJO"] };
    var sysLegs = ROUTES.map(function (r) { return { type: "sailing", route: r, stops: SYS[r].map(function (c) { return { c: c }; }) }; });
    var togs = h("div", { class: "route-tog" }, ROUTES.map(function (r, i) { return h("button", { class: "rt", style: "--rc:" + RC[r], "aria-pressed": "false", "data-r": r, onclick: function () { if (!sysApi) return; if (sel === r) { sysApi.clear(); sel = null; } else { sysApi.pickRun(i + 1); sel = r; } sync(); } }, ic(RI[r], { color: RC[r] }), RL[r], h("span", { class: "n" }, String(Object.keys(routeBids[r] || {}).length))); }));
    function sync() {
      togs.querySelectorAll(".rt").forEach(function (el) { var on = el.dataset.r === sel; el.classList.toggle("on", on); el.setAttribute("aria-pressed", on ? "true" : "false"); });
      listEl.innerHTML = "";
      if (!sel) { listEl.appendChild(h("span", { class: "hint", style: "margin:0" }, "Tap a route to list the bids that sail it.")); return; }
      var ns = Object.keys(routeBids[sel] || {}).map(Number).sort(function (a, b) { return a - b; });
      ns.forEach(function (n) { listEl.appendChild(h("button", { class: "chip", onclick: function () { go("bid-" + n); } }, "#" + n, h("span", { class: "muted" }, tc(byN[n].off)))); });
    }
    requestAnimationFrame(function () { var inner = h("div"); mapEl.appendChild(inner); sysApi = BM.mount(inner, { legs: sysLegs }, { synth: { legs: sysLegs }, chips: false, panel: false, onChange: function (st) { sel = st.run ? ROUTES[st.run - 1] : null; sync(); } }); });
    sync();
    // what matters to the person looking
    function lrow(icon, head, sub, fn) { return h("button", { class: "lrow", onclick: fn }, ic(icon), h("span", null, h("b", null, head), sub ? h("span", { class: "s" }, sub) : null), ic("right")); }
    function forYou() {
      var meRank = state.me ? rankOf(state.me) : null;
      if (!meRank) {
        var sel2 = h("select", { class: "sel", id: "whoami", "aria-label": "Which name is yours?", onchange: function (e) { if (!e.target.value) return; state.me = e.target.value; save("me", state.me); toast("Showing the dashboard for " + state.me); render(); } }, h("option", { value: "" }, "Which name is yours?"), DATA.sen.map(function (p, i) { return h("option", { value: p[0] }, "#" + (i + 1) + " " + p[0]); }));
        return card("Start here", "Pick your name once. The dashboard remembers it on this device and shows where you stand and what happened to your Bid 195 job.", sel2);
      }
      var M = jobModel(), v = verdict(M, meRank), pb = myPrevBid(), rows = [lrow("crew", v.head, v.body, function () { go("crew"); })];
      if (pb != null && CHG) {
        var g = CHG.gone.filter(function (x) { return x.n === pb; })[0], heirs = CHG.bids.filter(function (c) { return c.was === pb; });
        rows.push(lrow("swap", g ? "Your Bid 195 #" + pb + " is not on Bid 196" : "Your Bid 195 #" + pb + (heirs.length ? " is now Bid 196 #" + heirs.map(function (x) { return x.n; }).join(", #") + " · " + KIND[heirs[0].kind][1].toLowerCase() : ""), g ? g.text : heirs.length ? heirs[0].text : null, function () { state.prevPick = pb; if (!g && heirs.length) openChg(heirs[0].n); else go("changes"); }));
      }
      var favs = state.fav.slice().sort(function (a, b) { return a - b; }).filter(function (n) { return byN[n]; });
      return h("div", { class: "card" }, h("div", { class: "card-h" }, h("h2", { class: "card-t" }, "For you"), h("button", { class: "btn ghost", onclick: function () { state.me = null; save("me", null); render(); } }, "Not " + state.me + "?")),
        h("div", { class: "lrows" }, rows),
        h("div", { class: "sub-lbl" }, "Your shortlist"),
        favs.length ? h("div", { class: "chips" }, favs.map(function (n) { return h("button", { class: "chip", onclick: function () { go("bid-" + n); } }, ic("starf"), "#" + n, h("span", { class: "muted" }, shiftLabel(byN[n]))); })) : h("div", { class: "hint", style: "margin:0" }, "Nothing starred yet. Tap the star on any bid to keep it here."));
    }
    return h("div", null,
      h("div", { class: "hero" },
        h("div", null, h("div", { class: "hero-t" }, "IBU Deckhand ", h("span", null, "Bid 196")), h("div", { class: "hero-s" }, "Nov 2, 2026 – Feb 28, 2027, from the IBU Deckhand Bid 196 Final-Final sheet."),
          h("div", { class: "hero-cd" }, h("div", { class: "cd" }, h("b", null, dtg > 0 ? String(dtg) : dtg === 0 ? "Today" : "Live"), h("span", null, dtg > 0 ? "days until it starts" : "Bid 196 is underway")), h("div", { class: "cd" }, h("b", null, String(bids.length)), h("span", null, "bids")), h("div", { class: "cd" }, h("b", null, String(wkoff)), h("span", null, "with weekends off")))),
        h("div", null, h("div", { class: "hint", style: "margin:0 0 10px" }, !cc.filled ? "Crew not posted. All " + cc.slots + " seats stay open until the Bid 196 sign-ups post; the daily check fills them in." : cc.open ? cc.filled + " of " + cc.slots + " seats are filled." : "All " + cc.slots + " seats are filled."),
          h("div", { style: "display:flex;gap:6px;flex-wrap:wrap" }, h("button", { class: "btn primary", onclick: function () { go("bids"); } }, ic("bids"), "Browse bids"), h("button", { class: "btn", onclick: function () { go("day-" + state.day); } }, ic("day"), "Who's on today"), PREV ? h("button", { class: "btn", onclick: function () { go("changes"); } }, ic("swap"), "What changed") : null))),
      forYou(),
      lightestCard(),
      card("The system", null, h("div", { class: "sysgrid" }, mapEl, h("div", null, togs, listEl))),
      card("Boats underway by time of day", "Crews on the water each half hour, Wednesday against Saturday. South SF is counted although it is suspended in November.", h("div", { class: "chart-wrap", html: D.loadChartSVG([{ bins: wk.bins, color: "var(--navy)", label: "Wed (" + wk.crews + " crews)" }, { bins: we.bins, color: "var(--am)", label: "Sat (" + we.crews + " crews)" }]) })),
      h("details", { class: "fold more", open: state.moreOpen ? "" : null, ontoggle: function (e) { state.moreOpen = e.target.open; } }, h("summary", null, ic("audit"), "More numbers", ic("down", { cls: "tog" })), h("div", { class: "fold-b" },
        h("div", { class: "stats" }, stat("bids", bids.length, "bids", bySess.AM + " AM · " + bySess.PM + " PM · " + bySess.V + " varies"), stat("crew", cc.filled + "/" + cc.slots, "seats filled", cc.open ? cc.open + " open" : "all assigned"), stat("audit", DATA.sen.length, "on seniority list", noBid + " haven't bid yet"), stat("oa", legs, "sailings per weekday set", implied + " implied returns")),
        h("div", { class: "two" },
          h("div", null, h("div", { class: "sub-lbl" }, "Crews working each day"), h("div", { class: "chart", html: D.barChartSVG(perDay, { labelW: 40 }) })),
          h("div", null, h("div", { class: "sub-lbl" }, "Sailings by route, implied returns included"), h("div", { class: "chart", html: D.barChartSVG(Object.keys(routeCount).sort(function (a, b) { return routeCount[b] - routeCount[a]; }).map(function (r) { return { label: RL[r] || r, v: routeCount[r], color: RC[r] }; }), { labelW: 120 }) }))),
        h("div", { class: "sub-lbl" }, "Every shift on " + D.DAY_LONG[state.day]), dayChips(function () { render(); }), h("div", { class: "scrollx", html: D.ganttSVG(bids, schedMap, state.day, { width: 720 }).svg }),
        h("button", { class: "btn", style: "margin-top:8px", onclick: function () { go("day-" + state.day); } }, "Open day view", ic("right"))))
    );
  }
  // ---------- day ----------
  function viewDay() {
    var d = state.day, g = D.ganttSVG(bids, schedMap, d, { width: 720 }), rows = [];
    bids.forEach(function (b) { var sc = schedMap[b.n]; if (!sc) return; D.linesForDay(b, sc, d).forEach(function (L) { if (/sports\/event nights/i.test(L.header)) return; rows.push({ b: b, L: L, w: D.shiftWindow(b, L) }); }); });
    rows.sort(function (a, b) { return (a.w ? a.w.start : 9e9) - (b.w ? b.w.start : 9e9) || a.b.n - b.b.n; });
    return h("div", null,
      dayChips(function (i) { go("day-" + i); }),
      h("div", { class: "act" }, h("b", { style: "color:var(--ink)" }, D.DAY_LONG[d] + " · " + g.rows + " crews on duty"), h("span", null, "earliest report first" + (POSTED ? "" : " · crew not posted"))),
      h("div", { class: "list" }, rows.map(function (r) {
        var st = r.L.type === "route" ? lineStats(r.L) : null, end = r.L.shiftEnd || (r.w ? pad(r.w.end) : null);
        return h("div", { class: "bidrow", role: "button", tabindex: "0", onclick: function () { go("bid-" + r.b.n); }, onkeydown: function (e) { if (e.key === "Enter") go("bid-" + r.b.n); } },
          h("div", { class: "bn" }, h("b", null, String(r.b.n)), h("small", null, r.b.s === "V" ? "VAR" : r.b.s)),
          h("div", { class: "bb" },
            h("div", { class: "bb-t" }, h("span", { class: "tm" }, r.w ? fmt(r.w.tt) + (end ? "–" + fmt(end) : "") : "Extra Board"), h("span", { class: "off" }, glanceDays(r.L).days + glanceDays(r.L).stars)),
            h("div", { class: "bb-m" }, glanceRow(r.b, r.L, "row"), h("span", { class: "muted" }, st ? st.n + " sailings" + (st.first ? " · " + fmt(st.first) + "–" + fmt(st.last) : "") : r.L.type === "extra" ? "any time, any location" : "")),
            POSTED ? h("div", { class: "bb-crew" }, crewLine(r.b)) : null,
            r.L.type === "route" ? h("div", { class: "mini", html: miniStrip(r.L) }) : null),
          h("div", { class: "chev" }, ic("right")));
      })),
      h("details", { class: "fold more", style: "margin-top:12px", open: state.ganttOpen || !isPhone() ? "" : null, ontoggle: function (e) { state.ganttOpen = e.target.open; } }, h("summary", null, ic("clock"), "All " + g.rows + " shifts on one timeline", ic("down", { cls: "tog" })), h("div", { class: "fold-b" }, h("div", { class: "scrollx", html: g.svg }), h("div", { class: "legend" }, ROUTES.map(function (r) { return lgSwatch(RC[r], RL[r]); }))))
    );
  }
  function lgSwatch(color, label) { return h("span", { class: "lg" }, h("i", { style: "background:" + color }), label); }
  function lineBlurb(L) { return L.type === "shuttle" ? "Oakland Alameda Water Shuttle (" + L.variant + ") — Alameda Landing ⇄ Jack London Sq" : L.type === "seachange" ? "Sea Change: Jack London Sq ⇄ Pier 48½ + bunkering" : L.type === "dock" ? "Dock labor / maintenance at Pier 41" : "Extra Board — any time, any location"; }

  // ---------- bids list ----------
  function viewBids() {
    if (state.sort === "fav") { state.sort = "n"; state.favOnly = true; }
    var q = state.q.trim().toLowerCase();
    var list = bids.filter(function (b) {
      if (state.sess !== "All" && b.s !== state.sess) return false;
      if (state.offF === "wkend" && !wkOff(b)) return false;
      if (state.baseF !== "all" && baseOf(b).indexOf(state.baseF) < 0) return false;
      if (state.routeF !== "all" && routesOf(b).indexOf(state.routeF) < 0) return false;
      if (state.favOnly && !isFav(b.n)) return false;
      return !q || ("bid " + b.n + " #" + b.n + " " + b.off + " " + b.crew.join(" ") + " " + b.runs.join(" ") + " " + routesOf(b).map(function (r) { return RL[r]; }).join(" ")).toLowerCase().indexOf(q) >= 0;
    });
    function sailCount(b) { var sc = schedMap[b.n], n = 0; (sc ? sc.lines : []).forEach(function (L) { if (L.type === "route" && L.kind !== "weekend") n = Math.max(n, lineStats(L).n); }); return n; }
    if (state.sort === "tt") list.sort(function (a, b) { return (a.tt === "Varies" ? 9e9 : mins(a.tt)) - (b.tt === "Varies" ? 9e9 : mins(b.tt)) || a.n - b.n; });
    else if (state.sort === "sail") list.sort(function (a, b) { return sailCount(b) - sailCount(a) || a.n - b.n; });
    else if (state.sort === "light") { var wl = function (b) { var w = workload(b); return w && w.comparable ? w.under : 9e9; }; list.sort(function (a, b) { return wl(a) - wl(b) || a.n - b.n; }); }
    var short = function (r) { return RL[r].replace("Alameda Seaplane", "Seaplane").replace("Oakland & Alameda", "Oakland").replace("South San Francisco", "South SF"); };
    var act = [];
    if (state.sess !== "All") act.push([state.sess === "V" ? "Varies" : state.sess, function () { state.sess = "All"; }]);
    if (state.offF === "wkend") act.push(["Weekends off", function () { state.offF = "all"; }]);
    if (state.baseF !== "all") act.push([state.baseF === "CB" ? "Central Bay" : "North Bay", function () { state.baseF = "all"; }]);
    if (state.routeF !== "all") act.push([short(state.routeF), function () { state.routeF = "all"; }]);
    if (state.favOnly) act.push(["Shortlist", function () { state.favOnly = false; }]);
    var chip = function (key, val, label, cls) { var on = state[key] === val; return h("button", { class: "chip" + (cls ? " " + cls : "") + (on ? " on" : ""), "aria-pressed": on ? "true" : "false", style: cls === "r" ? "--rc:" + RC[val] : null, onclick: function () { state[key] = on ? "all" : val; render(); } }, label); };
    var wsBids = bids.filter(function (b) { var sc = schedMap[b.n]; return sc && sc.lines.some(function (L) { return L.type === "shuttle"; }); });
    var panel = !state.fOpen ? null : h("div", { class: "fpanel", id: "fpanel" },
      h("div", { class: "fgrp" }, h("span", { class: "fl" }, "Session"), h("div", { class: "seg" }, ["All", "AM", "PM", "V"].map(function (s) { return h("button", { class: state.sess === s ? "on" : "", "aria-pressed": state.sess === s ? "true" : "false", onclick: function () { state.sess = s; render(); } }, s === "V" ? "Varies" : s); }))),
      h("div", { class: "fgrp" }, h("span", { class: "fl" }, "Show"), chip("offF", "wkend", "Weekends off"), h("button", { class: "chip" + (state.favOnly ? " on" : ""), "aria-pressed": state.favOnly ? "true" : "false", onclick: function () { state.favOnly = !state.favOnly; render(); } }, ic("starf"), "Shortlist")),
      h("div", { class: "fgrp" }, h("span", { class: "fl" }, "Base"), chip("baseF", "CB", "Central Bay"), chip("baseF", "NB", "North Bay")),
      h("div", { class: "fgrp" }, h("span", { class: "fl" }, "Route"), ROUTES.map(function (r) { return chip("routeF", r, [ic(RI[r]), short(r)], "r"); })),
      h("div", { class: "fgrp" }, h("span", { class: "fl" }, "Sort"), h("div", { class: "seg" }, [["n", "Bid #"], ["tt", "Report time"], ["sail", "Most sailings"], ["light", "Least work"]].map(function (o) { return h("button", { class: state.sort === o[0] ? "on" : "", "aria-pressed": state.sort === o[0] ? "true" : "false", onclick: function () { state.sort = o[0]; render(); } }, o[1]); }))),
      h("div", { class: "fgrp", style: "justify-content:flex-end" }, act.length ? h("button", { class: "btn ghost", onclick: function () { state.sess = "All"; state.offF = state.baseF = state.routeF = "all"; state.favOnly = false; render(); } }, "Clear all") : null, h("button", { class: "btn primary", onclick: function () { state.fOpen = false; render(); } }, "Show " + list.length + " bid" + (list.length === 1 ? "" : "s"))));
    return h("div", null,
      h("div", { class: "frow" },
        h("div", { class: "search-wrap" }, ic("search"), h("input", { class: "search", id: "bidq", type: "search", placeholder: "Search bids…", value: state.q, "aria-label": "Search bids by number, name, terminal or day off", oninput: function (e) { state.q = e.target.value; render(true); } })),
        h("button", { class: "btn" + (state.fOpen ? " on" : ""), id: "fbtn", "aria-expanded": state.fOpen ? "true" : "false", "aria-controls": "fpanel", onclick: function () { state.fOpen = !state.fOpen; render(); } }, ic("filter"), "Filters" + (act.length ? " · " + act.length : ""))),
      panel,
      h("div", { class: "act" }, act.map(function (a) { return h("button", { class: "chip x", "aria-label": "Remove filter " + a[0], onclick: function () { a[1](); render(); } }, a[0], ic("x")); }),
        h("span", null, list.length + " of " + bids.length + " bids · by " + { n: "bid #", tt: "report time", sail: "most sailings", light: "least work first" }[state.sort] + (POSTED ? "" : " · crew not posted"))),
      list.length ? h("div", { class: "list" }, list.map(bidRow)) : h("div", { class: "card empty" }, ic("filter"), "No bids match these filters."),
      wsBids.length ? h("button", { class: "wasrow", style: "margin-top:12px", onclick: function () { go("shuttle"); } }, ic("ws"), h("span", null, "Water shuttle timetable"), h("span", { class: "muted" }, "bids " + wsBids.map(function (b) { return "#" + b.n; }).join(", ")), h("span", { class: "sp" }), ic("right")) : null
    );
  }
  function bidRow(b) {
    var sc = schedMap[b.n], L0 = sc ? sc.lines.filter(function (L) { return L.type === "route"; })[0] : null, st = L0 ? lineStats(L0) : null;
    var chg = (logBy[b.n] || []).filter(function (x) { return x.kind === "retime"; }).length, ssf = (logBy[b.n] || []).some(function (x) { return x.kind === "suspended"; }), ws = workLines(b), one = ws.length === 1, meta = [hours(b, sc)].filter(function (x) { return x && x !== "—"; });
    if (state.sort === "light") { var wl2 = workload(b); if (wl2 && wl2.comparable) meta.push(Math.round(wl2.under / 6) / 10 + "h underway/wk"); }
    if (ws.length && ws.every(function (L) { return L.type === "extra"; }) && baseOf(b)) meta.push(baseOf(b));
    if (one && st) meta.push(st.n + " sailings");
    return h("div", { class: "bidrow" + (inCmp(b.n) ? " cmp" : ""), role: "button", tabindex: "0", onclick: function (e) { if (e.target.closest(".iconbtn")) return; go("bid-" + b.n); }, onkeydown: function (e) { if (e.key === "Enter" && !e.target.closest(".iconbtn")) go("bid-" + b.n); } },
      h("div", { class: "bn" }, h("b", null, String(b.n)), h("small", null, b.s === "V" ? "VAR" : b.s)),
      h("div", { class: "bb" },
        h("div", { class: "bb-t" }, h("span", { class: "tm" }, shiftLabel(b)), h("span", { class: "off" }, "off " + tc(b.off))),
        h("div", { class: "bb-m" }, one ? rowRuns(b, ws) : null, h("span", { class: "muted" }, meta.join(" · ")), chg ? h("span", { class: "chk" }, chg + " to check") : null, ssf ? h("span", { class: "chk nov" }, "South SF off in Nov") : null),
        !one && ws.length ? rowRuns(b, ws) : null,
        POSTED ? h("div", { class: "bb-crew" }, crewLine(b)) : null,
        L0 ? h("div", { class: "mini", html: miniStrip(L0) }) : null),
      h("button", { class: "iconbtn" + (isFav(b.n) ? " on" : ""), "aria-label": (isFav(b.n) ? "Remove bid " + b.n + " from" : "Add bid " + b.n + " to") + " shortlist", "aria-pressed": isFav(b.n) ? "true" : "false", onclick: function () { toggleFav(b.n); render(true); } }, ic(isFav(b.n) ? "starf" : "star")));
  }

  // ---------- compare ----------
  function viewCompare() {
    var cs = state.cmp.map(function (n) { return byN[n]; }).filter(Boolean);
    if (cs.length < 2) return h("div", null, card("Compare bids", "Pick two to four bids from the list with the compare button, then come back here.", h("div", null, cs.length ? h("div", { class: "chips" }, cs.map(function (b) { return h("button", { class: "chip on", onclick: function () { go("bid-" + b.n); } }, "#" + b.n); })) : null, h("div", { style: "margin-top:10px" }, h("button", { class: "btn primary", onclick: function () { go("bids"); } }, ic("bids"), "Choose bids")))));
    function L0(b) { var sc = schedMap[b.n]; return sc ? sc.lines.filter(function (L) { return L.type === "route"; })[0] || sc.lines[0] : null; }
    var rows = [
      ["Session", function (b) { return pill(b.s, b.s === "V" ? "VARIES" : b.s); }],
      ["Days off", function (b) { return [b.off, wkOff(b) ? [" ", pill("ok", "Weekends")] : null]; }],
      ["Report", function (b) { return b.tt === "Varies" ? "varies" : fmt(b.tt); }],
      ["Shift ends", function (b) { var L = L0(b); return L && L.shiftEnd ? "~" + fmt(L.shiftEnd) : "—"; }],
      ["Hours", function (b) { return hours(b, schedMap[b.n]); }],
      ["Base", function (b) { return baseOf(b) || "—"; }],
      ["Runs", function (b) { return rowRuns(b); }],
      ["Sailings / day", function (b) { var L = L0(b); return L && L.type === "route" ? String(lineStats(L).n) : "—"; }],
      ["First departure", function (b) { var L = L0(b); return L && L.type === "route" && lineStats(L).first ? fmt(lineStats(L).first) : "—"; }],
      ["Last arrival", function (b) { var L = L0(b); return L && L.type === "route" && lineStats(L).last ? fmt(lineStats(L).last) : "—"; }],
      ["Time underway", function (b) { var L = L0(b); if (!L || L.type !== "route") return "—"; var w = lineStats(L).wat; return Math.floor(w / 60) + "h " + (w % 60) + "m"; }],
      ["Sheet checks", function (b) { var n = (logBy[b.n] || []).length; return n ? pill("warn", n + " to check") : pill("ok", "none"); }],
      ["Open slots", function (b) { var o = b.crew.filter(function (c) { return c === "OPEN"; }).length; return o ? pill("open", o + " open") : pill("ok", "full"); }],
      ["Lines", function (b) { var sc = schedMap[b.n]; return sc ? sc.lines.map(function (L) { return L.header; }).join(" · ") : "—"; }]
    ];
    return h("div", null, card("Compare bids", "Side by side. Tap a bid number to open it.", h("div", { class: "cmp-wrap" }, h("table", { class: "cmp" },
      h("thead", null, h("tr", null, h("th", null, ""), cs.map(function (b) { return h("th", { class: "s-" + b.s, role: "button", tabindex: "0", onclick: function () { go("bid-" + b.n); } }, "#" + b.n); }))),
      h("tbody", null, rows.map(function (r) { return h("tr", null, h("th", null, r[0]), cs.map(function (b) { return h("td", null, r[1](b)); })); })))),
      h("div", { style: "display:flex;gap:6px;flex-wrap:wrap;margin-top:8px" }, h("button", { class: "btn", onclick: function () { go("bids"); } }, ic("bids"), "Add more"), h("button", { class: "btn", onclick: function () { state.cmp = []; save("cmp", []); go("bids"); } }, ic("x"), "Clear"))));
  }

  // ---------- bid page ----------
  function viewBid(n) {
    var b = byN[n]; if (!b) return h("div", { class: "card" }, "No such bid.");
    var sc = schedMap[n], idx = bids.indexOf(b), roles = ["Captain", "DH 1", "DH 2", "DH 3"], lines = sc ? sc.lines : [];
    if (state.line >= lines.length) state.line = -1;
    if (state.line < 0) { var fr = lines.map(function (x) { return x.type; }).indexOf("route"); state.line = fr > 0 ? fr : 0; }
    var L = lines[state.line];
    var chg = logBy[n] || [];
    var multi = lines.filter(function (x) { return !/^sports/i.test(x.header); }).length > 1, Lw = L ? D.shiftWindow(b, L) : null;
    var hero = h("div", { class: "bid-hero" },
      h("div", { class: "bh-row" },
        h("div", { class: "bh-n" }, h("small", null, "IBU BID"), String(n)),
        h("div", { class: "bh-facts" },
          h("div", { class: "bh-f" }, h("b", null, b.s === "V" ? "Varies" : b.s), h("span", null, "session")),
          h("div", { class: "bh-f" }, h("b", null, b.off), h("span", null, "days off")),
          h("div", { class: "bh-f" }, h("b", null, Lw ? fmt(Lw.tt) : b.tt === "Varies" ? "varies" : fmt(b.tt)), h("span", null, "report")),
          h("div", { class: "bh-f" }, h("b", null, L && L.hours ? L.hours + "h" : hours(b, sc)), h("span", null, "shift")),
          h("div", { class: "bh-f" }, h("b", null, b.crew.filter(function (c) { return c !== null && c !== "OPEN"; }).length + "/" + b.crew.filter(function (c) { return c !== null; }).length), h("span", null, "seats filled")),
          h("div", { class: "bh-f" }, h("b", null, L && L.shiftEnd ? "~" + fmt(L.shiftEnd) : Lw ? "~" + fmt(pad(Lw.end)) : "—"), h("span", null, "ends"))),
        null),
      multi && L ? h("div", { class: "bh-line" }, "Report, shift and end are for " + glanceDays(L).days + ". Tap another day pattern below to switch.") : null,
      h("div", { class: "bh-base" }, ic("base"), h("span", null, sc ? baseLabel(sc.base) + (sc && (S.bases || {})[(sc.base || "").replace("*", "")] ? " — " + S.bases[sc.base.replace("*", "")].where : "") : "")),
      heroRuns(b, L, lines),
      h("div", { class: "wave", html: '<svg viewBox="0 0 260 90" aria-hidden="true"><path d="M0 60c30-30 60-30 90 0s60 30 90 0 60-30 80 0v30H0z" fill="#fff"/><path d="M0 40c30-30 60-30 90 0s60 30 90 0 60-30 80 0" fill="none" stroke="#fff" stroke-width="3"/></svg>' }));
    var crew = h("div", { class: "crewgrid" }, roles.map(function (r, i) { var c = b.crew[i], rk = c && c !== "OPEN" ? rankOf(c) : null; if (c === null) return null; return h("div", { class: "cr" }, h("span", null, r), h("b", { class: c === "OPEN" ? "open" : c ? "" : "empty" }, c === "OPEN" ? "Open" : c || "no slot"), rk ? h("small", null, "Seniority #" + rk) : null); }));
    var lineSel = lines.length > 1 ? h("div", { class: "linebar" }, h("div", { class: "seg", role: "tablist" }, lines.map(function (Lx, i) { return h("button", { class: i === state.line ? "on" : "", role: "tab", "aria-selected": i === state.line ? "true" : "false", onclick: function () { state.line = i; state.open = {}; render(); } }, ic(I.forLine(Lx)), glanceDays(Lx).days + glanceDays(Lx).stars + (glanceTT(b, Lx) ? " · " + glanceTT(b, Lx) : "")); }))) : null;
    var body = L ? lineSection(b, L) : h("div", { class: "card" }, "No schedule lines for this bid.");
    return h("div", null,
      h("div", { class: "pager" }, h("button", { class: "btn", onclick: function () { go("bids"); } }, ic("left"), "All bids"), h("span", { class: "sp" }),
        h("button", { class: "iconbtn" + (isFav(n) ? " on" : ""), "aria-label": "Shortlist", "aria-pressed": isFav(n) ? "true" : "false", onclick: function (e) { toggleFav(n); e.currentTarget.classList.toggle("on"); e.currentTarget.innerHTML = I.svg(isFav(n) ? "starf" : "star"); renderRail(); } }, ic(isFav(n) ? "starf" : "star")),
        h("button", { class: "iconbtn cmp" + (inCmp(n) ? " on" : ""), "aria-label": "Compare", "aria-pressed": inCmp(n) ? "true" : "false", onclick: function (e) { toggleCmp(n); e.currentTarget.classList.toggle("on", inCmp(n)); renderCmpBar(); renderRail(); toast(inCmp(n) ? "Added to compare" : "Removed from compare"); } }, ic("compare")),
        idx > 0 ? h("button", { class: "btn ghost", onclick: function () { go("bid-" + bids[idx - 1].n); } }, ic("left"), "#" + bids[idx - 1].n) : null, idx < bids.length - 1 ? h("button", { class: "btn ghost", onclick: function () { go("bid-" + bids[idx + 1].n); } }, "#" + bids[idx + 1].n, ic("right")) : null),
      hero,
      (function () { var c = chgBy[n]; if (!c) return null; var k = KIND[c.kind]; return h("button", { class: "wasrow", onclick: function () { openChg(n); } }, ic("swap"), h("span", null, c.was == null ? "New in Bid 196" : c.was === n ? "Same number as Bid 195" : "Was Bid 195 #" + c.was), pill(k[0], k[1]), h("span", { class: "sp" }), h("span", { class: "muted" }, "What changed"), ic("right")); })(),
      (function () { var cap = b.crew[0] !== null, d = b.crew.slice(1).filter(function (c) { return c !== null; }).length, dl = d + " deckhand" + (d > 1 ? "s" : ""), who = cap && d ? "Captain + " + dl : cap ? "Captain only" : dl + ", no captain seat", seats = b.crew.filter(function (c) { return c !== null; }).length;
        return bidFilled(b) ? card("Crew", who, crew) : h("div", { class: "wasrow static" }, ic("crew"), h("span", null, who), h("span", { class: "muted" }, seats === 1 ? "seat open" : "all " + seats + " seats open")); })(),
      lineSel,
      body,
      chg.length ? card("Bid sheet vs Nov 2 timetable", chg.length + " thing" + (chg.length === 1 ? "" : "s") + " to know about this bid’s runs.", nov2List(chg)) : h("div", { class: "hint", style: "margin:0 0 10px" }, "Every printed run on this bid matches the Nov 2 SF Bay Ferry timetable."),
      h("details", { class: "fold" }, h("summary", null, ic("bids"), "Bid sheet, as printed", ic("down", { cls: "tog" })), h("div", { class: "fold-b" }, h("div", { class: "runs" }, b.runs.map(function (r) { return h("div", { class: "run" }, r); })), b.notes.length ? h("div", { class: "notes" }, b.notes.map(function (t) { return h("div", { class: "note-i" }, t); })) : null))
    );
  }
  function nov2List(items) {
    var lab = { retime: "Time differs", "stop-removed": "Main St dropped", replaced: "New trip", repaired: "Re-paired", cut: "Not on timetable", conflict: "Doesn't fit", suspended: "Suspended Nov", light: "Light run" };
    var icn = { retime: "chg", "stop-removed": "pin", replaced: "rep", repaired: "rep", cut: "cut", conflict: "con", suspended: "sus", light: "dh" };
    return h("ul", { class: "chg-list" }, items.map(function (x) { return h("li", { class: x.kind }, ic(icn[x.kind] || "info"), h("div", null, h("b", { class: "k" }, lab[x.kind] || x.kind), h("b", null, x.line.replace(/\s*—.*$/, "") + ": "), x.text)); }));
  }

  // one schedule line: strip + map + scrubber + timeline
  function lineSection(b, L) {
    if (L.type !== "route") return otherLine(b, L);
    var api = null, curRun = null, phone = isPhone(), setTab = null, items = [], stripEl = h("div", { class: "strip" }), mapEl = h("div"), tlEl = h("div", { class: "tl" }), scrubEl = h("div", { class: "scrub" });
    var sails = L.legs.filter(function (g) { return g.type === "sailing"; });
    var w = D.shiftWindow(b, L), st = lineStats(L);
    var t0 = w ? w.start : (st.first ? mins(st.first) - 20 : 300), t1 = Math.max(w ? w.end : 0, L.shiftEnd ? mins(L.shiftEnd) : 0, st.last ? mins(st.last) + 25 : 0);
    // --- timeline items ---
    var no = 0, prevArr = null, prevStop = null;
    L.legs.forEach(function (g) {
      if (g.type === "sailing") {
        var s = g.stops, a = s[0], z = s[s.length - 1]; no++;
        if (prevArr && a.dep && prevStop === a.c) { var gap = (mins(a.dep) - mins(prevArr) + 1440) % 1440; if (gap >= 15) items.push({ kind: "layover", t: prevArr, dur: gap, at: a.c }); }
        items.push({ kind: "sail", no: no, g: g, t: a.dep || a.printedTime, arr: z.arr, color: RC[g.route] || "var(--navy)" });
        prevArr = z.arr; prevStop = z.c;
      } else if (g.type === "base") items.push({ kind: "base", g: g, t: g.time, phase: g.phase });
      else if (g.type === "deadhead") items.push({ kind: "dh", g: g });
      else if (g.type === "special") items.push({ kind: "special", g: g });
      else if (g.type === "note") items.push({ kind: "note", g: g });
    });
    function loopInfo(g) { var s = g.stops; return s.length > 2 && s[0].c === s[s.length - 1].c ? s[Math.floor((s.length - 1) / 2)].c : null; }
    function title(it) {
      var g = it.g, s = g.stops, mid = loopInfo(g);
      if (mid) return [NAME[s[0].c], h("span", { class: "arrow", html: I.svg("loop", { cls: "ic-s" }) }), NAME[mid], s.length > 3 ? h("span", { class: "muted" }, "via " + s.slice(1, -1).filter(function (x) { return x.c !== mid; }).map(function (x) { return SHORT[x.c]; }).join(", ")) : null];
      var out = []; s.forEach(function (x, i) { if (i) out.push(h("span", { class: "arrow" }, "→")); out.push(i === 0 || i === s.length - 1 ? NAME[x.c] : SHORT[x.c]); }); return out;
    }
    function flags(g) {
      var f = []; if (g.suspended) f.push(pill("off", "Suspended Nov 1–30"));
      g.stops.forEach(function (x) { if (x.cut) f.push(pill("bad", "Not on timetable")); if (x.replaced) f.push(pill("info", "New trip · confirm")); if (x.conflict) f.push(pill("warn", "Timing conflict")); });
      if (g.was && !f.length) f.push(pill("warn", "Retimed Nov 2"));
      if (g.approx) f.push(pill("warn", "Check time"));
      return f;
    }
    function detail(it) {
      var g = it.g, s = g.stops, notes = [];
      if (g.was) notes.push(["warn", ["Changed with the Nov 2 schedule — was ", h("s", null, g.was)]]);
      if (g.suspended) notes.push(["off", g.suspended]);
      s.forEach(function (x) { if (x.cut) notes.push(["bad", fmt(x.dep) + " from " + NAME[x.c] + " is not on the public Nov 2 timetable — confirm with Operations."]); if (x.replaced) notes.push(["info", "Moved onto the new " + fmt(x.dep) + " departure from " + NAME[x.c] + "; the old trip is eliminated Nov 2. Confirm on the Bid 196 sheet."]); if (x.conflict) notes.push(["warn", "Timing no longer fits at " + NAME[x.c] + " after the Nov 2 retime."]); });
      if (g.approx) notes.push(["warn", g.approx]); if (g.arrivalNote) notes.push(["info", g.arrivalNote]); if (g.aliasNote) notes.push(["info", g.aliasNote]); if (g.endsShift) notes.push(["info", g.endsShift]); if (g.paren) notes.push(["info", g.paren]);
      return h("div", { class: "tl-x", style: "--rc:" + it.color },
        h("ol", null, s.map(function (x, i) { var first = i === 0, last = i === s.length - 1, t = first ? [h("em", null, "dep"), fmt(x.dep)] : last ? [h("em", null, "arr"), fmt(x.arr)] : (x.dep && x.dep !== x.arr ? [h("em", null, "arr"), fmt(x.arr), " · ", h("em", null, "dep"), fmt(x.dep)] : [h("em", null, "calls"), fmt(x.arr || x.dep)]); return h("li", null, h("span", { class: "dot" }), h("span", { class: "nm" }, NAME[x.c] || x.c, x.wait > 0 && !last ? h("span", { class: "muted" }, " · " + x.wait + " min turn") : null), h("span", { class: "tm" }, t)); })),
        notes.map(function (nt) { return h("div", { class: "note " + nt[0] }, nt[1]); }),
        h("div", { style: "margin-top:8px;display:flex;gap:6px;flex-wrap:wrap" }, h("button", { class: "btn", onclick: function (e) { e.stopPropagation(); var go2 = function () { scrubTo(mins(s[0].dep || s[0].printedTime)); scrubEl.scrollIntoView({ block: "nearest", behavior: "smooth" }); }; if (setTab && state.bidTab !== "map") { curRun = it.no; setTab("map"); setTimeout(go2, 120); } else go2(); } }, ic("play"), "Watch this run"), s[s.length - 1].arr ? h("span", { class: "muted", style: "align-self:center;font-size:12px" }, ((mins(s[s.length - 1].arr) - mins(s[0].dep) + 1440) % 1440) + " min underway") : null));
    }
    function tlItem(it, i) {
      var el;
      if (it.kind === "sail") {
        var g = it.g, open = !!state.open[i], tag = g.implied ? (g.impliedReturn ? "implied return" : "implied from timetable") : (g.stops[0].printed ? "on bid sheet" : "from the timetable");
        var dur = it.arr && it.t ? (mins(it.arr) - mins(it.t) + 1440) % 1440 : null;
        var toggle = function () { pick(it.no, true); var x = el.querySelector(".tl-x"); if (x) { x.remove(); el.setAttribute("aria-expanded", "false"); state.open[i] = false; } else { el.appendChild(detail(it)); el.setAttribute("aria-expanded", "true"); state.open[i] = true; } };
        el = h("div", { class: "tli" + (g.implied ? " implied" : "") + (g.suspended ? " sus" : ""), style: "--rc:" + it.color, "data-run": it.no, role: "button", tabindex: "0", "aria-expanded": open ? "true" : "false",
          onclick: function (e) { if (e.target.closest(".tl-x")) return; toggle(); },
          onkeydown: function (e) { if ((e.key === "Enter" || e.key === " ") && !e.target.closest(".tl-x")) { e.preventDefault(); toggle(); } } },
          h("div", { class: "tl-t" }, fmt(it.t), h("small", null, "DEP")),
          h("div", { class: "tl-ic" }, ic(RI[g.route] || "oa")),
          h("div", { class: "tl-b" }, h("div", { class: "tl-n" }, title(it)), h("div", { class: "tl-s" }, h("b", null, RL[g.route] || g.route), " · " + tag + (dur != null ? " · " + dur + " min" : "") + (g.stops[0].printedTime && g.stops[0].printedTime !== g.stops[0].dep ? " · sheet says " + fmt(g.stops[0].printedTime) : "")), flags(g).length ? h("div", { class: "tl-flags" }, flags(g)) : null),
          h("div", { class: "tl-r" }, h("b", null, it.arr ? fmt(it.arr) : "—"), h("small", null, "ARR")),
          open ? detail(it) : null);
      } else if (it.kind === "layover") {
        el = h("div", { class: "tli light", style: "--rc:var(--muted)" }, h("div", { class: "tl-t" }, fmt(it.t), h("small", null, "ARR")), h("div", { class: "tl-ic" }, ic("layover")), h("div", { class: "tl-b" }, h("div", { class: "tl-n" }, it.dur + " min at " + NAME[it.at]), h("div", { class: "tl-s" }, "Layover before the next departure")), h("div", { class: "tl-r" }));
      } else if (it.kind === "base") {
        var g2 = it.g, start = it.phase === "start";
        el = h("div", { class: "tli base", style: "--rc:var(--ink)" }, h("div", { class: "tl-t" }, g2.time ? fmt(g2.time) : "—", h("small", null, start ? "TT" : "END")), h("div", { class: "tl-ic" }, ic(start ? "report" : "end")), h("div", { class: "tl-b" }, h("div", { class: "tl-n" }, (start ? "Report · " : "End of shift · ") + (NAME[g2.code] || g2.code)), h("div", { class: "tl-s" }, g2.text)), h("div", { class: "tl-r" }));
      } else if (it.kind === "dh") {
        el = h("div", { class: "tli light", style: "--rc:var(--r-dh)" }, h("div", { class: "tl-t" }, "", h("small", null, "LIGHT")), h("div", { class: "tl-ic" }, ic("dh")), h("div", { class: "tl-b" }, h("div", { class: "tl-n" }, "Light run " + (NAME[it.g.from] || it.g.from) + " → " + (NAME[it.g.to] || it.g.to)), h("div", { class: "tl-s" }, it.g.text || "No passengers")), h("div", { class: "tl-r" }));
      } else if (it.kind === "special") {
        el = h("div", { class: "tli light", style: "--rc:var(--r-sea)" }, h("div", { class: "tl-t" }, "", h("small", null, "EVENT")), h("div", { class: "tl-ic" }, ic("event")), h("div", { class: "tl-b" }, h("div", { class: "tl-n" }, it.g.text), h("div", { class: "tl-s" }, "As directed by Operations — time varies with the event")), h("div", { class: "tl-r" }));
      } else {
        el = h("div", { class: "tli light", style: "--rc:var(--warn)" }, h("div", { class: "tl-t" }, fmt(it.g.printed), h("small", null, "SHEET")), h("div", { class: "tl-ic" }, ic("con")), h("div", { class: "tl-b" }, h("div", { class: "tl-n" }, it.g.printed + " as printed"), h("div", { class: "tl-s" }, it.g.text)), h("div", { class: "tl-r" }));
      }
      return el;
    }
    items.forEach(function (it, i) { tlEl.appendChild(tlItem(it, i)); });
    // --- shift strip ---
    function strip(selected) {
      var W = Math.max(300, Math.min(640, (phone ? window.innerWidth : 520) - 62)), H = 60, PL = 6, PR = 6, span = Math.max(60, t1 - t0 + 20), x = function (m) { return PL + (m - (t0 - 10)) / span * (W - PL - PR); }, every = (W / (span / 60)) < 44 ? 2 : 1;
      var p = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Shift strip: every leg of the day on a time axis">'];
      for (var hh = Math.ceil((t0 - 10) / 60); hh * 60 <= t1 + 10; hh++) { var xx = x(hh * 60); p.push('<line class="axis" x1="' + xx.toFixed(1) + '" y1="16" x2="' + xx.toFixed(1) + '" y2="44"/>' + (hh % every ? "" : '<text x="' + xx.toFixed(1) + '" y="57" font-size="12" text-anchor="middle">' + (hh % 24 < 10 ? "0" : "") + (hh % 24) + '</text>')); }
      if (w) p.push('<rect class="gap" x="' + x(w.start).toFixed(1) + '" y="20" width="' + (x(w.end) - x(w.start)).toFixed(1) + '" height="20" rx="4"/>');
      L.legs.forEach(function (g) {
        if (g.type === "base" && g.time) { var bx = x(mins(g.time)); p.push('<line x1="' + bx.toFixed(1) + '" y1="14" x2="' + bx.toFixed(1) + '" y2="46" stroke="var(--ink)" stroke-width="1.5"/><text class="tt" x="' + (bx + (g.phase === "start" ? 3 : -3)).toFixed(1) + '" y="11" font-size="12" text-anchor="' + (g.phase === "start" ? "start" : "end") + '">' + (g.phase === "start" ? "TT " : "END ") + fmt(g.time) + '</text>'); }
        if (g.type !== "sailing") return;
        var s = g.stops, a = s[0].dep, z = s[s.length - 1].arr; if (!a || !z) return;
        var no2 = sails.indexOf(g) + 1, on = selected === no2, dim = selected !== null && selected !== undefined && !on;
        p.push('<g class="blk' + (on ? " on" : "") + (dim ? " dim" : "") + '" data-run="' + no2 + '" tabindex="0" role="button" aria-label="Run ' + no2 + ' ' + fmt(a) + '"><rect x="' + x(mins(a)).toFixed(1) + '" y="20" width="' + Math.max(3, x(mins(z)) - x(mins(a))).toFixed(1) + '" height="20" rx="3" fill="' + (RC[g.route] || "var(--navy)") + '"' + (g.implied ? ' opacity=".6"' : "") + (g.suspended ? ' opacity=".35"' : "") + '/></g>');
      });
      var nowM = (function () { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); })();
      if (nowM >= t0 - 10 && nowM <= t1 + 10) p.push('<line class="now" x1="' + x(nowM).toFixed(1) + '" y1="16" x2="' + x(nowM).toFixed(1) + '" y2="44"/>');
      p.push('</svg>');
      stripEl.innerHTML = p.join("") + '<div class="strip-l"><span>' + (w ? fmt(pad(w.start)) + ' – ' + fmt(pad(w.end)) + ' shift' : '') + (nowM >= t0 - 10 && nowM <= t1 + 10 ? ' · <span style="color:var(--r-sea);font-weight:700">| now</span>' : '') + '</span><span>tap a block to pick that run</span></div>';
    }
    stripEl.addEventListener("click", function (e) { var t = e.target.closest("[data-run]"); if (t) pick(+t.dataset.run, false); });
    stripEl.addEventListener("keydown", function (e) { var t = e.target.closest("[data-run]"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(+t.dataset.run, false); } });
    // --- scrubber ---
    var range = h("input", { type: "range", min: String(t0), max: String(t1), step: "1", value: String(t0), id: "scrub-" + b.n + "-" + state.line, "aria-label": "Time of day" });
    var readT = h("div", { class: "scrub-t" }, fmt(pad(t0))), readW = h("div", { class: "scrub-w" }, "Drag to see where the boat is."), playing = null;
    var playBtn = h("button", { class: "btn icon", "aria-label": "Play the day", onclick: function () { if (playing) stopPlay(); else startPlay(); } }, ic("play"));
    var nowBtn = h("button", { class: "btn", "aria-label": "Jump to the current time", onclick: function () { var d = new Date(), m = d.getHours() * 60 + d.getMinutes(); if (m < t0 || m > t1) { toast("This shift isn't underway right now (" + fmt(pad(m)) + ")"); scrubTo(Math.min(Math.max(m, t0), t1)); } else scrubTo(m); } }, ic("now"), "Now");
    scrubEl.appendChild(h("div", { class: "scrub-top" }, readT, readW));
    scrubEl.appendChild(h("div", { class: "scrub-row" }, range, h("div", { class: "scrub-acts" }, playBtn, nowBtn)));
    function startPlay() { stopPlay(); playBtn.innerHTML = I.svg("pause"); var m = +range.value >= t1 ? t0 : +range.value; playing = setInterval(function () { m += 1; if (m > t1) { stopPlay(); return; } scrubTo(m, true); }, 45); }
    function stopPlay() { if (playing) clearInterval(playing); playing = null; playBtn.innerHTML = I.svg("play"); }
    function scrubTo(m, fromPlay) {
      if (!fromPlay) stopPlay();
      range.value = String(m); readT.textContent = fmt(pad(m));
      if (!api) return; var pos = api.setTime(m), txt;
      if (!pos) txt = ""; else if (pos.moving && pos.what === "sail") { var r = pos.r, dest = NAME[pos.to]; txt = ["Underway ", h("b", null, NAME[pos.from] + " → " + dest), " · arrives " + fmt(pad(pos.eta)) + (pos.to !== pos.dest ? " · continues to " + SHORT[pos.dest] : "")]; }
      else if (pos.moving) txt = ["Light run to ", h("b", null, NAME[pos.to]), " — no passengers"];
      else if (pos.before) txt = ["At ", h("b", null, NAME[pos.at]), pos.next ? " · first departure " + fmt(pad(pos.next.t0 + (pos.next.what === "light" ? 15 : 0))) : ""];
      else if (pos.after) txt = ["Shift over · at ", h("b", null, NAME[pos.at])];
      else txt = ["At ", h("b", null, NAME[pos.at]), pos.next ? " · next " + fmt(pad(pos.next.t0)) + (pos.next.what === "sail" ? " to " + SHORT[pos.next.dest] : " light run to base") + " (in " + (pos.next.t0 - m) + " min)" : ""];
      readW.innerHTML = ""; add(readW, txt);
      if (pos && pos.r && pos.what === "sail") { var cur = api.state().run; if (cur !== pos.r.no) { api.pickRun(pos.r.no); highlight(pos.r.no); } }
    }
    range.addEventListener("input", function () { scrubTo(+range.value); });
    // --- sync ---
    function highlight(no2) {
      curRun = no2 == null ? null : no2; strip(no2);
      tlEl.querySelectorAll(".tli[data-run]").forEach(function (el) { var on = +el.dataset.run === no2; el.classList.toggle("on", on); el.classList.toggle("dim", no2 != null && !on); });
    }
    function pick(no2, fromList) {
      var cur = api ? api.state().run : curRun, next = cur === no2 && !fromList ? null : no2;
      if (api) { if (next === null) api.clear(); else api.pickRun(next); }
      highlight(next);
      if (next === null) return;
      if (phone) { if (!fromList && state.bidTab === "list") { var el = tlEl.querySelector('.tli[data-run="' + next + '"]'); if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); } }
      else if (fromList) { var r = mapEl.getBoundingClientRect(); if (r.bottom < 80 || r.top > window.innerHeight - 80) mapEl.scrollIntoView({ block: "start", behavior: "smooth" }); }
    }
    function mountMap() { if (api) return; api = BM.mount(mapEl, L, { chips: false, onChange: function (s2) { highlight(s2.run); } }); if (curRun != null) api.pickRun(curRun); }
    strip(null);
    var sum = [L.hours ? L.hours + "-hour shift" : null, st.n + " sailings", st.first ? fmt(st.first) + "–" + fmt(st.last) : null, st.wat ? underway(st) + " underway" : null].filter(Boolean).join(" · ");
    var head = h("div", { class: "line-hd wrap" }, glanceDT(b, L), h("small", null, sum));
    var foot = h("div", { class: "hint" }, "Solid icon = on the bid sheet · dashed ring = implied from the public timetable · tap a run for every stop");
    if (!phone) {
      requestAnimationFrame(mountMap);
      return h("div", { class: "bid-grid" }, h("div", { class: "sticky" }, h("div", { class: "card" }, head, stripEl, mapEl, scrubEl)), h("div", { class: "card" }, h("div", { class: "line-hd" }, ic("clock"), "Run by run"), tlEl, foot));
    }
    var listBox = h("div", null, tlEl, foot), mapBox = h("div", null, mapEl, scrubEl), bL = h("button", { role: "tab", id: "tab-list", onclick: function () { setTab("list"); } }, ic("clock"), "Run list"), bM = h("button", { role: "tab", id: "tab-map", onclick: function () { setTab("map"); } }, ic("map"), "Map");
    setTab = function (t) { state.bidTab = t; listBox.hidden = t !== "list"; mapBox.hidden = t !== "map"; bL.className = t === "list" ? "on" : ""; bM.className = t === "map" ? "on" : ""; bL.setAttribute("aria-selected", t === "list" ? "true" : "false"); bM.setAttribute("aria-selected", t === "map" ? "true" : "false"); if (t === "map") requestAnimationFrame(mountMap); };
    setTab(state.bidTab === "map" ? "map" : "list");
    return h("div", { class: "card" }, head, stripEl, h("div", { class: "seg full", role: "tablist", style: "margin:4px 0 10px" }, bL, bM), listBox, mapBox);
  }
  function otherLine(b, L) {
    var body;
    if (L.type === "shuttle") {
      var wsEl = h("div"), wsk = /FRI|SAT|SUN/i.test(L.header) && !/TUE|WED|THU/i.test(L.header) ? "frisun" : "tuethu", wsT = (S.ws[wsk] || {}), cw = (S.wsCrew || {})[L.variant === "PM" ? (wsk === "frisun" ? "PM_FS" : "PM_WT") : L.variant] || {};
      var days = /TUE|WED|THU/i.test(L.header) ? ["tuethu"] : []; if (/FRI|SAT|SUN/i.test(L.header)) days.push("frisun");
      var inWin = function (arr) { return (arr || []).filter(function (x) { return !cw.tt || (mins(x) >= mins(cw.tt) && mins(x) <= mins(cw.end || "2400")); }); };
      var nb = inWin(wsT.nb), sb = inWin(wsT.sb), addM = function (x, k) { return pad(mins(x) + k); };
      var legs = [].concat(nb.slice(0, 1).map(function (x) { return { type: "sailing", route: "WS", stops: [{ c: "AL", dep: x }, { c: "JLS", arr: addM(x, 7) }] }; }), sb.slice(0, 1).map(function (x) { return { type: "sailing", route: "WS", stops: [{ c: "JLS", dep: x }, { c: "AL", arr: addM(x, 7) }] }; }), nb.slice(-1).map(function (x) { return { type: "sailing", route: "WS", stops: [{ c: "AL", dep: x }, { c: "JLS", arr: addM(x, 7) }] }; }), sb.slice(-1).map(function (x) { return { type: "sailing", route: "WS", stops: [{ c: "JLS", dep: x }, { c: "AL", arr: addM(x, 7) }] }; }));
      requestAnimationFrame(function () { BM.mount(wsEl, L, { synth: { legs: legs }, chips: false }); });
      body = [wsEl, h("div", { class: "note" }, h("b", null, "Oakland Alameda Water Shuttle (" + L.variant + ")"), " — free Woodstock shuttle, Alameda Landing (Bohol Circle) ⇄ Jack London Square, about 7 minutes across, roughly every 22 minutes. Tue–Sun, no Monday service. If the shuttle is down the crew works Extra Board."),
        days.map(function (dk) { return h("div", null, h("div", { class: "sub-lbl" }, dk === "tuethu" ? "Tue–Thu timetable" : "Fri–Sun timetable"), h("div", { html: D.wsTableHTML(S, dk, L.variant, L.tt || b.tt) })); }),
        h("button", { class: "btn", style: "margin-top:10px", onclick: function () { go("shuttle"); } }, ic("ws"), "Full shuttle timetable and all three crews", ic("right"))];
    } else if (L.type === "seachange") {
      var scEl = h("div"); requestAnimationFrame(function () { BM.mount(scEl, L, { synth: { legs: [{ type: "sailing", route: "SEACHANGE", stops: [{ c: "JLS" }, { c: "P485" }] }, { type: "sailing", route: "SEACHANGE", stops: [{ c: "P485" }, { c: "JLS" }] }] }, chips: false }); });
      body = [scEl, h("div", { class: "note" }, h("b", null, "Sea Change hydrogen ferry"), " — continuous shuttle between Jack London Square and the Pier 48½ bunkering dock; the crew also handles bunkering (lead must be a qualified Bunkering PIC). Report " + fmt(L.tt || b.tt) + ", 10-hour shift.")];
    } else if (L.type === "dock") body = [h("div", { class: "note" }, h("b", null, "Dock labor / maintenance"), " at Pier 41 — rust chipping, painting, non-skid, CG inspection prep, sea trials, boat moves, splicing. Report " + fmt(L.tt || b.tt) + ". Shift starts and ends at Pier 41.")];
    else body = [h("div", { class: "note" }, h("b", null, "Extra Board"), " — any time, any location, assigned by Operations." + (L.tt ? " Report " + fmt(L.tt) + "." : ""))];
    return h("div", { class: "card" }, h("div", { class: "line-hd" }, glanceDT(b, L)), body);
  }

  // ---------- shuttle ----------
  function viewShuttle() {
    var wsBids = bids.filter(function (b) { var sc = schedMap[b.n]; return sc && sc.lines.some(function (L) { return L.type === "shuttle"; }); }), mapEl = h("div");
    requestAnimationFrame(function () { BM.mount(mapEl, { legs: [] }, { synth: { legs: [{ type: "sailing", route: "WS", stops: [{ c: "AL" }, { c: "JLS" }] }, { type: "sailing", route: "WS", stops: [{ c: "JLS" }, { c: "AL" }] }] }, chips: false, panel: false }); });
    // every crew window, once per timetable: which bid is on the boat for each departure
    var wins = { tuethu: [], frisun: [] }, crewKey = function (L, dk) { return L.variant === "PM" ? (dk === "frisun" ? "PM_FS" : "PM_WT") : L.variant; };
    wsBids.forEach(function (b) { schedMap[b.n].lines.forEach(function (L) { if (L.type !== "shuttle") return; var dks = []; if (/TUE|WED|THU/i.test(L.header)) dks.push("tuethu"); if (/FRI|SAT|SUN/i.test(L.header)) dks.push("frisun");
      dks.forEach(function (dk) { var c = (S.wsCrew || {})[crewKey(L, dk)] || {}, tt = L.tt || c.tt; if (!tt) return;
        wins[dk].push({ n: b.n, v: L.variant, tt: tt, end: c.end || pad(mins(tt) + 480), days: lineDay(L) }); }); }); });
    var table = function (dk) { var W = S.ws[dk], ws = wins[dk].slice().sort(function (a, b) { return mins(a.tt) - mins(b.tt) || a.n - b.n; });
      var who = function (t) { return ws.filter(function (w) { return t >= w.tt && t <= w.end; }).map(function (w) { return w.v + " #" + w.n; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(" · "); };
      return h("div", null,
        h("div", { class: "hint", style: "margin:0 0 8px" }, ws.map(function (w) { return h("span", { style: "display:block" }, h("b", { style: "color:var(--ink)" }, w.v + " crew · Bid #" + w.n), " · " + w.days + " · report " + fmt(w.tt) + ", on until about " + fmt(w.end)); })),
        h("table", { class: "tt" }, h("thead", null, h("tr", null, h("th", null, "Alameda Landing → Jack London"), h("th", null, "Jack London → Alameda Landing"), h("th", null, "Crew on board"))),
          h("tbody", null, W.nb.map(function (t, i) { var sbt = W.sb[i]; return h("tr", null, h("td", null, h("b", null, fmt(t)), h("span", { class: "muted" }, " → " + fmt(pad(mins(t) + 7)))), h("td", null, sbt ? [h("b", null, fmt(sbt)), h("span", { class: "muted" }, " → " + fmt(pad(mins(sbt) + 7)))] : "—"), h("td", { class: "muted" }, who(t) || "—")); })))); };
    return h("div", null,
      h("div", { class: "pager" }, h("button", { class: "btn", onclick: function () { go("bids"); } }, ic("left"), "All bids"), h("span", { class: "sp" })),
      card("Oakland Alameda Water Shuttle", "Alameda Landing (Bohol Circle / 5th St) ⇄ Jack London Square on the Woodstock. About 7 minutes across, free, Tue–Sun. No Monday service.",
        h("div", null, mapEl, h("div", { class: "sub-lbl" }, "The three shuttle bids"),
          h("div", { class: "list" }, wsBids.map(function (b) { var sc = schedMap[b.n]; return h("div", { class: "bidrow", role: "button", tabindex: "0", onclick: function () { go("bid-" + b.n); }, onkeydown: function (e) { if (e.key === "Enter") go("bid-" + b.n); } },
            h("div", { class: "bn" }, h("b", null, String(b.n)), h("small", null, b.s === "V" ? "VAR" : b.s)),
            h("div", { class: "bb" }, h("div", { class: "bb-t" }, h("span", { class: "tm" }, shiftLabel(b)), h("span", { class: "off" }, "off " + tc(b.off))), h("div", { class: "bb-m" }, ic("ws"), h("span", null, lineDays(sc))), POSTED ? h("div", { class: "bb-crew" }, crewLine(b)) : null),
            h("div", { class: "chev" }, ic("right"))); })),
          h("div", { class: "sub-lbl" }, "Who covers what"), h("div", { class: "scrollx", html: D.wsGanttSVG(S) }))),
      card("Tuesday – Thursday", "24 round trips. First 07:20 from Alameda Landing, last 19:41 from Jack London Sq.", table("tuethu")),
      card("Friday – Sunday", "34 round trips. Last 21:25 from Jack London Sq.", table("frisun"))
    );
  }
  // ---------- crew ----------
  // ---------- who gets a deckhand job ----------
  var PREV195_DH = 101;
  function notCounted(p) { // [reason] or null — people who won't take a Bid 196 deckhand job
    var prev = p[3] || "", st = p[2] || "", fixed = (window.SEN_OUT || {})[p[0]];
    if (fixed) return fixed;
    if (/retired/i.test(prev)) return "Retired";
    if (/working in hall/i.test(prev)) return "Working in the hall";
    if (/\(Captain\)/i.test(st)) return "Took a captain seat";
    if (/captain/i.test(prev)) return "Bids captain";
    if (!state.incUnknown && /unknown/i.test(prev)) return "Status unknown";
    if (state.skip.indexOf(p[0]) >= 0) return "You marked: not bidding";
    return null;
  }
  function jobModel() {
    var dh = 0, dhOpen = 0, cap = 0, capOpen = 0;
    bids.forEach(function (b) { b.crew.forEach(function (c, i) { if (c === null) return; if (i === 0) { cap++; if (c === "OPEN") capOpen++; } else { dh++; if (c === "OPEN") dhOpen++; } }); });
    var n = 0, proj = null, proj0 = null, bo = BIDOFF.length, boOpen = BIDOFF.filter(function (c) { return c === "OPEN"; }).length, out = {}, skipped = [], pin = null;
    DATA.sen.forEach(function (p, i) { var why = notCounted(p); if (state.lastPin && p[0] === state.lastPin) pin = { rank: i + 1, name: p[0], date: p[1], pos: n + (why ? 0 : 1) }; if (why) { out[i] = why; skipped.push({ rank: i + 1, name: p[0], why: why }); return; } n++; if (n === dh) proj0 = { rank: i + 1, name: p[0], date: p[1], pos: n }; if (n === dh + bo) proj = { rank: i + 1, name: p[0], date: p[1], pos: n }; });
    // the viewer can move the line to the name they know holds the last bid; that overrides the projection
    return { dh: dh, dhOpen: dhOpen, cap: cap, capOpen: capOpen, bo: bo, boOpen: boOpen, line: pin || proj, proj: proj, proj0: proj0, manual: !!pin, out: out, skipped: skipped, pool: n, short: proj ? 0 : dh + bo - n };
  }
  function setLast(name, msg) { state.lastPin = name; save("lastPin", name); if (msg !== false) toast(name ? "Last deckhand job moved to " + name : "Line back on the projection"); render(true); }
  function nudgeLast(M, dir) { var N = DATA.sen.length, i = (M.line ? M.line.rank - 1 : N) + dir; while (i >= 0 && i < N && M.out[i]) i += dir; if (i < 0 || i >= N) { toast(dir < 0 ? "Already at the top of the list" : "Already at the end of the list"); return; } setLast(DATA.sen[i][0], false); }
  function lastWith(col) { var r = null; DATA.sen.forEach(function (p, i) { if (/^Bid #\d+ \(DH|^Bid off/.test(p[col] || "")) r = i; }); return r; } // 2 = Bid 196 pick, 3 = Bid 195 seat
  function toCutline() { requestAnimationFrame(function () { var el = document.getElementById("cutline") || document.getElementById("senlist"); if (el) el.scrollIntoView({ block: "center" }); }); }
  function seniorityMeter(M, meRank, list, word) {
    list = list || DATA.sen; word = word || "deckhand";
    var N = list.length, W = 360, H = 58, L = 2, R = 2, bw = (W - L - R) / N, cut = M.line ? M.line.rank : N;
    var p = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Seniority list: who is projected to get a ' + word + ' job">'];
    list.forEach(function (s, i) {
      var x = L + i * bw, rank = i + 1, fill = M.out[i] ? "var(--line)" : rank <= cut ? "var(--ok)" : "var(--open)";
      p.push('<rect x="' + (x + 0.3).toFixed(1) + '" y="14" width="' + Math.max(1, bw - 0.6).toFixed(1) + '" height="24" rx="0.6" fill="' + fill + '"' + (M.out[i] ? ' opacity=".9"' : "") + '><title>#' + rank + ' ' + esc(s[0]) + (M.out[i] ? ' — not counted: ' + esc(M.out[i]) : rank <= cut ? ' — projected job' : ' — below the line') + '</title></rect>');
    });
    if (M.line) { var cx = L + cut * bw; var hi = cut > N * 0.8 && !meRank; p.push('<line x1="' + cx.toFixed(1) + '" y1="8" x2="' + cx.toFixed(1) + '" y2="44" stroke="var(--ink)" stroke-width="2"/><text x="' + cx.toFixed(1) + '" y="' + (hi ? 10 : 56) + '" font-size="13" font-weight="700" text-anchor="' + (cut > N * 0.8 ? "end" : "middle") + '" fill="var(--ink)">last job #' + cut + '</text>'); }
    if (M.manual && M.proj && M.proj.rank !== cut) { var px = L + M.proj.rank * bw; p.push('<line x1="' + px.toFixed(1) + '" y1="10" x2="' + px.toFixed(1) + '" y2="42" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="3 2"><title>Projection: #' + M.proj.rank + ' ' + esc(M.proj.name) + '</title></line>'); }
    if (meRank) { var mx = L + (meRank - 0.5) * bw; p.push('<path d="M' + (mx - 6).toFixed(1) + ' 1L' + (mx + 6).toFixed(1) + ' 1L' + mx.toFixed(1) + ' 11Z" fill="var(--r-sea)"/><text x="' + (mx - 8).toFixed(1) + '" y="10" font-size="13" font-weight="700" text-anchor="end" fill="var(--r-sea)">you #' + meRank + '</text>'); }
    p.push('<text x="' + L + '" y="56" font-size="13" fill="var(--muted)">#1</text><text x="' + (W - R) + '" y="56" font-size="13" fill="var(--muted)" text-anchor="end">#' + N + '</text></svg>');
    return p.join("");
  }
  function verdict(M, rank) {
    var p = DATA.sen[rank - 1], why = M.out[rank - 1];
    if (why) return { cls: "off", head: "#" + rank + " " + p[0] + " isn't counted", body: why + (state.skip.indexOf(p[0]) >= 0 ? ". Tap “count” next to their name below to include them again." : /won't take/.test(why) ? ". Left out of the job count." : " — left out of the count because they won't take a deckhand job.") };
    if (!M.line) return { cls: "ok", head: "#" + rank + " " + p[0] + " — gets a job", body: "There are more deckhand jobs than people bidding, so everyone counted gets one." };
    var d = M.line.rank - rank;
    if (d >= 0) return { cls: "ok", head: "#" + rank + " " + p[0] + " — projected to get a job", body: d === 0 ? "Right on the line: the last deckhand job." : d + " spot" + (d === 1 ? "" : "s") + " above the last job (#" + M.line.rank + " " + M.line.name + ")." };
    return { cls: "bad", head: "#" + rank + " " + p[0] + " — below the line", body: (-d) + " spot" + (d === -1 ? "" : "s") + " below the last job (#" + M.line.rank + " " + M.line.name + "). " + (-d) + " counted " + (d === -1 ? "person" : "people") + " above would have to skip the bid for this to change." };
  }
  function jobLineCard() {
    var M = jobModel(), meRank = state.me ? rankOf(state.me) : null, diff = M.dh - PREV195_DH, lp = lastWith(2), lv = lastWith(3), diff2 = M.manual ? M.line.pos - (M.dh + M.bo) : 0, v = meRank ? verdict(M, meRank) : null;
    var sel = h("select", { class: "sel", id: "lastsel", "aria-label": "Name that holds the last deckhand job", onchange: function (e) { setLast(e.target.value || null); } },
      h("option", { value: "" }, M.proj ? "#" + M.proj.rank + " " + M.proj.name + " (projected)" : "Everyone counted gets a job (projected)"),
      DATA.sen.map(function (p, i) { var o = h("option", { value: p[0] }, "#" + (i + 1) + " " + p[0] + (M.out[i] ? " (not counted)" : "")); if (M.manual && M.line.rank === i + 1) o.selected = true; return o; }));
    return h("div", { class: "card jl lead" },
      h("div", { class: "card-h" }, h("h2", { class: "card-t" }, "Will you get a deckhand job?"), M.manual ? pill("info", "Line set by you") : M.dhOpen === M.dh ? pill("warn", "Projection · picks not posted") : pill("ok", (M.dh - M.dhOpen) + " picked")),
      h("div", { class: "jl-stats" },
        h("div", { class: "jl-s" }, h("b", null, String(M.dh)), h("span", null, "deckhand jobs"), h("small", null, (M.bo ? "+" + M.bo + " bid off · " : "") + "Bid 195 had " + PREV195_DH + (diff ? " · " + Math.abs(diff) + (diff < 0 ? " fewer" : " more") : ""))),
        h("div", { class: "jl-s" }, h("b", null, String(M.dhOpen)), h("span", null, "still open"), h("small", null, (M.dh - M.dhOpen) + " taken")),
        h("div", { class: "jl-s line" }, h("b", null, M.line ? "#" + M.line.rank : "All in"), h("span", null, M.manual ? "last job · set by you" : "last job"), h("small", null, M.line ? M.line.name + " · hired " + M.line.date : "more jobs than bidders"))),
      h("div", { class: "jl-meter", html: seniorityMeter(M, meRank) }),
      h("div", { class: "legend", style: "margin-top:2px" }, h("span", { class: "lg" }, h("i", { style: "background:var(--ok);height:10px;width:10px" }), "Projected job"), h("span", { class: "lg" }, h("i", { style: "background:var(--open);height:10px;width:10px" }), "Below the line"), h("span", { class: "lg" }, h("i", { style: "background:var(--line);height:10px;width:10px" }), "Not counted (" + M.skipped.length + ")")),
      v ? h("div", { class: "jl-v " + v.cls, style: "margin-top:10px" }, h("b", null, v.head), h("span", null, v.body)) : h("div", { class: "hint" }, "Tap your name in the list below and choose “This is me” to see where you stand."),
      h("div", { class: "mv" },
        h("label", { class: "fl", "for": "lastsel" }, "Who holds the last deckhand job?"),
        h("div", { class: "mv-c" }, h("button", { class: "btn icon", "aria-label": "Move the line up one name", onclick: function () { nudgeLast(M, -1); } }, ic("down", { cls: "flip" })), sel, h("button", { class: "btn icon", "aria-label": "Move the line down one name", onclick: function () { nudgeLast(M, 1); } }, ic("down"))),
        (lp != null && !(M.manual && M.line.rank === lp + 1)) || (lv != null && !(M.line && M.line.rank === lv + 1)) || M.manual ? h("div", { class: "chips", style: "margin-top:8px" },
          lp != null && !(M.manual && M.line.rank === lp + 1) ? h("button", { class: "chip", onclick: function () { setLast(DATA.sen[lp][0]); } }, "Last Bid 196 pick so far · #" + (lp + 1) + " " + DATA.sen[lp][0]) : null,
          lv != null && !(M.line && M.line.rank === lv + 1) ? h("button", { class: "chip", onclick: function () { setLast(DATA.sen[lv][0]); } }, "Last Bid 195 seat · #" + (lv + 1) + " " + DATA.sen[lv][0]) : null,
          M.manual ? h("button", { class: "chip", onclick: function () { setLast(null); } }, ic("x"), "Back to projection") : null) : null,
        M.manual ? h("div", { class: "hint" }, "You moved the line to #" + M.line.rank + " " + M.line.name + ". " + M.line.pos + " counted " + (M.line.pos === 1 ? "person is" : "people are") + " at or above it" + (diff2 ? " — " + Math.abs(diff2) + (diff2 > 0 ? " more" : " fewer") + " than the " + (M.dh + M.bo) + " places (deckhand seats + bid off)" : ", the same as the " + (M.dh + M.bo) + " places (deckhand seats + bid off)") + (M.proj ? ". The projection was #" + M.proj.rank + " " + M.proj.name + "." : ".") + " Saved on this device only.") : null,
        h("button", { class: "btn ghost", style: "margin-top:6px;padding-left:0", onclick: toCutline }, "Show the line in the seniority list", ic("down"))),
      h("details", { class: "fold" }, h("summary", null, ic("info"), "How the line is worked out", ic("down", { cls: "tog" })),
        h("div", { class: "fold-b" },
          h("p", { class: "hint", style: "margin:0 0 8px" }, "Jobs go down the IBU seniority list in order. Counting " + M.dh + " deckhand seats (bids 1–28 × 3, 29–31 × 1, 32–33 × 2, 34–35 × 3, 36–39 × 1) plus " + M.bo + " bid-off slots from the top, skipping people who won't take a deckhand job, the last seat lands on #" + (M.proj ? M.proj.rank + " " + M.proj.name : "—") + ". Deckhands who take bid off don't work this bid, so the " + M.bo + " bid-off slots push the line " + M.bo + " names further down" + (M.proj0 ? " (seats alone would end at #" + M.proj0.rank + " " + M.proj0.name + ")" : "") + ". If someone above you skips the bid, the line moves down one. This is a projection from the bid sheet — the real picks decide it. If you know who holds the last bid, move the line to that name and everything on this page follows it."),
          h("div", { class: "chips", style: "margin-bottom:8px" }, h("button", { class: "chip" + (state.incUnknown ? " on" : ""), "aria-pressed": state.incUnknown ? "true" : "false", onclick: function () { state.incUnknown = !state.incUnknown; save("incUnknown", state.incUnknown); render(); } }, state.incUnknown ? "Counting “Unknown” as bidding" : "Not counting “Unknown”"), state.skip.length ? h("button", { class: "chip", onclick: function () { state.skip = []; save("skip", []); render(); } }, ic("x"), "Clear my " + state.skip.length + " skip" + (state.skip.length > 1 ? "s" : "")) : null),
          h("div", { class: "hint", style: "margin:0" }, h("b", null, "Not counted: "), M.skipped.length ? M.skipped.map(function (s) { return "#" + s.rank + " " + s.name + " (" + s.why.toLowerCase() + ")"; }).join(" · ") : "nobody"))));
  }

  function toBidOff() { requestAnimationFrame(function () { var el = document.getElementById("bidoff"); if (el) el.scrollIntoView({ block: "start", behavior: "smooth" }); }); }
  function bidOffCard(M) {
    if (!BIDOFF.length) return null;
    var taken = BIDOFF.length - M.boOpen;
    return h("div", { class: "card", id: "bidoff" },
      h("div", { class: "card-h" }, h("h2", { class: "card-t" }, "Bid off"), taken ? pill("ok", taken + " of " + BIDOFF.length + " taken") : pill("open", BIDOFF.length + " slots open")),
      h("div", { class: "card-s" }, "Deckhands who take bid off don't work Bid 196, so each slot opens one more deckhand job further down the seniority list."),
      h("div", { class: "bo-g" }, BIDOFF.map(function (c, i) { var open = !c || c === "OPEN", r = open ? null : rankOf(c);
        return h("div", { class: "bo-s " + (open ? "open" : "ok") }, h("small", null, "Slot " + (i + 1)), h("b", null, open ? "Open" : c), h("small", null, r ? "#" + r + " on the list" : open ? "Not taken yet" : "Not on the IBU list")); })),
      M.proj && M.proj0 ? h("div", { class: "bo-fx" }, h("span", { class: "bo-n" }, "+" + BIDOFF.length), h("span", null, h("b", null, BIDOFF.length + " more jobs. "), "Last deckhand job moves from #" + M.proj0.rank + " " + M.proj0.name + " to #" + M.proj.rank + " " + M.proj.name + (M.manual ? " (projection; you moved the line to #" + M.line.rank + ")" : "") + "."))
        : h("div", { class: "bo-fx" }, h("span", null, "There are more places than people bidding, so everyone counted gets a job either way.")));
  }
  function viewCrew() {
    if (state.crewTab === "capt") return h("div", null, crewTabs(), viewCaptains());
    var q = state.crewQ.trim().toLowerCase(), JM = jobModel();
    var rows = DATA.sen.map(function (p, i) { return { rank: i + 1, name: p[0], date: p[1], status: p[2] || "", prev: p[3] }; }).filter(function (p) { return !q || String(p.rank) === q || (p.name + " " + p.status + " " + (p.prev || "")).toLowerCase().indexOf(q) >= 0; });
    var fb = bids.filter(function (b) { return (state.offF === "all" || wkOff(b)) && (state.baseF === "all" || baseOf(b).indexOf(state.baseF) >= 0); });
    var cats = { bid: 0, nobid: 0, other: 0 }; DATA.sen.forEach(function (p) { if (/^Bid (#|off)/.test(p[2])) cats.bid++; else if (/no bid/i.test(p[2])) cats.nobid++; else cats.other++; });
    var hit = q && rows.length ? verdict(JM, rows[0].rank) : null;
    function gcCell(c) {
      if (c == null) return h("span", { class: "gc none" }, "—");
      if (c === "OPEN") return h("span", { class: "gc open" }, "open");
      var m = String(c).trim().match(/^(.*?)\s*\(([^)]*)\)\s*$/), nm = m ? m[1] : String(c).trim(), tag = m ? m[2] : "";
      var last = nm.replace(/^(?:[A-Z]{1,2}\.\s*)+/, "").trim() || nm;
      last = last.split(" ").map(function (w) { return w.length > 10 && w.indexOf("-") < 0 ? w.slice(0, Math.ceil(w.length / 2)) + "\u00AD" + w.slice(Math.ceil(w.length / 2)) : w; }).join(" ");
      return h("span", { class: "gc ok", title: c }, h("span", { class: "gc-n" }, last), tag ? h("span", { class: "gc-t" }, tag) : null);
    }
    var grid = h("div", null, h("div", { class: "fbar" },
        h("div", { class: "fgrp" }, h("span", { class: "fl" }, "Days off"), [["all", "Any"], ["wkend", "Weekends off"]].map(function (o) { return h("button", { class: "chip" + (state.offF === o[0] ? " on" : ""), "aria-pressed": state.offF === o[0] ? "true" : "false", onclick: function () { state.offF = o[0]; state.gridOpen = true; render(); } }, o[1]); })),
        h("div", { class: "fgrp" }, h("span", { class: "fl" }, "Base"), [["all", "All"], ["CB", "Central Bay"], ["NB", "North Bay"]].map(function (o) { return h("button", { class: "chip" + (state.baseF === o[0] ? " on" : ""), "aria-pressed": state.baseF === o[0] ? "true" : "false", onclick: function () { state.baseF = o[0]; state.gridOpen = true; render(); } }, o[1]); }))),
      h("div", { class: "hint", style: "margin:0 0 8px" }, fb.length + " of " + bids.length + " bids" + (state.baseF !== "all" ? " · bids that report at either base count for both" : "")),
      fb.length ? h("div", { class: "grid" }, h("div", { class: "grid-hd" }, h("span", { class: "gid" }, h("span", null, "Bid"), h("span", { class: "gid-off" }, "Off · base")), ["Capt", "DH 1", "DH 2", "DH 3"].map(function (c) { return h("span", { class: "gc" }, c); })),
        fb.map(function (b) { var bs = baseOf(b); return h("div", { class: "grid-row", role: "button", tabindex: "0", onclick: function () { go("bid-" + b.n); }, onkeydown: function (e) { if (e.key === "Enter") go("bid-" + b.n); } }, h("span", { class: "gid" }, h("span", { class: "gn" }, "#" + b.n), h("span", { class: "gm" }, h("b", null, tc(b.off)), h("small", null, bs || "—"))), b.crew.map(gcCell)); }),
          BIDOFF.length ? h("div", { class: "grid-row bo-row", role: "button", tabindex: "0", onclick: toBidOff, onkeydown: function (e) { if (e.key === "Enter") toBidOff(); } }, h("span", { class: "gid" }, h("span", { class: "gn" }, "Off"), h("span", { class: "gm" }, h("b", null, "Bid off"), h("small", null, "not working"))), h("span", { class: "gc none" }, "—"), [0, 1, 2].map(function (i) { return gcCell(BIDOFF[i]); })) : null)
        : h("div", { class: "empty" }, ic("filter"), "No bids match these filters."));
    var gridCard = POSTED ? card("Bids & crew seats", "Who took what. Tap a bid to open it.", grid)
      : h("details", { class: "fold more", id: "gridfold", open: state.gridOpen ? "" : null, ontoggle: function (e) { state.gridOpen = e.target.open; } }, h("summary", null, ic("bids"), "Crew grid · all " + crewCounts().slots + " seats open until picks post", ic("down", { cls: "tog" })), h("div", { class: "fold-b" }, grid));
    var act = function (label, fn, icon) { return h("button", { class: "btn", onclick: function (e) { e.stopPropagation(); fn(); } }, icon ? ic(icon) : null, label); };
    var listCard = card("Seniority list", !DATA.sen.length ? "No seniority list loaded." : cats.bid ? cats.bid + " holding a Bid 196 seat · " + cats.nobid + " have not picked yet" + (cats.other ? " · " + cats.other + " other" : "") + ". Tap a name for actions." : DATA.sen.length + " on the IBU list (JD updated 8/16/26). Nobody has picked yet; each row shows the Bid 195 seat. Tap a name for actions.",
      h("div", null, h("div", { class: "search-wrap" }, ic("search"), h("input", { class: "search", id: "crewq", type: "search", placeholder: "Find a name or seniority number…", value: state.crewQ, "aria-label": "Find a name or seniority number", oninput: function (e) { state.crewQ = e.target.value; render(true); } })),
        hit ? h("div", { class: "jl-v " + hit.cls, style: "margin-bottom:8px" }, h("b", null, hit.head), h("span", null, hit.body)) : q ? h("div", { class: "jl-v off", style: "margin-bottom:8px" }, h("b", null, "No match"), h("span", null, "Try a last name, like “Tonga”, or a seniority number.")) : null,
        h("div", { class: "senlist", id: "senlist" }, rows.map(function (p) {
          var m = p.status.match(/^Bid #(\d+)/), isMe = state.me === p.name, why = JM.out[p.rank - 1], zone = why ? "out" : (!JM.line || p.rank <= JM.line.rank) ? "in" : "below", userSkip = state.skip.indexOf(p.name) >= 0, open = state.rowMenu === p.name, isLast = JM.line && p.rank === JM.line.rank;
          var extra = p.status.replace(/^no bid yet\s*·?\s*/i, ""), side = m || /^Bid off/.test(p.status) ? h("span", { class: "st st-bid" }, p.status) : extra && !/^no bid yet$/i.test(p.status) ? h("span", { class: "sen-none" }, extra) : null;
          var toggle = function () { state.rowMenu = open ? null : p.name; render(true); };
          var row = h("div", { class: "sen-row z-" + zone + (isMe ? " me" : "") + (isLast ? " last" : "") + (open ? " open" : ""), role: "button", tabindex: "0", "aria-expanded": open ? "true" : "false", onclick: toggle, onkeydown: function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } } },
            h("span", { class: "sen-rank" }, String(p.rank)), h("span", { class: "sen-name" }, p.name, isMe ? [" ", pill("info", "you")] : null, h("small", null, p.date + (p.prev ? " · Bid 195: " + p.prev.replace(/^Bid /, "") : "")), why ? h("span", { class: "sen-prev", style: "color:var(--warn)" }, "Not counted: " + why) : null),
            h("span", { class: "sen-side" }, side, ic("down", { cls: "tog" })));
          var out = [row];
          if (open) out.push(h("div", { class: "sen-acts" },
            m ? act("Open Bid 196 #" + m[1], function () { go("bid-" + m[1]); }, "right") : null,
            act(isMe ? "Not me" : "This is me", function () { state.me = isMe ? null : p.name; save("me", state.me); state.rowMenu = null; toast(isMe ? "Cleared" : "Showing the dashboard for " + p.name); render(true); }, "pin"),
            !isLast ? act("Last job here", function () { state.rowMenu = null; setLast(p.name); toCutline(); }) : null,
            !why || userSkip ? act(userSkip ? "Count again" : "Won't bid — skip", function () { var k = state.skip.indexOf(p.name); if (k >= 0) state.skip.splice(k, 1); else state.skip.push(p.name); save("skip", state.skip); state.rowMenu = null; toast(k >= 0 ? p.name + " counted again" : p.name + " marked as not bidding"); render(true); }) : null));
          if (isLast) out.push(h("div", { class: "cutline" + (JM.manual ? " manual" : ""), id: "cutline", role: "group", "aria-label": "Last deckhand job line" }, h("span", null, "Last deckhand job" + (JM.manual ? " · set by you" : " · projected")),
            h("button", { class: "skipbtn", "aria-label": "Move the line up one name", onclick: function () { nudgeLast(JM, -1); toCutline(); } }, ic("down", { cls: "flip" })), h("button", { class: "skipbtn", "aria-label": "Move the line down one name", onclick: function () { nudgeLast(JM, 1); toCutline(); } }, ic("down"))));
          return out;
        }))));
    return h("div", null, crewTabs(), POSTED ? [gridCard, jobLineCard(), listCard, bidOffCard(JM)] : [jobLineCard(), listCard, gridCard, bidOffCard(JM)]);
  }

  // ---------- captains ----------
  var CAPT = DATA.capt || null, CAPSEN = DATA.capSen || [], CAP_OUT = window.CAP_OUT || {};
  function capRankOf(name) { if (!name) return null; var n = name.replace(/\(.*?\)/g, "").trim().toLowerCase(); for (var i = 0; i < CAPSEN.length; i++) if (CAPSEN[i][0].toLowerCase() === n) return i + 1; return null; }
  function capNotCounted(p) { if (state.capSkip.indexOf(p[0]) >= 0) return "You marked: not bidding"; if (CAP_OUT[p[0]] && state.capCount.indexOf(p[0]) < 0) return CAP_OUT[p[0]]; return null; }
  function capJobs() { // every captain job on Bid 196: the captain seat of bids 1–33, the captain-only lines, Bay Cruise A/B and bid-off
    var out = [];
    bids.forEach(function (b) { if (b.crew[0] !== null) out.push({ id: String(b.n), label: "#" + b.n, name: b.crew[0], kind: "bid", n: b.n, off: b.off, tt: b.tt, prev: (chgBy[b.n] && chgBy[b.n].was != null && PREV && PREV.capt) ? PREV.capt.bids[String(chgBy[b.n].was)] : null }); });
    (CAPT ? CAPT.lines : []).forEach(function (L) { var pv = PREV && PREV.capt ? (/^[AB]$/.test(L.id) ? PREV.capt.bc[L.id] : PREV.capt.bids[L.id]) : null; out.push({ id: L.id, label: /^[AB]$/.test(L.id) ? "BC " + L.id : "#" + L.id, name: L.crew, kind: "line", off: L.off, tt: L.tt, line: L, prev: pv }); });
    if (CAPT) out.push({ id: "off", label: "Bid off", name: CAPT.bidOff, kind: "off", prev: PREV && PREV.capt ? PREV.capt.bidOff : null });
    return out;
  }
  function capModel() {
    var jobs = capJobs(), total = jobs.length, open = jobs.filter(function (j) { return !j.name || j.name === "OPEN"; }).length;
    var n = 0, proj = null, out = {}, skipped = [], pin = null;
    CAPSEN.forEach(function (p, i) { var why = capNotCounted(p); if (state.capPin && p[0] === state.capPin) pin = { rank: i + 1, name: p[0], date: p[1], pos: n + (why ? 0 : 1) }; if (why) { out[i] = why; skipped.push({ rank: i + 1, name: p[0], why: why }); return; } n++; if (n === total) proj = { rank: i + 1, name: p[0], date: p[1], pos: n }; });
    return { jobs: jobs, total: total, open: open, filled: total - open, line: pin || proj, proj: proj, manual: !!pin, out: out, skipped: skipped, pool: n, short: proj ? 0 : total - n };
  }
  function capSetLast(name, msg) { state.capPin = name; save("capPin", name); if (msg !== false) toast(name ? "Last captain job moved to " + name : "Line back on the projection"); render(true); }
  function capNudge(M, dir) { var N = CAPSEN.length, i = (M.line ? M.line.rank - 1 : N) + dir; while (i >= 0 && i < N && M.out[i]) i += dir; if (i < 0 || i >= N) { toast(dir < 0 ? "Already at the top of the list" : "Already at the end of the list"); return; } capSetLast(CAPSEN[i][0], false); }
  function capVerdict(M, rank) {
    var p = CAPSEN[rank - 1], why = M.out[rank - 1];
    if (why) return { cls: "off", head: "#" + rank + " " + p[0] + " isn't counted", body: why + (state.capSkip.indexOf(p[0]) >= 0 || CAP_OUT[p[0]] ? ". Tap “count” next to the name below to include them." : ".") };
    if (!M.line) return { cls: "ok", head: "#" + rank + " " + p[0] + " — gets a captain job", body: "More captain jobs than captains bidding, so everyone counted gets one." };
    var d = M.line.rank - rank;
    if (d >= 0) return { cls: "ok", head: "#" + rank + " " + p[0] + " — projected to get a captain job", body: d === 0 ? "Right on the line: the last captain job." : d + " spot" + (d === 1 ? "" : "s") + " above the last job (#" + M.line.rank + " " + M.line.name + ")." };
    return { cls: "bad", head: "#" + rank + " " + p[0] + " — below the line", body: (-d) + " spot" + (d === -1 ? "" : "s") + " below the last captain job (#" + M.line.rank + " " + M.line.name + "). " + (-d) + " counted captain" + (d === -1 ? "" : "s") + " above would have to skip the bid for this to change." };
  }
  function capOrderNote(M) { var picked = [], maxR = 0; CAPSEN.forEach(function (p, i) { if (/^(Bid #|Bay Cruise|Bid off)/.test(p[2] || "")) { picked.push(i + 1); maxR = i + 1; } }); if (!picked.length) return "No captain has picked yet."; var above = 0; for (var i = 0; i < maxR; i++) if (!M.out[i] && picked.indexOf(i + 1) < 0) above++; return "The " + picked.length + " captain" + (picked.length === 1 ? "" : "s") + " who have picked so far run down to #" + maxR + " on the list" + (above ? ", with " + above + " counted captain" + (above === 1 ? "" : "s") + " above that still to pick." : " — the picks are running in seniority order."); }
  function capToCut() { requestAnimationFrame(function () { var el = document.getElementById("capcut") || document.getElementById("caplist"); if (el) el.scrollIntoView({ block: "center" }); }); }
  function capJobCard(M) {
    var lp = null; CAPSEN.forEach(function (p, i) { if (/^(Bid #\d+|Bay Cruise|Bid off)/.test(p[2] || "")) lp = i; });
    var sel = h("select", { class: "sel", id: "caplastsel", "aria-label": "Name that holds the last captain job", onchange: function (e) { capSetLast(e.target.value || null); } },
      h("option", { value: "" }, M.proj ? "#" + M.proj.rank + " " + M.proj.name + " (projected)" : "Everyone counted gets a job (projected)"),
      CAPSEN.map(function (p, i) { var o = h("option", { value: p[0] }, "#" + (i + 1) + " " + p[0] + (M.out[i] ? " (not counted)" : "")); if (M.manual && M.line.rank === i + 1) o.selected = true; return o; }));
    var prevJobs = PREV && PREV.capt ? PREV.capt.jobs : null, diff = prevJobs != null ? M.total - prevJobs : 0;
    return h("div", { class: "card jl lead" },
      h("div", { class: "card-h" }, h("h2", { class: "card-t" }, "Who gets a captain job?"), M.manual ? pill("info", "Line set by you") : M.filled ? pill("ok", M.filled + " picked") : pill("warn", "Projection · picks not posted")),
      h("div", { class: "jl-stats" },
        h("div", { class: "jl-s" }, h("b", null, String(M.total)), h("span", null, "captain jobs"), h("small", null, "36 lines + bid off + Bay Cruise A, B" + (prevJobs != null ? " · Bid 195 had " + prevJobs + (diff ? " · " + Math.abs(diff) + (diff < 0 ? " fewer" : " more") : "") : ""))),
        h("div", { class: "jl-s" }, h("b", null, String(M.open)), h("span", null, "still open"), h("small", null, M.filled + " taken")),
        h("div", { class: "jl-s line" }, h("b", null, M.line ? "#" + M.line.rank : "All in"), h("span", null, M.manual ? "last job · set by you" : "last job"), h("small", null, M.line ? M.line.name + " · " + M.line.date : "more jobs than bidders"))),
      h("div", { class: "jl-meter", html: seniorityMeter(M, null, CAPSEN, "captain") }),
      h("div", { class: "legend", style: "margin-top:2px" }, h("span", { class: "lg" }, h("i", { style: "background:var(--ok);height:10px;width:10px" }), "Projected job"), h("span", { class: "lg" }, h("i", { style: "background:var(--open);height:10px;width:10px" }), "Below the line"), h("span", { class: "lg" }, h("i", { style: "background:var(--line);height:10px;width:10px" }), "Not counted (" + M.skipped.length + ")")),
      h("div", { class: "hint" }, "Captains pick in their own seniority order (Blue & Gold captains list, updated 8/14/26, " + CAPSEN.length + " names). " + M.pool + " are counted as bidding for " + M.total + " jobs" + (M.proj ? ", so the last captain job lands on #" + M.proj.rank + " " + M.proj.name + " and " + (M.pool - M.proj.pos) + " counted captain" + (M.pool - M.proj.pos === 1 ? "" : "s") + " below the line would be without a bid line." : ".") + " " + capOrderNote(M)),
      h("div", { class: "mv" },
        h("label", { class: "fl", "for": "caplastsel" }, "Who holds the last captain job?"),
        h("div", { class: "mv-c" }, h("button", { class: "btn icon", "aria-label": "Move the line up one name", onclick: function () { capNudge(M, -1); } }, ic("down", { cls: "flip" })), sel, h("button", { class: "btn icon", "aria-label": "Move the line down one name", onclick: function () { capNudge(M, 1); } }, ic("down"))),
        h("div", { class: "chips", style: "margin-top:8px" },
          lp != null && !(M.manual && M.line.rank === lp + 1) ? h("button", { class: "chip", onclick: function () { capSetLast(CAPSEN[lp][0]); } }, "Last captain pick so far · #" + (lp + 1) + " " + CAPSEN[lp][0]) : null,
          M.manual ? h("button", { class: "chip", onclick: function () { capSetLast(null); } }, ic("x"), "Back to projection") : null),
        h("button", { class: "btn ghost", style: "margin-top:6px;padding-left:0", onclick: capToCut }, "Show the line in the captain list", ic("down"))),
      h("details", { class: "fold" }, h("summary", null, ic("info"), "How the captain line is worked out", ic("down", { cls: "tog" })),
        h("div", { class: "fold-b" },
          h("p", { class: "hint", style: "margin:0 0 8px" }, "Jobs go down the captains seniority list in order: " + M.total + " jobs = the captain seat on bids #1–33, the three captain-only Extra Board lines (#34–36), Bay Cruise A and B (Pier 41) and one bid-off. Captains with no Bid 195 line are left out of the count — four of them are marked “MW” on the printed list and three (J. Stilz, E. Thompson, E. Tracy) hold no bid line — tap “count” on a name to include them. Three captains are also on the IBU deckhand list (J. Perez, T. Brown, E. Campos): they are counted here and left out of the deckhand count."),
          state.capSkip.length || state.capCount.length ? h("div", { class: "chips", style: "margin-bottom:8px" }, h("button", { class: "chip", onclick: function () { state.capSkip = []; state.capCount = []; save("capSkip", []); save("capCount", []); render(); } }, ic("x"), "Reset my captain changes")) : null,
          h("div", { class: "hint", style: "margin:0" }, h("b", null, "Not counted: "), M.skipped.length ? M.skipped.map(function (s) { return "#" + s.rank + " " + s.name + " (" + s.why.toLowerCase() + ")"; }).join(" · ") : "nobody"))));
  }
  function capNameCell(c, prev) {
    if (c == null) return h("span", { class: "gc none" }, "—");
    if (c === "OPEN") return h("span", { class: "gc open" }, "open", prev ? h("small", null, "195: " + prev.replace(/\s*\(.*\)$/, "")) : null);
    var m = String(c).trim().match(/^(.*?)\s*\(([^)]*)\)\s*$/), nm = m ? m[1] : String(c).trim(), tag = m ? m[2] : "", r = capRankOf(nm);
    return h("span", { class: "gc ok", title: c }, h("span", { class: "gc-n" }, nm), tag ? h("span", { class: "gc-t" }, tag) : null, r ? h("small", null, "#" + r + " on the list") : null);
  }
  function capPicksCard(M) {
    var openOnly = state.capOpenOnly, rows = M.jobs.filter(function (j) { return !openOnly || !j.name || j.name === "OPEN"; });
    return card("Captain picks", "Every captain job on Bid 196 and who took it. Tap a bid to open it.",
      h("div", null,
        h("div", { class: "fbar" }, h("div", { class: "fgrp" }, h("span", { class: "fl" }, "Show"), [[false, "All " + M.total], [true, "Open " + M.open]].map(function (o) { return h("button", { class: "chip" + (openOnly === o[0] ? " on" : ""), "aria-pressed": openOnly === o[0] ? "true" : "false", onclick: function () { state.capOpenOnly = o[0]; render(); } }, o[1]); }))),
        h("div", { class: "capgrid" }, h("div", { class: "capgrid-hd" }, h("span", null, "Job"), h("span", null, "Days off · report"), h("span", null, "Captain")),
          rows.map(function (j) { var open = !j.name || j.name === "OPEN", go2 = j.kind === "bid" ? function () { go("bid-" + j.n); } : j.kind === "line" ? function () { state.capLine = j.id; render(); requestAnimationFrame(function () { var el = document.getElementById("capline-" + j.id); if (el) el.scrollIntoView({ block: "start" }); }); } : null;
            return h("div", { class: "capgrid-row" + (go2 ? " tap" : ""), role: go2 ? "button" : null, tabindex: go2 ? "0" : null, onclick: go2, onkeydown: go2 ? function (e) { if (e.key === "Enter") go2(); } : null },
              h("span", { class: "gn" }, j.label), h("span", { class: "gm" }, h("b", null, j.kind === "off" ? "Not working" : tc(j.off)), h("small", null, j.kind === "off" ? "1 slot" : j.tt && j.tt !== "Varies" ? fmt(j.tt) : "varies")), capNameCell(open ? "OPEN" : j.name, j.prev)); }))));
  }
  function capLinesCard() {
    if (!CAPT) return null;
    return card("Captain-only lines", "Lines on the Masters and MMP sheets that have no deckhand crew: #34–36 Extra Board captains and the Pier 41 Bay Cruise bids.",
      h("div", { class: "caplines" }, CAPT.lines.map(function (L) { var open = !L.crew || L.crew === "OPEN", on = state.capLine === L.id;
        return h("div", { class: "capline" + (on ? " on" : ""), id: "capline-" + L.id },
          h("div", { class: "capline-h" }, h("span", { class: "bn s-" + (L.s || "V") }, h("b", null, L.id), h("small", null, L.s === "V" ? "VAR" : L.s)), h("span", { class: "capline-t" }, h("b", null, L.label), h("span", { class: "muted" }, "off " + tc(L.off) + " · " + (L.tt && L.tt !== "Varies" ? "report " + fmt(L.tt) : "report varies") + " · " + (L.base === "P41" ? "Pier 41" : L.base))), capNameCell(open ? "OPEN" : L.crew, PREV && PREV.capt ? (/^[AB]$/.test(L.id) ? PREV.capt.bc[L.id] : PREV.capt.bids[L.id]) : null)),
          h("ul", { class: "runs-txt" }, L.runs.map(function (r) { return h("li", null, r); })),
          L.prev ? h("div", { class: "hint", style: "margin:4px 0 0" }, L.prev) : null,
          L.notes && L.notes.length ? h("div", { class: "hint", style: "margin:2px 0 0" }, L.notes.join(" ")) : null); })));
  }
  function capListCard(M) {
    var q = state.capQ.trim().toLowerCase();
    var rows = CAPSEN.map(function (p, i) { return { rank: i + 1, name: p[0], full: p[4] || p[0], date: p[1], status: p[2] || "", prev: p[3] || "" }; }).filter(function (p) { return !q || String(p.rank) === q || (p.name + " " + p.full + " " + p.status + " " + p.prev).toLowerCase().indexOf(q) >= 0; });
    var hit = q && rows.length ? capVerdict(M, rows[0].rank) : null, picked = CAPSEN.filter(function (p) { return /^(Bid #|Bay Cruise|Bid off)/.test(p[2] || ""); }).length;
    var act = function (label, fn, icon) { return h("button", { class: "btn", onclick: function (e) { e.stopPropagation(); fn(); } }, icon ? ic(icon) : null, label); };
    return card("Captains seniority list", CAPSEN.length + " captains (Blue & Gold list updated 8/14/26 JD) · " + picked + " have picked a Bid 196 job · each row shows the Bid 195 job. Tap a name for actions.",
      h("div", null, h("div", { class: "search-wrap" }, ic("search"), h("input", { class: "search", id: "capq", type: "search", placeholder: "Find a captain or seniority number…", value: state.capQ, "aria-label": "Find a captain or seniority number", oninput: function (e) { state.capQ = e.target.value; render(true); } })),
        hit ? h("div", { class: "jl-v " + hit.cls, style: "margin-bottom:8px" }, h("b", null, hit.head), h("span", null, hit.body)) : q ? h("div", { class: "jl-v off", style: "margin-bottom:8px" }, h("b", null, "No match"), h("span", null, "Try a last name, like “Elles”, or a seniority number.")) : null,
        h("div", { class: "senlist", id: "caplist" }, rows.map(function (p) {
          var m = p.status.match(/^Bid #(\d+)/), why = M.out[p.rank - 1], zone = why ? "out" : (!M.line || p.rank <= M.line.rank) ? "in" : "below", open = state.capMenu === p.name, isLast = M.line && p.rank === M.line.rank, userSkip = state.capSkip.indexOf(p.name) >= 0, fixedOut = !!CAP_OUT[p.name] && state.capCount.indexOf(p.name) < 0;
          var side = /^(Bid #|Bay Cruise|Bid off)/.test(p.status) ? h("span", { class: "st st-bid" }, p.status) : null;
          var toggle = function () { state.capMenu = open ? null : p.name; render(true); };
          var row = h("div", { class: "sen-row z-" + zone + (isLast ? " last" : "") + (open ? " open" : ""), role: "button", tabindex: "0", "aria-expanded": open ? "true" : "false", onclick: toggle, onkeydown: function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } } },
            h("span", { class: "sen-rank" }, String(p.rank)), h("span", { class: "sen-name" }, p.full, h("small", null, p.date + (p.prev ? " · Bid 195: " + p.prev.replace(/^Bid /, "") : "")), why ? h("span", { class: "sen-prev", style: "color:var(--warn)" }, "Not counted: " + why) : null),
            h("span", { class: "sen-side" }, side, ic("down", { cls: "tog" })));
          var out = [row];
          if (open) out.push(h("div", { class: "sen-acts" },
            m ? act("Open Bid 196 #" + m[1], function () { go("bid-" + m[1]); }, "right") : null,
            !isLast ? act("Last job here", function () { state.capMenu = null; capSetLast(p.name); capToCut(); }) : null,
            fixedOut ? act("Count again", function () { state.capCount.push(p.name); save("capCount", state.capCount); state.capMenu = null; toast(p.name + " counted"); render(true); }) : act(userSkip ? "Count again" : "Won't bid — skip", function () { var k = state.capSkip.indexOf(p.name); if (k >= 0) state.capSkip.splice(k, 1); else state.capSkip.push(p.name); save("capSkip", state.capSkip); state.capMenu = null; toast(k >= 0 ? p.name + " counted again" : p.name + " marked as not bidding"); render(true); })));
          if (isLast) out.push(h("div", { class: "cutline" + (M.manual ? " manual" : ""), id: "capcut", role: "group", "aria-label": "Last captain job line" }, h("span", null, "Last captain job" + (M.manual ? " · set by you" : " · projected")),
            h("button", { class: "skipbtn", "aria-label": "Move the line up one name", onclick: function () { capNudge(M, -1); capToCut(); } }, ic("down", { cls: "flip" })), h("button", { class: "skipbtn", "aria-label": "Move the line down one name", onclick: function () { capNudge(M, 1); capToCut(); } }, ic("down"))));
          return out;
        }))));
  }
  function viewCaptains() {
    var M = capModel();
    return h("div", null, capJobCard(M), capPicksCard(M), capLinesCard(), capListCard(M));
  }
  function crewTabs() {
    return h("div", { class: "seg crewseg", role: "tablist" }, [["dh", "Deckhands", "crew"], ["capt", "Captains", "pin"]].map(function (o) { var on = state.crewTab === o[0]; return h("button", { class: on ? "on" : "", role: "tab", "aria-selected": on ? "true" : "false", onclick: function () { go(o[0] === "capt" ? "captains" : "crew"); } }, ic(o[2]), o[1]); }));
  }

  // ---------- workload: the lightest bids first ----------
  function lineDaysCount(L) { var hd = String(L.header || "").replace(/\s*—.*$/, "").replace(/\(.*?\)/g, "").replace(/\*/g, "").replace(/,/g, "/").trim(); return Object.keys(offDays(hd)).length; }
  function workload(b) {
    var sc = schedMap[b.n]; if (!sc) return null;
    var w = { sail: 0, under: 0, hrs: 0, days: 0, extra: 0, other: 0, kinds: [], events: 0 };
    workLines(b).forEach(function (L) { var nd = lineDaysCount(L) || 1, hm = L.header.match(/\((\d+)/), hh = hm ? +hm[1] : (L.hours || 8); w.days += nd; w.hrs += nd * hh;
      if (L.type === "route") { var st = lineStats(L); w.sail += nd * st.n; w.under += nd * st.wat; w.events += nd * L.legs.filter(function (g) { return g.type === "special"; }).length; } else if (L.type === "extra") w.extra += nd; else { w.other += nd; if (w.kinds.indexOf(L.type) < 0) w.kinds.push(L.type); } });
    w.ot = (b.notes || []).some(function (t) { return /overtime is expected/i.test(t); }) || /\*/.test((workLines(b)[0] || {}).header || "");
    w.comparable = !w.extra && !w.other && w.sail > 0;
    return w;
  }
  function sfReports(b) { var sc = schedMap[b.n]; return baseOf(b) === "Pier 41" || !!(sc && sc.lines.some(function (L) { return L.type === "seachange" || L.type === "dock"; })); }
  function lightestCard() {
    var pk = state.pk, rows = bids.map(function (b) { return { b: b, w: workload(b) }; }).filter(function (r) { return r.w; });
    rows = rows.filter(function (r) { if (pk.cb && baseOf(r.b) !== "CB") return false; if (pk.sf && sfReports(r.b)) return false; if (pk.wk && !wkOff(r.b)) return false; return true; });
    var cmp = rows.filter(function (r) { return r.w.comparable; }).sort(function (a, b) { return a.w.under - b.w.under || a.w.sail - b.w.sail || a.b.n - b.b.n; }), rest = rows.filter(function (r) { return !r.w.comparable; });
    var show = state.pkAll ? cmp : cmp.slice(0, 8), hm = function (m) { return Math.round(m / 60 * 10) / 10 + "h"; };
    var tog = function (key, label) { return h("button", { class: "chip" + (pk[key] ? " on" : ""), "aria-pressed": pk[key] ? "true" : "false", onclick: function () { pk[key] = !pk[key]; save("pk", pk); render(); } }, label); };
    return card("Lightest bids first", "Ranked by hours actually underway per week (printed runs plus implied returns), then by sailings. Extra Board, water shuttle, Sea Change and dock-labor lines can't be ranked and sit at the end.",
      h("div", null,
        h("div", { class: "chips", style: "margin-bottom:8px" }, tog("cb", "Central Bay base only"), tog("sf", "Hide lines that report in SF"), tog("wk", "Weekends off only")),
        show.length ? h("div", { class: "lt" }, h("div", { class: "lt-hd" }, h("span", null, "Bid"), h("span", null, "Days off · report"), h("span", null, "Per week"), h("span", null, "Crew")),
          show.map(function (r, i) { var b = r.b, open = b.crew.filter(function (c) { return c === "OPEN"; }).length;
            return h("div", { class: "lt-row" + (isFav(b.n) ? " fav" : ""), role: "button", tabindex: "0", onclick: function (e) { if (e.target.closest(".iconbtn")) return; go("bid-" + b.n); }, onkeydown: function (e) { if (e.key === "Enter") go("bid-" + b.n); } },
              h("span", { class: "lt-rk" }, String(i + 1)), h("span", { class: "bn s-" + b.s }, h("b", null, String(b.n)), h("small", null, b.s === "V" ? "VAR" : b.s)),
              h("span", { class: "lt-m" }, h("b", null, "off " + tc(b.off)), h("small", null, shiftLabel(b) + " · " + r.w.days + " days")),
              h("span", { class: "lt-w" }, h("b", null, hm(r.w.under), h("i", null, " underway")), h("small", null, r.w.sail + " sailings · " + r.w.hrs + "h paid" + (r.w.events ? " · " + r.w.events + " event stop" + (r.w.events === 1 ? "" : "s") : "")), r.w.ot || r.w.events ? h("span", { class: "chk", style: "display:block" }, (r.w.ot ? "overtime expected" : "") + (r.w.ot && r.w.events ? " · " : "") + (r.w.events ? "sports/event work" : "")) : null),
              h("span", { class: "lt-c" }, b.crew[0] && b.crew[0] !== "OPEN" ? h("b", null, "Capt " + b.crew[0]) : h("b", { class: "muted" }, "Captain open"), h("small", null, open ? open + " seat" + (open === 1 ? "" : "s") + " open" : "crew full")),
              h("button", { class: "iconbtn" + (isFav(b.n) ? " on" : ""), "aria-label": (isFav(b.n) ? "Remove bid " + b.n + " from" : "Add bid " + b.n + " to") + " shortlist", "aria-pressed": isFav(b.n) ? "true" : "false", onclick: function () { toggleFav(b.n); render(true); } }, ic(isFav(b.n) ? "starf" : "star"))); })) : h("div", { class: "empty" }, ic("filter"), "No bids match these rules."),
        cmp.length > 8 ? h("button", { class: "btn ghost", style: "padding-left:0", onclick: function () { state.pkAll = !state.pkAll; render(); } }, state.pkAll ? "Show the lightest 8" : "Show all " + cmp.length + " ranked bids", ic("down", { cls: state.pkAll ? "flip" : "" })) : null,
        rest.length ? h("div", { class: "hint", style: "margin-top:6px" }, "Not ranked (Extra Board or non-route days): " + rest.map(function (r) { return "#" + r.b.n; }).join(", ")) : null));
  }

  // ---------- changes: Bid 195 -> Bid 196 ----------
  var PREV = window.PREV || null, CHG = window.CHG || null, prevBy = {}, prevSched = {}, chgBy = {};
  if (PREV) { PREV.bids.forEach(function (b) { prevBy[b.n] = b; }); PREV.sched.forEach(function (b) { prevSched[b.n] = b; }); }
  if (CHG) CHG.bids.forEach(function (c) { chgBy[c.n] = c; });
  var KIND = { same: ["ok", "Same job"], minor: ["warn", "Small change"], major: ["open", "Big change"], "new": ["info", "New"] };
  function dhSeats(list, sched) { // deckhand seats by kind of work
    var out = { route: 0, extra: 0, seachange: 0, shuttle: 0, dock: 0, total: 0 };
    list.forEach(function (b) { var d = b.crew.slice(1).filter(function (c) { return c !== null; }).length, ty = ((sched[b.n] || {}).lines || []).map(function (L) { return L.type; });
      var k = ty.indexOf("route") >= 0 ? "route" : ty.indexOf("shuttle") >= 0 ? "shuttle" : ty.indexOf("seachange") >= 0 ? "seachange" : ty.indexOf("dock") >= 0 ? "dock" : "extra"; out[k] += d; out.total += d; });
    return out;
  }
  function shape(list, sched) { // counts of bids by shape, same rules for both bids
    var o = { all: list.length, wk: 0, mf8: 0, ten: 0, wkwork: 0, extra: 0 };
    list.forEach(function (b) { var ls = (sched[b.n] || {}).lines || [], off = offDays(b.off);
      if (off[5] && off[6]) o.wk++; else o.wkwork++;
      var core = ls.filter(function (L) { return !/^sports/i.test(L.header); }); if (core.length === 1 && /^MON-FRI \(8/.test(core[0].header) && core[0].type === "route") o.mf8++;
      if (ls.some(function (L) { return /\(10\)/.test(L.header); })) o.ten++;
      if (ls.length && ls.every(function (L) { return L.type === "extra"; })) o.extra++; });
    return o;
  }
  function pairBars(rows, la, lb) { // two bars per row: Bid 195 (grey) over Bid 196 (navy)
    var W = 340, LW = 118, RH = 34, max = Math.max.apply(null, rows.map(function (r) { return Math.max(r.a, r.b); })) || 1, H = rows.length * RH + 4, bw = W - LW - 34;
    var p = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(la) + ' compared with ' + esc(lb) + '">'];
    rows.forEach(function (r, i) { var y = i * RH + 4, wa = Math.max(2, r.a / max * bw), wb = Math.max(2, r.b / max * bw), d = r.b - r.a;
      p.push('<text x="' + (LW - 8) + '" y="' + (y + 16) + '" text-anchor="end" font-size="12.5" font-weight="600" fill="var(--ink-2)">' + esc(r.label) + '</text>');
      p.push('<rect x="' + LW + '" y="' + y + '" width="' + wa.toFixed(1) + '" height="10" rx="2" fill="var(--r-dh)" opacity=".55"><title>' + esc(la + ": " + r.a) + '</title></rect><text x="' + (LW + wa + 5).toFixed(1) + '" y="' + (y + 9) + '" font-size="12.5" fill="var(--muted)">' + r.a + '</text>');
      p.push('<rect x="' + LW + '" y="' + (y + 12) + '" width="' + wb.toFixed(1) + '" height="12" rx="2" fill="var(--navy)"><title>' + esc(lb + ": " + r.b) + '</title></rect><text x="' + (LW + wb + 5).toFixed(1) + '" y="' + (y + 22.5) + '" font-size="13" font-weight="800" fill="var(--ink)">' + r.b + (d ? '<tspan font-weight="600" fill="var(--muted)"> ' + (d > 0 ? "+" : "−") + Math.abs(d) + '</tspan>' : "") + '</text>'); });
    p.push("</svg>"); return p.join("");
  }
  function renumSVG() { // Bid 195 numbers on the left, Bid 196 on the right, one link per job
    var A = PREV.bids, B = bids, RH = 20, W = 330, H = Math.max(A.length, B.length) * RH + 38, xa = 100, xb = W - 130, nw = 30, nh = 16;
    var ya = function (i) { return 34 + i * RH; }, ia = {}, ib = {}; A.forEach(function (b, i) { ia[b.n] = i; }); B.forEach(function (b, i) { ib[b.n] = i; });
    var lab = function (b) { return (b.tt === "Varies" ? "varies" : fmt(b.tt)) + " · " + b.off.toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }).replace("Tues", "Tue").replace("Thurs", "Thu").replace("Thur", "Thu"); };
    var col = { same: "var(--r-dh)", minor: "var(--warn)", major: "var(--open)" }, fed = {}, gone = {};
    CHG.gone.forEach(function (g) { gone[g.n] = 1; });
    var p = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Which Bid 195 number became which Bid 196 number">'];
    p.push('<text x="' + (xa + nw / 2) + '" y="11" text-anchor="middle" font-size="12" font-weight="800" fill="var(--muted)">BID 195</text><text x="' + (xb + nw / 2) + '" y="11" text-anchor="middle" font-size="12" font-weight="800" fill="var(--navy)">BID 196</text><text x="' + (xa - 6) + '" y="24" text-anchor="end" font-size="12" fill="var(--muted)">report · off</text><text x="' + (xb + nw + 6) + '" y="24" font-size="12" fill="var(--muted)">report · off</text>');
    var link = function (na, nb, stroke, dash, w) { var y1 = ya(ia[na]) + nh / 2, y2 = ya(ib[nb]) + nh / 2, x1 = xa + nw, x2 = xb, mx = (x1 + x2) / 2; return '<path d="M' + x1 + ' ' + y1 + 'C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2 + '" fill="none" stroke="' + stroke + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="3 3"' : "") + ' stroke-linecap="round"/>'; };
    CHG.bids.forEach(function (c) { (c.also || []).forEach(function (a) { if (ia[a] != null) { p.push(link(a, c.n, "var(--muted)", true, 1)); fed[a] = 1; } }); });
    CHG.gone.forEach(function (g) { (g.to || []).forEach(function (t) { if (!(chgBy[t].also || []).some(function (a) { return a === g.n; }) && chgBy[t].was !== g.n) p.push(link(g.n, t, "var(--muted)", true, 1)); }); });
    CHG.bids.forEach(function (c) { if (c.was != null && ia[c.was] != null) p.push(link(c.was, c.n, col[c.kind] || "var(--r-dh)", false, c.kind === "same" ? 1.6 : 2.2)); });
    var node = function (b, x, y, side, cls, stroke) { return '<g class="rn-n" data-' + side + '="' + b.n + '" tabindex="0" role="button" aria-label="' + (side === "a" ? "Bid 195" : "Bid 196") + ' number ' + b.n + '"><rect x="' + x + '" y="' + y + '" width="' + nw + '" height="' + nh + '" rx="4" fill="var(--' + (b.s === "AM" ? "am" : b.s === "PM" ? "pm" : "v") + '-bg)" stroke="' + stroke + '" stroke-width="' + (cls ? 1.6 : 1) + '"' + (cls === "gone" ? ' stroke-dasharray="3 2"' : "") + '/><text x="' + (x + nw / 2) + '" y="' + (y + 12) + '" text-anchor="middle" font-size="12" font-weight="800" fill="var(--ink)">' + b.n + '</text></g>'; };
    A.forEach(function (b, i) { var g = gone[b.n]; p.push('<text x="' + (xa - 6) + '" y="' + (ya(i) + 12) + '" text-anchor="end" font-size="12" fill="var(--muted)"' + (g ? ' text-decoration="line-through"' : "") + '>' + esc(lab(b)) + '</text>' + node(b, xa, ya(i), "a", g ? "gone" : "", g ? "var(--bad)" : "var(--line)")); });
    B.forEach(function (b, i) { var c = chgBy[b.n] || {}, nw2 = c.kind === "new"; p.push(node(b, xb, ya(i), "b", nw2 ? "new" : "", nw2 ? "var(--ok)" : "var(--line)") + '<text x="' + (xb + nw + 6) + '" y="' + (ya(i) + 12) + '" font-size="12" fill="var(--ink-2)">' + esc(lab(b)) + '</text>'); });
    p.push("</svg>"); return p.join("");
  }
  function runChips(d) {
    return h("div", { class: "rc" }, d.map(function (x) { var k = x[0], t = x[2] ? fmt(x[2]) : "";
      return h("span", { class: "rc-i " + k }, k === "add" ? h("i", null, "+") : null, h("b", null, x[1] + (t ? " " + t : "")), k === "retime" ? h("small", null, "was " + fmt(x[3])) : k === "swap" ? h("small", null, "was " + x[3].replace(/(\d\d)(\d\d)$/, "$1:$2")) : null); }));
  }
  function lineFacts(L, P) {
    var out = [];
    var f = function (label, now, was) { if (now == null && was == null) return; out.push(h("span", { class: "fct" + (was != null && now !== was ? " ch" : "") }, h("em", null, label), h("b", null, now == null ? "—" : now), was != null && now !== was ? h("small", null, "was " + was) : null)); };
    var hrs = function (x) { var m = x && x.header.match(/\((\d+)\*?\)/); return m ? m[1] + "h" : null; };
    f("Report", L.tt ? fmt(L.tt) : null, P ? (P.tt ? fmt(P.tt) : null) : null);
    f("Ends", L.shiftEnd ? "~" + fmt(L.shiftEnd) : null, P ? (P.shiftEnd ? "~" + fmt(P.shiftEnd) : null) : null);
    f("Shift", hrs(L), P ? hrs(P) : null);
    return h("div", { class: "fcts" }, out);
  }
  function mapPair(c, li) {
    var Lx = (schedMap[c.n] || { lines: [] }).lines[li], e = c.lines[li] || {}, P = e.p ? prevSched[e.p[0]].lines[e.p[1]] : null, box = h("div", { class: "mp" });
    var one = function (title, line, cls) { var el = h("div"), ok = line && line.type === "route"; if (ok) requestAnimationFrame(function () { BM.mount(el, line, { chips: false, panel: false }); });
      return h("div", { class: "mp-c " + cls }, h("div", { class: "mp-h" }, title), ok ? el : h("div", { class: "empty" }, ic(line ? I.forLine(line) : "x"), line ? lineBlurb(line) : "No matching Bid 195 line")); };
    box.appendChild(one(e.p ? "Bid 195 #" + e.p[0] + " · " + e.ph : "Bid 195", P, "a")); box.appendChild(one("Bid 196 #" + c.n + " · " + e.h, Lx, "b"));
    return box;
  }
  function chgCard(c) {
    var b = byN[c.n], k = KIND[c.kind], open = state.chgOpen === c.n, renum = c.was != null && c.was !== c.n, routeIdx = [];
    c.lines.forEach(function (e, i) { var Lx = schedMap[c.n].lines[i]; if (Lx.type === "route" || (e.p && prevSched[e.p[0]].lines[e.p[1]].type === "route")) routeIdx.push(i); });
    if (open && (state.chgLine == null || routeIdx.indexOf(state.chgLine) < 0)) state.chgLine = routeIdx[0];
    var mapHost = h("div"), pb = c.was != null ? prevBy[c.was] : null;
    var showMap = function (li) { state.chgLine = li; mapHost.innerHTML = ""; if (routeIdx.length > 1) mapHost.appendChild(h("div", { class: "linebar" }, h("div", { class: "seg", role: "tablist" }, routeIdx.map(function (i) { return h("button", { class: i === li ? "on" : "", role: "tab", "aria-selected": i === li ? "true" : "false", onclick: function () { showMap(i); } }, c.lines[i].h.replace(/ — TT.*/, "")); })))); mapHost.appendChild(mapPair(c, li)); };
    var body = !open ? null : h("div", { class: "cc-x" },
      c.lines.map(function (e, i) { var Lx = schedMap[c.n].lines[i], P = e.p ? prevSched[e.p[0]].lines[e.p[1]] : null, ch = (e.d || []).some(function (x) { return x[0] !== "same"; });
        return h("div", { class: "cc-l" }, h("div", { class: "cc-lh" }, h("b", null, e.h), e.p ? h("span", null, "from Bid 195 #" + e.p[0] + (e.ph !== e.h ? " · " + e.ph : "")) : h("span", null, "no Bid 195 equivalent")),
          lineFacts(Lx, P), e.d && e.d.length ? runChips(e.d) : null, e.d && e.d.length && !ch ? h("div", { class: "hint", style: "margin-top:4px" }, "Printed runs are identical.") : null); }),
      pb ? h("div", { class: "hint" }, "Bid 195 #" + c.was + " crew: " + pb.crew.map(function (x, i) { return x === null ? null : (i === 0 ? "Capt " : "") + x; }).filter(Boolean).join(" · ")) : null,
      routeIdx.length ? mapHost : null,
      h("div", { class: "cc-a" }, h("button", { class: "btn", onclick: function () { go("bid-" + c.n); } }, "Open Bid 196 #" + c.n, ic("right"))));
    if (open && routeIdx.length) showMap(state.chgLine);
    return h("div", { class: "cc k-" + c.kind + (open ? " open" : ""), id: "chg-" + c.n },
      h("button", { class: "cc-h", "aria-expanded": open ? "true" : "false", onclick: function () { state.chgOpen = open ? null : c.n; state.chgLine = null; render(); if (!open) requestAnimationFrame(function () { var el = document.getElementById("chg-" + c.n); if (el) el.scrollIntoView({ block: "nearest" }); }); } },
        h("span", { class: "bn s-" + b.s }, h("b", null, String(c.n)), h("small", null, renum ? "was " + c.was : c.was == null ? "new" : "same #")),
        h("span", { class: "cc-b" }, h("span", { class: "cc-p" }, pill(k[0], k[1]), renum && c.kind === "same" ? pill("info", "Renumbered") : null, h("span", { class: "muted" }, "Off " + tc(b.off) + " · " + hours(b, schedMap[c.n]))), h("span", { class: "cc-t" }, c.text)),
        ic("down", { cls: "tog" })),
      body);
  }
  function prevLookup(n) { // what happened to Bid 195 #n
    var g = CHG.gone.filter(function (x) { return x.n === n; })[0], heirs = CHG.bids.filter(function (c) { return c.was === n; }), parts = CHG.bids.filter(function (c) { return c.was !== n && (c.also || []).indexOf(n) >= 0; });
    var jump = function (t) { return h("button", { class: "chip", onclick: function () { openChg(t); } }, "Bid 196 #" + t, ic("right")); };
    if (g) return h("div", { class: "jl-v bad" }, h("b", null, "Bid 195 #" + n + " is not on Bid 196"), h("span", null, g.text), g.to.length ? h("div", { class: "chips", style: "margin-top:6px" }, g.to.map(jump)) : null);
    if (!heirs.length) return h("div", { class: "jl-v off" }, h("b", null, "No match for #" + n));
    var c = heirs[0], k = KIND[c.kind];
    return h("div", { class: "jl-v " + (c.kind === "same" ? "ok" : c.kind === "minor" ? "warn" : "bad") }, h("b", null, "Bid 195 #" + n + " → Bid 196 #" + heirs.map(function (x) { return x.n; }).join(", #") + " · " + k[1].toLowerCase()), h("span", null, c.text),
      h("div", { class: "chips", style: "margin-top:6px" }, heirs.map(function (x) { return jump(x.n); }), parts.length ? h("span", { class: "muted", style: "font-size:12px;align-self:center" }, "Some of its runs also moved to") : null, parts.map(function (x) { return jump(x.n); })));
  }
  function openChg(n) { state.chgOpen = n; state.chgF = "all"; state.chgLine = null; if (state.view !== "changes") { go("changes"); } else render(); requestAnimationFrame(function () { requestAnimationFrame(function () { var el = document.getElementById("chg-" + n); if (el) el.scrollIntoView({ block: "start" }); }); }); }
  function myPrevBid() { if (!state.me) return null; var p = DATA.sen.filter(function (x) { return x[0] === state.me; })[0], m = p && (p[3] || "").match(/^Bid #(\d+)/); return m ? +m[1] : null; }
  function viewChanges() {
    if (!PREV || !CHG) return viewNotes();
    var sa = dhSeats(PREV.bids, prevSched), sb = dhSeats(bids, schedMap), ha = shape(PREV.bids, prevSched), hb = shape(bids, schedMap), cnt = { same: 0, minor: 0, major: 0, "new": 0 };
    CHG.bids.forEach(function (c) { cnt[c.kind]++; });
    var renumbered = CHG.bids.filter(function (c) { return c.kind === "same" && c.was !== c.n; }).length, wkA = Math.round(PREV.days / 7), wkB = Math.round((BID_END - BID_START) / 864e5 / 7 + 1 / 7);
    var pick = state.prevPick != null ? state.prevPick : myPrevBid(), res = h("div", { class: "jl-res", style: "margin-top:8px" });
    if (pick != null) res.appendChild(prevLookup(pick));
    var sel = h("select", { class: "sel", id: "prevpick", "aria-label": "Pick a Bid 195 number", onchange: function (e) { state.prevPick = e.target.value === "" ? null : +e.target.value; render(true); } }, h("option", { value: "" }, "Pick a Bid 195 number…"), PREV.bids.map(function (b) { var o = h("option", { value: String(b.n) }, "#" + b.n + " · " + (b.tt === "Varies" ? "varies" : fmt(b.tt)) + " · off " + b.off + (myPrevBid() === b.n ? " · yours" : "")); if (pick === b.n) o.selected = true; return o; }));
    var list = CHG.bids.filter(function (c) { return state.chgF === "all" || (state.chgF === "chg" ? c.kind === "minor" || c.kind === "major" : state.chgF === c.kind); });
    var diagram = h("div", { class: "renum", html: renumSVG() });
    diagram.addEventListener("click", function (e) { var t = e.target.closest(".rn-n"); if (!t) return; if (t.dataset.b) openChg(+t.dataset.b); else { state.prevPick = +t.dataset.a; render(); requestAnimationFrame(function () { var el = document.getElementById("prevpick"); if (el) el.scrollIntoView({ block: "center" }); }); } });
    diagram.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { var t = e.target.closest(".rn-n"); if (t) { e.preventDefault(); t.dispatchEvent(new MouseEvent("click", { bubbles: true })); } } });
    var seatRow = function (label, a, b) { return h("div", { class: "seat" + (a !== b ? " ch" : "") }, h("span", null, label), h("b", null, a + " → " + b), a !== b ? h("em", null, (b > a ? "+" : "−") + Math.abs(b - a)) : h("em", { class: "eq" }, "same")); };
    return h("div", null,
      h("div", { class: "card" },
        h("div", { class: "card-h" }, h("h2", { class: "card-t" }, "What changed from Bid 195"), pill("info", "Final-Final sheets")),
        h("div", { class: "card-s" }, "Bid 195 as worked (Aug 17 – Nov 1) against the IBU and Masters Bid 196 Final-Final sheets (Nov 2 – Feb 28, issued Oct 13). Bid numbers moved, so match by the work, not the number."),
        h("div", { class: "jl-stats c4" },
          h("div", { class: "jl-s" }, h("b", null, String(bids.length)), h("span", null, "bids"), h("small", null, "was " + PREV.bids.length)),
          h("div", { class: "jl-s" }, h("b", null, String(sb.total)), h("span", null, "deckhand seats"), h("small", null, "was " + sa.total + " · " + Math.abs(sb.total - sa.total) + (sb.total < sa.total ? " fewer" : " more"))),
          h("div", { class: "jl-s" }, h("b", null, wkB + " wk"), h("span", null, "bid length"), h("small", null, "was " + wkA + " weeks")),
          h("div", { class: "jl-s" }, h("b", null, String(cnt.same)), h("span", null, "same job"), h("small", null, renumbered + " renumbered · " + (cnt.minor + cnt.major) + " changed · " + cnt["new"] + " new"))),
        h("div", { class: "search-wrap", style: "margin:12px 0 0" }, h("label", { class: "fl", "for": "prevpick", style: "display:block;margin-bottom:4px" }, "What happened to a Bid 195 job?"), sel), res),
      h("div", { class: "two" },
        card("Old number → new number", "Solid line = the same job carried over. Dashed = some of its runs moved there. Tap a number.", h("div", null, diagram,
          h("div", { class: "legend" }, lgSwatch("var(--r-dh)", "Same job"), lgSwatch("var(--warn)", "Small change"), lgSwatch("var(--open)", "Big change"), h("span", { class: "lg" }, h("i", { class: "dash" }), "Runs moved"), h("span", { class: "lg" }, h("i", { class: "box gone" }), "Not on Bid 196"), h("span", { class: "lg" }, h("i", { class: "box new" }), "New")))),
        h("div", null,
          card("The shape of the bid", "Grey = Bid 195, navy = Bid 196. Counted the same way for both.", h("div", null, h("div", { class: "chart", html: pairBars([{ label: "All bids", a: ha.all, b: hb.all }, { label: "Weekends off", a: ha.wk, b: hb.wk }, { label: "Mon–Fri, 8 hours", a: ha.mf8, b: hb.mf8 }, { label: "With 10-hour days", a: ha.ten, b: hb.ten }, { label: "Work a weekend day", a: ha.wkwork, b: hb.wkwork }, { label: "Extra Board only", a: ha.extra, b: hb.extra }], "Bid 195", "Bid 196") }))),
          card("Deckhand seats", "Counted from the crew columns. Crew sizes for Extra Board #36–38 are not printed — one deckhand each, as on Bid 195.", h("div", { class: "seats" }, seatRow("Route crews", sa.route, sb.route), seatRow("Extra Board", sa.extra, sb.extra), seatRow("Sea Change", sa.seachange, sb.seachange), seatRow("Water shuttle", sa.shuttle, sb.shuttle), seatRow("Dock labor", sa.dock, sb.dock), seatRow("Total", sa.total, sb.total),
            h("button", { class: "btn", style: "margin-top:10px;align-self:flex-start", onclick: function () { go("crew"); } }, ic("crew"), "See where the last job lands"))),
          CHG.capt ? card("Captain jobs", "From the Masters and MMP Final sheets.", h("div", null, h("div", { class: "seats" }, seatRow("Masters lines", 36, 36), seatRow("Bay Cruise (Pier 41)", 3, 2), seatRow("Bid off", 1, 1), seatRow("Total", PREV.capt ? PREV.capt.jobs : 40, CHG.capt.jobs)), h("div", { class: "hint", style: "margin-top:8px" }, CHG.capt.text), h("button", { class: "btn", style: "margin-top:10px", onclick: function () { go("captains"); } }, ic("pin"), "Captain picks and seniority"))) : null,
          card("Also different", null, h("ul", { class: "audit" },
            h("li", { html: "<b>Final-Final vs the draft and the Oct 12 book.</b> #19 now prints a fixed 14:00 report; #27 Sat/Sun prints the Nov 2 times 14:50 and 17:05; the Masters sheet agrees with 12:15 on #16 Mon–Wed and #17 Thu/Fri. Nothing else moved." }),
            h("li", { html: "<b>Timetable.</b> Bid 195 ran on the July 2026 timetable; Bid 196 is matched to the Nov 2, 2026 SF Bay Ferry timetable (re-checked Oct 15: 250 of 252 sailings match)." }),
            h("li", { html: "<b>South San Francisco is suspended Nov 1–30</b> for dredging. Bids with South SF runs do maintenance, cleaning, fueling or shift coverage instead that month." }),
            h("li", { html: "<b>Dorado Class qualification</b> is now printed on #8 and #9 (Fri), as well as #15." }))))),
      card("Bid by bid", "Each Bid 196 line against the Bid 195 job it came from. Open a row for report times, runs and both maps.",
        h("div", null, h("div", { class: "seg", role: "tablist", style: "margin-bottom:10px;max-width:100%;overflow-x:auto" }, [["all", "All " + CHG.bids.length], ["chg", "Changed " + (cnt.minor + cnt.major)], ["same", "Same " + cnt.same], ["new", "New " + cnt["new"]]].map(function (o) { return h("button", { class: state.chgF === o[0] ? "on" : "", role: "tab", "aria-selected": state.chgF === o[0] ? "true" : "false", onclick: function () { state.chgF = o[0]; render(); } }, o[1]); })),
          h("div", { class: "ccs" }, list.map(chgCard)),
          h("div", { class: "legend" }, h("span", { class: "lg" }, h("i", { class: "rc-k add" }), "Added run"), h("span", { class: "lg" }, h("i", { class: "rc-k cut" }), "Removed"), h("span", { class: "lg" }, h("i", { class: "rc-k retime" }), "Retimed or relabelled")))),
      card("On Bid 195, not on Bid 196", "The people holding these seats will be bidding somewhere else.", h("div", { class: "ccs" }, CHG.gone.map(function (g) { var pb = prevBy[g.n], sc = prevSched[g.n], L0 = sc && sc.lines[0], mapEl = h("div");
        return h("div", { class: "cc k-gone" }, h("div", { class: "cc-h static" }, h("span", { class: "bn gone" }, h("b", null, String(g.n)), h("small", null, "Bid 195")),
          h("span", { class: "cc-b" }, h("span", { class: "cc-p" }, pill("bad", "Not on Bid 196"), h("span", { class: "muted" }, "Off " + pb.off + " · " + (pb.tt === "Varies" ? "varies" : fmt(pb.tt)))), h("span", { class: "cc-t" }, g.text),
            h("span", { class: "hint", style: "margin:4px 0 0" }, "Held by " + pb.crew.map(function (x, i) { return x === null ? null : (i === 0 ? "Capt " : "") + x; }).filter(Boolean).join(" · ")),
            g.to.length ? h("span", { class: "chips", style: "margin-top:6px" }, g.to.map(function (t) { return h("button", { class: "chip", onclick: function () { openChg(t); } }, "Bid 196 #" + t, ic("right")); })) : null)),
          L0 && L0.type === "route" ? h("details", { class: "fold", ontoggle: function (e) { if (e.target.open && !mapEl.firstChild) BM.mount(mapEl, L0, { chips: false, panel: false }); } }, h("summary", null, ic("map"), "Bid 195 #" + g.n + " map", ic("down", { cls: "tog" })), h("div", { class: "fold-b" }, mapEl)) : null); }))),
      card("Bid 195 lessons to re-check", "Readings the crew or Dispatch confirmed during Bid 195 that the Bid 196 timeline has not been checked against yet.", h("ul", { class: "audit" }, CHG.carry.map(function (x) { return h("li", null, h("span", { html: x.text }), h("span", { class: "chips", style: "margin-top:6px;display:flex" }, x.n.map(function (t) { return h("button", { class: "chip", onclick: function () { go("bid-" + t); } }, "#" + t); }))); }))),
      h("details", { class: "fold", style: "margin-bottom:12px" }, h("summary", null, ic("audit"), "Schedule audit — sources and sheet checks", ic("down", { cls: "tog" })), h("div", { class: "fold-b" }, h("ul", { class: "audit" }, (window.AUDIT_NOTES || []).map(function (t) { return h("li", { html: t }); })), h("div", { class: "hint" }, DATA.meta)))
    );
  }

  // ---------- audit ----------
  function viewNotes() {
    var items = window.AUDIT_NOTES || [];
    return h("div", null, card("Schedule audit — what changed and what to double-check", "Every bid-sheet time was walked through the official SF Bay Ferry timetables as one boat. Findings:", h("ul", { class: "audit" }, items.map(function (t) { return h("li", { html: t }); }))),
      card("About this dashboard", null, h("div", { class: "hint", style: "margin:0" }, DATA.meta)));
  }

  // ---------- render ----------
  function render(keepFocus) {
    var v;
    if (state.view === "bid") v = viewBid(state.bid); else if (state.view === "day") v = viewDay(); else if (state.view === "bids") v = viewBids(); else if (state.view === "compare") v = viewCompare(); else if (state.view === "shuttle") v = viewShuttle(); else if (state.view === "crew") v = viewCrew(); else if (state.view === "changes") v = viewChanges(); else v = viewOverview();
    var active = document.activeElement, sel = active && active.selectionStart, aid = active && active.id;
    main.textContent = ""; main.appendChild(v);
    renderNav(); renderRail(); renderCmpBar();
    if (keepFocus && aid) { var inp = document.getElementById(aid); if (inp) { inp.focus(); try { inp.setSelectionRange(sel, sel); } catch (e) { } } }
  }
  window.addEventListener("hashchange", function () { parseHash(); state.open = {}; state.rowMenu = null; state.capMenu = null; state.bidTab = "list"; state.fOpen = false; var keep = state.view === "changes" && state.chgOpen != null; render(); if (!keep) window.scrollTo(0, 0); });
  var wasPhone = isPhone(); window.addEventListener("resize", function () { if (isPhone() !== wasPhone) { wasPhone = isPhone(); render(true); } });
  parseHash(); render();
})();
