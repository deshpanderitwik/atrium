import SwiftUI
import SwiftData

@main
struct AtriumApp: App {
    var body: some Scene {
        WindowGroup {
            AtriumView()
                .preferredColorScheme(.dark)
                .tint(Color.oxblood)
        }
        .modelContainer(for: Todo.self)
    }
}
