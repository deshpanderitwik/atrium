import SwiftUI

struct DayHeader: View {
    let day: Date

    var body: some View {
        HStack {
            Text(label)
                .font(Garamond.italic(16))
                .foregroundStyle(Color.inkFaint)
            Spacer()
        }
        .padding(.leading, 12)
        .padding(.top, 12)
        .padding(.bottom, 4)
    }

    private var label: String {
        let cal = Calendar.current
        if cal.isDateInToday(day)     { return "today" }
        if cal.isDateInYesterday(day) { return "yesterday" }

        let euro = Locale(identifier: "en_GB")
        let isThisYear = cal.isDate(day, equalTo: .now, toGranularity: .year)
        if isThisYear {
            // "monday 12 may"
            return day.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(euro)).lowercased()
        }
        // "12 may 2024"
        return day.formatted(.dateTime.day().month(.wide).year().locale(euro)).lowercased()
    }
}
