
/* Shared renderers for the Bid 196 dashboard (browser) and the PDF (node). Pure string output. */
(function (root) {
  var LOC = {
    FB: { name: "Ferry Building", short: "Ferry Bldg", city: "San Francisco", lat: 37.7955, lon: -122.3937 },
    P41: { name: "Pier 41", short: "Pier 41", city: "San Francisco", lat: 37.8087, lon: -122.4098 },
    P485: { name: "Pier 48.5", short: "Pier 48.5", city: "SF · China Basin bunkering dock", lat: 37.7788, lon: -122.3878 },
    JLS: { name: "Jack London Square", short: "Jack London", city: "Oakland", lat: 37.7946, lon: -122.2778 },
    AO: { name: "Alameda Main St", short: "Alameda Main", city: "Alameda", lat: 37.7909, lon: -122.2997 },
    AL: { name: "Alameda Landing", short: "Ala Landing", city: "Alameda · Bohol Circle", lat: 37.7893, lon: -122.2860 },
    HB: { name: "Harbor Bay", short: "Harbor Bay", city: "Alameda", lat: 37.7256, lon: -122.2419 },
    RICH: { name: "Richmond", short: "Richmond", city: "Richmond", lat: 37.9161, lon: -122.3567 },
    SSF: { name: "South San Francisco", short: "South SF", city: "Oyster Point", lat: 37.6624, lon: -122.3789 },
    VJO: { name: "Vallejo", short: "Vallejo", city: "Vallejo", lat: 38.1052, lon: -122.2586 },
    MI: { name: "Mare Island", short: "Mare Island", city: "Vallejo", lat: 38.0894, lon: -122.2649 },
    SP: { name: "Seaplane Lagoon", short: "Seaplane", city: "Alameda Point", lat: 37.7752, lon: -122.3080 },
    CB: { name: "WETA Central Bay O&M Facility", short: "Central Bay base", city: "Alameda Point · 670 W Hornet St", lat: 37.7625, lon: -122.2990, base: true },
    NB: { name: "WETA North Bay O&M Facility", short: "North Bay base", city: "Vallejo · Mare Island Strait", lat: 38.1000, lon: -122.2620, base: true }
  };
  var ROUTE_LABEL = { OAKALA: "Oakland/Alameda", HB: "Harbor Bay", RCH: "Richmond", VJO: "Vallejo", SEA: "Alameda Seaplane", SSF: "South SF", SHORTHOP: "Alameda Short Hop", WS: "Oakland Alameda Water Shuttle" };
  var ROUTE_COLOR = { OAKALA: "var(--r-oa, #4FAB47)", HB: "var(--r-hb, #C7485D)", RCH: "var(--r-rch, #104676)", VJO: "var(--r-vjo, #118B98)", SEA: "var(--r-sea, #E07B27)", SSF: "var(--r-ssf, #862985)", SHORTHOP: "var(--r-oa, #4FAB47)", WS: "var(--r-ws, #3E9B5A)" };
  var C = { navy: "var(--navy)", sky: "var(--sky)", green: "var(--am)", mint: "var(--am-bg)", pink: "var(--open-bg)", grey: "var(--v-bg)", bg: "var(--bg)", ink: "var(--ink)", muted: "var(--muted)", line: "var(--line)", amber: "var(--warn)", amberInk: "var(--warn)", surface: "var(--surface)", surface2: "var(--surface-2)", line2: "var(--line-2)" };
  var DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  var DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var LABEL_OFFSET = { FB: { dx: -26, dy: 4 }, P41: { dx: 0, dy: -14 }, P485: { dx: 26, dy: 4 }, JLS: { dx: 4, dy: 20 }, AO: { dx: -10, dy: -14 }, AL: { dx: -8, dy: 20 }, HB: { dx: -6, dy: 20 }, RICH: { dx: 0, dy: -14 }, SSF: { dx: 0, dy: 20 }, VJO: { dx: 24, dy: 4 }, MI: { dx: -28, dy: 4 }, SP: { dx: -24, dy: -10 }, CB: { dx: 0, dy: 22 }, NB: { dx: 26, dy: 12 } };

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function DC(c) { return c === "AO" || c === "OA" ? "AMS" : c; }
  function fmt(t) { t = String(t || ""); if (t.length === 3) t = "0" + t; return t.length === 4 ? t.slice(0, 2) + ":" + t.slice(2) : t; }
  function mins(t) { t = String(t); if (t.length === 3) t = "0" + t; return parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(2), 10); }
  function pad(m) { var h = Math.floor(m / 60), mm = m % 60; return (h < 10 ? "0" : "") + h + (mm < 10 ? "0" : "") + mm; }

  function dayIdx(tok) {
    tok = tok.toUpperCase().replace(/[^A-Z]/g, "");
    if (/^MON/.test(tok)) return 0; if (/^TU/.test(tok)) return 1; if (/^WED/.test(tok)) return 2; if (/^TH/.test(tok)) return 3;
    if (/^FRI/.test(tok)) return 4; if (/^SAT/.test(tok)) return 5; if (/^SUN/.test(tok)) return 6; return -1;
  }
  // "MON-FRI (8) — TT 1200" -> [0,1,2,3,4]
  function daysOf(header) {
    var h = header.split("(")[0].split("—")[0].trim();
    var out = [];
    h.split(/[\/,]/).forEach(function (part) {
      part = part.trim(); if (!part) return;
      var m = part.match(/^([A-Za-z]+)\s*-\s*([A-Za-z]+)$/);
      if (m) { var a = dayIdx(m[1]), b = dayIdx(m[2]); if (a < 0 || b < 0) return; var i = a; for (var k = 0; k < 7; k++) { out.push(i); if (i === b) break; i = (i + 1) % 7; } }
      else { var d = dayIdx(part); if (d >= 0) out.push(d); }
    });
    return out;
  }
  function shiftWindow(bid, line) {
    var tt = line.tt && /^\d{4}$/.test(line.tt) ? line.tt : (/^\d{4}$/.test(bid.tt) ? bid.tt : null);
    var hrs = line.hours || (line.type === "seachange" || line.type === "dock" ? 10 : line.type === "shuttle" ? 8 : null);
    if (!tt) return null;
    return { start: mins(tt), end: hrs ? mins(tt) + hrs * 60 : mins(tt) + 8 * 60, tt: tt, hrs: hrs };
  }

  // ---------- schematic map ----------
  var MAP_W = 340, MAP_H = 380, MAP_PAD = 42;
  var LAT_MIN = 37.6624, LAT_MAX = 38.1052, LON_MIN = -122.4098, LON_MAX = -122.2419;
  function projectBay(lat, lon) {
    return { x: MAP_PAD + (lon - LON_MIN) / (LON_MAX - LON_MIN) * (MAP_W - 2 * MAP_PAD), y: MAP_PAD + (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * (MAP_H - 2 * MAP_PAD) };
  }
  function orderAndEdges(legs) {
    var order = [], edges = {}, prev = null;
    function touch(code, dashed) {
      if (order.indexOf(code) === -1) order.push(code);
      if (prev && prev !== code) {
        var a = prev < code ? prev : code, b = prev < code ? code : prev, key = a + "|" + b;
        if (!edges[key]) edges[key] = { a: a, b: b, count: 0, a2b: 0, b2a: 0, dashed: 0 };
        edges[key].count++; if (prev === a) edges[key].a2b++; else edges[key].b2a++; if (dashed) edges[key].dashed++;
      }
      prev = code;
    }
    legs.forEach(function (g) {
      if (g.type === "sailing") g.stops.forEach(function (s) { touch(s.c, false); });
      else if (g.type === "deadhead" && g.from && g.to) { touch(g.from, false); touch(g.to, true); }
      else if (g.type === "base") { if (g.phase === "start") { touch(g.code, false); touch(g.to, true); } else { touch(g.from, false); touch(g.code, true); } }
    });
    return { order: order, edges: edges };
  }
  function mapSVG(order, edgesObj, accent, uid, fit) {
    var proj = projectBay;
    if (fit) {
      var la = [], lo = [];
      order.forEach(function (c) { if (LOC[c]) { la.push(LOC[c].lat); lo.push(LOC[c].lon); } });
      var laMin = Math.min.apply(null, la), laMax = Math.max.apply(null, la), loMin = Math.min.apply(null, lo), loMax = Math.max.apply(null, lo);
      var span = Math.max(laMax - laMin, (loMax - loMin) * 0.8, 0.012) * 1.8, laC = (laMin + laMax) / 2, loC = (loMin + loMax) / 2;
      proj = function (lat, lon) { return { x: MAP_W / 2 + (lon - loC) / (span / 0.8) * (MAP_W - 2 * MAP_PAD), y: MAP_H / 2 + (laC - lat) / span * (MAP_H - 2 * MAP_PAD) }; };
    }
    var pins = order.map(function (code, i) { var l = LOC[code]; if (!l) return null; var p = proj(l.lat, l.lon); return { code: code, x: p.x, y: p.y, seq: i + 1 }; }).filter(Boolean);
    if (!pins.length) return "";
    var by = {}; pins.forEach(function (p) { by[p.code] = p; });
    var aId = "ar" + uid, sId = "as" + uid, parts = [];
    parts.push('<svg viewBox="0 0 ' + MAP_W + ' ' + MAP_H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schematic route map">');
    parts.push('<defs><marker id="' + aId + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + accent + '"/></marker><marker id="' + sId + '" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="' + accent + '"/></marker></defs>');
    parts.push('<rect x="0" y="0" width="' + MAP_W + '" height="' + MAP_H + '" rx="10" fill="var(--water)"/>');
    if (!fit) {
      // faint context pins for every terminal so the map reads as the Bay even when a bid touches only two of them
      Object.keys(LOC).forEach(function (c) { if (by[c] || c === "P41" || c === "P485" || c === "AL" || LOC[c].base) return; var p = proj(LOC[c].lat, LOC[c].lon); var clash = pins.some(function (q) { return Math.abs(q.x - p.x) < 22 && Math.abs(q.y - p.y) < 16; }); if (clash) return; parts.push('<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3" fill="var(--line)"/><text x="' + (p.x + 6).toFixed(1) + '" y="' + (p.y + 3).toFixed(1) + '" font-size="7.5" fill="var(--muted)" font-family="var(--font-display)">' + c + '</text>'); });
    }
    parts.push('<text x="12" y="19" font-size="9" font-weight="700" fill="var(--muted)" font-family="var(--font-display)">N ↑  ' + (fit ? 'OAKLAND ESTUARY' : 'SF BAY') + ' — SCHEMATIC, NOT TO SCALE</text>');
    Object.keys(edgesObj).forEach(function (key) {
      var e = edgesObj[key], pa = by[e.a], pb = by[e.b]; if (!pa || !pb) return;
      var mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2, dx = pb.x - pa.x, dy = pb.y - pa.y, len = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / len, ny = dx / len, bow = 15, cx = mx + nx * bow, cy = my + ny * bow;
      parts.push('<path d="M' + pa.x.toFixed(1) + ' ' + pa.y.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + pb.x.toFixed(1) + ' ' + pb.y.toFixed(1) + '" fill="none" stroke="' + accent + '" stroke-width="2.25"' + (e.dashed ? ' stroke-dasharray="5 4"' : '') + (e.a2b > 0 ? ' marker-end="url(#' + aId + ')"' : '') + (e.b2a > 0 ? ' marker-start="url(#' + sId + ')"' : '') + ' opacity="0.85"/>');
      if (e.count > 1) parts.push('<rect x="' + (cx - 12).toFixed(1) + '" y="' + (cy - 8).toFixed(1) + '" width="24" height="14" rx="7" fill="#fff" stroke="' + accent + '" stroke-width="1"/><text x="' + cx.toFixed(1) + '" y="' + (cy + 2.5).toFixed(1) + '" font-size="8.5" font-weight="700" fill="' + accent + '" text-anchor="middle" font-family="var(--font-display)">×' + e.count + '</text>');
    });
    pins.forEach(function (p) {
      if (LOC[p.code] && LOC[p.code].base) parts.push('<rect x="' + (p.x - 9).toFixed(1) + '" y="' + (p.y - 9).toFixed(1) + '" width="18" height="18" rx="3" fill="var(--ink)" stroke="#fff" stroke-width="2"/><text x="' + p.x.toFixed(1) + '" y="' + (p.y + 3.5).toFixed(1) + '" font-size="9" font-weight="800" fill="#fff" text-anchor="middle">⌂</text>');
      else parts.push('<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="8.5" fill="var(--navy)" stroke="#fff" stroke-width="2"/><text x="' + p.x.toFixed(1) + '" y="' + (p.y + 3).toFixed(1) + '" font-size="8" font-weight="800" fill="#fff" text-anchor="middle" font-family="var(--font-display)">' + p.seq + '</text>');
      var off = LABEL_OFFSET[p.code] || { dx: 0, dy: 20 };
      parts.push('<text x="' + (p.x + off.dx).toFixed(1) + '" y="' + (p.y + off.dy).toFixed(1) + '" font-size="9.5" font-weight="700" fill="var(--ink)" text-anchor="middle">' + esc(DC(p.code)) + '</text>');
    });
    parts.push('</svg>');
    return parts.join("");
  }

  // ---------- per-line itinerary ----------
  function itineraryHTML(line, opts) {
    opts = opts || {};
    var rows = [];
    if (line.tt && !line.legs.some(function (g) { return g.type === "base"; })) rows.push('<div class="it-row it-tt"><div class="it-time">' + fmt(line.tt) + '</div><div class="it-body"><div class="it-loc">Report (TT)</div><div class="it-sub">' + (line.hours ? line.hours + "-hour shift" + (line.shiftEnd ? " · ends ~" + fmt(line.shiftEnd) : "") : "") + '</div></div></div>');
    line.legs.forEach(function (g) {
      if (g.type === "special") { rows.push('<div class="it-row it-special"><div class="it-time">·</div><div class="it-body"><div class="it-loc">' + esc(g.text) + '</div><div class="it-sub">as directed by Operations — time varies with the event</div></div></div>'); return; }
      if (g.type === "note") { rows.push('<div class="it-row it-unv"><div class="it-time">' + esc((g.printed || "").replace(/(\d{2})(\d{2})$/, "$1:$2")) + '</div><div class="it-body"><div class="it-loc">' + esc(g.printed) + ' (as printed)</div><div class="it-sub">' + esc(g.text) + '</div></div></div>'); return; }
      if (g.type === "base") { rows.push('<div class="it-row it-base"><div class="it-time">' + (g.time ? fmt(g.time) : "—") + '</div><div class="it-body"><div class="it-loc">⌂ ' + (g.phase === "start" ? "Report · " : "End of shift · ") + esc((LOC[g.code] || {}).short || g.code) + '</div><div class="it-sub">' + esc(g.text) + '</div></div></div>'); return; }
      if (g.type === "deadhead") { rows.push('<div class="it-row it-dh"><div class="it-time">⇢</div><div class="it-body"><div class="it-loc">' + esc((LOC[g.from] || {}).name || g.from) + ' → ' + esc((LOC[g.to] || {}).name || g.to) + '</div><div class="it-sub">' + esc(g.text) + '</div></div></div>'); return; }
      var s = g.stops, tag = g.implied ? (g.impliedReturn ? "implied return" : "implied") : (s[0].printed ? "on bid sheet" : "from the timetable"), rl = ROUTE_LABEL[g.route] || g.route;
      s.forEach(function (x, i) {
        var loc = LOC[x.c] || { name: x.c }, first = i === 0, last = i === s.length - 1, t = first ? (x.dep || x.printedTime) : (x.arr || x.dep || '—'), bits = [];
        var turn = g.loopFrom != null && i === g.loopFrom, retPart = g.loopFrom != null && i >= g.loopFrom && !g.loopPrinted;
        if (first) { bits.push(g.arrivalNote && x.arr ? "arrive " + fmt(x.arr) + " \u00b7 depart " + fmt(x.dep) : "depart " + fmt(x.dep) + (x.printedTime && x.printedTime !== x.dep ? " (sheet " + fmt(x.printedTime) + ")" : "")); if (x.wait > 0) bits.push(x.wait + " min turn"); }
        else if (last) bits.push(x.arr ? "arrive " + fmt(x.arr) : "arrival time not on the public timetable");
        else if (turn) bits.push("arrive " + fmt(x.arr) + " · depart " + fmt(x.dep) + " back toward " + (LOC[s[s.length - 1].c] || {}).short + (x.wait > 0 ? " (" + x.wait + " min turn)" : "") + (g.loopPrinted ? " · on bid sheet (" + fmt(x.printedTime) + ")" : " · implied return"));
        else bits.push(x.arr ? (x.dep && x.dep !== x.arr ? "arrive " + fmt(x.arr) + " \u00b7 depart " + fmt(x.dep) : "arrive / depart " + fmt(x.arr) + " (timetable lists one time at this stop)") : "time not on the public timetable");
        if (first) bits.push(rl + " · " + tag);
        if (last && g.endsShift) bits.push(g.endsShift);
        if (last && g.paren) bits.push(g.paren);
        rows.push('<div class="it-row' + (g.implied || retPart ? " it-implied" : "") + (first || turn ? " it-dep" : "") + (last ? " it-arr" : "") + '"><div class="it-time">' + fmt(t) + '</div><div class="it-body"><div class="it-loc">' + (first ? "▲ " : last ? "▼ " : turn ? "↩ " : "◦ ") + esc(loc.name) + ' <span class="code">' + esc(DC(x.c)) + '</span></div><div class="it-sub">' + esc(bits.join(" · ")) + '</div></div></div>');
      });
      if (g.suspended) rows.push('<div class="it-row it-unv"><div class="it-time">⏸</div><div class="it-body"><div class="it-sub">' + esc(g.suspended) + '</div></div></div>');
      if (g.was) rows.push('<div class="it-row it-info"><div class="it-time">Nov 2</div><div class="it-body"><div class="it-sub">Changed with the Nov 2 schedule · was <s>' + esc(g.was) + '</s>' + (s.some(function (x) { return x.cut; }) ? ' · <b>eliminated — rebuild on Bid 196 sheet</b>' : s.some(function (x) { return x.replaced; }) ? ' · moved to the nearest new trip' : '') + '</div></div></div>');
      if (g.approx) rows.push('<div class="it-row it-unv"><div class="it-time">!</div><div class="it-body"><div class="it-sub">' + esc(g.approx) + '</div></div></div>');
      if (g.arrivalNote) rows.push('<div class="it-row it-info"><div class="it-time">i</div><div class="it-body"><div class="it-sub">' + esc(g.arrivalNote) + '</div></div></div>');
      if (g.aliasNote) rows.push('<div class="it-row it-info"><div class="it-time">i</div><div class="it-body"><div class="it-sub">' + esc(g.aliasNote) + '</div></div></div>');
    });
    return '<div class="itin">' + rows.join("") + '</div>';
  }
  function locTableHTML(order, legs) {
    var by = {}; order.forEach(function (c) { by[c] = { deps: [], arrs: [] }; });
    legs.forEach(function (g) {
      if (g.type !== "sailing") return;
      g.stops.forEach(function (x, i) { if (!by[x.c]) return; if (x.dep && i < g.stops.length - 1) by[x.c].deps.push(fmt(i === 0 && x.printedTime ? x.printedTime : x.dep)); if (x.arr && i > 0) by[x.c].arrs.push(fmt(x.arr)); });
    });
    return '<div class="loc-table">' + order.map(function (c) {
      var l = LOC[c] || { name: c }, d = by[c].deps, a = by[c].arrs;
      return '<div class="loc-row"><div class="loc-row-name">' + esc(l.name) + ' <span class="code">' + esc(DC(c)) + '</span></div><div class="loc-row-times"><span class="loc-row-dep">↳ Dep ' + (d.length ? d.join(", ") : "—") + '</span><span class="loc-row-arr">↴ Arr ' + (a.length ? a.join(", ") : "—") + '</span></div></div>';
    }).join("") + '</div>';
  }
  // compact horizontal strip of the day's legs
  function stripHTML(line) {
    var chips = [];
    line.legs.forEach(function (g) {
      if (g.type === "sailing") { var s = g.stops; chips.push('<span class="lg' + (g.implied ? " lg-imp" : "") + (g.approx ? " lg-unv" : "") + '"><b>' + fmt(s[0].dep || s[0].printedTime) + '</b> ' + s.map(function (x, i) { return (g.loopFrom != null && i === g.loopFrom ? "↩" : "") + DC(x.c); }).join("→") + ' <i>' + (s[s.length - 1].arr ? fmt(s[s.length - 1].arr) : '?') + '</i></span>'); }
      else if (g.type === "deadhead") chips.push('<span class="lg lg-dh">⇢ ' + esc(DC(g.from)) + '→' + esc(DC(g.to)) + '</span>');
      else if (g.type === "base") chips.push('<span class="lg lg-base">⌂ ' + (g.phase === "start" ? "TT " + fmt(g.time) + " " + esc(DC(g.code)) : esc(DC(g.code)) + " " + (g.time ? fmt(g.time) : "")) + '</span>');
      else if (g.type === "special") chips.push('<span class="lg lg-sp">' + esc(g.text) + '</span>');
      else if (g.type === "note") chips.push('<span class="lg lg-unv"><b>' + esc(g.printed) + '</b> ?</span>');
    });
    return '<div class="strip">' + chips.join("") + '</div>';
  }

  // ---------- day Gantt ----------
  var G_START = 4 * 60, G_END = 24 * 60 + 30;
  function sessInfo(s) { return s === "AM" ? { bg: "var(--am-bg)", fg: "var(--am)", label: "AM" } : s === "PM" ? { bg: "var(--pm-bg)", fg: "var(--pm)", label: "PM" } : { bg: "var(--v-bg)", fg: "var(--v)", label: "VARIES" }; }
  function linesForDay(bid, sched, d) {
    return sched.lines.filter(function (L) { return daysOf(L.header).indexOf(d) >= 0; });
  }
  function ganttSVG(bids, schedMap, d, opts) {
    opts = opts || {};
    var W = opts.width || 720, LBL = opts.labelW || 118, RH = opts.rowH || 15, TOP = 22;
    var rows = [];
    bids.forEach(function (b) {
      var sc = schedMap[b.n]; if (!sc) return;
      var Ls = linesForDay(b, sc, d);
      Ls.forEach(function (L) {
        if (/sports\/event nights/i.test(L.header)) return;
        var w = shiftWindow(b, L);
        rows.push({ bid: b, line: L, win: w });
      });
    });
    rows.sort(function (a, b) { var sa = a.win ? a.win.start : 9e9, sb = b.win ? b.win.start : 9e9; return sa - sb || a.bid.n - b.bid.n; });
    var H = TOP + rows.length * RH + 8;
    var x = function (m) { return LBL + (m - G_START) / (G_END - G_START) * (W - LBL - 8); };
    var p = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="gantt" role="img" aria-label="Shift timeline">'];
    p.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="var(--surface)" rx="8"/>');
    for (var hh = 4; hh <= 24; hh++) { var xx = x(hh * 60); p.push('<line x1="' + xx.toFixed(1) + '" y1="' + TOP + '" x2="' + xx.toFixed(1) + '" y2="' + (H - 6) + '" stroke="' + (hh % 6 === 0 ? "var(--line)" : "var(--line-2)") + '" stroke-width="1"/>'); if (hh % 2 === 0) p.push('<text x="' + xx.toFixed(1) + '" y="14" font-size="8.5" fill="' + C.muted + '" text-anchor="middle" font-family="var(--font-display)">' + (hh < 10 ? "0" : "") + hh + '</text>'); }
    rows.forEach(function (r, i) {
      var y = TOP + i * RH, b = r.bid, L = r.line, si = sessInfo(b.s);
      if (i % 2 === 0) p.push('<rect x="0" y="' + y + '" width="' + W + '" height="' + RH + '" fill="var(--surface-2)"/>');
      var lead = (b.crew[1] || b.crew[0] || "").replace(/\(.*?\)/g, "").trim();
      p.push('<text x="4" y="' + (y + RH - 4) + '" font-size="8.5" font-weight="800" fill="' + C.navy + '" font-family="var(--font-display)">#' + b.n + '</text>');
      p.push('<text x="24" y="' + (y + RH - 4) + '" font-size="8" fill="' + C.ink + '">' + esc(lead.slice(0, 16)) + '</text>');
      var typeLbl = L.type === "route" ? "" : L.type === "shuttle" ? "WS " + (L.variant || "") : L.type === "seachange" ? "SEA CHANGE" : L.type === "dock" ? "DOCK" : "EXTRA";
      if (r.win) {
        var x0 = x(r.win.start), x1 = x(Math.min(r.win.end, G_END));
        p.push('<rect x="' + x0.toFixed(1) + '" y="' + (y + 2) + '" width="' + (x1 - x0).toFixed(1) + '" height="' + (RH - 4) + '" rx="3" fill="' + si.bg + '" stroke="' + si.fg + '" stroke-opacity=".35"/>');
        if (L.type === "route") {
          L.legs.forEach(function (g) {
            if (g.type !== "sailing") return;
            var s = g.stops; if (!s[0].dep || !s[s.length - 1].arr) return; var a = mins(s[0].dep), z = mins(s[s.length - 1].arr);
            p.push('<rect x="' + x(a).toFixed(1) + '" y="' + (y + 4) + '" width="' + Math.max(1.5, x(z) - x(a)).toFixed(1) + '" height="' + (RH - 8) + '" rx="1.5" fill="' + (ROUTE_COLOR[g.route] || C.navy) + '" opacity="' + (g.implied ? ".45" : ".9") + '"/>');
          });
        } else if (L.type === "shuttle") {
          p.push('<rect x="' + x0.toFixed(1) + '" y="' + (y + 4) + '" width="' + (x1 - x0).toFixed(1) + '" height="' + (RH - 8) + '" rx="1.5" fill="' + C.green + '" opacity=".55"/>');
        } else if (L.type === "seachange") {
          p.push('<rect x="' + x0.toFixed(1) + '" y="' + (y + 4) + '" width="' + (x1 - x0).toFixed(1) + '" height="' + (RH - 8) + '" rx="1.5" fill="' + C.sky + '" opacity=".55"/>');
        }
        if (typeLbl) p.push('<text x="' + (x0 + 3).toFixed(1) + '" y="' + (y + RH - 4.5) + '" font-size="7" font-weight="700" fill="' + C.ink + '">' + typeLbl + '</text>');
      } else {
        p.push('<text x="' + (LBL + 4) + '" y="' + (y + RH - 4) + '" font-size="7.5" fill="' + C.muted + '" font-style="italic">' + (typeLbl || "varies") + ' — report time varies, any location</text>');
      }
    });
    p.push('</svg>');
    return { svg: p.join(""), rows: rows.length, height: H };
  }

  // ---------- boats sailing per half hour ----------
  function loadCurve(bids, schedMap, d) {
    var bins = []; for (var m = G_START; m < G_END; m += 30) bins.push(0);
    var crews = 0;
    bids.forEach(function (b) {
      var sc = schedMap[b.n]; if (!sc) return;
      linesForDay(b, sc, d).forEach(function (L) {
        if (/sports\/event nights/i.test(L.header)) return;
        crews++;
        if (L.type === "route") L.legs.forEach(function (g) { if (g.type !== "sailing" || !g.stops[0].dep || !g.stops[g.stops.length - 1].arr) return; var a = mins(g.stops[0].dep), z = mins(g.stops[g.stops.length - 1].arr); for (var i = 0; i < bins.length; i++) { var s = G_START + i * 30; if (s < z && s + 30 > a) bins[i]++; } });
        else if (L.type === "shuttle" || L.type === "seachange") { var w = shiftWindow(b, L); if (w) for (var i = 0; i < bins.length; i++) { var s = G_START + i * 30; if (s < w.end && s + 30 > w.start) bins[i]++; } }
      });
    });
    return { bins: bins, crews: crews };
  }
  function loadChartSVG(curves, opts) {
    opts = opts || {};
    var W = opts.width || 400, H = opts.height || 170, L = 26, B = 20, T = 12, R = 6;
    var n = curves[0].bins.length, max = 1; curves.forEach(function (c) { c.bins.forEach(function (v) { if (v > max) max = v; }); });
    var x = function (i) { return L + i / n * (W - L - R); }, y = function (v) { return T + (1 - v / max) * (H - T - B); };
    var p = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="chart" role="img" aria-label="Boats underway by time of day">'];
    for (var g = 0; g <= max; g += (max > 8 ? 4 : 2)) p.push('<line x1="' + L + '" y1="' + y(g).toFixed(1) + '" x2="' + (W - R) + '" y2="' + y(g).toFixed(1) + '" stroke="var(--line-2)"/><text x="' + (L - 4) + '" y="' + (y(g) + 3).toFixed(1) + '" font-size="8.5" fill="' + C.muted + '" text-anchor="end" font-family="var(--font-display)">' + g + '</text>');
    for (var hh = 4; hh <= 24; hh += 2) { var i = (hh * 60 - G_START) / 30; p.push('<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" font-size="8.5" fill="' + C.muted + '" text-anchor="middle" font-family="var(--font-display)">' + (hh < 10 ? "0" : "") + hh + '</text>'); }
    curves.forEach(function (c) {
      var d = c.bins.map(function (v, i) { return (i ? "L" : "M") + x(i + 0.5).toFixed(1) + " " + y(v).toFixed(1); }).join(" ");
      p.push('<path d="' + d + ' L' + x(n).toFixed(1) + ' ' + y(0).toFixed(1) + ' L' + x(0.5).toFixed(1) + ' ' + y(0).toFixed(1) + 'Z" fill="' + c.color + '" opacity=".13"/>');
      p.push('<path d="' + d + '" fill="none" stroke="' + c.color + '" stroke-width="2"/>');
    });
    var lx = W - R - 4;
    curves.slice().reverse().forEach(function (c, k) { p.push('<text x="' + lx + '" y="' + (T + 10 + k * 12) + '" font-size="9" font-weight="700" fill="' + c.color + '" text-anchor="end">' + esc(c.label) + '</text>'); });
    p.push('</svg>');
    return p.join("");
  }
  function barChartSVG(items, opts) {
    opts = opts || {};
    var W = opts.width || 340, RH = 18, L = opts.labelW || 96, H = items.length * RH + 6, max = Math.max.apply(null, items.map(function (i) { return i.v; })) || 1;
    var p = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="chart" role="img">'];
    items.forEach(function (it, i) {
      var y = i * RH + 3, w = (it.v / max) * (W - L - 34);
      p.push('<text x="' + (L - 6) + '" y="' + (y + 12) + '" font-size="10" fill="' + C.ink + '" text-anchor="end" font-weight="600">' + esc(it.label) + '</text>');
      p.push('<rect x="' + L + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + (RH - 6) + '" rx="3" fill="' + (it.color || C.navy) + '"/>');
      p.push('<text x="' + (L + w + 5).toFixed(1) + '" y="' + (y + 12) + '" font-size="10" fill="' + C.muted + '" font-family="var(--font-display)">' + it.v + (it.suffix || "") + '</text>');
    });
    p.push('</svg>');
    return p.join("");
  }

  // ---------- water shuttle ----------
  function wsTableHTML(S, dayKey, variant, tt) {
    var W = S.ws[dayKey], crewMap = S.wsCrew, crew = variant === "AM" ? crewMap.AM : variant === "MID" ? crewMap.MID : dayKey === "frisun" ? crewMap.PM_FS : crewMap.PM_WT;
    tt = tt && /^\d{4}$/.test(tt) ? tt : crew.tt;
    var end = crew.end, on = function (t) { return t >= tt && t <= end; };
    function list(arr) { return arr.map(function (t) { return '<span class="ws-t' + (on(t) ? " on" : "") + '">' + fmt(t) + '<small>→' + fmt(pad(mins(t) + 7)) + '</small></span>'; }).join(""); }
    var nb = W.nb.filter(on).length, sb = W.sb.filter(on).length;
    return '<div class="ws-win">' + esc(crew.label) + '<br>Highlighted = inside this crew\'s window (TT ' + fmt(tt) + ' → ~' + fmt(end) + '): <b>' + nb + ' northbound + ' + sb + ' southbound ≈ ' + (nb + sb) + ' crossings</b></div>' +
      '<div class="ws-grid"><div class="ws-col"><div class="ws-hd">Dep Alameda Landing → arr Jack London Sq</div>' + list(W.nb) + '</div><div class="ws-col"><div class="ws-hd">Dep Jack London Sq → arr Alameda Landing</div>' + list(W.sb) + '</div></div>';
  }
  function wsGanttSVG(S, opts) {
    opts = opts || {};
    var W = opts.width || 720, LBL = 150, RH = 18, TOP = 22, x = function (m) { return LBL + (m - 6 * 60) / (17.5 * 60) * (W - LBL - 8); };
    var rows = [
      { lbl: "Tue–Thu · service", a: mins("0720"), z: mins("1948"), color: "var(--line)", svc: "tuethu" },
      { lbl: "Tue · PM crew (Bid 31)", a: mins("1255"), z: mins("2055"), color: C.navy },
      { lbl: "Wed–Thu · AM crew (Bid 29)", a: mins("0615"), z: mins("1415"), color: C.sky },
      { lbl: "Wed–Thu · PM crew (Bid 30)", a: mins("1255"), z: mins("2055"), color: C.navy },
      { lbl: "Fri–Sun · service", a: mins("0720"), z: mins("2132"), color: "var(--line)", svc: "frisun" },
      { lbl: "Fri–Sun · AM crew (Bid 29)", a: mins("0615"), z: mins("1415"), color: C.sky },
      { lbl: "Fri–Sun · MID crew (Bid 31)", a: mins("1010"), z: mins("1810"), color: C.green },
      { lbl: "Fri–Sun · PM crew (Bid 30)", a: mins("1440"), z: mins("2240"), color: C.navy }
    ];
    var H = TOP + rows.length * RH + 8, p = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="gantt" role="img" aria-label="Water shuttle crew coverage">'];
    p.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="var(--surface)" rx="8"/>');
    for (var hh = 6; hh <= 23; hh++) { var xx = x(hh * 60); p.push('<line x1="' + xx.toFixed(1) + '" y1="' + TOP + '" x2="' + xx.toFixed(1) + '" y2="' + (H - 6) + '" stroke="' + (hh % 6 === 0 ? "var(--line)" : "var(--line-2)") + '"/><text x="' + xx.toFixed(1) + '" y="14" font-size="8.5" fill="' + C.muted + '" text-anchor="middle" font-family="var(--font-display)">' + (hh < 10 ? "0" : "") + hh + '</text>'); }
    rows.forEach(function (r, i) {
      var y = TOP + i * RH;
      if (r.svc) p.push('<rect x="0" y="' + y + '" width="' + W + '" height="' + RH + '" fill="var(--surface-2)"/>');
      p.push('<text x="4" y="' + (y + RH - 5) + '" font-size="8.5" font-weight="' + (r.svc ? 800 : 600) + '" fill="' + C.ink + '">' + esc(r.lbl) + '</text>');
      p.push('<rect x="' + x(r.a).toFixed(1) + '" y="' + (y + 3) + '" width="' + (x(r.z) - x(r.a)).toFixed(1) + '" height="' + (RH - 6) + '" rx="3" fill="' + r.color + '" opacity="' + (r.svc ? 1 : .8) + '"/>');
      if (r.svc) S.ws[r.svc].nb.forEach(function (t) { p.push('<rect x="' + x(mins(t)).toFixed(1) + '" y="' + (y + 5) + '" width="1.2" height="' + (RH - 10) + '" fill="' + C.navy + '" opacity=".7"/>'); });
      p.push('<text x="' + (x(r.a) + 3).toFixed(1) + '" y="' + (y + RH - 5) + '" font-size="7.5" font-weight="700" fill="' + (r.svc ? C.navy : "#fff") + '">' + fmt(pad(r.a)) + '–' + fmt(pad(r.z)) + '</text>');
    });
    p.push('</svg>');
    return p.join("");
  }

  root.DashLib = { LOC: LOC, ROUTE_LABEL: ROUTE_LABEL, ROUTE_COLOR: ROUTE_COLOR, C: C, DAYS: DAYS, DAY_LONG: DAY_LONG, esc: esc, fmt: fmt, mins: mins, pad: pad, daysOf: daysOf, shiftWindow: shiftWindow, orderAndEdges: orderAndEdges, mapSVG: mapSVG, itineraryHTML: itineraryHTML, locTableHTML: locTableHTML, stripHTML: stripHTML, ganttSVG: ganttSVG, loadCurve: loadCurve, loadChartSVG: loadChartSVG, barChartSVG: barChartSVG, wsTableHTML: wsTableHTML, wsGanttSVG: wsGanttSVG, sessInfo: sessInfo, linesForDay: linesForDay };
})(typeof window !== "undefined" ? window : global);

