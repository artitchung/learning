/* BayMap — interactive per-bid map of San Francisco Bay.
   Real GSHHG full-resolution shoreline, vessel paths routed along a water-only lane network,
   SF Bay Ferry official route colours. Pick a run to show only that run; tap a stop to see every
   arrival/departure there; scrub a time to see where the boat is. Pure DOM + inline SVG, no external tiles.
   mount() returns a small API so the page around it (shift strip, timeline, scrubber) can stay in sync. */
(function (root) {
  "use strict";
  var G = root.BAY_GEO;
  var RC = { OAKALA: "var(--r-oa, #4FAB47)", SEA: "var(--r-sea, #E07B27)", HB: "var(--r-hb, #C7485D)", RCH: "var(--r-rch, #104676)", SSF: "var(--r-ssf, #862985)", VJO: "var(--r-vjo, #118B98)", SHORTHOP: "var(--r-oa, #4FAB47)", WS: "var(--r-ws, #3E9B5A)", SEACHANGE: "var(--r-h2, #015088)", DH: "var(--r-dh, #7a8794)" };
  var RL = { OAKALA: "Oakland & Alameda", SEA: "Alameda Seaplane", HB: "Harbor Bay", RCH: "Richmond", SSF: "South San Francisco", VJO: "Vallejo", SHORTHOP: "Alameda Short Hop", WS: "Oakland Alameda Water Shuttle", SEACHANGE: "Sea Change", DH: "Light run (no passengers)" };
  var NAME = { FB: "Ferry Building", P41: "Pier 41", P485: "Pier 48½", JLS: "Oakland · Jack London Sq", AO: "Alameda Main St", AL: "Alameda Landing", SP: "Seaplane Lagoon", CB: "Central Bay base", HB: "Harbor Bay", RICH: "Richmond", SSF: "South SF · Oyster Pt", VJO: "Vallejo", MI: "Mare Island", NB: "North Bay base" };
  var SHORT = { FB: "Ferry Bldg", P41: "Pier 41", P485: "Pier 48½", JLS: "Oakland", AO: "Main St", AL: "Ala Landing", SP: "Seaplane", CB: "CB base", HB: "Harbor Bay", RICH: "Richmond", SSF: "South SF", VJO: "Vallejo", MI: "Mare Island", NB: "NB base" };
  var SIDE = { FB: [-1, 0], P41: [-1, -0.6], P485: [-1, 0.2], JLS: [1, -0.6], AO: [-0.3, 1], AL: [0.7, 1], SP: [-1, 0.5], CB: [1, -0.2], HB: [1, 0.3], RICH: [1, 0], SSF: [-1, 0], VJO: [0.4, -1], MI: [-1, 0.2], NB: [0.6, 1] };
  var BASES = { CB: 1, NB: 1 };
  var ICO = root.Icons;

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fmt(t) { t = String(t || ""); if (t.length === 3) t = "0" + t; return t.length === 4 ? t.slice(0, 2) + ":" + t.slice(2) : t; }
  function mins(t) { t = String(t); if (t.length === 3) t = "0" + t; return +t.slice(0, 2) * 60 + +t.slice(2); }
  function ico(name, color) { return ICO ? ICO.svg(name, { color: color }) : ""; }

  // ---------- shortest water path on the lane network ----------
  var ADJ = null, PATHC = {};
  function adj() {
    if (ADJ) return ADJ; ADJ = {};
    G.edges.forEach(function (e) {
      var a = G.nodes[e[0]], b = G.nodes[e[1]]; if (!a || !b) return;
      var w = Math.hypot(a[0] - b[0], a[1] - b[1]);
      (ADJ[e[0]] = ADJ[e[0]] || []).push([e[1], w]); (ADJ[e[1]] = ADJ[e[1]] || []).push([e[0], w]);
    });
    return ADJ;
  }
  function path(a, b) {
    var k = a + ">" + b; if (PATHC[k]) return PATHC[k];
    if (a === b || !G.nodes[a] || !G.nodes[b]) return (PATHC[k] = [G.nodes[a] || G.nodes[b]].filter(Boolean));
    var A = adj(), dist = {}, prev = {}, Q = Object.keys(G.nodes);
    Q.forEach(function (n) { dist[n] = Infinity; }); dist[a] = 0;
    while (Q.length) {
      var bi = 0; for (var i = 1; i < Q.length; i++) if (dist[Q[i]] < dist[Q[bi]]) bi = i;
      var u = Q.splice(bi, 1)[0]; if (u === b || dist[u] === Infinity) break;
      if (u !== a && G.term.indexOf(u) >= 0) continue;
      (A[u] || []).forEach(function (vw) { var nd = dist[u] + vw[1]; if (nd < dist[vw[0]]) { dist[vw[0]] = nd; prev[vw[0]] = u; } });
    }
    if (dist[b] === Infinity) return (PATHC[k] = [G.nodes[a], G.nodes[b]]);
    var out = [], c = b; while (c) { out.unshift(G.nodes[c]); c = prev[c]; }
    return (PATHC[k] = out);
  }
  function legPts(codes) {
    var pts = [];
    for (var i = 0; i < codes.length - 1; i++) { var p = path(codes[i], codes[i + 1]); pts = pts.concat(i ? p.slice(1) : p); }
    return pts.length ? pts : (G.nodes[codes[0]] ? [G.nodes[codes[0]]] : []);
  }
  function far(r) { var c = r.codes; return c.length > 2 && c[0] === c[c.length - 1] ? c[Math.floor((c.length - 1) / 2)] : c[c.length - 1]; }
  function isLoop(r) { var c = r.codes; return c.length > 2 && c[0] === c[c.length - 1]; }
  function runName(r, short) { var N = short ? SHORT : NAME; return N[r.codes[0]] + (isLoop(r) ? " ⇄ " : " → ") + N[far(r)]; }
  function d(pts) { return pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(""); }
  function along(pts, f) { // point + heading at fraction f of a polyline
    if (!pts.length) return null; if (pts.length === 1) return { x: pts[0][0], y: pts[0][1], a: 0 };
    var L = 0, seg = []; for (var i = 0; i < pts.length - 1; i++) { var l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); L += l; }
    var t = Math.max(0, Math.min(1, f)) * L;
    for (var j = 0; j < seg.length; j++) { if (t <= seg[j] || j === seg.length - 1) { var k = seg[j] ? t / seg[j] : 0, a = pts[j], b = pts[j + 1]; return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, a: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI }; } t -= seg[j]; }
    return { x: pts[0][0], y: pts[0][1], a: 0 };
  }

  // ---------- turn a schedule line into drawable runs ----------
  function buildRuns(line, synth) {
    var runs = [], n = 0, legs = synth ? synth.legs : line.legs;
    legs.forEach(function (g) {
      if (g.type === "sailing") {
        var s = g.stops.filter(function (x) { return G.nodes[x.c]; });
        if (s.length < 2) return;
        n++;
        runs.push({ kind: "sail", no: n, g: g, route: g.route, color: RC[g.route] || "#015088", codes: s.map(function (x) { return x.c; }), stops: s,
          dep: s[0].dep, arr: s[s.length - 1].arr, implied: !!g.implied, pts: legPts(s.map(function (x) { return x.c; })) });
      } else if (g.type === "deadhead" && G.nodes[g.from] && G.nodes[g.to]) {
        runs.push({ kind: "dh", g: g, route: "DH", color: RC.DH, codes: [g.from, g.to], stops: [{ c: g.from }, { c: g.to }], pts: legPts([g.from, g.to]) });
      } else if (g.type === "base" && G.nodes[g.code]) {
        var other = g.phase === "start" ? g.to : g.from;
        if (other && G.nodes[other] && other !== g.code) {
          var cs = g.phase === "start" ? [g.code, other] : [other, g.code];
          runs.push({ kind: "base", phase: g.phase, g: g, route: "DH", color: RC.DH, codes: cs, stops: cs.map(function (c) { return { c: c }; }), time: g.time, pts: legPts(cs) });
        }
      }
    });
    return runs;
  }
  // where the boat is at minute m (for the scrubber)
  function buildSegments(runs) {
    var segs = [], sails = runs.filter(function (r) { return r.kind === "sail"; });
    var first = sails[0], last = sails[sails.length - 1];
    runs.forEach(function (r) {
      if (r.kind === "base" && r.phase === "start" && first && first.dep && r.codes[1] === first.codes[0]) segs.push({ t0: mins(first.dep) - 15, t1: mins(first.dep), pts: r.pts, r: r, what: "light", from: r.codes[0], to: r.codes[1] });
      if (r.kind === "base" && r.phase === "end" && last && last.arr && r.codes[0] === last.codes[last.codes.length - 1]) segs.push({ t0: mins(last.arr), t1: mins(last.arr) + 20, pts: r.pts, r: r, what: "light", from: r.codes[0], to: r.codes[1] });
      if (r.kind !== "sail") return;
      for (var i = 0; i < r.stops.length - 1; i++) {
        var a = r.stops[i], b = r.stops[i + 1], t0 = a.dep || a.arr, t1 = b.arr || b.dep; if (!t0 || !t1) continue;
        segs.push({ t0: mins(t0), t1: mins(t1), pts: path(a.c, b.c), r: r, what: "sail", from: a.c, to: b.c, arrAt: b.c, dest: r.codes[r.codes.length - 1] });
      }
    });
    segs.sort(function (a, b) { return a.t0 - b.t0; });
    return segs;
  }

  // ---------- the component ----------
  function mount(el, line, opts) {
    opts = opts || {};
    var runs = buildRuns(line, opts.synth);
    var sails = runs.filter(function (r) { return r.kind === "sail"; });
    var segs = buildSegments(runs);
    var st = { run: null, stop: null, time: null };
    var vb = null, anim = 0, PLACED = [];
    var showChips = opts.chips !== false, showPanel = opts.panel !== false;

    el.className = "bm" + (opts.cls ? " " + opts.cls : "");
    el.innerHTML =
      (showChips ? '<div class="bm-bar" role="toolbar" aria-label="Choose a run"><button class="bm-step" data-step="-1" aria-label="Previous run">' + ico("left") + '</button><div class="bm-chips"></div><button class="bm-step" data-step="1" aria-label="Next run">' + ico("right") + '</button></div>' : "") +
      '<div class="bm-stage"><svg class="bm-svg" role="img" aria-label="Map of San Francisco Bay showing this bid\'s ferry runs" preserveAspectRatio="xMidYMid meet"></svg>' +
        '<div class="bm-hint"></div><div class="bm-tools"><button data-step="-1" aria-label="Previous run">' + ico("left") + '</button><button data-step="1" aria-label="Next run">' + ico("right") + '</button><button data-zoom="fit" aria-label="Fit runs">' + ico("fit") + '</button></div></div>' +
      '<div class="bm-legend"></div>' +
      (showPanel ? '<div class="bm-panel" aria-live="polite"></div>' : "");
    var chipsEl = el.querySelector(".bm-chips"), svg = el.querySelector(".bm-svg"), panel = el.querySelector(".bm-panel"), legend = el.querySelector(".bm-legend"), hint = el.querySelector(".bm-hint");

    var used = {}; sails.forEach(function (r) { used[r.route] = 1; });
    legend.innerHTML = Object.keys(used).map(function (r) { return '<span class="bm-lg">' + ico(ICO ? ICO.ROUTE_ICON[r] || "oa" : "", RC[r]) + '<i style="background:' + RC[r] + '"></i>' + esc(RL[r] || r) + '</span>'; }).join("") +
      (runs.some(function (r) { return r.kind !== "sail"; }) ? '<span class="bm-lg">' + ico("dh", RC.DH) + '<i class="dash"></i>Light run (no passengers)</span>' : "");

    function chipHTML() {
      var h = '<button class="bm-chip' + (st.run === null ? " on" : "") + '" data-run="all">All runs <small>' + sails.length + '</small></button>';
      sails.forEach(function (r) {
        var g = r.g, flag = g.suspended ? " sus" : (r.stops.some(function (x) { return x.cut; }) ? " cut" : (r.stops.some(function (x) { return x.conflict; }) ? " con" : (g.was ? " chg" : "")));
        h += '<button class="bm-chip' + (st.run === r.no ? " on" : "") + (r.implied ? " imp" : "") + flag + '" data-run="' + r.no + '" style="--rc:' + r.color + '" aria-pressed="' + (st.run === r.no) + '">' +
          ico(ICO ? ICO.ROUTE_ICON[r.route] || "oa" : "") + '<b>' + fmt(r.dep) + '</b> ' + esc(runName(r, true)) + '</button>';
      });
      return h;
    }
    function relevant() {
      if (st.run !== null) return runs.filter(function (r) { return r.kind === "sail" && r.no === st.run; });
      if (st.stop) return sails.filter(function (r) { return r.codes.indexOf(st.stop) >= 0; });
      return runs;
    }
    function fitBox(rs) {
      var xs = [], ys = [];
      rs.forEach(function (r) { r.pts.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); });
      if (!xs.length) { xs = [0, G.W]; ys = [0, G.H]; }
      var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
      var w, h, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      var cw = Math.max(1, svg.clientWidth), ch = Math.max(1, svg.clientHeight), r = cw / ch || 1.4;
      var mx = Math.min(125, cw * 0.24), my = Math.min(48, ch * 0.1);
      var W0 = Math.max(x1 - x0, 200), H0 = Math.max(y1 - y0, 200);
      w = W0 / (1 - 2 * mx / cw); h = H0 / (1 - 2 * my / ch);
      if (w / h > r) h = w / r; else w = h * r;
      if (w > G.W) { w = G.W; h = w / r; }
      if (h > G.H) { h = G.H; w = h * r; }
      var vx = Math.min(Math.max(cx - w / 2, 0), Math.max(0, G.W - w)), vy = Math.min(Math.max(cy - h / 2, 0), Math.max(0, G.H - h));
      if (w >= G.W) vx = (G.W - w) / 2;
      return [vx, vy, w, h];
    }
    function setVB(target, instant) {
      var reduce = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!vb || instant || reduce) { vb = target; draw(); return; }
      var from = vb.slice(), t0 = performance.now(), my = ++anim;
      (function step(now) {
        if (my !== anim) return;
        var k = Math.min(1, (now - t0) / 380), e = 1 - Math.pow(1 - k, 3);
        vb = from.map(function (v, i) { return v + (target[i] - v) * e; }); draw();
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }

    // ---------- drawing ----------
    function draw() {
      if (!vb) return;
      svg.setAttribute("viewBox", vb.map(function (v) { return v.toFixed(1); }).join(" "));
      var px = vb[2] / Math.max(1, svg.clientWidth);
      var o = [];
      o.push('<rect x="' + (vb[0] - 50) + '" y="' + (vb[1] - 50) + '" width="' + (vb[2] + 100) + '" height="' + (vb[3] + 100) + '" class="bm-water"/>');
      o.push('<path class="bm-land" d="' + G.land + '"/>');
      (G.carvePoly || []).forEach(function (c) { o.push('<path class="bm-carvep" d="' + c + '"/>'); });
      G.carve.forEach(function (c) { o.push('<path class="bm-carve" d="' + (c.d || c) + '" stroke-width="' + (c.w || 40) + '"/>'); });

      var sel = st.run !== null, focus = relevant(), fset = {}; focus.forEach(function (r) { fset[runs.indexOf(r)] = 1; });
      runs.forEach(function (r, i) {
        var on = !(sel || st.stop) || fset[i];
        var cls = r.kind === "sail" ? "bm-run" : "bm-light";
        o.push('<path class="' + cls + (on ? "" : " dim") + (r.implied ? " imp" : "") + (r.g && r.g.suspended ? " sus" : "") + '" d="' + d(r.pts) + '" style="--rc:' + r.color + '"' + (r.kind === "sail" ? ' data-run="' + r.no + '"' : "") + '/>');
        if (r.kind === "sail") o.push('<path class="bm-hit" d="' + d(r.pts) + '" data-run="' + r.no + '"><title>' + esc(fmt(r.dep) + " " + runName(r) + " · back " + fmt(r.arr)) + '</title></path>');
      });
      focus.forEach(function (r) {
        if (r.kind !== "sail" || !(sel || st.stop)) return;
        o.push('<path class="bm-case" d="' + d(r.pts) + '"/><path class="bm-sel" d="' + d(r.pts) + '" style="--rc:' + r.color + '" data-run="' + r.no + '"/>');
      });
      (sel ? focus : (st.stop ? focus : sails)).forEach(function (r) {
        if (r.kind !== "sail") return;
        var big = sel ? 1 : 0.7;
        for (var i = 0; i < r.pts.length - 1; i++) {
          var a = r.pts[i], b = r.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (L < 42 * px) continue;
          var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, s = 6.5 * px * big;
          o.push('<path class="bm-chev" style="--rc:' + r.color + '" d="M' + (mx + ux * s) + " " + (my + uy * s) + "L" + (mx - ux * s - uy * s) + " " + (my - uy * s + ux * s) + "L" + (mx - ux * s + uy * s) + " " + (my - uy * s - ux * s) + 'Z"/>');
        }
      });
      var stops = {}; runs.forEach(function (r) { r.codes.forEach(function (c) { stops[c] = 1; }); });
      var hot = {}; focus.forEach(function (r) { r.codes.forEach(function (c) { hot[c] = 1; }); });
      Object.keys(stops).forEach(function (c) {
        var p = G.nodes[c]; if (!p) return;
        var isBase = BASES[c], on = !(sel || st.stop) || hot[c], picked = st.stop === c, r = (picked ? 9 : 7) * px;
        var color = "var(--navy)";
        if (sel) { var rr = focus[0]; color = rr.color; }
        o.push('<g class="bm-stop' + (on ? "" : " dim") + (picked ? " picked" : "") + '" data-stop="' + c + '" tabindex="0" role="button" aria-label="' + esc(NAME[c]) + ' — show every arrival and departure here">' +
          (picked ? '<circle class="bm-halo" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (r * 2.1) + '"/>' : "") +
          (isBase ? '<rect class="bm-base" x="' + (p[0] - r) + '" y="' + (p[1] - r) + '" width="' + 2 * r + '" height="' + 2 * r + '" rx="' + r * 0.25 + '"/>'
                  : '<circle class="bm-pin" cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '" style="--rc:' + color + '"/>') +
          '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r * 2.4 + '" fill="transparent"/></g>');
      });
      var labels = []; PLACED = [];
      Object.keys(stops).sort(function (a, b) { return (hot[b] ? 1 : 0) - (hot[a] ? 1 : 0) || (st.stop === b) - (st.stop === a); }).forEach(function (c) {
        var p = G.nodes[c]; if (!p) return;
        var on = !(sel || st.stop) || hot[c];
        var lines = [{ t: SHORT[c], cls: "nm" }];
        if (sel) {
          var r0 = focus[0], idx = r0.codes.indexOf(c);
          if (idx >= 0) {
            var x = r0.stops[idx], first = idx === 0, last = idx === r0.stops.length - 1;
            if (first && x.dep) lines.push({ t: "Depart " + fmt(x.dep), cls: "dep" });
            else if (last && x.arr) lines.push({ t: "Arrive " + fmt(x.arr), cls: "arr" });
            else if (!first && !last && (x.arr || x.dep)) lines.push({ t: (x.dep && x.arr && x.dep !== x.arr ? fmt(x.arr) + " → " + fmt(x.dep) : "Calls " + fmt(x.arr || x.dep)), cls: "via" });
          }
        } else if (st.stop === c) {
          var ev = events(c); lines.push({ t: ev.length + " call" + (ev.length === 1 ? "" : "s") + " · " + (ev.length ? fmt(ev[0].t) + "–" + fmt(ev[ev.length - 1].t) : ""), cls: "via" });
        } else if (!st.stop && !BASES[c]) {
          var e2 = events(c).filter(function (e) { return e.type !== "light"; });
          if (e2.length) lines.push({ t: e2.length === 1 ? (e2[0].type === "dep" ? "Dep " : "Arr ") + fmt(e2[0].t) : fmt(e2[0].t) + " … " + fmt(e2[e2.length - 1].t), cls: "sub" });
        }
        if (!on && lines.length === 1 && (sel || st.stop)) { labels.push(label(p, c, lines, px, true)); return; }
        labels.push(label(p, c, lines, px, false));
      });
      o.push(labels.join(""));
      // the boat, when a time is being scrubbed
      if (st.time != null) {
        var pos = posAt(st.time);
        if (pos && pos.pt) {
          var R = 9 * px, q = pos.pt;
          o.push('<g class="bm-boat" transform="translate(' + q.x.toFixed(1) + ' ' + q.y.toFixed(1) + ')"><circle class="bm-boat-halo" r="' + (R * 2.2) + '"/><circle class="bm-boat-dot" r="' + R + '" style="--rc:' + (pos.r ? pos.r.color : RC.DH) + '"/>' +
            (pos.moving ? '<path class="bm-boat-hd" transform="rotate(' + q.a.toFixed(1) + ')" d="M' + (R * 1.9) + ' 0L' + (R * 0.4) + ' ' + (-R * 0.75) + 'L' + (R * 0.4) + ' ' + (R * 0.75) + 'Z"/>' : "") + '</g>');
        }
      }
      svg.innerHTML = o.join("");
    }
    function label(p, c, lines, px, faint) {
      var side = SIDE[c] || [1, 0], fs = 12.5 * px, lh = 15 * px, padx = 6 * px, pady = 4 * px;
      var w = Math.max.apply(0, lines.map(function (l) { return l.t.length * (l.cls === "nm" ? 7.1 : 6.6) * px; })) + padx * 2;
      var h = lines.length * lh + pady * 2 - (lh - fs);
      var off = 14 * px, x, y = p[1] + side[1] * off - h / 2;
      if (side[0] < 0) x = p[0] - off - w; else if (side[0] > 0) x = p[0] + off; else x = p[0] - w / 2;
      if (Math.abs(side[1]) > 0.8) y = side[1] > 0 ? p[1] + off : p[1] - off - h;
      var L0 = vb[0] + 6 * px, R0 = vb[0] + vb[2] - 6 * px, T0 = vb[1] + 6 * px, B0 = vb[1] + vb[3] - 6 * px;
      if (y < T0) y = T0; if (y + h > B0 - 34 * px && x < vb[0] + vb[2] * 0.72) y = Math.min(y, B0 - 34 * px - h); if (y + h > B0) y = B0 - h;
      if (y < vb[1] + 50 * px) R0 -= 120 * px;
      if (x < L0) x = L0; if (x + w > R0) x = R0 - w;
      for (var tries = 0; tries < 8; tries++) {
        var hit = null;
        for (var q = 0; q < PLACED.length; q++) { var P = PLACED[q]; if (x < P[0] + P[2] && x + w > P[0] && y < P[1] + P[3] && y + h > P[1]) { hit = P; break; } }
        if (!hit) break;
        var below = hit[1] + hit[3] + 3 * px, above = hit[1] - h - 3 * px;
        y = (below + h <= B0) ? below : (above >= T0 ? above : below);
      }
      PLACED.push([x, y, w, h]);
      var s = '<g class="bm-lbl' + (faint ? " faint" : "") + '" data-stop="' + c + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + 5 * px + '"/>';
      lines.forEach(function (l, i) { s += '<text class="' + l.cls + '" x="' + (x + padx) + '" y="' + (y + pady + fs * 0.92 + i * lh) + '" font-size="' + (l.cls === "nm" ? fs : fs * 0.96) + '">' + esc(l.t) + '</text>'; });
      return s + "</g>";
    }
    function events(c) {
      var ev = [];
      sails.forEach(function (r) {
        r.stops.forEach(function (x, i) {
          if (x.c !== c) return;
          var first = i === 0, last = i === r.stops.length - 1;
          if (!first && x.arr) ev.push({ t: x.arr, type: "arr", r: r, from: isLoop(r) && last ? far(r) : r.codes[0], loop: isLoop(r) && last });
          if (!last && x.dep) ev.push({ t: x.dep, type: "dep", r: r, to: isLoop(r) && first ? far(r) : r.codes[r.codes.length - 1], loop: isLoop(r) && first });
        });
      });
      ev.sort(function (a, b) { return mins(a.t) - mins(b.t) || (a.type === "arr" ? -1 : 1); });
      return ev;
    }
    // boat position + plain-language status at minute m
    function posAt(m) {
      if (!segs.length) return null;
      for (var i = 0; i < segs.length; i++) {
        var s = segs[i];
        if (m >= s.t0 && m <= s.t1) {
          var f = s.t1 > s.t0 ? (m - s.t0) / (s.t1 - s.t0) : 1;
          return { pt: along(s.pts, f), moving: true, r: s.r, seg: s, what: s.what, from: s.from, to: s.to, dest: s.dest || s.to, eta: s.t1 };
        }
        if (m < s.t0) {
          var prev = segs[i - 1];
          if (!prev) { var b0 = runs.filter(function (r) { return r.kind === "base" && r.phase === "start"; })[0]; var at0 = b0 ? b0.codes[0] : s.from; var p0 = G.nodes[at0]; return { pt: p0 ? { x: p0[0], y: p0[1], a: 0 } : null, moving: false, at: at0, next: s, r: null, before: true }; }
          var atc = prev.to, pp = G.nodes[atc];
          return { pt: pp ? { x: pp[0], y: pp[1], a: 0 } : null, moving: false, at: atc, next: s, r: s.what === "sail" ? s.r : null, prevSeg: prev };
        }
      }
      var lastS = segs[segs.length - 1], pl = G.nodes[lastS.to];
      return { pt: pl ? { x: pl[0], y: pl[1], a: 0 } : null, moving: false, at: lastS.to, next: null, r: null, after: true };
    }

    // ---------- detail panel ----------
    function statusBits(r) {
      var g = r.g, out = [];
      if (g.suspended) out.push('<div class="bm-flag sus">' + ico("sus") + ' ' + esc(g.suspended) + '</div>');
      r.stops.forEach(function (x) {
        if (x.cut) out.push('<div class="bm-flag cut">' + ico("cut") + ' ' + fmt(x.dep) + " from " + esc(NAME[x.c]) + ' is not on the public Nov 2 timetable — confirm with Operations.</div>');
        if (x.replaced) out.push('<div class="bm-flag rep">' + ico("rep") + ' Moved onto the new ' + fmt(x.dep) + " departure from " + esc(NAME[x.c]) + ' (the old trip is eliminated Nov 2). Confirm on the Bid 196 sheet.</div>');
        if (x.conflict) out.push('<div class="bm-flag con">' + ico("con") + ' Timing no longer fits at ' + esc(NAME[x.c]) + ' after the Nov 2 retime.</div>');
      });
      if (g.was) out.push('<div class="bm-flag chg">' + ico("chg") + ' Nov 2 change · was <s>' + esc(g.was) + '</s></div>');
      if (g.approx) out.push('<div class="bm-flag chg">' + ico("chg") + ' ' + esc(g.approx) + '</div>');
      return out.join("");
    }
    function panelRun(r) {
      var s = r.stops, a = s[0], z = s[s.length - 1], dur = a.dep && z.arr ? (mins(z.arr) - mins(a.dep) + 1440) % 1440 : null;
      var idx = sails.indexOf(r), nx = sails[idx + 1];
      var turn = nx && z.arr && nx.dep && nx.codes[0] === z.c ? (mins(nx.dep) - mins(z.arr) + 1440) % 1440 : null;
      var h = '<div class="bm-run-hd" style="--rc:' + r.color + '">' + ico(ICO ? ICO.ROUTE_ICON[r.route] || "oa" : "", r.color) + '<span class="bm-rt">' + esc(RL[r.route] || r.route) + '</span><span class="bm-no">run ' + r.no + ' of ' + sails.length + (r.implied ? ' · implied from timetable' : ' · on bid sheet') + '</span></div>';
      h += '<div class="bm-big"><div><b>' + fmt(a.dep) + '</b><span>' + esc(NAME[a.c]) + '</span></div><div class="bm-arrow" style="--rc:' + r.color + '">' + (isLoop(r) ? ico("loop") : "→") + (dur != null ? '<small>' + dur + ' min</small>' : "") + '</div><div><b>' + fmt(z.arr) + '</b><span>' + esc(NAME[z.c]) + '</span></div></div>';
      h += '<ol class="bm-stops">' + s.map(function (x, i) {
        var t = i === 0 ? '<em>dep</em> ' + fmt(x.dep) : i === s.length - 1 ? '<em>arr</em> ' + fmt(x.arr) : (x.dep && x.dep !== x.arr ? '<em>arr</em> ' + fmt(x.arr) + ' · <em>dep</em> ' + fmt(x.dep) : '<em>calls</em> ' + fmt(x.arr || x.dep));
        return '<li><button data-stop="' + x.c + '" style="--rc:' + r.color + '"><span class="dot"></span><span class="nm">' + esc(NAME[x.c]) + '</span><span class="tm">' + t + '</span></button></li>';
      }).join("") + '</ol>';
      h += statusBits(r);
      if (turn !== null) h += '<div class="bm-next">Next: <b>' + fmt(nx.dep) + '</b> to ' + esc(NAME[nx.codes[nx.codes.length - 1]]) + ' · ' + turn + ' min at ' + esc(SHORT[z.c]) + ' <button data-run="' + nx.no + '">Show ' + ico("right") + '</button></div>';
      return h;
    }
    function panelStop(c) {
      var ev = events(c);
      var h = '<div class="bm-run-hd">' + ico("pin") + '<span class="bm-rt">' + esc(NAME[c]) + '</span><span class="bm-no">' + ev.length + ' arrivals & departures on this line</span></div>';
      if (!ev.length) h += '<p class="bm-empty">No passenger sailings call here on this line' + (BASES[c] ? " — this is where the shift starts and ends." : ".") + '</p>';
      h += '<ol class="bm-ev">' + ev.map(function (e) {
        var other = (e.type === "arr" ? "from " + SHORT[e.from] : "to " + SHORT[e.to]) + (e.loop ? (e.type === "arr" ? " (round trip)" : " & back") : "");
        return '<li><button data-run="' + e.r.no + '" style="--rc:' + e.r.color + '" class="' + (st.run === e.r.no ? "on" : "") + '"><span class="tm">' + fmt(e.t) + '</span><span class="ty ' + e.type + '">' + (e.type === "arr" ? "Arrive" : "Depart") + '</span><span class="ot">' + esc(other) + '</span><span class="rn">Run ' + e.r.no + '</span></button></li>';
      }).join("") + '</ol>';
      return h;
    }
    function panelAll() {
      var first = sails[0], last = sails[sails.length - 1], wat = 0;
      sails.forEach(function (r) { if (r.dep && r.arr) wat += (mins(r.arr) - mins(r.dep) + 1440) % 1440; });
      var h = '<div class="bm-sum"><div><b>' + sails.length + '</b><span>sailings</span></div><div><b>' + (first ? fmt(first.dep) : "—") + '</b><span>first departure</span></div><div><b>' + (last ? fmt(last.arr) : "—") + '</b><span>last arrival</span></div><div><b>' + Math.floor(wat / 60) + 'h ' + (wat % 60) + 'm</b><span>underway</span></div></div>';
      var flagged = sails.filter(function (r) { return r.g.was || r.g.approx || r.g.suspended || r.stops.some(function (x) { return x.cut || x.conflict || x.replaced; }); });
      if (flagged.length) h += '<div class="bm-flag chg">' + ico("chg") + ' ' + flagged.length + ' of these runs have something to check (time differs from the timetable or South SF suspended in November). Tap one for details.</div>';
      return h;
    }

    function notify() { if (opts.onChange) opts.onChange({ run: st.run, stop: st.stop, time: st.time }); }
    function render(refit) {
      if (chipsEl) { chipsEl.innerHTML = chipHTML(); var on = chipsEl.querySelector(".on"); if (on && on.scrollIntoView && refit) on.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); }
      if (panel) {
        panel.innerHTML = st.run !== null ? panelRun(sails[st.run - 1]) : st.stop ? panelStop(st.stop) : panelAll();
        if (st.run !== null && st.stop) panel.innerHTML += '<div class="bm-back"><button data-stop="' + st.stop + '">' + ico("left") + ' Every call at ' + esc(SHORT[st.stop]) + '</button></div>';
      }
      hint.textContent = st.run !== null ? "Run " + st.run + " of " + sails.length + " · tap open water to reset" : st.stop ? "Runs that call at " + SHORT[st.stop] + " · tap it again to clear" : "Tap a run or a stop";
      if (refit) setVB(fitBox(relevant())); else draw();
    }
    function pickRun(no, quiet) { st.run = no; render(true); if (!quiet) notify(); }
    function pickStop(c, quiet) {
      if (st.stop === c && st.run === null) st.stop = null; else { st.stop = c; st.run = null; }
      render(true); if (!quiet) notify();
    }
    el.addEventListener("click", function (e) {
      var t = e.target.closest("[data-run],[data-stop],[data-step],[data-zoom]");
      if (!t || !el.contains(t)) { if (e.target === svg || (e.target.classList && (e.target.classList.contains("bm-water") || e.target.classList.contains("bm-land")))) { if (st.run !== null || st.stop) { st.run = null; st.stop = null; render(true); notify(); } } return; }
      if (t.dataset.step) { var s = st.run === null ? (t.dataset.step > 0 ? 1 : sails.length) : st.run + +t.dataset.step; if (s < 1) s = sails.length; if (s > sails.length) s = 1; pickRun(s); return; }
      if (t.dataset.zoom) { setVB(fitBox(relevant())); return; }
      if (t.dataset.run) { if (t.dataset.run === "all") { st.stop = null; pickRun(null); } else pickRun(+t.dataset.run); return; }
      if (t.dataset.stop) pickStop(t.dataset.stop);
    });
    el.addEventListener("keydown", function (e) {
      var t = e.target.closest && e.target.closest("[data-stop]");
      if (t && (e.key === "Enter" || e.key === " ") && t.tagName.toLowerCase() === "g") { e.preventDefault(); pickStop(t.dataset.stop); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if (/input|textarea/i.test(e.target.tagName)) return;
        e.preventDefault(); var s = st.run === null ? (e.key === "ArrowRight" ? 1 : sails.length) : st.run + (e.key === "ArrowRight" ? 1 : -1);
        if (s < 1) s = sails.length; if (s > sails.length) s = 1; pickRun(s);
      }
    });
    if (root.ResizeObserver) new ResizeObserver(function () { if (vb) { vb = fitBox(relevant()); draw(); } }).observe(svg);
    if (opts.startRun) st.run = opts.startRun;
    requestAnimationFrame(function () { render(true); });

    return {
      runs: sails, allRuns: runs, segs: segs,
      pickRun: function (no) { pickRun(no, true); }, pickStop: function (c) { pickStop(c, true); },
      clear: function () { st.run = null; st.stop = null; render(true); },
      setTime: function (m) { st.time = m; draw(); return m == null ? null : posAt(m); },
      posAt: posAt, state: function () { return { run: st.run, stop: st.stop, time: st.time }; },
      fit: function () { setVB(fitBox(relevant())); }, redraw: draw
    };
  }

  root.BayMap = { mount: mount, colors: RC, labels: RL, names: NAME, short: SHORT, path: legPts };
})(window);
