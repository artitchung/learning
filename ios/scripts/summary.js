// Build the home-screen summary for the iPhone app from the dashboards' own data.
// usage: node ios/scripts/summary.js > ios/CrewBid/CrewBid/Resources/summary.json
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.join(__dirname, "..", "..", "bid197");
function load(files) {
  const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
  files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f }));
  return ctx;
}
const TOK = { MON: 0, TUE: 1, TUES: 1, WED: 2, WEDS: 2, THU: 3, THUR: 3, THURS: 3, FRI: 4, SAT: 5, SUN: 6 };
function offDays(s) { const out = {}; String(s || "").toUpperCase().split("/").forEach((part) => { const r = part.split("-").map((x) => TOK[x.trim()]); if (r.length === 2 && r[0] != null && r[1] != null) { for (let i = r[0], k = 0; k < 7; k++) { out[i] = 1; if (i === r[1]) break; i = (i + 1) % 7; } } else if (r[0] != null) out[r[0]] = 1; }); return out; }
function summarize(cycleFile, html, id) {
  const c = load([cycleFile, "src/data.js"]); const CY = c.CYCLE, D = c.DATA, bids = D.bids;
  const sess = { AM: 0, PM: 0, V: 0 }; bids.forEach((b) => sess[b.s]++);
  let filled = 0, open = 0; bids.forEach((b) => b.crew.forEach((x) => { if (x === null) return; x === "OPEN" ? open++ : filled++; })); (D.bidOff || []).forEach((x) => (x === "OPEN" ? open++ : filled++));
  const weekendsOff = bids.filter((b) => { const o = offDays(b.off); return o[5] && o[6]; }).length;
  const appTitle = CY.provisional ? "Bid " + CY.bid + " preview" : /^R\d/.test(CY.brandTag || "") ? "Bid " + CY.bid + " " + CY.brandTag.split(" ")[0] : "Bid " + CY.bid;
  return { id, html, appTitle, bid: CY.bid, title: CY.title, brandTag: CY.brandTag || "IBU DECKHAND", provisional: !!CY.provisional, sheet: CY.sheet,
    start: CY.start, end: CY.end, startNote: CY.startNote || null, sheetDates: CY.sheetDates, bids: bids.length, am: sess.AM, pm: sess.PM, varies: sess.V,
    seatsFilled: filled, seats: filled + open, weekendsOff, seniority: D.sen.length };
}
const out = { generated: new Date().toISOString(), crewSnapshot: "Oct 28, 6:50 PM",
  dashboards: [summarize("cycle196r2.js", "bid196r2", "bid196r2"), summarize("cycle.js", "bid197", "bid197")] };
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
