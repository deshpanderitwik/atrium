import SwiftUI
import UIKit

/// Re-enables the system "swipe from left edge to pop" gesture even when
/// the navigation bar / back button is hidden. SwiftUI's NavigationStack
/// turns this gesture off when you hide the nav bar — this UIKit shim
/// reaches into the hosting UINavigationController and turns it back on.
struct SwipeBackEnabler: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        UIViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        DispatchQueue.main.async {
            guard let nav = uiViewController.navigationController else { return }
            nav.interactivePopGestureRecognizer?.delegate = nil
            nav.interactivePopGestureRecognizer?.isEnabled = true
        }
    }
}

extension View {
    /// Apply to a pushed NavigationStack destination to keep the edge-swipe
    /// back gesture working even when the nav bar is hidden.
    func swipeBackEnabled() -> some View {
        background(SwipeBackEnabler())
    }
}
