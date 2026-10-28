# Bid 197 dashboard · UI/UX map

The working map for revising the IBU Bid 197 dashboard. Read this before touching anything; it says where every
view, component, behaviour, style and data field lives, how the page is built, and how to test a change.

- Live dashboard: https://claude.ai/artifact/6tH3od7uvMHVP2AmWo6iGE (redeploy `dist/bid197.html` to this URL; never a second URL)
- Design revisions canvas: https://claude.ai/artifact/H8D8ho8eMcdkeTMHS2YC1i
- Template it was derived from: IBU Bid 196 dashboard, artifact BV5gKTMZgGTYjd8ASqx9o4 (do not edit that one from here)
- Repo: `bid197/` on branch `claude/bid-197-interactive-dashboard-8fb30e`

## 1. Status of the data (read first)

The Bid 197 sheet has not been issued. The dashboard runs on **provisional Bid 196 data** and says so in three
places that never go away: the amber strip above the header, the amber status pill, and the hero subtitle.
Rule from the user's knowledge base (Notion atom AT-96): use Bid 196 data provisionally, never present it as
published Bid 197 evidence, keep the maintained Bid 196 dashboard untouched, separate storage namespace.

`cycle.js` is the single switch. When the real sheet arrives (section 9), only data files and that one file change.

## 2. Build pipeline

```
src/  (pristine Bid 196 parts, hashes in src/UPSTREAM.sha256)      cycle.js   extra.js   extra.css
  head.html fonts.css app.css shell.html data.js prev195.js icons.js lib.js baymap.js app.js
        │                                                               │
        ▼  python3 patch.py  (anchored string edits, every anchor asserted)
build/  head.html app.css(+extra.css) shell.html lib.js app.js(+extra.js)
        │
        ▼  python3 build.py  (runs patch.py, checks data.js hash, node --check every script, concatenates)
dist/bid197.html   = head + <style>fonts+css</style> + shell + 8 <script> blocks
        │
        ▼  node tests/sweep.js   (Playwright: 48 routes × 2 widths, tap targets, text sizes, functional pass)
publish  →  Artifact tool, file_path dist/bid197.html  (same path = same URL)
```

Script order inside the page (never reorder): `cycle.js → data.js → prev195.js → icons.js → sprite insert → lib.js → baymap.js → app.js`.

- **Never edit `build/` or `dist/` by hand.** Edit `src/` (only to resync from upstream), `patch.py`, `extra.js`, `extra.css`, `cycle.js`, then rebuild.
- `patch.py` fails loudly if an anchor is missing or duplicated. That is the point: when the upstream Bid 196 artifact changes, the diff shows exactly which patch to re-anchor.
- `data.js` must stay byte-identical to the recorded hash. To refresh it from the live Bid 196 artifact: read the artifact, take the first `<script>` block, overwrite `src/data.js`, re-record the hash with `sha256sum data.js` into `src/UPSTREAM.sha256`.

## 3. Globals and files

| Global | File | Shape | Who edits it |
|---|---|---|---|
| `window.CYCLE` | `cycle.js` | `{bid, sheet, prevSheet, provisional, start, end, startNote, sheetStart, sheetEnd, sheetDates, heroSub, banner{short,long,pill}}` | you, when the cycle changes |
| `DATA` | `src/data.js` | `{title, subtitle, meta, bids[39]{n,s,off,cnt,tt,crew[4],runs[],notes[]}, bidOff[3], capSen, capt, sen[][name,date,status,prev]}` | upstream only (scheduled crew updates) |
| `SCHED` | `src/data.js` | `{bids[]{n, base, lines[]{header,type,kind,tt,hours,shiftEnd,legs[]}}, ws, wsCrew, bases, generated}` | upstream only |
| `AUDIT_NOTES`, `CAP_OUT`, `SEN_OUT`, `BAY_GEO`, `NOV2_LOG` | `src/data.js` | audit bullets (HTML), excluded names, shoreline geometry, sheet-vs-timetable findings | upstream only |
| `PREV`, `CHG` | `src/prev195.js` | previous sheet (`name,dates,days,timetable,bids,sched,capt`) and the authored change list (`bids[]{n,was,kind,text,lines,also}`, `gone`, `carry`, `capt`) | authored per cycle |
| `Icons` | `src/icons.js` | `sprite(), svg(name,{color,cls,size,title}), forLeg, forLine, ROUTE_ICON, names[]` | rarely |
| `DashLib` (`D`) | `build/lib.js` | pure string renderers: `mapSVG, itineraryHTML, stripHTML, ganttSVG, loadCurve, loadChartSVG, barChartSVG, wsTableHTML, wsGanttSVG, shiftWindow, linesForDay, fmt, mins, pad, esc` | via patch.py |
| `BayMap` (`BM`) | `src/baymap.js` | `mount(el, line, opts) → {pickRun, pickStop, clear, setTime, posAt, state, fit, redraw}`, plus `names, short, colors, labels` | rarely |
| App IIFE | `build/app.js` | everything below | via patch.py + extra.js |

Line types in `SCHED.bids[].lines[].type`: `route` (legs: `base`, `sailing`, `deadhead`, `special`, `note`), `shuttle`, `seachange`, `dock`, `extra`. Routes: `OAKALA SEA HB RCH SSF VJO` (+ `WS`, `SEACHANGE`).

## 4. Routing, state, storage

Hash router (`parseHash`, app.js ≈ L35). Views and hashes:

| Hash | View fn | Notes |
|---|---|---|
| `#overview` | `viewOverview` | launch pad: hero, For you, Lightest bids, system map, load chart, More numbers fold |
| `#bids` / `#bids?sess=AM&off=wkend&base=CB&route=HB&sort=tt&fav=1&q=…` | `viewBids` | filters are read from the query on load (`applyQuery`) and written back with `history.replaceState` (`syncBidsHash`) |
| `#bid-N` | `viewBid(N)` | hero, was-row, crew, line selector, `lineSection` (strip + map + scrubber + run list) |
| `#day-0..6` | `viewDay` | rows by report time, gantt fold |
| `#crew` / `#captains` | `viewCrew` / `viewCaptains` | job line, seniority list, crew grid, bid-off |
| `#compare` | `viewCompare` | up to 4 bids, best-of-row outline |
| `#shuttle` | `viewShuttle` | water shuttle page |
| `#changes` (`#notes` alias) | `viewChanges` | provisional lead card, then last cycle |

`state` (app.js ≈ L20): `view day sess q crewQ offF baseF routeF sort line open fav cmp me skip incUnknown lineQ sysOff lastPin chgF chgOpen chgLine prevPick favOnly fOpen rowMenu bidTab moreOpen ganttOpen gridOpen crewTab capQ capMenu capLine capOpenOnly capPin capSkip capCount pk pkAll theme provSeen`.

`hashchange` resets: `open rowMenu capMenu bidTab fOpen` and scrolls to top (except when a Changes row is open). Filters persist in memory across views; the query only applies when present.

localStorage, all through `load()/save()` (≈ L18–19), prefix **`b197.`** (never `b196.`): `fav cmp me skip incUnknown lastPin capPin capSkip capCount pk theme provSeen`.

Rendering model: every interaction mutates `state` then calls `render(keepFocus)`, which wipes `#main`, builds the view, then `renderNav()`, `renderRail()`, `renderCmpBar()`, then honours `pendingFocus` (keyboard `/`).

## 5. Shell and header (shell.html + renderNav)

```
.app
 ├ #provo .provo                 provisional strip (renderBanner; open until "Got it", then one line; b197.provSeen)
 ├ header.topbar .topbar-in      sticky
 │   ├ .logo  ├ .brand (.brand-t "Bid 197" / #brand-s subtitle)
 │   ├ .status-pill (+.prov while provisional; text from CYCLE.banner.pill)
 │   ├ #theme .theme             sun/moon, cycles auto→light→dark (applyTheme/cycleTheme, b197.theme)
 │   └ nav#nav .tabbar           5 tabs (NAV): overview bids day crew changes; bottom bar on phones, inline ≥900px
 ├ #rail .rail                   jump-to-bid rail; only on bids / bid / compare
 ├ main#main                     the view
 └ #toast                        in-page toast (no alert/confirm anywhere)
```

Breakpoints: CSS phone < 900 px (tabs at bottom, 44 px targets), JS `isPhone()` < 960 px (bid page stacks map behind a tab). Two-column bid page ≥ 960 px; list rows two-up ≥ 900 px.

## 6. Component inventory (what each piece is, where it is made)

| Component | Made by (app.js) | Styled by (app.css) | Interactions |
|---|---|---|---|
| Hero (overview) | `viewOverview` L≈270 | `.hero .hero-t .hero-cd .cd` | countdown static; **bids** and **weekends off** facts are buttons → `#bids` (+ `offF=wkend`) |
| For you card | `forYou()` inside viewOverview | `.card .lrows .lrow .chips` | name picker (`me`), verdict row → crew, prev-bid row → changes, shortlist chips |
| Lightest bids | `lightestCard` L≈910 | `.lt .lt-row` | toggles saved in `pk`, rows open bid, star |
| System map | `viewOverview` + `BM.mount(…, {synth})` | `.sysgrid .sysmap .route-tog .rt .route-bids` | route chip toggles ⇄ map line; lists bids |
| Load chart | `loadChartBox` (extra.js) + `D.loadChartSVG` | `.lc-box .lc-read .lc-v .lc-list` | pointer move = cursor + readout; tap/arrow keys = chips of bids underway (`binBids`) |
| Stat tiles | `stat(icon,v,lbl,sub,fn)` L≈85 | `.stats .stat button.stat` | each tile is a button → bids / crew / bids sorted by sailings |
| Bar charts | `chartBox` (extra.js) + `D.barChartSVG(items{k})` | `.chart.tappable .bar .bar-hit` | day bar → `#day-i`; route bar → `routeF` + `#bids` |
| Gantt | `ganttBox` (extra.js) + `D.ganttSVG(…,{now})` | `.gantt-box .gr .gr-hit .g-now` | row → bid; "now" dashed line on today |
| Day chips | `dayChips(onPick)` L≈187 | `.days .day` | tab-like |
| Bids controls | `viewBids` L≈315 | `.frow .search-wrap .fpanel .fgrp .seg .chip .act` | search (`q`), Filters panel, chips removable, URL sync |
| Bid row | `bidRow` L≈358 | `.bidrow .bn.r .bb .bb-t .bb-m .bb-crew .mini .iconbtn` | row → bid; star; route accent `--rc` on `.bn.r` |
| Glance row | `glanceRow(b,L,"row"|"hero")` L≈122 (+ `workLines glanceSeq glanceDays glanceTT glanceBase glanceDT glanceDD rowRuns`) | `.gl .gl-row .gl-hero` | icon line identical to the phone guide; do not change counting rules |
| Compare | `viewCompare` L≈377 | `table.cmp td.best .cmp-key .cmp-bar` | header → bid; `.best` outline via row scorer (3rd element of a row def) |
| Bid hero | `viewBid` L≈405 + `heroRuns` L≈162 | `.bid-hero .bh-n .bh-facts .bh-f .bh-runs .hg .bh-seq` | pattern buttons select the line; **swipe** ⇄ prev/next (`swipeable`) |
| Pager | `viewBid` | `.pager .iconbtn(.share)` | All bids, star, compare, **share** (`shareBid` → Web Share / clipboard), prev/next |
| Line section | `lineSection(b,L)` L≈454 | `.strip .blk .scrub .tl .tli .bid-grid` | strip block ⇄ map run ⇄ run list (`pick/highlight`); scrubber + play + Now (`scrubTo`) |
| Other lines | `otherLine` L≈595 / `viewShuttle` L≈616 | `.ws-* table.tt` | shuttle timetables with crew window |
| Crew: job line | `jobLineCard` L≈691, `seniorityMeter`, `verdict` | `.jl-* .cutline .skipbtn` | movable last-job line, nudges, skips |
| Crew: seniority list | `viewCrew` L≈733 | `.senlist .sen-row .sen-acts` | one search; tap row = actions |
| Crew grid | `viewCrew` (`gcCell`) | `.grid .grid-row .gc button.gc` | row → bid; **name → seniority search** (`crewQ`) |
| Captains | `viewCaptains` L≈890 + `cap*` fns | same families with `cap` prefix | parallel model for the Masters sheet |
| Changes | `viewChanges` L≈1029, `provChangesCard` (extra.js), `renumSVG`, `chgCard`, `prevLookup`, `mapPair` | `.renum .rn-n .ccs .cc .seats .seat .fcts .rc .mp` | provisional lead card; lookup select; old→new diagram taps; bid-by-bid rows with both maps |
| Toast | `toast(msg)` L≈34 | `.toast` | 1.8 s |
| Keyboard | document keydown (extra.js) | `.kbd` | `/` search · `1–5` tabs · `[` `]` prev/next bid · `s` star · `c` compare · `t` theme · `?` help |

## 7. Design system (tokens live at the top of app.css; dark values repeated for `prefers-color-scheme` and `[data-theme=dark]`)

- Brand: `--navy #015088`, `--navy-deep #003A63`, `--logo-blue #0A77BC`, `--sky #1BA6E1`, `--brand-green #51AB49`.
- Routes: `--r-oa #4FAB47 --r-sea #E07B27 --r-hb #C7485D --r-rch #104676 --r-ssf #862985 --r-vjo #118B98 --r-ws #3E9B5A --r-h2 #015088 --r-dh #7A8794` (dark lifts rch/ssf).
- Surfaces: `--bg --surface --surface-2 --surface-3 --ink --ink-2 --muted --line --line-2 --water --land`.
- Semantic: `--ok --warn --bad --info --off --open` each with `-bg`; session `--am --pm --v` (text labels only, never a hue job).
- **Hue has two jobs only: route identity and status.** The provisional strip uses `--warn` (status). The route accent on `.bn.r` is identity.
- Type: Barlow body, Barlow Semi Condensed display/numbers (embedded woff2 in fonts.css). Scale `--fs-1..-7` = 12/13.5/15/17/20/26/34(/46). Nothing under 12 px (SVG chart labels inside scrolling 720-wide gantts are the upstream exception).
- Radius 14 (cards) / 9 / 6; shadow only on `.card.lead`, `.hero`, `.bid-hero`.
- Tap targets ≥ 44 px under 900 px (enforced in `@media (max-width: 899px)` blocks and tested).
- Bid 197 additions live at the end of app.css (from `extra.css`): `.provo*`, `.theme`, `.status-pill.prov`, `button.stat`, `.hero-cd button.cd`, `.bn.r`, `.chart.tappable`, `.lc-*`, `.gantt-box`, `button.gc`, `table.cmp td.best`, `.cmp-key`, `.kbd`.

## 8. Revision playbook (where to go for the usual asks)

| Ask | Touch | How |
|---|---|---|
| Change banner / pill / hero wording | `cycle.js` | edit `banner.short/long/pill`, `heroSub`, `startNote`; rebuild |
| Expected start date changes | `cycle.js` `start` | countdown follows it |
| Restyle anything | `extra.css` (append; prefix new classes, watch `.rt .row .n` collisions) | rebuild, run sweep, look at `tests/shots/` |
| Add a behaviour to an existing view | `patch.py` (new `rep()` with a unique anchor from `src/app.js`) + helper in `extra.js` | anchors must be unique; assert counts |
| New view | `extra.js` (fn) + `patch.py` (add to `render()` chain, `parseHash` list, `NAV`) | keep the rail rule (bids/bid/compare only) |
| Change a chart | `patch.py` lib section (`barChartSVG/ganttSVG/loadChartSVG`) | keep `data-k`, `.gr[data-n]`, `.lc-cur` hooks |
| Change what a bid row shows | `patch.py` `bidRow` anchor | mirror in day rows; glance counting rules are fixed (phone-guide parity) |
| Crew names / seniority / picks | **not here** — `src/data.js` is upstream; resync from the Bid 196 artifact | re-record hash |
| Different storage key | `extra.js` + `load()/save()` prefix | never `b196.` |
| Keyboard shortcut | `extra.js` keydown block | ignore inputs; no modifier combos |
| Publish | Artifact tool `file_path dist/bid197.html` | same path keeps the URL; add `label` |

Always: `python3 build.py && node tests/sweep.js`, open two screenshots (phone overview, desktop bid page), then publish.

## 9. When the Bid 197 sheet is issued (data swap)

1. Build the new `data.js` (same shape; `DATA.title "IBU Bid 197"`, 197 bids/crew/sen, `SCHED` matched to the timetable in force). Put it at `src/data.js`; record its hash.
2. Move today's Bid 196 data into `src/prev196.js` as `window.PREV` (`name "Bid 196", dates, days 119, timetable, bids, sched, capt`) and author `window.CHG` (bids/gone/carry/capt) the way `prev195.js` does. Point `build.py` at `prev196.js`.
3. `cycle.js`: `sheet: 197, prevSheet: 196, provisional: false, start/end/sheetStart/sheetEnd/sheetDates` real; `banner` can stay (ignored when not provisional).
4. Check `BID_START` uses (`daysToGo`, hero), the Changes "wk" counts (`SHEET_START/END`), and any hard-coded Bid 196 facts inside upstream text (`wsGanttSVG` crew labels for bids 29/30/31, `viewShuttle` round-trip counts, `capJobCard` "36 lines…", `viewChanges` seat rows 36/3/2/1, "Also different" bullets). Those describe the sheet and must be rewritten with it.
5. Rebuild, sweep, publish to the same URL. Update `.claude/skills/bid197-dashboard/SKILL.md`.

## 10. Test checklist (tests/sweep.js does all of this; run it every time)

- 48 routes × {390, 1100} px: zero page errors, no `undefined/NaN`, every bid hero has `.gl.gl-hero`, every route line has `.tli` items, no horizontal scroll at 390.
- Phone: no control under 44 px, no text under 12 px (SVG and `<sup>` excluded).
- Functional: banner open→collapse→stored under `b197.`, no `b196.` writes; status pill provisional; theme cycles; hero fact → weekends filter → URL; stat tile → sort; URL filters apply; day bar → day; gantt row → bid; load chart readout + chips; share copies "Bid 197 #n"; `]` steps; `s` stars; compare `.best`; `/` focuses search; crew-grid name → search; Changes leads with "Bid 196 → Bid 197"; title "IBU Bid 197 Dashboard".
- Look at `tests/shots/phone-overview.png`, `desktop-overview.png`, `desktop-bid-7.png`, `desktop-overview-dark.png`.

## 11. Known quirks kept from upstream (do not "fix" silently)

Rail buttons never get `s-AM/PM/V`; `forLeg(null)` returns a missing symbol; JS phone breakpoint 960 vs CSS 900; `cnt` unused; `state.lineQ`/`sysOff` unused; the two-document wrapper is added by the publish step (dist has one doctype). `<sup>` stars render at 8.7 px. `AUDIT_NOTES`, `CHG.carry[].text` and some itinerary strings are injected as HTML: data must stay trusted.
