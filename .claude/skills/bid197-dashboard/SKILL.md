---
name: bid197-dashboard
description: Revise, rebuild, test and republish the IBU Bid 197 dashboard (artifact 6tH3od7uvMHVP2AmWo6iGE). Use for any Bid 197 dashboard change, the Bid 197 data swap when the sheet is issued, or when Artit asks for a "bid 197" revision, redesign, new interaction or PDF.
---

# Bid 197 dashboard

Everything lives in `bid197/` on branch `claude/bid-197-interactive-dashboard-8fb30e`. **Read `bid197/UX-MAP.md` first**: it maps every view, component, function, state key, storage key, token and anchor, and has the revision playbook and the data-swap procedure. `bid197/ux-map.json` is the machine-readable subset.

## Non-negotiables

- The Bid 197 sheet is not issued (as of Oct 28, 2026). The dashboard runs on **provisional Bid 196 data** and must say so (amber strip, amber pill, hero subtitle). Never present it as Bid 197 data or current vacancies. Never remove the provisional labelling until `cycle.js` has `provisional: false` with a real sheet.
- Never edit the maintained Bid 196 artifact (BV5gKTMZgGTYjd8ASqx9o4) or its Compact companion from this work. `src/data.js` is a byte-identical copy of its data block; refresh it from the live artifact, never by hand.
- Storage namespace is `b197.`; never read or write `b196.*`.
- Redeploy to the existing URL https://claude.ai/artifact/6tH3od7uvMHVP2AmWo6iGE (same `file_path dist/bid197.html`). Never a second URL.
- Design rules from the `ferry-crew-dashboard` skill still apply: hue has two jobs (route identity, status); Barlow / Barlow Semi Condensed; nothing under 12 px; 44 px targets on phones; glance rows count exactly like the phone guide; crew slots stay as the data says, never invent names; "AMS" never "AO"; Artit Ekaparbbandhit spelled exactly.

## Workflow for a revision

1. `cd bid197 && python3 build.py` (runs `patch.py`, checks the data hash, `node --check`, writes `dist/bid197.html`).
2. Make the change in the right place (UX-MAP §8): wording → `cycle.js`; style → `extra.css`; behaviour → `extra.js` + an anchored `rep()` in `patch.py` (anchor copied from `src/app.js`, must be unique); charts → the lib section of `patch.py`.
3. `python3 build.py && node tests/sweep.js` — must print `ALL CHECKS PASSED`. Then look at `tests/shots/phone-overview.png` and `desktop-bid-7.png`.
4. Publish with the Artifact tool, `file_path /home/user/learning/bid197/dist/bid197.html`, a short `label`.
5. If the change is visual, update the design canvas https://claude.ai/artifact/H8D8ho8eMcdkeTMHS2YC1i (files under `bid197/design/project/`, root `bid197/design`), and keep UX-MAP.md current.
6. Commit to the branch and push (`git push -u origin claude/bid-197-interactive-dashboard-8fb30e`).

## When the Bid 197 sheet posts

Follow UX-MAP §9: new `src/data.js` + hash, `src/prev196.js` (PREV + authored CHG), `cycle.js` flipped, rewrite the upstream hard-coded sheet facts listed there, rebuild, sweep, publish, then update this skill's first bullet.

## PDF

Reuse the `ferry-bid-phone-guide` skill with `dist/bid197.html`'s `data.js` + `icons.js` + fonts; label the cover "provisional Bid 196 lines" while `CYCLE.provisional` is true.

## Related skills

- `ferry-bid-new-cycle` — make the Bid 198+ dashboard from this one (split script, re-pointing checklist).
- `dashboard-ux-map` — regenerate UX-MAP.md / ux-map.json / the mind-map page after a revision.
- `design-revision-canvas` — add or change artboards on the design canvas.
- `github-empty-repo-pr` — pushing, 403 recovery and pull requests.
