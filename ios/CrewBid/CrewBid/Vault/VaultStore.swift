import CryptoKit
import Foundation
import LocalAuthentication
import UIKit
import UniformTypeIdentifiers

/// Holds the vault's plaintext only while it is unlocked; `lock()` wipes it and the key from memory.
@MainActor
final class VaultStore: ObservableObject {
    enum Phase: Equatable {
        case locked
        case unlocking
        case unlocked
    }

    @Published private(set) var phase: Phase = .locked
    /// "Website address" field. Pre-filled with the Blue & Gold crew site the first time.
    @Published var website = ""
    /// "Password" field.
    @Published var password = ""
    @Published private(set) var saved: VaultRecord?
    @Published var errorMessage: String?
    /// True when the saved vault exists but can't be opened on this device; only Erase helps then.
    @Published private(set) var needsErase = false
    /// False when the iPhone has no passcode: the vault is still encrypted, but nothing gates opening it.
    @Published private(set) var protectedByDeviceLock = true

    private var key: SymmetricKey?

    // MARK: Unlock method shown on buttons

    var unlockMethodName: String {
        switch Self.biometryType() {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .opticID: return "Optic ID"
        default: return "Passcode"
        }
    }

    var unlockMethodSymbol: String {
        switch Self.biometryType() {
        case .faceID: return "faceid"
        case .touchID: return "touchid"
        case .opticID: return "opticid"
        default: return "lock.fill"
        }
    }

    private static func biometryType() -> LABiometryType {
        let context = LAContext()
        var error: NSError?
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        return context.biometryType
    }

    // MARK: Derived state

    var trimmedWebsite: String {
        website.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// A usable http(s) address, or nil.
    var websiteURL: URL? {
        guard let url = URL(string: trimmedWebsite),
              let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http",
              url.host != nil else { return nil }
        return url
    }

    var hasChanges: Bool {
        guard phase == .unlocked else { return false }
        guard let saved else { return true }   // first save writes the pre-filled address too
        return saved.website != trimmedWebsite || saved.password != password
    }

    // MARK: Actions

    func unlock() async {
        guard phase == .locked else { return }
        phase = .unlocking
        errorMessage = nil

        let context = LAContext()
        context.localizedCancelTitle = "Not now"
        var policyError: NSError?
        let canAuthenticate = context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &policyError)
        protectedByDeviceLock = canAuthenticate

        if canAuthenticate {
            do {
                _ = try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock your Blue & Gold crew login")
            } catch {
                phase = .locked
                if let laError = error as? LAError,
                   [.userCancel, .appCancel, .systemCancel].contains(laError.code) {
                    return
                }
                errorMessage = error.localizedDescription
                return
            }
        }

        do {
            let existingKey = try VaultKeychain.loadKey(context: canAuthenticate ? context : nil)
            let key: SymmetricKey
            if let existingKey {
                key = existingKey
            } else if VaultFile.exists {
                throw VaultError.keyMissing
            } else {
                key = try VaultKeychain.createKey()
            }
            let record = try VaultFile.read(using: key)
            self.key = key
            saved = record
            website = record?.website ?? VaultRecord.defaultWebsite
            password = record?.password ?? ""
            needsErase = false
            phase = .unlocked
        } catch {
            phase = .locked
            if let vaultError = error as? VaultError {
                switch vaultError {
                case .keyMissing, .cannotDecrypt: needsErase = true
                default: break
                }
            }
            errorMessage = error.localizedDescription
        }
    }

    /// Encrypts both fields and replaces the sealed file.
    @discardableResult
    func save() -> Bool {
        guard phase == .unlocked, let key else { return false }
        let record = VaultRecord(website: trimmedWebsite, password: password, updatedAt: Date())
        do {
            try VaultFile.write(record, using: key)
            saved = record
            website = record.website
            errorMessage = nil
            return true
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            return false
        }
    }

    /// Wipes plaintext and the key from memory. Unsaved edits are discarded.
    func lock() {
        key = nil
        website = ""
        password = ""
        saved = nil
        if phase != .unlocking {
            phase = .locked
        }
    }

    /// Deletes the sealed file and the key. The next unlock starts fresh with the default website.
    func erase() {
        VaultFile.delete()
        VaultKeychain.deleteKey()
        needsErase = false
        errorMessage = nil
        key = nil
        website = ""
        password = ""
        saved = nil
        phase = .locked
    }

    /// Puts the password on the clipboard for this device only, cleared after 60 seconds.
    func copyPassword() {
        UIPasteboard.general.setItems(
            [[UTType.plainText.identifier: password]],
            options: [.localOnly: true, .expirationDate: Date().addingTimeInterval(60)]
        )
    }
}
