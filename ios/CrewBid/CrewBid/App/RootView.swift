import SwiftUI

/// Screens reachable from Home.
enum Route: Hashable {
    case dashboard(String)   // DashboardInfo.id, e.g. "bid196r2"
    case vault
}

/// Home is a hub (no tab bar): the bundled dashboards bring their own bottom tabs.
struct RootView: View {
    @EnvironmentObject private var vault: VaultStore
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        NavigationStack {
            HomeView()
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .dashboard(let id):
                        DashboardView(dashboardID: id)
                    case .vault:
                        VaultView()
                    }
                }
        }
        .tint(Theme.navy)
        // Hide the vault from the app switcher snapshot while it is open.
        .overlay {
            if scenePhase != .active && vault.phase == .unlocked {
                PrivacyCover()
            }
        }
        // Lock the vault (and wipe its plaintext from memory) whenever the app leaves the foreground.
        .onChange(of: scenePhase) { _, phase in
            if phase == .background {
                vault.lock()
            }
        }
    }
}

/// Shown over the app while it is in the app switcher with the vault open.
struct PrivacyCover: View {
    var body: some View {
        ZStack {
            Theme.heroGradient.ignoresSafeArea()
            VStack(spacing: 12) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 44, weight: .semibold))
                Text("Crew Bid")
                    .font(.system(size: 28, weight: .heavy))
                    .fontWidth(.condensed)
            }
            .foregroundStyle(.white)
        }
        .accessibilityHidden(true)
    }
}
