import SwiftUI
import SwiftData
import Inject

/// The three declared tasks, shown at the top level of the atrium.
///
/// Everything on this strip is something the user chose to put here. Tap the
/// circle to complete, tap the star to release it back to its house, tap the
/// text to walk to the house it came from.
struct StarredStrip: View {
    @Query(
        filter: #Predicate<Todo> { $0.starred && $0.statusRaw == 0 },
        sort: [SortDescriptor(\Todo.priority), SortDescriptor(\Todo.position)]
    )
    private var starred: [Todo]

    @ObserveInjection var inject

    var body: some View {
        Group {
            if starred.isEmpty {
                EmptyView()
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    // Defensive slice — the swipe affordance already caps at
                    // three, but a synced device could hand us more.
                    ForEach(Array(starred.prefix(StarLimit.max))) { todo in
                        starredRow(todo)
                    }
                }
                .padding(.bottom, 32)
            }
        }
        .enableInjection()
    }

    @ViewBuilder
    private func starredRow(_ todo: Todo) -> some View {
        let house = HouseCatalog.houses.first { $0.id == todo.houseID }

        HStack(alignment: .firstTextBaseline, spacing: 2) {
            TodoCheckbox(isDone: false) {
                withAnimation(.easeInOut(duration: 0.18)) {
                    todo.isDone = true
                    todo.starred = false
                }
                Haptics.success()
            }
            .alignmentGuide(.firstTextBaseline) { d in d[VerticalAlignment.center] + 6 }

            NavigationLink(value: house) {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text(todo.text)
                        .font(Garamond.regular(18))
                        .foregroundStyle(Color.ink)
                        .lineLimit(1)
                    Spacer(minLength: 8)
                    Text(house?.name.lowercased() ?? "")
                        .font(Garamond.italic(15))
                        .foregroundStyle(Color.inkFaint)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            unstarButton(todo)
                .alignmentGuide(.firstTextBaseline) { d in d[VerticalAlignment.center] + 6 }
        }
        .padding(.vertical, 9)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.rule.opacity(0.5))
                .frame(height: 1)
        }
    }

    private func unstarButton(_ todo: Todo) -> some View {
        Button {
            withAnimation(.easeOut(duration: 0.18)) { todo.starred = false }
            Haptics.rigid()
        } label: {
            Text("★")
                .font(.system(size: 13))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
