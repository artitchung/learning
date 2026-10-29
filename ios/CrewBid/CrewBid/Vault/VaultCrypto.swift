import CryptoKit
import Foundation
import LocalAuthentication
import Security

/// What the vault stores. Only ever written to disk sealed with AES-256-GCM.
struct VaultRecord: Codable, Equatable {
    static let defaultWebsite = "https://www.blueandgoldfleet.com/crew/"

    var website: String
    var password: String
    var updatedAt: Date
}

enum VaultError: LocalizedError {
    case keychain(OSStatus)
    case keyMissing
    case cannotDecrypt
    case cannotEncrypt

    var errorDescription: String? {
        switch self {
        case .keychain(let status):
            let detail = (SecCopyErrorMessageString(status, nil) as String?) ?? "error \(status)"
            return "The iPhone's Keychain refused the vault key (\(detail))."
        case .keyMissing:
            return "The vault's key is gone from this iPhone (for example after the passcode was turned off), so the saved login can't be opened. Erase the vault and enter it again."
        case .cannotDecrypt:
            return "The saved vault can't be decrypted on this iPhone. Erase the vault and enter the login again."
        case .cannotEncrypt:
            return "The vault couldn't be encrypted. Nothing was saved."
        }
    }
}

/// The 256-bit vault key lives only in the Keychain, on this device. When the iPhone has a passcode the item
/// also requires user presence (Face ID, Touch ID or the passcode) every time it is read.
enum VaultKeychain {
    static let service = "com.artit.crewbid.vault"
    static let account = "vault-key-v1"

    private static var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    /// Reads the key. Pass the LAContext that was just authenticated so the Keychain does not prompt again.
    static func loadKey(context: LAContext?) throws -> SymmetricKey? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        if let context {
            query[kSecUseAuthenticationContext as String] = context
        }
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        switch status {
        case errSecSuccess:
            guard let data = item as? Data, data.count == 32 else { throw VaultError.cannotDecrypt }
            return SymmetricKey(data: data)
        case errSecItemNotFound:
            return nil
        default:
            throw VaultError.keychain(status)
        }
    }

    /// Creates and stores a new random key. Prefers "passcode set, this device only, user presence";
    /// falls back to "when unlocked, this device only" on a device (or simulator) without a passcode.
    static func createKey() throws -> SymmetricKey {
        let key = SymmetricKey(size: .bits256)
        let keyData = key.withUnsafeBytes { Data($0) }

        var error: Unmanaged<CFError>?
        if let access = SecAccessControlCreateWithFlags(
            nil,
            kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
            .userPresence,
            &error
        ) {
            var query = baseQuery
            query[kSecValueData as String] = keyData
            query[kSecAttrAccessControl as String] = access
            if SecItemAdd(query as CFDictionary, nil) == errSecSuccess {
                return key
            }
        }

        var query = baseQuery
        query[kSecValueData as String] = keyData
        query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else { throw VaultError.keychain(status) }
        return key
    }

    static func deleteKey() {
        SecItemDelete(baseQuery as CFDictionary)
    }
}

/// The sealed vault file in Application Support: AES-256-GCM (nonce + ciphertext + tag), written with
/// complete file protection and excluded from backups (the key never leaves this device anyway).
enum VaultFile {
    private static let associatedData = Data("crewbid.vault.v1".utf8)

    static var url: URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return dir.appendingPathComponent("vault.sealed")
    }

    static var exists: Bool {
        FileManager.default.fileExists(atPath: url.path)
    }

    static func read(using key: SymmetricKey) throws -> VaultRecord? {
        guard exists else { return nil }
        do {
            let sealed = try AES.GCM.SealedBox(combined: Data(contentsOf: url))
            let plain = try AES.GCM.open(sealed, using: key, authenticating: associatedData)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(VaultRecord.self, from: plain)
        } catch {
            throw VaultError.cannotDecrypt
        }
    }

    static func write(_ record: VaultRecord, using key: SymmetricKey) throws {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let plain = try encoder.encode(record)
        guard let combined = try AES.GCM.seal(plain, using: key, authenticating: associatedData).combined else {
            throw VaultError.cannotEncrypt
        }
        let dir = url.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try combined.write(to: url, options: [.atomic, .completeFileProtection])
        var fileURL = url
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? fileURL.setResourceValues(values)
    }

    static func delete() {
        try? FileManager.default.removeItem(at: url)
    }
}
