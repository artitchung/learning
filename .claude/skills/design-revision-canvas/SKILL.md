---
name: design-revision-canvas
description: Produce professional design revisions for an existing dashboard or page as a Design canvas artifact (phone and desktop artboards, before/after comparisons, sticky notes explaining each change), then apply the revisions to the real page. Use when Artit asks to "use the design feature", "do design revisions", "make it look professional", or wants to see a redesign before or alongside a build.
---

# Design revision canvas

Worked example: https://claude.ai/artifact/H8D8ho8eMcdkeTMHS2YC1i (files in `bid197/design/project/`). Act as a senior UI designer: every revision must have a reason a user would feel, not decoration.

## 1. Audit before drawing

Screenshot the current page at 390 px and 1100 px (Playwright, `fullPage: true`) and look at them. Write down, in one line each, what to fix. Typical high-value revisions:
- one status/provisional cue in the shell instead of repeating it on every row
- every summary number is a control (tap a stat, a bar, a gantt row → what it counts)
- charts read out under the finger (cursor + value + "who")
- identity colour on row tiles (hue = identity or status only, never both)
- 44 px targets and 12 px minimum text on phones; a theme toggle that respects auto
- shareable state (filters in the URL), share-as-text, keyboard and swipe navigation

## 2. Create the canvas

1. `Artifact action: "quickstart", intent: "design"` → it returns the Design type URL.
2. Publish with that `type_url`, a real `title` (e.g. "Bid 197 Design Revisions"), `auto_open: "after_first_write"`, nothing else.
3. Write `project/canvas.json` FIRST with every artboard already in `boards` and `order`, plus sticky `notes` (one per artboard, coloured by theme) and one `title1` note above the row. Then `project/Main.dc.html`; publish those two in one call with `root` = the folder holding `project/`.
4. Then ONE artboard file per publish (write, publish, next). Never two writes in a row. Do not render or verify the canvas unless asked.

Artboard set that worked:
| File | Size | Shows |
|---|---|---|
| `Main.dc.html` | 390×1180 | phone overview: header, status strip, hero, tappable stats, tab bar |
| `BidPage.dc.html` | 390×980 | phone detail page: pager with new actions, hero, timeline strip |
| `Charts.dc.html` | 880×640 | desktop: chart cursor readout, tappable bars, gantt with "now" |
| `BidRow.dc.html` | 880×420 | before / after of the core list row, with the reasons listed |

## 3. Artboard rules (fail silently if broken)

- Keep `<script src="./support.js"></script>` exactly; close every element, quote every attribute.
- Fixed root size = the board's `w`×`h`; layout with flex/grid + `gap`; inline `style` for everything the panel should edit.
- Fonts only via a Google Fonts `<link>` in `<helmet>`; icons as inline stroke SVG (no emoji).
- Real `<button>`, `<a href>`, `<label>` even in mockups; text contrast 4.5:1; targets 44 px.
- Always include the `<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":W,"height":H}}'>` block with `class Component extends DCLogic { renderVals() { return {}; } }`.
- Use the project's real tokens and real content (actual bid numbers, times, names from the data); no lorem ipsum.

## 4. Apply to the real page

Put the revisions in the page's own style layer (for bid dashboards: `extra.css` + `extra.js` + anchored `patch.py` edits), rebuild, run the sweep, compare screenshots with the canvas, publish. Update the UX map (`dashboard-ux-map`) with any new components.
