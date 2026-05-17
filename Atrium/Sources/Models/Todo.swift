import Foundation
import SwiftData

@Model
final class Todo {
    var id: UUID
    var text: String
    var houseID: String

    // 0..3 → P0..P3. Stored as Int so SwiftData predicates can filter.
    var priority: Int

    // Manual ordering within a (houseID, priority) cluster. Doubles let us
    // insert between two items by averaging without renumbering siblings.
    var position: Double

    // 0 = open, 1 = done
    var statusRaw: Int

    var starred: Bool
    var createdAt: Date
    var completedAt: Date?

    init(
        text: String,
        houseID: String,
        priority: Priority = .defaultValue,
        position: Double = 0,
        starred: Bool = false
    ) {
        self.id = UUID()
        self.text = text
        self.houseID = houseID
        self.priority = priority.rawValue
        self.position = position
        self.statusRaw = 0
        self.starred = starred
        self.createdAt = .now
        self.completedAt = nil
    }

    var isDone: Bool {
        get { statusRaw == 1 }
        set {
            statusRaw = newValue ? 1 : 0
            completedAt = newValue ? .now : nil
        }
    }

    var priorityValue: Priority {
        get { Priority(rawValue: priority) ?? .defaultValue }
        set { priority = newValue.rawValue }
    }
}
