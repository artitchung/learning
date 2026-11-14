---
name: dashboard-ux-map
description: Build a UI/UX map for any dashboard or artifact so later revisions are fast — a text map (UX-MAP.md), a machine-readable ux-map.json, and a published mind-map page. Use when Artit asks for a "UX map", "UI map", "map for revisions", or after building a new dashboard.
---

# Dashboard UX map

Goal: whoever revises the page next (usually Claude in a later session) can find the file, function, CSS class and data field for any change without re-reading the whole page. Worked example: `bid197/UX-MAP.md`, `bid197/ux-map.json`, published at https://claude.ai/artifact/JdiEyMYpbKAQjni2HJSCtp.

## 1. Inventory (from the code, not from memory)

Run these on the page's app script and CSS (adjust paths):
```bash
grep -n -o "^  function [A-Za-z0-9_]*\|^  var [A-Z_]* =" app.js        # functions + constants with line numbers
grep -o 'load("[a-zA-Z]*"' app.js | sort -u                          # persisted keys
grep -n -o '^[^{]\{0,120\}{' app.css | sed 's/{$//'                    # selectors
grep -n "parseHash\|location.hash" app.js                             # routes
```
Also note the data globals and their shapes (`node -e` eval of the data script, print `Object.keys`).

## 2. UX-MAP.md — sections, in this order

1. Status of the data (provisional? source? owner of the data block?)
2. Build pipeline (diagram as a code block; what never to edit by hand)
3. Globals and files (table: global · file · shape · who edits it)
4. Routing, state, storage (routes table, `state` keys, storage prefix + keys, render model)
5. Shell and header (tree of the DOM shell)
6. Component inventory (table: component · made by · styled by · interactions)
7. Design system (tokens, type, rules)
8. Revision playbook (table: ask → file → how)
9. Data swap / next cycle steps
10. Test checklist
11. Known quirks kept on purpose

## 3. ux-map.json

Same facts, machine-readable: `artifacts`, `pipeline`, `scriptOrder`, `globals`, `routes`, `state`, `storage`, `components[]{name,fn,file,css,interactions}`, `tokens`, `playbook`, `dataSwap`, `tests`.

## 4. Mind-map page

Write a spec (see `example-spec.json`: title, heading, intro, notice, links, center, 6–8 branches with 3–10 leaves, sections) and run:
```bash
python3 .claude/skills/dashboard-ux-map/scripts/make_mindmap.py spec.json dist/ux-map.html
```
The page follows the artifact contract (tokens for light/dark, 16 px gutters, map scrolls sideways on phones, 44 px links). Screenshot it once at 1200 px; if leaf labels clip at the edges, shorten them. Publish with icon `map`; republish the same path to keep the URL.

## 5. Keep it current

Every revision that adds a view, component, state key or storage key updates UX-MAP.md and ux-map.json in the same commit, and republishes the mind map if a branch changed. Point the project's own skill (e.g. `bid197-dashboard`) at the map.
