import SwiftUI

/// The hub. Design: https://claude.ai/artifact/HeDyHqD3Myzcq2NeUxKFeU ("Home" artboard).
struct HomeView: View {
    @EnvironmentObject private var vault: VaultStore
    private let summary = AppSummary.shared

    /// The published bid gets the hero; provisional previews are quieter rows.
    private var featured: DashboardInfo? {
        summary.dashboards.first { !$0.provisional } ?? summary.dashboards.first
    }

    private var others: [DashboardInfo] {
        summary.dashboards.filter { $0.id != featured?.id }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                header
                if let featured {
                    HeroCard(info: featured)
                }
                ForEach(others) { info in
                    NavigationLink(value: Route.dashboard(info.id)) {
                        DashboardRow(info: info)
                    }
                    .buttonStyle(.plain)
                }
                SectionLabel("Crew website vault")
                VaultCard()
                Text(footnote)
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.muted)
                    .padding(.horizontal, 4)
                    .padding(.top, 8)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 28)
        }
        .background(Theme.background.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
    }

    private var header: some View {
        HStack(alignment: .bottom, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("IBU DECKHAND · " + Date().formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day()).uppercased())
                    .font(.system(size: 12, weight: .bold))
                    .tracking(1.2)
                    .foregroundStyle(Theme.muted)
                Text("Crew Bid")
                    .font(Theme.display(34))
                    .fontWidth(.condensed)
                    .foregroundStyle(Theme.ink)
                    .accessibilityAddTraits(.isHeader)
            }
            Spacer()
            Image(systemName: "ferry.fill")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(Theme.navy)
                .frame(width: 44, height: 44)
                .background(Theme.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Theme.line))
                .accessibilityHidden(true)
        }
        .padding(.horizontal, 4)
        .padding(.top, 8)
    }

    private var footnote: String {
        let sheet = featured.map { "Bid \($0.sheet)" } ?? "the bid"
        let crew = summary.crewSnapshot.isEmpty ? "" : " Crew list \(summary.crewSnapshot)."
        return "Unofficial crew reference from the \(sheet) Final-Final sheet.\(crew) Confirm with Dispatch."
    }
}

/// Navy hero for the bid in effect next (or now).
private struct HeroCard: View {
    let info: DashboardInfo

    var body: some View {
        let days = info.daysToStart()
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text((days ?? 0) > 0 ? "IN EFFECT NEXT" : "IN EFFECT NOW")
                        .font(.system(size: 12, weight: .bold))
                        .tracking(1.2)
                        .opacity(0.8)
                    Text("Bid \(info.bid)")
                        .font(Theme.display(56))
                        .fontWidth(.condensed)
                        .minimumScaleFactor(0.7)
                        .lineLimit(1)
                    Text(info.dateRangeText + " · Final-Final sheet")
                        .font(.system(size: 14))
                        .opacity(0.9)
                }
                Spacer(minLength: 0)
                if let days, days > 0 {
                    VStack(spacing: 0) {
                        Text("\(days)")
                            .font(Theme.display(40))
                            .fontWidth(.condensed)
                        Text(days == 1 ? "day to go" : "days to go")
                            .font(.system(size: 12, weight: .semibold))
                            .opacity(0.9)
                    }
                    .frame(minWidth: 76)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 8)
                    .background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(.white.opacity(0.22)))
                    .accessibilityElement(children: .combine)
                }
            }
            HStack(alignment: .top, spacing: 8) {
                HeroStat(value: "\(info.bids)", label: "bids · \(info.am) AM · \(info.pm) PM")
                HeroStat(value: "\(info.seatsFilled)/\(info.seats)", label: "seats filled")
                HeroStat(value: "\(info.weekendsOff)", label: "weekends off")
            }
            NavigationLink(value: Route.dashboard(info.id)) {
                HStack {
                    Text("Open \(info.appTitle) dashboard")
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .font(.system(size: 15, weight: .bold))
                .padding(.horizontal, 16)
                .frame(minHeight: 48)
                .foregroundStyle(Color(hex: 0x003A63))
                .background(.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .foregroundStyle(.white)
        .padding(18)
        .background(Theme.heroGradient, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .shadow(color: Color(hex: 0x015088).opacity(0.22), radius: 15, y: 10)
    }
}

private struct HeroStat: View {
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(Theme.display(24))
                .fontWidth(.condensed)
            Text(label)
                .font(.system(size: 12))
                .opacity(0.85)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

/// Quieter row for a provisional preview (Bid 197) or any other bundled dashboard.
private struct DashboardRow: View {
    let info: DashboardInfo

    var body: some View {
        HStack(spacing: 12) {
            Text("\(info.bid)")
                .font(Theme.display(22))
                .fontWidth(.condensed)
                .foregroundStyle(Theme.navy)
                .frame(width: 52, height: 52)
                .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Theme.line, lineWidth: 1.5))
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 8) {
                    Text(info.appTitle)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Theme.ink)
                    if info.provisional {
                        Text("Provisional")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Theme.warn)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Theme.warnBackground, in: Capsule())
                    }
                }
                Text(subtitle)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Theme.muted)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(minHeight: 64)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Theme.line))
        .contentShape(Rectangle())
    }

    private var subtitle: String {
        guard info.provisional else { return info.dateRangeText }
        let expected = info.startShortText.map { " · expected \($0)" } ?? ""
        return "Sheet not issued · Bid \(info.sheet) lines until it posts\(expected)"
    }
}

/// Entry to the encrypted vault. Never shows the stored values on Home.
private struct VaultCard: View {
    @EnvironmentObject private var vault: VaultStore

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: vault.phase == .unlocked ? "lock.open.fill" : "lock.fill")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(Theme.navy)
                    .frame(width: 44, height: 44)
                    .background(Theme.navyTint, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Blue & Gold crew login")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Theme.ink)
                    Text("Website address and password · encrypted on this iPhone")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
            NavigationLink(value: Route.vault) {
                Label(vault.phase == .unlocked ? "Open vault" : "Unlock with \(vault.unlockMethodName)",
                      systemImage: vault.phase == .unlocked ? "lock.open" : vault.unlockMethodSymbol)
                    .font(.system(size: 17, weight: .bold))
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .foregroundStyle(.white)
                    .background(Theme.navy, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Theme.line))
    }
}

#Preview {
    NavigationStack {
        HomeView()
    }
    .environmentObject(VaultStore())
}
