import SwiftUI
import Inject

struct HouseView: View {
    let house: House
    @Environment(\.dismiss) private var dismiss
    @ObserveInjection var inject

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
                .padding(.horizontal, 28)
            Rectangle()
                .fill(Color.rule)
                .frame(height: 1)
                .padding(.horizontal, 28)
            TodoListPane(house: house)
                .padding(.horizontal, 28)
        }
        .background(Color.paper.ignoresSafeArea())
        .navigationBarBackButtonHidden()
        .toolbar(.hidden, for: .navigationBar)
        .scrollDismissesKeyboard(.interactively)
        .swipeBackEnabled()
        .enableInjection()
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                dismiss()
            } label: {
                Text("← atrium")
                    .font(Mono.label(11))
                    .tracking(3)
                    .foregroundStyle(Color.inkFaint)
            }
            .padding(.top, 24)
            .padding(.bottom, 18)

            VStack(alignment: .leading, spacing: 8) {
                Text(house.name)
                    .font(Garamond.medium(38))
                    .foregroundStyle(Color.ink)

                Text(house.definition)
                    .font(Garamond.italic(17))
                    .foregroundStyle(Color.inkSoft)
                    .lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.bottom, 20)
        }
    }
}
