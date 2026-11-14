import SwiftUI
import UIKit

/// Colour tokens from the dashboards' design system (SF Bay Ferry navy), with dark-mode values.
enum Theme {
    static let navy = Color(light: 0x015088, dark: 0x2E8ACB)
    static let navyDeep = Color(light: 0x003A63, dark: 0x0D3C63)
    static let navyTint = Color(light: 0xE4EEF6, dark: 0x173754)
    static let background = Color(light: 0xEEF3F8, dark: 0x0B1726)
    static let surface = Color(light: 0xFFFFFF, dark: 0x13243A)
    static let line = Color(light: 0xD3DFEA, dark: 0x2C4258)
    static let ink = Color(light: 0x0F2237, dark: 0xE8F0F7)
    static let muted = Color(light: 0x56697D, dark: 0x8FA4B8)
    static let info = Color(light: 0x0B4A78, dark: 0x7FB6E6)
    static let warn = Color(light: 0x8A4E08, dark: 0xF0A24B)
    static let warnBackground = Color(light: 0xFCEBD2, dark: 0x3E2A10)
    static let bad = Color(light: 0xB3232A, dark: 0xF27A80)

    /// The navy hero gradient used on Home, the locked vault and the privacy cover.
    static let heroGradient = RadialGradient(
        colors: [Color(hex: 0x015088), Color(hex: 0x003A63)],
        center: .topTrailing,
        startRadius: 0,
        endRadius: 420
    )

    /// Condensed heavy numerals, close to the dashboards' Barlow Semi Condensed.
    static func display(_ size: CGFloat, weight: Font.Weight = .heavy) -> Font {
        .system(size: size, weight: weight)
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(uiColor: UIColor(hex: hex))
    }

    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

extension UIColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: alpha
        )
    }
}

/// Small uppercase section label ("CREW WEBSITE VAULT").
struct SectionLabel: View {
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 12, weight: .bold))
            .tracking(1.2)
            .foregroundStyle(Theme.muted)
            .padding(.horizontal, 4)
            .padding(.top, 6)
    }
}

/// Primary filled button (navy, 52 pt tall).
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 17, weight: .bold))
            .frame(maxWidth: .infinity, minHeight: 52)
            .foregroundStyle(.white)
            .background(Theme.navy.opacity(configuration.isPressed ? 0.85 : 1), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

/// Small outlined button used inside field cards ("Open", "Copy").
struct OutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .bold))
            .padding(.horizontal, 12)
            .frame(minHeight: 44)
            .foregroundStyle(Theme.navy)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .strokeBorder(Theme.line, lineWidth: 1.5)
            )
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}
