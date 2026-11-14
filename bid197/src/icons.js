/* Icon set for the Bid 196 dashboard & phone guide.
   One pictogram per kind of run: every SF Bay Ferry route gets its own landmark motif over a shared ferry hull,
   plus glyphs for the non-sailing legs (report at base, light run, end of shift, Extra Board, dock labor, events).
   24×24 grid, stroke 1.8, round joins; colour comes from CSS `color` so one symbol works in any route colour. */
(function (root) {
  "use strict";
  var S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  // shared ferry: hull, cabin, two windows, wake
  var HULL = '<path d="M2.5 14.5h19l-1.9 3.6H4.4z" fill="currentColor" stroke="none"/><path d="M6.8 14.5V11h7.6l2.3 3.5" ' + S + '/><path d="M9 12.6h1.2M12 12.6h1.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M3 21c1.5-1.1 3-1.1 4.5 0s3 1.1 4.5 0 3-1.1 4.5 0 3 1.1 4.5 0" ' + S + '/>';
  var HULL_LIGHT = '<path d="M2.5 14.5h19l-1.9 3.6H4.4z" ' + S + '/><path d="M6.8 14.5V11h7.6l2.3 3.5" ' + S + '/><path d="M3 21c1.5-1.1 3-1.1 4.5 0s3 1.1 4.5 0 3-1.1 4.5 0 3 1.1 4.5 0" ' + S + ' stroke-dasharray="2.2 2.4"/>';
  var SYM = {
    // ---- routes: landmark + hull ----
    oa:   '<path d="M5.5 9.5V3M5.5 3.8h12.5M5.5 3l8 .8M15.5 3.8v3.2M14.4 7h2.2" ' + S + '/>' + HULL,            // Port of Oakland container crane
    sea:  '<path d="M4.5 6.5h11.2l2.6-2.4M8.6 4h7.2M7.6 9.2h8.6M10.6 6.5v2.7M13.8 6.5v2.7" ' + S + '/>' + HULL, // seaplane on floats
    hb:   '<path d="M3.2 10.5a8.8 8.8 0 0 1 17.6 0" ' + S + '/><path d="M12 7.6v2.4" ' + S + '/>' + HULL,         // breakwater arc, boat in the harbor
    rch:  '<path d="M2.8 9.5l3-5.4 3 5.4 3-5.4 3 5.4 3-5.4 3 5.4" ' + S + '/>' + HULL,                           // Ford Point sawtooth roofline
    ssf:  '<path d="M10.2 9.5l.9-5.6h1.8l.9 5.6M9.4 3.9h5.2M5.6 5.2l2.3.9M18.4 5.2l-2.3.9" ' + S + '/>' + HULL,   // beacon on Oyster Point
    vjo:  '<path d="M2.5 9h19M6.5 9V3.4M17.5 9V3.4M6.5 3.4q5.5 6.6 11 0" ' + S + '/>' + HULL,                    // under the Richmond–San Rafael Bridge
    ws:   '<path d="M4.5 5h11M12.6 2.6L15.5 5l-2.9 2.4M19.5 9.5h-11M11.4 7.1L8.5 9.5l2.9 2.4" ' + S + '/><path d="M4 15h16l-1.6 3H5.6z" fill="currentColor" stroke="none"/><path d="M4 21c1.5-1.1 3-1.1 4.5 0s3 1.1 4.5 0 3-1.1 4.5 0" ' + S + '/>', // water shuttle, both ways
    h2:   '<path d="M12 2.6c3.4 4.3 5.6 6.8 5.6 10a5.6 5.6 0 0 1-11.2 0c0-3.2 2.2-5.7 5.6-10z" ' + S + '/><text x="12" y="15.2" font-size="6.6" font-weight="800" font-family="Barlow,Arial,sans-serif" text-anchor="middle" fill="currentColor" stroke="none">H₂</text>', // Sea Change hydrogen ferry
    dh:   HULL_LIGHT,                                                                                            // light run, no passengers
    // ---- non-sailing legs ----
    report: '<path d="M12 2.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zM12 7.4v14M4.6 13h3.2M16.2 13h3.2M5.4 13.4c.3 4.6 3.1 7.3 6.6 8 3.5-.7 6.3-3.4 6.6-8" ' + S + '/>', // anchor — report at base
    end:    '<path d="M5.5 21.5V3.5M5.5 4h11.8l-2.2 3.9 2.2 3.9H5.5" ' + S + '/><path d="M8.5 4v7.8M11.5 4v7.8M8.5 6.6h6M8.5 9.2h7.2" stroke="currentColor" stroke-width="1.2"/>', // chequered flag — end of shift
    extra:  '<path d="M9 3.5h6v3H9zM6.5 5.5h11v15h-11zM9.2 11h5.6M9.2 14.5h5.6M9.2 18h3.4" ' + S + '/>',          // clipboard — Extra Board
    dock:   '<path d="M14.5 6.2a4.2 4.2 0 0 0-5.6 5.6L3 17.7l3.3 3.3 5.9-5.9a4.2 4.2 0 0 0 5.6-5.6l-2.6 2.6-2.3-2.3z" ' + S + '/>', // wrench — dock labor
    event:  '<path d="M3.5 9a2.2 2.2 0 0 0 2.2-2.2V5.5h12.6v1.3A2.2 2.2 0 0 0 20.5 9v6a2.2 2.2 0 0 0-2.2 2.2v1.3H5.7v-1.3A2.2 2.2 0 0 0 3.5 15z" ' + S + '/><path d="M12 6.5v11" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 2.2"/>', // ticket — special event
    loop:   '<path d="M4.5 12a7.5 7.5 0 0 1 13-5.1l1.8 1.8M19.5 12a7.5 7.5 0 0 1-13 5.1l-1.8-1.8" ' + S + '/><path d="M19.3 4.6v4.2h-4.2M4.7 19.4v-4.2h4.2" ' + S + '/>', // round trip
    layover:'<circle cx="12" cy="12" r="8.5" ' + S + '/><path d="M12 7.2V12l3.2 2.2" ' + S + '/>',                 // waiting at a terminal
    // ---- Nov 2 status ----
    cut:    '<circle cx="12" cy="12" r="8.5" ' + S + '/><path d="M8.8 8.8l6.4 6.4M15.2 8.8l-6.4 6.4" ' + S + '/>',
    con:    '<path d="M12 3.5l9 16H3z" ' + S + '/><path d="M12 9.5v4.2M12 16.6v.2" ' + S + '/>',
    rep:    '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v3.2h-3.2" ' + S + '/>',
    sus:    '<circle cx="12" cy="12" r="8.5" ' + S + '/><path d="M9.8 8.8v6.4M14.2 8.8v6.4" ' + S + '/>',
    chg:    '<circle cx="12" cy="12" r="8.5" ' + S + '/><path d="M12 7.5V12h3.6" ' + S + '/><path d="M3.5 12h2M18.5 12h2" ' + S + '/>',
    swap:   '<path d="M4 8.5h15M15.5 5L19 8.5 15.5 12M20 15.5H5M8.5 12L5 15.5 8.5 19" ' + S + '/>',                 // this bid against the last one
    // ---- UI ----
    home:   '<path d="M4 11.5L12 4l8 7.5M6.5 9.8V20h11V9.8M10 20v-5h4v5" ' + S + '/>',
    day:    '<path d="M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4.5M15.5 4v4.5" ' + S + '/><path d="M8 14h2.4M12 14h2.4M8 17h2.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    bids:   '<path d="M5 6.5h14M5 12h14M5 17.5h9" ' + S + ' stroke-width="2.2"/>',
    crew:   '<circle cx="9" cy="8.2" r="3.2" ' + S + '/><path d="M3.5 19.5c0-3.3 2.4-5.4 5.5-5.4s5.5 2.1 5.5 5.4M15.5 5.4a3.2 3.2 0 0 1 0 5.8M16.8 14.3c2.3.5 3.7 2.3 3.7 5.2" ' + S + '/>',
    map:    '<path d="M3.5 6l5.5-2 6 2 5.5-2v14l-5.5 2-6-2-5.5 2zM9 4v14M15 6v14" ' + S + '/>',
    audit:  '<path d="M5 12.5l4.5 4.5L19 7.5" ' + S + ' stroke-width="2.3"/>',
    search: '<circle cx="10.5" cy="10.5" r="6" ' + S + '/><path d="M15 15l5 5" ' + S + ' stroke-width="2.2"/>',
    star:   '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" ' + S + '/>',
    starf:  '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    compare:'<path d="M4 5h6v14H4zM14 5h6v14h-6z" ' + S + '/><path d="M6.5 9h1M6.5 12h1M16.5 9h1M16.5 12h1M16.5 15h1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    filter: '<path d="M4 5.5h16l-6.2 7.2v5.1l-3.6 1.7v-6.8z" ' + S + '/>',
    left:   '<path d="M14.5 5.5L8 12l6.5 6.5" ' + S + ' stroke-width="2.2"/>',
    right:  '<path d="M9.5 5.5L16 12l-6.5 6.5" ' + S + ' stroke-width="2.2"/>',
    down:   '<path d="M6 9.5l6 6 6-6" ' + S + ' stroke-width="2.2"/>',
    x:      '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" ' + S + ' stroke-width="2.2"/>',
    fit:    '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" ' + S + '/>',
    play:   '<path d="M7.5 4.5l11 7.5-11 7.5z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    pause:  '<path d="M8 5v14M16 5v14" ' + S + ' stroke-width="2.6"/>',
    now:    '<circle cx="12" cy="12" r="8.5" ' + S + '/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" ' + S + '/>',
    pin:    '<path d="M12 21.5s-6.5-6.4-6.5-11.3a6.5 6.5 0 0 1 13 0C18.5 15.1 12 21.5 12 21.5z" ' + S + '/><circle cx="12" cy="10.2" r="2.3" ' + S + '/>',
    clock:  '<circle cx="12" cy="12" r="8.5" ' + S + '/><path d="M12 7.5V12l3.2 2.2" ' + S + '/>',
    sun:    '<circle cx="12" cy="12" r="4" ' + S + '/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" ' + S + '/>',
    moon:   '<path d="M19.5 14.2A8 8 0 0 1 9.8 4.5a8 8 0 1 0 9.7 9.7z" ' + S + '/>',
    info:   '<circle cx="12" cy="12" r="8.5" ' + S + '/><path d="M12 11v5.5M12 7.8v.2" ' + S + ' stroke-width="2.2"/>',
    off:    '<path d="M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4.5M15.5 4v4.5" ' + S + '/><path d="M9.5 13.5l5 4M14.5 13.5l-5 4" ' + S + '/>',
    base:   '<path d="M3 20.5h18M5 20.5V10l7-5 7 5v10.5M9 20.5v-5h6v5" ' + S + '/>',
    print:  '<path d="M7 8V3.5h10V8M5.5 8h13a2 2 0 0 1 2 2v6h-3.5v4.5H7V16H3.5v-6a2 2 0 0 1 2-2zM7 13h10" ' + S + '/>',
    link:   '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2" ' + S + '/>'
  };
  var ROUTE_ICON = { OAKALA: "oa", SHORTHOP: "oa", SEA: "sea", HB: "hb", RCH: "rch", SSF: "ssf", VJO: "vjo", WS: "ws", SEACHANGE: "h2", DH: "dh" };
  function sprite() {
    return '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>' +
      Object.keys(SYM).map(function (k) { return '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + SYM[k] + '</symbol>'; }).join("") + '</defs></svg>';
  }
  function svg(name, opts) {
    opts = opts || {};
    var cls = "ic" + (opts.cls ? " " + opts.cls : "") + (opts.size ? " ic-" + opts.size : "");
    return '<svg class="' + cls + '"' + (opts.color ? ' style="color:' + opts.color + '"' : "") + (opts.title ? ' role="img" aria-label="' + opts.title + '"' : ' aria-hidden="true"') + '><use href="#i-' + name + '"/></svg>';
  }
  // which pictogram a schedule leg gets
  function forLeg(g) {
    if (!g) return "ferry";
    if (g.type === "sailing") { var s = g.stops || []; return ROUTE_ICON[g.route] || "oa"; }
    if (g.type === "base") return g.phase === "start" ? "report" : "end";
    if (g.type === "deadhead") return "dh";
    if (g.type === "special") return "event";
    if (g.type === "note") return "con";
    return "oa";
  }
  function forLine(L) { return L.type === "shuttle" ? "ws" : L.type === "seachange" ? "h2" : L.type === "dock" ? "dock" : L.type === "extra" ? "extra" : "oa"; }
  root.Icons = { sprite: sprite, svg: svg, forLeg: forLeg, forLine: forLine, ROUTE_ICON: ROUTE_ICON, names: Object.keys(SYM) };
})(typeof window !== "undefined" ? window : global);
