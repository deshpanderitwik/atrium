import Foundation

/// The atrium holds at most three declared tasks.
///
/// The cap is the point, not a convenience. An unbounded strip would drift
/// back into a computed list — the app reporting on you rather than you
/// stating something — and the choosing would quietly stop. Three forces
/// the choosing.
enum StarLimit {
    static let max = 3
}
