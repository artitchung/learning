/* Bid cycle metadata for this dashboard. Loaded BEFORE data.js so data.js can stay byte-identical to the
   maintained Bid 196 artifact (scheduled crew updates edit that block; copy it over 1:1 when it changes).
   When the Bid 197 sheet is issued: replace data.js with the Bid 197 data block, move the Bid 196 data to a
   prev196.js (window.PREV / window.CHG, same shape as prev195.js), then set sheet: 197, prevSheet: 196,
   provisional: false, and the real dates below. Every label in the app follows these fields. */
window.CYCLE = {
  bid: 197,                 // the bid this dashboard is for (header, hero, storage namespace "b197.")
  sheet: 196,               // the bid sheet the lines, times and crew below actually come from
  prevSheet: 195,           // the sheet window.PREV / window.CHG compare against (prev195.js)
  provisional: true,        // true while the Bid 197 sheet has not been issued
  start: "2027-03-01",      // expected first day of Bid 197 (the day after Bid 196 ends); not official yet
  end: null,                // unknown until the sheet posts
  startNote: "expected — the day after Bid 196 ends; the sheet is not issued yet",
  sheetStart: "2026-11-02", // the sheet the data comes from (Bid 196): first and last day
  sheetEnd: "2027-02-28",
  sheetDates: "Nov 2, 2026 – Feb 28, 2027, issued Oct 13",
  heroSub: "Bid 197 preview. The sheet is not out yet, so every line, time and name below is from the Bid 196 Final-Final sheet (Nov 2, 2026 – Feb 28, 2027). When the Bid 197 sheet posts, the data is swapped and this page updates.",
  banner: {
    short: "Provisional preview: showing Bid 196 lines until the Bid 197 sheet is issued.",
    long: "Bid 197 information is not available yet. Everything on this dashboard — bid lines, report times, runs, the crew list and the seniority projections — is the Bid 196 Final-Final sheet (Nov 2, 2026 – Feb 28, 2027; crew snapshot Oct 27, 2026). It is not Bid 197 data and does not show current vacancies. Unofficial: confirm with Dispatch.",
    pill: "Provisional · Bid 196 lines"
  }
};
