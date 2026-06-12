import SwiftUI
import WebKit

struct GameWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.945, green: 0.941, blue: 0.918, alpha: 1)
        webView.scrollView.bounces = false
        webView.scrollView.isScrollEnabled = false
        if let url = Bundle.main.url(forResource: "demo", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct ContentView: View {
    var body: some View {
        GameWebView()
            .ignoresSafeArea()
    }
}
