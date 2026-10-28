---
name: bid196r2-dashboard
description: Revise, rebuild, test and republish the IBU Bid 196 R2 dashboard (artifact SxR3GazcGsdheJkV6PBVkZ) — the real Bid 196 sheet with the Bid 197 redesign and interactions. Use when Artit asks for a "196 R2" / "bid 196 r2" change.
---

# Bid 196 R2 dashboard

Same tooling as the Bid 197 dashboard (`bid197/`, read `bid197/UX-MAP.md` first); only the cycle file differs.

- Cycle file: `bid197/cycle196r2.js` (bid 196, not provisional, storage `b196r2.`, title "IBU Bid 196 Dashboard R2", header "Bid 196" + "R2 · IBU DECKHAND").
- Build: `cd bid197 && python3 build.py --cycle cycle196r2.js` → `dist/bid196r2.html`.
- Test: `node tests/sweep.js dist/bid196r2.html` → must print `ALL CHECKS PASSED`; screenshots in `tests/shots/bid196r2/`.
- Publish: Artifact `file_path /home/user/learning/bid197/dist/bid196r2.html` (keeps https://claude.ai/artifact/SxR3GazcGsdheJkV6PBVkZ).
- A change to `extra.js`, `extra.css` or `patch.py` affects BOTH builds: rebuild and sweep both (`python3 build.py` and `--cycle cycle196r2.js`), republish both.
- The original Bid 196 artifact (BV5gKTMZgGTYjd8ASqx9o4) stays the maintained one; never edit it from here. When its crew data changes, resync `src/data.js` (see bid197-dashboard) and rebuild both.
