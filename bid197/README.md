# IBU Bid 197 dashboard

Interactive deckhand bid dashboard for Bid 197, derived from the maintained Bid 196 dashboard. Until the Bid 197
sheet is issued it runs on provisional Bid 196 data and says so on every page.

- Live: https://claude.ai/artifact/6tH3od7uvMHVP2AmWo6iGE
- Design revisions canvas: https://claude.ai/artifact/H8D8ho8eMcdkeTMHS2YC1i
- Map for revisions: [UX-MAP.md](UX-MAP.md) · [ux-map.json](ux-map.json) · skill `.claude/skills/bid197-dashboard`

```
python3 build.py          # patch.py -> build/ -> dist/bid197.html (node --check on every script)
node tests/sweep.js       # Playwright: 48 routes x 2 widths + functional pass, screenshots in tests/shots/
```

| Path | Role |
|---|---|
| `src/` | pristine Bid 196 parts (`UPSTREAM.sha256` records them); `data.js` is the upstream data block, never hand-edited |
| `cycle.js` | which bid this is, which sheet the data comes from, provisional flag, dates, banner text |
| `patch.py` | anchored, asserted edits that turn the 196 parts into the 197 app |
| `extra.js` / `extra.css` | the Bid 197 behaviours and styles injected by `patch.py` |
| `build/` | patched intermediates (generated) |
| `dist/bid197.html` | the single self-contained page that gets published (generated) |
| `tests/sweep.js` | the Playwright sweep |
| `design/project/` | the Design canvas artboards |

What is new versus Bid 196: provisional strip + pill, theme toggle (auto/light/dark), tappable hero facts and stat
tiles, bar charts and gantt rows that open what they count, a load chart that reads out under the pointer and lists
who is underway, filters carried in the URL, best-of-row outline in Compare, share-as-text on the bid page, swipe and
keyboard navigation between bids, crew-grid names that search the seniority list, a Bid 196 → 197 lead card on Changes,
and a route-colour accent on number tiles.
