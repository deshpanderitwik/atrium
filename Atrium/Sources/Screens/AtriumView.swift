import SwiftUI
import Inject

struct AtriumView: View {
    @ObserveInjection var inject

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    header
                    StarredStrip()
                    ForEach(HouseCatalog.houses) { house in
                        NavigationLink(value: house) {
                            HouseDoor(house: house)
                        }
                        .buttonStyle(.plain)
                    }
                    footer
                }
                .padding(.horizontal, 28)
            }
            .scrollIndicators(.hidden)
            .background(Color.paper.ignoresSafeArea())
            .navigationDestination(for: House.self) { house in
                HouseView(house: house)
            }
            .navigationDestination(for: House?.self) { maybe in
                if let house = maybe { HouseView(house: house) }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .tint(Color.oxblood)
        .enableInjection()
    }

    private var header: some View {
        VStack(spacing: 28) {
            Text("tend each house in its own time")
                .font(Garamond.italic(26))
                .foregroundStyle(Color.ink)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .padding(.horizontal, 24)

            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [Color.rule.opacity(0), Color.rule, Color.rule.opacity(0)],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .frame(width: 1, height: 40)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 88)
        .padding(.bottom, 40)
    }

    private var footer: some View {
        VStack(spacing: 0) {
            Spacer().frame(height: 56)
            Text("·")
                .font(Garamond.regular(20))
                .foregroundStyle(Color.inkFaint)
            Spacer().frame(height: 48)
        }
    }
}
