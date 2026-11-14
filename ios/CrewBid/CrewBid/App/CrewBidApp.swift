import SwiftUI

/// Crew Bid — the IBU bid dashboards offline, plus an encrypted vault for the Blue & Gold crew website login.
@main
struct CrewBidApp: App {
    @StateObject private var vault = VaultStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(vault)
        }
    }
}
