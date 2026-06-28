import SwiftUI

struct PriorityChip: View {
    @Binding var priority: Priority
    var onChange: ((Priority) -> Void)? = nil

    var body: some View {
        Menu {
            ForEach(Priority.allCases) { p in
                Button {
                    if p != priority {
                        priority = p
                        Haptics.selection()
                        onChange?(p)
                    }
                } label: {
                    HStack {
                        Text(p.label)
                        if p == priority {
                            Spacer()
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            Text(priority.label)
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .tracking(1.4)
                .foregroundStyle(Color.inkFaint)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .overlay(
                    RoundedRectangle(cornerRadius: 3)
                        .stroke(Color.rule, lineWidth: 1)
                )
        }
        .menuStyle(.borderlessButton)
        .buttonStyle(.plain)
    }
}
