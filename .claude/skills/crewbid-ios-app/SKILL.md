---
name: crewbid-ios-app
description: Build, run, fix and extend the Crew Bid iPhone app (SwiftUI) in ios/CrewBid — the offline IBU bid dashboards plus the encrypted Blue & Gold crew login vault. Use when Artit asks about the iPhone/iOS app, the vault, Face ID, Xcode, TestFlight, or updating the dashboards inside the app.
---

# Crew Bid iPhone app

Read `ios/README.md` first (screens, vault security model, open items). Design: https://claude.ai/artifact/HeDyHqD3Myzcq2NeUxKFeU (`ios/design/project/*.dc.html`).

## On the Mac (Claude Code)

1. `git pull` on branch `claude/bid-197-interactive-dashboard-8fb30e`.
2. Build: `xcodebuild -project ios/CrewBid/CrewBid.xcodeproj -scheme CrewBid -destination 'platform=iOS Simulator,name=iPhone 16' build`. Fix errors in the Swift files; the project was written without a compiler, so expect a few. Keep Swift 5 language mode unless asked.
3. Run in the simulator (`xcrun simctl boot "iPhone 16"`, `open -a Simulator`, then build+install, or just Run in Xcode). Enroll Face ID (Features → Face ID → Enrolled) to test the vault prompt.
4. Signing is Artit's choice: set the Team in Xcode; bundle id `com.artit.crewbid` may need changing.

## Rules

- Vault field names stay exactly **Website address** and **Password**; default website `https://www.blueandgoldfleet.com/crew/`; both editable.
- Never store the vault plaintext anywhere but memory while unlocked. The sealed file is AES-256-GCM; the key lives only in the Keychain (`ThisDeviceOnly`, user presence when a passcode exists). Never log, print, sync or send the password; no analytics.
- Lock on background; keep the app-switcher cover.
- The dashboards are bundled copies: after any dashboard rebuild run `ios/scripts/sync.sh`. Never fetch them from the network.
- New files go anywhere under `ios/CrewBid/CrewBid/` (folder-synced group); no project-file edits needed. Docs stay outside that folder.
- Syntax-check without Xcode (Linux): tree-sitter-swift (`pip install tree-sitter tree-sitter-swift`), see the check in the session history or write a 10-line parser loop.
- Design changes: update the canvas via the `design-revision-canvas` skill and keep SwiftUI matching it.
