# Handoff — Bid 197 dashboard, Bid 196 R2, skills, Crew Bid iPhone app

Cloud session `session_01P3dUj5oHUiSB4ZPRG1kS8M`, Oct 28–29, 2026. Branch `claude/bid-197-interactive-dashboard-8fb30e`,
PR https://github.com/artitchung/learning/pull/1 (into `main`). Artit is continuing on his Mac mini (`~/learning`).

## Live links

| What | Link | Built from |
|---|---|---|
| Bid 197 dashboard (provisional) | https://claude.ai/artifact/6tH3od7uvMHVP2AmWo6iGE | `bid197/dist/bid197.html` (`python3 build.py`) |
| Bid 196 R2 dashboard | https://claude.ai/artifact/SxR3GazcGsdheJkV6PBVkZ | `bid197/dist/bid196r2.html` (`python3 build.py --cycle cycle196r2.js`) |
| Bid 197 design revisions canvas | https://claude.ai/artifact/H8D8ho8eMcdkeTMHS2YC1i | `bid197/design/project/` |
| UX map (mind map page) | https://claude.ai/artifact/JdiEyMYpbKAQjni2HJSCtp | `bid197/dist/ux-map.html` (`python3 tests/make-uxmap.py`) |
| Crew Bid iPhone app design | https://claude.ai/artifact/HeDyHqD3Myzcq2NeUxKFeU | `ios/design/project/` |
| Original Bid 196 dashboard (maintained, never edited here) | https://claude.ai/artifact/BV5gKTMZgGTYjd8ASqx9o4 | — |

All artifacts are private until shared from their Share menu.

## What Artit asked for, in order, and what happened

1. **"Using my IBU bid 196 dashboard as a template, create a new bid197 dashboard, make everything interactive, create a UI/UX map for yourself, use your design feature to do design revisions."**
   Done. `bid197/` splits the Bid 196 page into `src/`, applies anchored edits (`patch.py`) plus `extra.js`/`extra.css`, builds `dist/`, tests with `tests/sweep.js`. New interactions: provisional strip + pill, theme toggle, tappable hero facts/stat tiles/bars/gantt rows, load-chart cursor with "who is underway", filters in the URL, compare best-of-row, share as text, swipe and `[ ]`/`/`/`1–5`/`s`/`c`/`t` keys, crew-grid names search the seniority list, Changes lead card. UX map: `UX-MAP.md`, `ux-map.json`, mind-map page. Design canvas with 4 artboards.
2. **"Fix github, try again"** → push worked once access was reconnected. **"Create a pull request"** → the repo was empty, so a README-only `main` was created with git plumbing and merged into the branch (unrelated histories); PR #1 opened. GitHub's default branch is still the feature branch — Artit can switch it to `main` in Settings → Branches.
3. **"Create new skills so I can reuse it"** → `.claude/skills/`: `ferry-bid-new-cycle` (split script + re-pointing checker), `dashboard-ux-map` (generic mind-map generator), `design-revision-canvas`, `github-empty-repo-pr` (base-branch script), plus `bid197-dashboard`.
4. **"Using this new bid 197 dashboard create a r2 version for bid 196"** → the build now takes a cycle file; `cycle196r2.js` gives the real Bid 196 sheet with the 197 design (not provisional, storage `b196r2.`, title "IBU Bid 196 Dashboard R2", header "Bid 196 · R2 IBU DECKHAND"). Skill `bid196r2-dashboard`.
5. **"Help me create an iPhone app from this dashboard … encrypted vault, Website address pre-filled with https://www.blueandgoldfleet.com/crew/, Password, both editable"** then **"I have Claude on my Mac, can I pick it up there after a basic skeleton? Use your design skill to create the home page."**
   Done as a skeleton in `ios/` — see `ios/README.md`. Designed Home, Vault locked, Vault unlocked and Dashboard screens first (canvas above), then wrote the SwiftUI app to match. **Never compiled** (no Swift toolchain in the cloud container); all Swift parses cleanly with tree-sitter and the Xcode project parses. Skill `crewbid-ios-app`.
6. **Mac session request (via cross-session message):** commit and push everything, resync the R2 changes made outside git, add this file. Done — see next section.

## Resync from the live R2 page (Oct 29)

The live R2 artifact was republished from another session (version `1793241014`, ~02:30 UTC Oct 29) with changes that
were not in git. They are now in the repo, and `python3 build.py --cycle cycle196r2.js` reproduces that live page
**byte for byte** (verified):
- `src/data.js` ← the live R2 data block: crew imported Oct 28 from the Bid196 Drive folder (deckhands "196 IBU Deckhands Bid — Crew List", portal snapshot Oct 28 ~6:50 PM; captains "196 Captains Bid — Crew List", Oct 17 ~3:50 PM), corrected names (e.g. W. Ladue → W. Allen, W. Bartz → B. Bartz, P.B. Lopes → P. Brown-Lopes, G. Thierry → C. G. Thierry), new `capSen`, bid-off slots Open.
- `src/app.js`: two wording changes ("…seats stay open until crew data is imported."; shorter captain-count hint).
- `cycle196r2.js` brandSub: "crew imported from file · list Oct 28, 6:50 PM".
- `src/UPSTREAM.sha256` re-recorded for `data.js` and `app.js`. **Note:** `src/data.js` no longer equals the original Bid 196 artifact's data block (that artifact is still the Oct 27 version). The live R2 page is now the data source of truth.
- Because Bid 197 shares `src/data.js`, `dist/bid197.html` was rebuilt with the new crew list and its cycle text now says "crew list Oct 28, 6:50 PM". **It has not been republished** — the live Bid 197 artifact still shows the Oct 27 crew list. Republish with the Artifact tool (`file_path bid197/dist/bid197.html`) when Artit wants it.
- The iPhone app bundle (`ios/CrewBid/CrewBid/Resources/Dashboards/`) was synced to these builds.

## Decisions made (and why)

- Bid 197 runs on **provisional Bid 196 data**, labelled on every page (Notion atom AT-96: never present it as Bid 197 evidence). `cycle.js` is the switch for the data swap; UX-MAP §9 has the steps.
- Separate storage namespaces: `b197.`, `b196r2.` (never `b196.`).
- Never edit the original Bid 196 artifact from this work.
- iPhone app: **native SwiftUI**, not a web wrapper only — the vault needs Keychain + Face ID. Home is a hub with no tab bar because the dashboards bring their own bottom tabs. Dashboards load from the app bundle with a fake https origin per dashboard so their localStorage persists; no network.
- Vault: AES-256-GCM sealed file + Keychain key (`ThisDeviceOnly`, user presence when a passcode exists); locks on background; copy clears after 60 s; no passcode → still encrypted, amber warning.
- Bundle id `com.artit.crewbid`, iOS 17+, iPhone only, Swift 5 mode, Xcode 16 folder-synced project.

## Still open / next steps

1. **Mac:** build the app in Xcode, fix compiler errors, run on simulator and iPhone (checklist in `ios/README.md`). Set the signing Team; maybe change the bundle id.
2. Decide whether to republish the Bid 197 artifact with the Oct 28 crew list (built, not published).
3. Merge PR #1 when happy; switch GitHub's default branch to `main`.
4. Optional: account-level skills (claude.ai settings) so the repo skills work outside this repo.
5. Optional: Compact companion for Bid 197 / R2 (the Bid 196 Compact artifact 3pohn9TaMmJyo4hsjsers6 was not cloned).
6. When the Bid 197 sheet is issued: data swap per `UX-MAP.md` §9 and `ferry-bid-new-cycle`.

## Pending questions for Artit

- Distribution of the app: personal team (7-day installs on your own phone) or Apple Developer Program ($99/yr) for TestFlight to coworkers?
- Should the vault also auto-fill the crew site login inside the app (an in-app browser), or is Open + Copy enough?
- Republish Bid 197 with the newer crew list now?

## Things that only existed in chat

- GitHub push failed with 403 until Artit reconnected GitHub; it worked on retry.
- The Linux container could not download a Swift toolchain (proxy 403); Swift was syntax-checked with `tree-sitter-swift` from PyPI.
- An accidental worktree folder (`basewt/`) was created and removed with `git worktree remove`; the `rm -rf` safety check blocks relative globs after `cd`.
- The phone header wordmark wrapped on both builds; fixed with `white-space: nowrap` (both republished at the time).
