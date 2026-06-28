import Foundation

enum Priority: Int, CaseIterable, Identifiable {
    case p0 = 0, p1 = 1, p2 = 2, p3 = 3

    var id: Int { rawValue }
    var label: String { "P\(rawValue)" }

    static var defaultValue: Priority { .p2 }
}
