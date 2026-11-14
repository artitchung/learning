# Crew Bid — iPhone app

A SwiftUI app that carries the IBU bid dashboards offline and keeps the Blue & Gold crew website login in an
encrypted vault on the phone.

- Design (4 phone screens): https://claude.ai/artifact/HeDyHqD3Myzcq2NeUxKFeU — sources in `ios/design/project/`
- Status: **skeleton, never compiled.** It was written in a Linux container with no Swift compiler. Every Swift file
  passes a tree-sitter syntax check, and the project file parses, but the first real build happens on the Mac.

## Run it (Mac, Xcode 16 or newer)

```bash
cd ~/learning && git pull
open ios/CrewBid/CrewBid.xcodeproj
```
1. Select the **CrewBid** target → Signing & Capabilities → Team: your Apple ID (a free personal team works for your own iPhone; builds expire after 7 days).
2. If Xcode says the bundle ID is taken, change `com.artit.crewbid` to something unique (e.g. `com.<yourname>.crewbid`).
3. Pick an iPhone simulator (or your iPhone) and press Run.

Command line build check (what Claude Code on the Mac should run first):
```bash
xcodebuild -project ios/CrewBid/CrewBid.xcodeproj -scheme CrewBid \
  -destination 'platform=iOS Simulator,name=iPhone 16' build | xcpretty || true
```

## What is in it

| Screen | File | Notes |
|---|---|---|
| Home (hub, no tab bar) | `CrewBid/Home/HomeView.swift` | Navy hero for the published bid (Bid 196 R2): countdown, 39 bids, 137/137 seats, 23 weekends off; quieter row for the provisional Bid 197 preview; vault card. Numbers come from `Resources/summary.json`. |
| Dashboard | `CrewBid/Dashboard/DashboardView.swift` | The bundled dashboard HTML in a `WKWebView` with an https origin per dashboard (`bid196r2.crewbid.local`), so stars, compare picks and "me" persist. Share button shares the self-contained HTML file. External links open in Safari. |
| Vault | `CrewBid/Vault/VaultView.swift` | Two editable fields named exactly **Website address** (pre-filled `https://www.blueandgoldfleet.com/crew/`) and **Password** (hidden, eye to reveal). Open, Copy (clipboard clears after 60 s, device only), Save changes, Lock, Erase vault. |

### Vault security (`CrewBid/Vault/VaultCrypto.swift`, `VaultStore.swift`)
- Both fields are stored together as JSON sealed with **AES-256-GCM** (CryptoKit) in `Application Support/vault.sealed`,
  written with complete file protection and excluded from backups.
- The 256-bit key is created on first unlock and kept only in the **Keychain**, `ThisDeviceOnly`. When the iPhone has a
  passcode the key item also requires **user presence** (Face ID / Touch ID / passcode) to be read.
- Unlock: `LAContext.evaluatePolicy(.deviceOwnerAuthentication)`; the same context is handed to the Keychain read so
  there is one prompt. No passcode on the device (e.g. a fresh simulator): it still encrypts, and the vault shows an
  amber warning that nothing gates opening it.
- Locks (and wipes plaintext + key from memory) when the app goes to the background; a navy cover hides it in the app
  switcher. Unsaved edits are discarded on lock.
- If the key disappears (passcode turned off) the sealed file can't be opened; the vault offers "Erase vault and start over".
- Nothing is sent anywhere. The app makes no network requests of its own.

## Updating the bundled dashboards

```bash
(cd bid197 && python3 build.py && python3 build.py --cycle cycle196r2.js)
ios/scripts/sync.sh      # copies dist/*.html into the app and regenerates summary.json
```

## Project notes
- `CrewBid.xcodeproj` uses an Xcode 16 **folder-synced group** (`objectVersion 77`): any file added under `ios/CrewBid/CrewBid/`
  is compiled or bundled automatically — no need to edit the project file. Keep docs out of that folder (they would be bundled).
- iOS 17+, iPhone only, Swift 5 language mode, generated Info.plist (`NSFaceIDUsageDescription` set in build settings).
- App icon: `Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png` (single size; Xcode makes the rest).

## Open items for the Mac session
1. First build: fix whatever the compiler reports (none expected beyond warnings, but it has never been compiled).
2. Run on a simulator with Face ID enrolled (Features → Face ID → Enrolled) and a device with a passcode; test: first unlock pre-fills the website, Save, Lock, background → locked, Copy clears after 60 s, Erase.
3. Check the dashboards scroll and their bottom tab bar sits above the home indicator; adjust `DashboardWebView` safe-area handling if not.
4. Decide distribution: personal team (7-day installs) or the $99 Apple Developer Program for TestFlight to coworkers.
