import SwiftUI

struct PrioritySectionHeader: View {
    let label: String
    var topPadding: CGFloat = 22
    var bottomPadding: CGFloat = 6

    var body: some View {
        Text(label)
            .font(.system(size: 11, weight: .medium, design: .monospaced))
            .tracking(3)
            .foregroundStyle(Color.inkFaint)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.leading, 12)
            .padding(.top, topPadding)
            .padding(.bottom, bottomPadding)
    }
}
