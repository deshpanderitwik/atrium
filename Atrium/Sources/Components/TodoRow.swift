import SwiftUI
import SwiftData
import Inject

struct TodoRow: View {
    @Bindable var todo: Todo
    @Environment(\.modelContext) private var ctx

    @State private var isEditing: Bool = false
    @FocusState private var focused: Bool
    @ObserveInjection var inject

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 2) {

            TodoCheckbox(isDone: todo.isDone) {
                withAnimation(.easeInOut(duration: 0.18)) {
                    todo.isDone.toggle()
                    if todo.isDone {
                        todo.starred = false
                        Haptics.success()
                    } else {
                        Haptics.light()
                    }
                }
            }
            .alignmentGuide(.firstTextBaseline) { d in d[VerticalAlignment.center] + 6 }

            if todo.starred && !todo.isDone {
                Text("★")
                    .font(.system(size: 13))
                    .foregroundStyle(.white)
            }

            textBody
                .padding(.trailing, 4)

            Spacer(minLength: 8)

            if !todo.isDone {
                PriorityChip(priority: Binding(
                    get: { todo.priorityValue },
                    set: { newValue in
                        repositionAtBottom(of: newValue)
                        todo.priorityValue = newValue
                    }
                ))
                .alignmentGuide(.firstTextBaseline) { d in d[VerticalAlignment.center] + 6 }
            }
        }
        .padding(.vertical, 12)
        .padding(.leading, 4)
        .padding(.trailing, 8)
        .background(Color.paperWarm, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .padding(.vertical, 4)
        .enableInjection()
    }

    @ViewBuilder
    private var textBody: some View {
        if isEditing {
            TextField("", text: $todo.text, axis: .vertical)
                .font(Garamond.regular(19))
                .foregroundStyle(Color.ink)
                .lineSpacing(2)
                .focused($focused)
                .submitLabel(.done)
                .task { focused = true }
                .onSubmit { finishEditing() }
                .onChange(of: todo.text) { _, newValue in
                    // The Return key inserts a newline on multi-line TextFields.
                    // Treat that as "press Done" → commit and exit edit mode.
                    // (Mark-as-done is only set via the checkbox.)
                    if newValue.contains("\n") {
                        todo.text = newValue.replacingOccurrences(of: "\n", with: "")
                        finishEditing()
                    }
                }
                .onChange(of: focused) { _, isFocused in
                    if !isFocused { finishEditing() }
                }
        } else {
            Text(todo.text.isEmpty ? "—" : todo.text)
                .font(Garamond.regular(19))
                .foregroundStyle(textColor)
                .strikethrough(todo.isDone, color: Color.inkFaint.opacity(0.6))
                .lineSpacing(2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
                .onTapGesture {
                    guard !todo.isDone else { return }
                    isEditing = true
                }
        }
    }

    private var textColor: Color {
        if todo.isDone { return Color.inkFaint }
        if todo.text.isEmpty { return Color.inkFaint }
        return Color.ink
    }

    private func finishEditing() {
        let trimmed = todo.text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            // Empty text → remove the row entirely.
            ctx.delete(todo)
        } else if trimmed != todo.text {
            todo.text = trimmed
        }
        focused = false
        isEditing = false
    }

    private func repositionAtBottom(of newPriority: Priority) {
        guard newPriority != todo.priorityValue else { return }
        let hid = todo.houseID
        let pVal = newPriority.rawValue
        let myID = todo.id
        let descriptor = FetchDescriptor<Todo>(
            predicate: #Predicate<Todo> { other in
                other.houseID == hid
                && other.statusRaw == 0
                && other.priority == pVal
                && other.id != myID
            }
        )
        let siblings = (try? ctx.fetch(descriptor)) ?? []
        let maxPos = siblings.map { $0.position }.max() ?? 0
        todo.position = maxPos + 1
    }
}
