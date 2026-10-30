---
name: ferry-bid-new-cycle
description: Create the next IBU ferry bid dashboard (Bid 198, 199, …) from the previous bid's dashboard artifact, interactive, clearly marked provisional until the new sheet is issued, with its own storage namespace, build pipeline, tests and a new artifact URL. Use when Artit asks to "make a bid N dashboard", "use bid N as a template", or "start the next bid".
---

# New bid cycle dashboard

Worked example: `bid197/` in this repo (built from the Bid 196 artifact BV5gKTMZgGTYjd8ASqx9o4, published at https://claude.ai/artifact/6tH3od7uvMHVP2AmWo6iGE). Copy its approach; do not rebuild from scratch. Also load `ferry-crew-dashboard` for the design system and content rules.

## Inputs to settle (decide, don't ask, unless truly unknown)

| Name | Meaning | Bid 197 example |
|---|---|---|
| TARGET | the bid this dashboard is for | 197 |
| SHEET | the bid sheet the data actually comes from | 196 (197 not issued yet) |
| PREV | the sheet `PREV`/`CHG` compares against | 195 |
| Template artifact | the live dashboard to copy | BV5gKTMZgGTYjd8ASqx9o4 |

If the new sheet is not out, the dashboard is **provisional**: it shows the previous sheet's lines and says so on every page (amber strip above the header, amber status pill, hero subtitle), never presents them as the new bid's data or vacancies. Check Notion (Knowledge Atoms) and Drive (`bid<N>-dashboard/planning`) first for decisions already made about this cycle.

## Steps

1. **Read the template live.** Artifact `action: "read"` on the template URL saves the full HTML. Never edit the template artifact.
2. **Split it.** `python3 .claude/skills/ferry-bid-new-cycle/scripts/split_artifact.py <saved.html> bid<TARGET>/src` → head, fonts, css, shell, data, prev, icons, lib, baymap, app + `UPSTREAM.sha256`.
3. **Copy the tooling** from the latest cycle folder (`bid197/`): `patch.py build.py cycle.js extra.js extra.css tests/ README.md UX-MAP.md ux-map.json`. Run `scripts/find_bid_numbers.sh bid<TARGET> <old target> <old sheet> <old prev>` and re-point every hit:
   - `cycle.js`: bid, sheet, prevSheet, provisional, dates, heroSub, banner text.
   - `patch.py`: anchors are copied from the *template's* text (e.g. `<title>IBU Bid 197 Dashboard</title>` when the template is the 197 page), replacements use TARGET. If the template is already a patched dashboard, many patches are already in it: drop those `rep()` calls instead of forcing them; every remaining anchor must match exactly once.
   - `build.py`: output name, `prev<N>.js` name. `tests/sweep.js`: storage prefix `b<TARGET>.`, title, hero, Changes header.
4. **Build and test:** `python3 build.py && node tests/sweep.js` must end with `ALL CHECKS PASSED`. Look at `tests/shots/phone-overview.png` and `desktop-bid-7.png` yourself; fix what they show.
5. **Publish a new artifact** (`file_path dist/bid<TARGET>.html`, icon `ship`). Same path on later publishes keeps the URL.
6. **Map and design:** run the `dashboard-ux-map` skill, and the `design-revision-canvas` skill if the look changes. Create `.claude/skills/bid<TARGET>-dashboard/SKILL.md` modelled on `bid197-dashboard`.
7. **Commit and push** on the session branch; open a PR only when asked (`github-empty-repo-pr` if the repo has no base branch).

## Rules that bit last time

- Storage prefix must change (`b<TARGET>.`); assert in the sweep that nothing writes the old prefix.
- `data.js` stays byte-identical to the template's first script; the hash check in `build.py` enforces it. Refresh from the live template, never by hand.
- Python `%`-formatting breaks on CSS `100%`; escape or use placeholders carefully in generators.
- Phone checks: no control under 44 px, no text under 12 px (`<sup>` stars and SVG excluded). The hero facts became buttons and needed `min-height:44px`.
- Never `rm -rf` with a relative glob after `cd`; the safety check blocks it. Use `git worktree remove` or plumbing.
- When the real sheet posts, follow the data-swap section of that cycle's `UX-MAP.md` (§9 in bid197).
