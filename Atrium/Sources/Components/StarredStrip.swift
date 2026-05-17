import SwiftUI
import SwiftData
import Inject

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
                    ForEach(starred) { todo in
                        NavigationLink(value: HouseCatalog.houses.first { $0.id == todo.houseID }) {
                            starredRow(todo)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.bottom, 32)
            }
        }
        .enableInjection()
    }

    @ViewBuilder
    private func starredRow(_ todo: Todo) -> some View {
        let houseName = HouseCatalog.houses.first { $0.id == todo.houseID }?.name ?? ""
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text("★")
                .font(.system(size: 12))
                .foregroundStyle(Color.oxblood)
            Text(todo.text)
                .font(Garamond.regular(18))
                .foregroundStyle(Color.ink)
                .lineLimit(1)
            Spacer(minLength: 8)
            Text(houseName.lowercased())
                .font(Garamond.italic(15))
                .foregroundStyle(Color.inkFaint)
        }
        .padding(.vertical, 9)
        .contentShape(Rectangle())
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.rule.opacity(0.5))
                .frame(height: 1)
        }
    }
}
