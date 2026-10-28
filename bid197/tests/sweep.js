// Playwright sweep for any build (Bid 197 preview, Bid 196 R2). Run: node tests/sweep.js [dist/<name>.html]
// Expectations (title, storage prefix, provisional or not) come from the page's own window.CYCLE.
// Checks: zero page errors on every route at 390 px and 1100 px, every bid renders a hero glance row and a run list,
// no "undefined" text, no horizontal scroll on phones, no interactive control under 44 px on phones, no text under 12 px,
// and a functional pass over the new Bid 197 interactions (banner, theme, stat buttons, chart taps, gantt taps,
// URL filters, compare "best", share, keyboard, crew-grid names). Writes screenshots to tests/shots/.
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const file = path.resolve(process.argv[2] || path.join(__dirname, "..", "dist", "bid197.html"));
const shots = path.join(__dirname, "shots", path.basename(file, ".html")); fs.mkdirSync(shots, { recursive: true });
const url = "file://" + file;
let fails = 0; const fail = (m) => { fails++; console.log("FAIL " + m); }; const ok = (m) => console.log("ok   " + m);

async function fresh(browser, width, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, hasTouch: width < 600, colorScheme: opts.dark ? "dark" : "light" });
  const page = await ctx.newPage(); const errors = [];
  page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(url + "#overview"); await page.waitForSelector("#main .hero");
  return { ctx, page, errors };
}
async function openMore(page) { await page.evaluate(() => { const d = document.querySelector("details.more"); if (d && !d.open) d.open = true; }); await page.waitForTimeout(80); }
async function route(page, hash) { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(120); }

(async () => {
  const browser = await chromium.launch();
  const bidNs = JSON.parse(fs.readFileSync(file, "utf8").match(/var DATA = \{[\s\S]*?\n  bids: \[/) ? "[]" : "[]");
  for (const width of [390, 1100]) {
    const { ctx, page, errors } = await fresh(browser, width);
    const ns = await page.evaluate(() => window.DATA.bids.map((b) => b.n));
    const routes = ["overview", "bids", "day-2", "day-5", "crew", "captains", "changes", "shuttle", "compare"].concat(ns.map((n) => "bid-" + n));
    for (const r of routes) {
      await route(page, r);
      const txt = await page.evaluate(() => document.getElementById("main").innerText);
      if (/undefined|NaN|\[object/.test(txt)) fail(width + " " + r + " shows undefined/NaN");
      if (r.startsWith("bid-")) {
        const g = await page.$$("#main .bid-hero .gl.gl-hero"); if (!g.length) fail(width + " " + r + " has no hero glance row");
        const hasRoute = await page.evaluate(() => { const b = window.SCHED.bids.find((x) => "bid-" + x.n === location.hash.slice(1)); return b && b.lines.some((L) => L.type === "route"); });
        if (hasRoute) { const items = await page.$$("#main .tli"); if (!items.length) fail(width + " " + r + " has no run-list items"); }
      }
      if (width === 390) {
        const sw = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        if (sw) fail("390 " + r + " scrolls horizontally");
      }
    }
    if (errors.length) fail(width + " page errors: " + errors.slice(0, 5).join(" | ")); else ok(width + " zero page errors over " + routes.length + " routes");
    await ctx.close();
  }

  // phone: tap targets and text sizes on the busiest views
  {
    const { ctx, page } = await fresh(browser, 390);
    for (const r of ["overview", "bids", "bid-1", "crew", "changes"]) {
      await route(page, r);
      const small = await page.evaluate(() => {
        const out = []; const els = document.querySelectorAll("#main button, #main a, #main [role=button], #main input, #main select, .topbar button, .topbar a, .provo button, .tabbar a, .rail button");
        els.forEach((el) => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return; const cs = getComputedStyle(el); if (cs.visibility === "hidden") return; if (Math.min(r.width, r.height) < 44 && !el.closest("svg")) out.push((el.className || el.tagName) + " " + Math.round(r.width) + "x" + Math.round(r.height)); });
        return out.slice(0, 12);
      });
      if (small.length) fail("390 " + r + " controls under 44px: " + small.join(", "));
      const tiny = await page.evaluate(() => { const out = []; document.querySelectorAll("#main *, .provo *, .topbar *").forEach((el) => { if (!el.childNodes.length || el.closest("svg") || el.tagName === "SUP") return; const t = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (!t) return; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12 && el.getBoundingClientRect().height) out.push(el.className + " " + fs); }); return out.slice(0, 8); });
      if (tiny.length) fail("390 " + r + " text under 12px: " + tiny.join(", "));
      await page.screenshot({ path: path.join(shots, "phone-" + r + ".png"), fullPage: true });
    }
    ok("phone tap-target and text-size pass done");
    await ctx.close();
  }

  // functional pass
  {
    const { ctx, page, errors } = await fresh(browser, 1100);
    const CY = await page.evaluate(() => window.CYCLE), PFX = (CY.store || "b" + CY.bid) + ".", TN = "Bid " + CY.bid;
    const TITLE = CY.title || "IBU Bid " + CY.bid + " Dashboard"; ok("cycle: " + TITLE + " · provisional " + !!CY.provisional + " · storage " + PFX);
    const otherPfx = ["b196.", "b197.", "b196r2."].filter((x) => x !== PFX);
    // banner
    if (!CY.provisional) { if (await page.$(".provo:not([hidden])")) fail("provisional banner shown on a published sheet"); else ok("no provisional banner (published sheet)"); const pill0 = await page.textContent(".status-pill span"); if (/Provisional/.test(pill0)) fail("status pill says provisional: " + pill0); else ok("status pill: " + pill0); }
    const banner = CY.provisional ? await page.$(".provo:not([hidden]) .provo-h") : null; if (CY.provisional && !banner) fail("provisional banner missing"); else if (banner) {
      const open = await page.$(".provo.open .provo-b"); if (!open) fail("banner not open on first visit");
      await page.click(".provo .provo-acts .btn.primary"); if (await page.$(".provo.open")) fail("Got it did not collapse the banner"); else ok("banner collapses and stays visible");
      const stored = await page.evaluate((p) => Object.keys(localStorage).filter((k) => k.startsWith(p)), PFX); if (!stored.includes(PFX + "provSeen")) fail("banner state not saved under " + PFX + "*");
      const pill = await page.textContent(".status-pill span"); if (!/Provisional/.test(pill)) fail("status pill is not provisional: " + pill);
    }
    // theme
    await page.click("#theme"); const t1 = await page.evaluate(() => document.documentElement.getAttribute("data-theme")); if (t1 !== "light") fail("theme toggle 1 -> " + t1);
    await page.click("#theme"); const t2 = await page.evaluate(() => document.documentElement.getAttribute("data-theme")); if (t2 !== "dark") fail("theme toggle 2 -> " + t2); else ok("theme cycles auto > light > dark");
    await page.screenshot({ path: path.join(shots, "desktop-overview-dark.png"), fullPage: true });
    await page.click("#theme");
    // hero facts + stat buttons
    await page.click(".hero-cd button.cd:nth-of-type(2)"); await page.waitForTimeout(150); if (!/^#bids/.test(await page.evaluate(() => location.hash))) fail("weekends-off hero fact did not open bids"); else { const chips = await page.textContent("#main .act"); if (!/Weekends off/.test(chips)) fail("weekends filter not applied from hero"); else ok("hero fact applies the weekends filter"); }
    const h = await page.evaluate(() => location.hash); if (!/off=wkend/.test(h)) fail("filter not written to the URL: " + h); else ok("filters live in the URL: " + h);
    await route(page, "overview"); await openMore(page); await page.click("button.stat:nth-of-type(4)"); await page.waitForTimeout(150);
    if (!/sort=sail/.test(await page.evaluate(() => location.hash))) fail("sailings stat did not sort by sailings"); else ok("stat tile navigates with sort");
    // URL filters round-trip
    await page.goto(url + "#bids?sess=PM&route=HB&sort=tt"); await page.waitForSelector("#main .list, #main .empty");
    const act = await page.textContent("#main .act"); if (!/PM/.test(act) || !/Harbor/.test(act)) fail("URL filters not applied: " + act); else ok("URL filters apply on load");
    // charts + gantt
    await route(page, "overview"); await openMore(page);
    await page.click(".chart.tappable .bar:nth-of-type(1)"); await page.waitForTimeout(150); if (!/^#day-\d/.test(await page.evaluate(() => location.hash))) fail("day bar tap did not open the day"); else ok("day bar opens day view");
    await route(page, "overview"); await openMore(page);
    const bars = await page.$$(".chart.tappable .bar"); if (bars.length < 8) fail("too few tappable bars: " + bars.length);
    await page.click(".gantt-box .gr:nth-of-type(1)"); await page.waitForTimeout(150); if (!/^#bid-\d+/.test(await page.evaluate(() => location.hash))) fail("gantt row tap did not open a bid"); else ok("gantt row opens its bid");
    await route(page, "overview");
    const svg = await page.$(".lc-box svg"); await svg.scrollIntoViewIfNeeded(); const bb = await svg.boundingBox(); await page.mouse.move(bb.x + bb.width * 0.4, bb.y + bb.height * 0.5); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(100);
    const read = await page.textContent(".lc-read"); if (!/\d\d:\d\d/.test(read)) fail("load chart readout: " + read); else ok("load chart reads: " + read.trim().slice(0, 60));
    const chips = await page.$$(".lc-list .chip"); if (!chips.length) fail("load chart tap listed no bids"); else ok("load chart tap lists " + chips.length + " bids");
    // bid page: share + keyboard
    await route(page, "bid-3"); await page.waitForSelector("#main .bid-hero");
    await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.click(".pager .iconbtn.share"); await page.waitForTimeout(100); const clip = await page.evaluate(() => navigator.clipboard.readText()); if (!new RegExp(TN + " #3").test(clip)) fail("share text: " + clip.slice(0, 80)); else ok("share copies: " + clip.split("\n")[0]);
    await page.keyboard.press("]"); await page.waitForTimeout(150); if ((await page.evaluate(() => location.hash)) !== "#bid-4") fail("] key did not step to bid 4"); else ok("] steps to the next bid");
    await page.keyboard.press("s"); await page.waitForTimeout(100); const fav = await page.evaluate((p) => JSON.parse(localStorage.getItem(p + "fav") || "[]"), PFX); if (!fav.includes(4)) fail("s key did not star"); else ok("s stars the bid");
    await page.keyboard.press("c"); await page.keyboard.press("["); await page.waitForTimeout(100); await page.keyboard.press("c"); await page.waitForTimeout(100);
    await route(page, "compare"); const best = await page.$$("table.cmp td.best"); if (!best.length) fail("compare has no best cells"); else ok("compare marks " + best.length + " best cells");
    await page.keyboard.press("/"); await page.waitForTimeout(150); const focused = await page.evaluate(() => document.activeElement && document.activeElement.id); if (focused !== "bidq") fail("/ did not focus the search: " + focused); else ok("/ focuses the search");
    // crew grid name -> seniority search
    await page.goto(url + "#crew"); await page.waitForSelector("#senlist"); if (await page.$("#gridfold summary")) { await page.click("#gridfold summary"); await page.waitForTimeout(100); }
    const cell = await page.$("button.gc.ok"); if (!cell) fail("no crew grid name buttons"); else { const name = await cell.getAttribute("title"); await cell.click(); await page.waitForTimeout(150); const q = await page.inputValue("#crewq"); if (!q || !name.startsWith(q)) fail("grid name did not search: " + q + " / " + name); else ok("crew grid name searches the list: " + q); }
    // changes: provisional card first
    await route(page, "changes");
    if (CY.provisional) { const first = await page.textContent("#main .card.lead .card-t"); if (!new RegExp("Bid " + CY.sheet + " → " + TN).test(first)) fail("changes lead card: " + first); else ok("changes leads with " + first); }
    else { const first = await page.textContent("#main .card .card-t"); if (!new RegExp("What changed from Bid " + CY.prevSheet).test(first) || await page.$("#main .card.lead")) fail("changes header: " + first); else ok("changes leads with " + first); }
    // the cycle name is used where it belongs
    await route(page, "overview"); const ht = await page.textContent("#main .hero-t"); if (!new RegExp(TN).test(ht)) fail("hero title: " + ht);
    const title = await page.title(); if (title !== TITLE) fail("title: " + title); else ok("title: " + title);
    const leak = await page.evaluate((o) => Object.keys(localStorage).filter((k) => o.some((p) => k.startsWith(p))), otherPfx); if (leak.length) fail("wrote another dashboard's keys: " + leak.join(",")); else ok("storage stays under " + PFX);
    await page.screenshot({ path: path.join(shots, "desktop-overview.png"), fullPage: true });
    await route(page, "bid-7"); await page.waitForTimeout(400); await page.screenshot({ path: path.join(shots, "desktop-bid-7.png"), fullPage: true });
    await route(page, "bids"); await page.screenshot({ path: path.join(shots, "desktop-bids.png"), fullPage: true });
    if (errors.length) fail("functional pass page errors: " + errors.slice(0, 5).join(" | ")); else ok("functional pass: zero page errors");
    await ctx.close();
  }
  // posted-names mode sanity: already posted in the 196 data (crew names present) — check names show on rows
  {
    const { ctx, page } = await fresh(browser, 390); await route(page, "bids"); const crew = await page.$$("#main .bb-crew"); if (!crew.length) fail("no crew lines on bid rows although names are posted"); else ok("crew names show on rows (" + crew.length + ")"); await ctx.close();
  }
  await browser.close();
  console.log(fails ? "\n" + fails + " FAILURE(S)" : "\nALL CHECKS PASSED"); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
