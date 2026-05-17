import SwiftUI

struct TodoCheckbox: View {
    let isDone: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .strokeBorder(Color.inkFaint, lineWidth: 1)
                    .frame(width: 18, height: 18)
                if isDone {
                    Circle()
                        .fill(Color.inkSoft.opacity(0.7))
                        .frame(width: 10, height: 10)
                }
            }
            .contentShape(Rectangle())
            .frame(width: 32, height: 32, alignment: .center)
        }
        .buttonStyle(.plain)
    }
}
