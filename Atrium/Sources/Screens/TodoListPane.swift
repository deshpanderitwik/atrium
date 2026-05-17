import SwiftUI
import SwiftData
import Inject

struct TodoListPane: View {
    let house: House
    @Environment(\.modelContext) private var ctx
    @Query private var openTodos: [Todo]
    @Query private var doneTodos: [Todo]

    @State private var newText: String = ""
    @State private var newPriority: Priority = .defaultValue
    @FocusState private var inputFocused: Bool
    @ObserveInjection var inject

    init(house: House) {
        self.house = house
        let id = house.id

        _openTodos = Query(
            filter: #Predicate<Todo> { $0.houseID == id && $0.statusRaw == 0 },
            sort: [
                SortDescriptor(\Todo.priority),
                SortDescriptor(\Todo.position)
            ]
        )

        _doneTodos = Query(
            filter: #Predicate<Todo> { $0.houseID == id && $0.statusRaw == 1 },
            sort: [SortDescriptor(\Todo.completedAt, order: .reverse)]
        )
    }

    var body: some View {
        List {
            // INPUT --------------------------------------------------------
            inputRow
                .listRowBackground(Color.paper)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 6, trailing: 0))

            // OPEN — one section per priority cluster ---------------------
            ForEach(Priority.allCases) { p in
                let items = openTodos.filter { $0.priority == p.rawValue }
                if !items.isEmpty {
                    Section {
                        PrioritySectionHeader(label: p.label)
                            .listRowBackground(Color.paper)
                            .listRowSeparator(.hidden)
                            .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))

                        ForEach(items) { todo in
                            TodoRow(todo: todo)
                                .listRowBackground(Color.paper)
                                .listRowSeparator(.hidden)
                                .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
                                .swipeActions(edge: .leading, allowsFullSwipe: true) {
                                    Button {
                                        withAnimation(.easeOut(duration: 0.18)) {
                                            todo.starred.toggle()
                                        }
                                        Haptics.rigid()
                                    } label: {
                                        Label(
                                            todo.starred ? "Unstar" : "Star",
                                            systemImage: todo.starred ? "star.slash.fill" : "star.fill"
                                        )
                                    }
                                    .tint(Color.oxblood)
                                }
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        withAnimation { ctx.delete(todo) }
                                        Haptics.warning()
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                        }
                        .onMove { from, to in
                            reorderWithin(priority: p, from: from, to: to)
                        }
                    }
                }
            }

            // EMPTY --------------------------------------------------------
            if openTodos.isEmpty && doneTodos.isEmpty {
                emptyMessage
                    .listRowBackground(Color.paper)
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets())
            }

            // DONE ---------------------------------------------------------
            if !doneTodos.isEmpty {
                PrioritySectionHeader(label: "DONE", topPadding: 56, bottomPadding: 4)
                    .listRowBackground(Color.paper)
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))

                ForEach(doneByDay, id: \.0) { (day, items) in
                    Section {
                        DayHeader(day: day)
                            .listRowBackground(Color.paper)
                            .listRowSeparator(.hidden)
                            .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))

                        ForEach(items) { todo in
                            TodoRow(todo: todo)
                                .listRowBackground(Color.paper)
                                .listRowSeparator(.hidden)
                                .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        withAnimation { ctx.delete(todo) }
                                        Haptics.warning()
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                        }
                    }
                }
            }

            // Bottom breathing room
            Color.clear
                .frame(height: 80)
                .listRowBackground(Color.paper)
                .listRowSeparator(.hidden)
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .scrollIndicators(.hidden)
        .background(Color.paper)
        .environment(\.defaultMinListRowHeight, 0)
        .enableInjection()
    }

    // MARK: - Derived

    /// Done todos grouped by the calendar day they were completed, most recent day first.
    private var doneByDay: [(Date, [Todo])] {
        let cal = Calendar.current
        let grouped = Dictionary(grouping: doneTodos) { todo -> Date in
            cal.startOfDay(for: todo.completedAt ?? todo.createdAt)
        }
        return grouped
            .map { (key: $0.key, items: $0.value) }
            .sorted { $0.key > $1.key }
            .map { ($0.key, $0.items) }
    }

    // MARK: - Subviews

    private var inputRow: some View {
        HStack(alignment: .center, spacing: 2) {
            Text("+")
                .font(Garamond.regular(24))
                .foregroundStyle(Color.inkFaint)
                .frame(width: 32, height: 32, alignment: .center)

            TextField("",
                      text: $newText,
                      prompt: Text("add").font(Garamond.italic(19)).foregroundColor(Color.inkFaint))
                .font(Garamond.regular(19))
                .foregroundStyle(Color.ink)
                .focused($inputFocused)
                .submitLabel(.done)
                .onSubmit(commitNew)
                .padding(.trailing, 4)

            Spacer(minLength: 8)

            PriorityChip(priority: $newPriority)
        }
        .padding(.vertical, 12)
        .padding(.leading, 12)
        .padding(.trailing, 16)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.rule)
                .frame(height: 1)
        }
    }

    private var emptyMessage: some View {
        VStack(spacing: 12) {
            Spacer().frame(height: 64)
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [Color.rule.opacity(0), Color.rule, Color.rule.opacity(0)],
                        startPoint: .leading, endPoint: .trailing
                    )
                )
                .frame(width: 40, height: 1)
            Text("the room is empty")
                .font(Garamond.italic(15))
                .foregroundStyle(Color.inkFaint)
            Spacer().frame(height: 32)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Actions

    private func commitNew() {
        let trimmed = newText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let p = newPriority
        let maxPos = openTodos
            .filter { $0.priority == p.rawValue }
            .map { $0.position }
            .max() ?? 0
        let todo = Todo(
            text: trimmed,
            houseID: house.id,
            priority: p,
            position: maxPos + 1
        )
        ctx.insert(todo)
        newText = ""
        Haptics.light()
        // Keep priority sticky for chained entries; keep keyboard up.
        inputFocused = true
    }

    private func reorderWithin(priority p: Priority, from: IndexSet, to: Int) {
        var items = openTodos.filter { $0.priority == p.rawValue }
        items.move(fromOffsets: from, toOffset: to)
        for (index, item) in items.enumerated() {
            item.position = Double(index)
        }
        Haptics.soft()
    }
}
