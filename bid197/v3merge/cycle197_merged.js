/* Bid 197 dashboard — merged onto the newest Bid 196 build ("v3") (Nov 13, 2026): v3's code, design and data (Live view,
   Fleet, Track, Navigation tab, search palette; crew roster Oct 27 with lead deckhands, seniority JD Oct 30 + Nov 7
   additions), plus the Nov 4 timetable corrections from the Bid 196 dashboard. The Bid 197 sheet is NOT issued, so
   every line, time and name is Bid 196 data and the page says so. Storage namespace "b197." (CY.store default).
   When the Bid 197 sheet is issued: swap the data block, set sheet: 197, prevSheet: 196, provisional: false. */
window.CYCLE = {
  bid: 197,
  title: "IBU Bid 197 Dashboard",
  brand: "Bid 197",
  brandSub: "Sheet not issued · showing Bid 196 lines (Nov 2, 2026 – Feb 28, 2027) · crew roster Oct 27 · leads + seniority Oct 30 · timetable checked Nov 4",
  sheet: 196,
  prevSheet: 195,
  provisional: true,
  start: "2027-03-01",
  end: null,
  startNote: "expected — the day after Bid 196 ends; the sheet is not issued yet",
  sheetStart: "2026-11-02",
  sheetEnd: "2027-02-28",
  sheetDates: "Nov 2, 2026 – Feb 28, 2027, issued Oct 13",
  heroSub: "Bid 197 preview. The sheet is not out yet, so every line, time and name below is from the Bid 196 Final-Final sheet (Nov 2, 2026 – Feb 28, 2027). When the Bid 197 sheet posts, the data is swapped and this page updates.",
  banner: {
    short: "Provisional preview: showing Bid 196 lines until the Bid 197 sheet is issued.",
    long: "Bid 197 information is not available yet. Everything on this dashboard — bid lines, report times, runs, the crew list and the seniority projections — is the Bid 196 Final-Final sheet (Nov 2, 2026 – Feb 28, 2027; crew roster Oct 27, leads and seniority Oct 30, 2026). It is not Bid 197 data and does not show current vacancies. Unofficial: confirm with Dispatch.",
    pill: "Provisional · Bid 196 lines"
  }
};
