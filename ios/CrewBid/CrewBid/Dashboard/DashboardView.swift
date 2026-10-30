import SwiftUI
import WebKit

/// One bundled dashboard, full screen under a native bar. Design: "Dashboard · Bid 196 R2" artboard.
struct DashboardView: View {
    let dashboardID: String

    private var info: DashboardInfo? { AppSummary.shared.dashboard(dashboardID) }
    private var fileURL: URL? { Bundle.main.url(forResource: info?.html ?? dashboardID, withExtension: "html") }

    var body: some View {
        DashboardWebView(fileURL: fileURL, originHost: "\(dashboardID).crewbid.local")
            .background(Theme.background)
            .navigationTitle(info?.appTitle ?? "Dashboard")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if let fileURL {
                    ToolbarItem(placement: .topBarTrailing) {
                        // Shares the self-contained dashboard file: coworkers can open it in any browser, offline.
                        ShareLink(item: fileURL) {
                            Image(systemName: "square.and.arrow.up")
                        }
                        .accessibilityLabel("Share this dashboard")
                    }
                }
            }
    }
}

/// WKWebView that loads a bundled dashboard with a stable https origin per dashboard, so each keeps its own
/// saved stars, compare picks and name (localStorage) between launches. Nothing is fetched from the network.
struct DashboardWebView: UIViewRepresentable {
    let fileURL: URL?
    let originHost: String

    func makeCoordinator() -> Coordinator {
        Coordinator(originHost: originHost)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.allowsBackForwardNavigationGestures = false
        if let fileURL, let html = try? String(contentsOf: fileURL, encoding: .utf8) {
            webView.loadHTMLString(html, baseURL: URL(string: "https://\(originHost)/"))
        } else {
            webView.loadHTMLString(
                "<meta name='viewport' content='width=device-width'><p style='font:17px -apple-system;padding:24px'>This dashboard is missing from the app. Run ios/scripts/sync.sh and rebuild.</p>",
                baseURL: nil
            )
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        let originHost: String

        init(originHost: String) {
            self.originHost = originHost
        }

        /// In-page navigation (hash routes) stays in the web view; real links leave for Safari.
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            let isLocal = url.host == originHost || url.scheme == "about"
            if navigationAction.navigationType == .linkActivated && !isLocal {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }
    }
}

#Preview {
    NavigationStack {
        DashboardView(dashboardID: "bid196r2")
    }
}
