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
        TimelineView(.periodic(from: .now, by: 30)) { context in
            let now = context.date
            let euro = Locale(identifier: "en_GB")

            VStack(spacing: 18) {
                Text(now.formatted(.dateTime.weekday(.wide).locale(euro)).uppercased())
                    .font(Mono.label(11))
                    .tracking(3.5)
                    .foregroundStyle(Color.inkFaint)

                Text(now.formatted(.dateTime.hour().minute().locale(euro)))
                    .font(Garamond.mediumItalic(72))
                    .foregroundStyle(Color.ink)

                Text(now.formatted(.dateTime.day().month(.wide).year().locale(euro)))
                    .font(Garamond.italic(17))
                    .foregroundStyle(Color.inkFaint)

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
