import SwiftUI

/// The encrypted crew-website vault. Design: "Vault · locked" and "Vault · unlocked, editing" artboards.
struct VaultView: View {
    @EnvironmentObject private var vault: VaultStore
    @Environment(\.openURL) private var openURL
    @State private var showPassword = false
    @State private var confirmErase = false
    @State private var note: String?
    @FocusState private var focus: Field?

    private enum Field {
        case website
        case password
    }

    var body: some View {
        Group {
            if vault.phase == .unlocked {
                unlockedForm
            } else {
                lockedView
            }
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Vault")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if vault.phase == .unlocked {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        vault.lock()
                    } label: {
                        Label("Lock", systemImage: "lock.fill")
                            .labelStyle(.titleAndIcon)
                    }
                }
            }
        }
        .overlay(alignment: .bottom) {
            if let note {
                Text(note)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Theme.ink.opacity(0.92), in: Capsule())
                    .padding(.bottom, 24)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .accessibilityAddTraits(.updatesFrequently)
            }
        }
        .confirmationDialog("Erase the vault?", isPresented: $confirmErase, titleVisibility: .visible) {
            Button("Erase vault", role: .destructive) {
                vault.erase()
                show("Vault erased")
            }
        } message: {
            Text("This deletes the saved website address and password from this iPhone.")
        }
        .task {
            // Arriving from Home's "Unlock with Face ID" asks straight away.
            if vault.phase == .locked && !vault.needsErase {
                await vault.unlock()
            }
        }
    }

    // MARK: Locked

    private var lockedView: some View {
        VStack(spacing: 18) {
            Spacer()
            Image(systemName: "lock.fill")
                .font(.system(size: 44, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 104, height: 104)
                .background(Theme.heroGradient, in: RoundedRectangle(cornerRadius: 30, style: .continuous))
                .shadow(color: Color(hex: 0x015088).opacity(0.22), radius: 15, y: 10)
                .accessibilityHidden(true)
            Text("Your crew login is locked")
                .font(Theme.display(28))
                .fontWidth(.condensed)
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.center)
            Text("The website address and password are encrypted on this iPhone. \(vault.unlockMethodName) or your passcode opens them.")
                .font(.system(size: 15))
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 300)
            if let error = vault.errorMessage {
                Text(error)
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.bad)
                    .multilineTextAlignment(.center)
            }
            if vault.needsErase {
                Button("Erase vault and start over", role: .destructive) {
                    confirmErase = true
                }
                .buttonStyle(PrimaryButtonStyle())
            } else {
                Button {
                    Task { await vault.unlock() }
                } label: {
                    Label(vault.phase == .unlocking ? "Unlocking…" : "Unlock with \(vault.unlockMethodName)",
                          systemImage: vault.unlockMethodSymbol)
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(vault.phase == .unlocking)
            }
            Label("Locks again when you leave the app", systemImage: "clock")
                .font(.system(size: 13))
                .foregroundStyle(Theme.muted)
            Spacer()
            Spacer()
        }
        .padding(.horizontal, 32)
    }

    // MARK: Unlocked

    private var unlockedForm: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel("Crew website")
                FieldCard(label: "Website address") {
                    HStack(spacing: 8) {
                        TextField("https://", text: $vault.website)
                            .keyboardType(.URL)
                            .textContentType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .submitLabel(.next)
                            .focused($focus, equals: .website)
                            .onSubmit { focus = .password }
                            .accessibilityLabel("Website address")
                        Button("Open") {
                            if let url = vault.websiteURL { openURL(url) }
                        }
                        .buttonStyle(OutlineButtonStyle())
                        .disabled(vault.websiteURL == nil)
                    }
                }
                if vault.websiteURL == nil {
                    Text("Enter a full address that starts with https://")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.bad)
                        .padding(.horizontal, 4)
                }

                SectionLabel("Password")
                    .padding(.top, 6)
                FieldCard(label: "Password") {
                    HStack(spacing: 4) {
                        Group {
                            if showPassword {
                                TextField("Password", text: $vault.password)
                            } else {
                                SecureField("Password", text: $vault.password)
                            }
                        }
                        .textContentType(.password)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.done)
                        .focused($focus, equals: .password)
                        .onSubmit(saveNow)
                        .accessibilityLabel("Password")
                        Button {
                            showPassword.toggle()
                        } label: {
                            Image(systemName: showPassword ? "eye.slash" : "eye")
                                .font(.system(size: 18))
                                .foregroundStyle(Theme.muted)
                                .frame(width: 44, height: 44)
                        }
                        .accessibilityLabel(showPassword ? "Hide password" : "Show password")
                        Button("Copy") {
                            vault.copyPassword()
                            show("Password copied for 60 seconds")
                        }
                        .buttonStyle(OutlineButtonStyle())
                        .disabled(vault.password.isEmpty)
                    }
                }
                Text("A copied password clears from the clipboard after 60 seconds.")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.muted)
                    .padding(.horizontal, 4)

                Button("Save changes", action: saveNow)
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(!vault.hasChanges || vault.websiteURL == nil)
                    .opacity(vault.hasChanges && vault.websiteURL != nil ? 1 : 0.5)
                    .padding(.top, 14)
                Text(savedLine)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.muted)
                    .frame(maxWidth: .infinity)

                if let error = vault.errorMessage {
                    Text(error)
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.bad)
                }

                securityNote
                    .padding(.top, 18)
                Button("Erase vault", role: .destructive) {
                    confirmErase = true
                }
                .font(.system(size: 15, weight: .semibold))
                .frame(maxWidth: .infinity, minHeight: 44)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private var securityNote: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "checkmark.shield")
                .font(.system(size: 18))
            Text(vault.protectedByDeviceLock
                 ? "Encrypted with AES-256 on this iPhone. The key stays in the iPhone's Keychain and needs \(vault.unlockMethodName) or your passcode. Nothing is sent anywhere."
                 : "Encrypted with AES-256 on this iPhone, but the iPhone has no passcode, so anyone holding it can open the vault. Set a passcode in Settings to protect it with \(vault.unlockMethodName).")
                .font(.system(size: 13))
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(vault.protectedByDeviceLock ? Theme.info : Theme.warn)
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(vault.protectedByDeviceLock ? Theme.navyTint : Theme.warnBackground,
                    in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var savedLine: String {
        guard let saved = vault.saved else { return "Not saved yet" }
        return "Last saved " + saved.updatedAt.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day().hour().minute())
    }

    private func saveNow() {
        focus = nil
        guard vault.hasChanges, vault.websiteURL != nil else { return }
        if vault.save() {
            show("Saved and encrypted")
        }
    }

    private func show(_ message: String) {
        withAnimation { note = message }
        Task {
            try? await Task.sleep(nanoseconds: 1_800_000_000)
            withAnimation { note = nil }
        }
    }
}

/// White rounded card with a small field label on top.
private struct FieldCard<Content: View>: View {
    let label: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Theme.muted)
                .accessibilityHidden(true)
            content
                .font(.system(size: 16))
                .foregroundStyle(Theme.ink)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

#Preview {
    NavigationStack {
        VaultView()
    }
    .environmentObject(VaultStore())
}
