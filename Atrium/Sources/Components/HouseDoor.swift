import SwiftUI
import SwiftData
import Inject

struct HouseDoor: View {
    let house: House
    @Query private var openTodos: [Todo]
    @ObserveInjection var inject

    init(house: House) {
        self.house = house
        let id = house.id
        _openTodos = Query(
            filter: #Predicate<Todo> { $0.houseID == id && $0.statusRaw == 0 }
        )
    }

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(house.name)
                    .font(Garamond.medium(24))
                    .foregroundStyle(Color.ink)
                Text(house.definition)
                    .font(Garamond.italic(16))
                    .foregroundStyle(Color.inkFaint)
                    .lineSpacing(2)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 12)

            Text(openTodos.isEmpty ? "—" : "\(openTodos.count)")
                .font(.system(size: 11, weight: .medium, design: .monospaced))
                .tracking(2)
                .foregroundStyle(Color.inkFaint)
                .padding(.top, 6)
        }
        .padding(.vertical, 18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.rule.opacity(0.7))
                .frame(height: 1)
        }
        .enableInjection()
    }
}
