import Foundation

/// Home-screen facts about each bundled dashboard. Generated from the dashboards' own data by
/// `ios/scripts/summary.js` into `Resources/summary.json` — never edit the JSON by hand.
struct AppSummary: Decodable {
    let generated: String
    let crewSnapshot: String
    let dashboards: [DashboardInfo]

    static let shared: AppSummary = {
        guard
            let url = Bundle.main.url(forResource: "summary", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let decoded = try? JSONDecoder().decode(AppSummary.self, from: data)
        else {
            return AppSummary(generated: "", crewSnapshot: "", dashboards: [])
        }
        return decoded
    }()

    func dashboard(_ id: String) -> DashboardInfo? {
        dashboards.first { $0.id == id }
    }
}

struct DashboardInfo: Decodable, Identifiable, Hashable {
    let id: String
    let html: String          // bundled file name without ".html"
    let appTitle: String      // "Bid 196 R2", "Bid 197 preview"
    let bid: Int
    let title: String
    let brandTag: String
    let provisional: Bool
    let sheet: Int
    let start: String?
    let end: String?
    let startNote: String?
    let sheetDates: String
    let bids: Int
    let am: Int
    let pm: Int
    let varies: Int
    let seatsFilled: Int
    let seats: Int
    let weekendsOff: Int
    let seniority: Int

    private static let isoDay: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let shortDay: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US")
        f.dateFormat = "EEE, MMM d"
        return f
    }()

    var startDate: Date? { start.flatMap { Self.isoDay.date(from: $0) } }
    var endDate: Date? { end.flatMap { Self.isoDay.date(from: $0) } }

    /// Whole days from today to the first day; nil when unknown, 0 or less once it has started.
    func daysToStart(from now: Date = Date()) -> Int? {
        guard let startDate else { return nil }
        let cal = Calendar.current
        return cal.dateComponents([.day], from: cal.startOfDay(for: now), to: cal.startOfDay(for: startDate)).day
    }

    /// "Mar 1" — the first day, short.
    var startShortText: String? {
        startDate.map { $0.formatted(.dateTime.month(.abbreviated).day()) }
    }

    /// "Mon, Nov 2 – Sun, Feb 28", or "Expected Mon, Mar 1" when only the start is known.
    var dateRangeText: String {
        guard let startDate else { return sheetDates }
        guard let endDate else { return "Expected " + Self.shortDay.string(from: startDate) }
        return Self.shortDay.string(from: startDate) + " – " + Self.shortDay.string(from: endDate)
    }
}
