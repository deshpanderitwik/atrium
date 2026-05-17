import SwiftUI

// MARK: - Colors
// The warm dark palette established in the process microsites.
// Always dark — preferredColorScheme is locked at the app root.

extension Color {
    static let paper      = Color(red: 0.078, green: 0.067, blue: 0.051)  // #14110d
    static let paperWarm  = Color(red: 0.114, green: 0.094, blue: 0.071)  // #1d1812
    static let paperDeep  = Color(red: 0.067, green: 0.055, blue: 0.039)  // #110e0a
    static let ink        = Color(red: 0.902, green: 0.851, blue: 0.737)  // #e6d9bc
    static let inkSoft    = Color(red: 0.659, green: 0.604, blue: 0.490)  // #a89a7d
    static let inkFaint   = Color(red: 0.431, green: 0.392, blue: 0.318)  // #6e6451
    static let rule       = Color(red: 0.196, green: 0.165, blue: 0.125)  // #322a20
    static let oxblood    = Color(red: 0.788, green: 0.455, blue: 0.408)  // #c97468
}

// MARK: - Fonts

enum Garamond {
    static func regular(_ size: CGFloat) -> Font     { .custom("EBGaramond-Regular",     size: size) }
    static func medium(_ size: CGFloat) -> Font      { .custom("EBGaramond-Medium",      size: size) }
    static func italic(_ size: CGFloat) -> Font      { .custom("EBGaramond-Italic",      size: size) }
    static func mediumItalic(_ size: CGFloat) -> Font { .custom("EBGaramond-MediumItalic", size: size) }
}

enum Mono {
    static func label(_ size: CGFloat = 10, tracking: CGFloat = 2.4) -> Font {
        .system(size: size, weight: .medium, design: .monospaced)
    }
}
