# Atrium

A contemplative todo app for tending the twelve domains of life. iOS, SwiftUI.

> The atrium is the open central court of a Roman house — the room you pass
> through to reach every other room. The home screen is the atrium; the
> houses open off it.

You open the app, see twelve names, and choose where to spend yourself today.
Inside each house: an ongoing prioritized list, and (later) a week-long
conversation with an LLM that serves as a thinking partner for that domain.

The order of the houses matters — it moves from self outward to world:

```
  I    Corpus       movement without friction
  II   Animus       the day's emotion integrates in sleep
  III  Tempus       the week breathes
  IV   Domus        the apartment exhales
  V    Patrimonium  enough; resources flow without anxiety
  VI   Opus         the next move is obvious
  VII  Ars          the made thing is more than the parts
  VIII Studium      the concept clicks
  IX   Vinculum     a conversation that meets both people
  X    Polis        contribution without exhausting the self
  XI   Naturum      the indifferent ocean
  XII  Ludus        laughter that surprises you
```

## What this is not

- Not a dashboard. There are no vitality bars, scores, or felt-state ratings.
  The app does not tell you how you are doing.
- Not a productivity app. No streaks, no throughput metrics, no "you've been
  neglecting X" nudges.
- Not a coach. The LLM thinking partner (when built) is a thinking partner,
  not a motivator.

Load balancing emerges from the user seeing the twelve names and choosing.
The app's job is to hold the rooms with fidelity.

## Status

Built and running on a personal device. Not yet on the App Store.

### What's built

- **Atrium home screen** — live date and time at the top (24h, lowercase
  italic), a strip of starred items pulled from across the twelve houses,
  then the twelve doors with open-todo counts
- **House view** — header with name and definition, swipe-from-left-edge back
  to the atrium
- **Todos** with full CRUD
  - `+ add` input with a sticky priority chip
  - Priorities P0–P3 grouped into clusters
  - Tap a chip to change priority; the row regroups
  - Drag-to-reorder within a cluster
  - Single-tap text to edit inline; return or blur commits
  - Tap the checkbox circle to mark done; tap again to uncomplete
  - Swipe-right to star (oxblood), swipe-left to delete
  - Empty rows on commit delete themselves
- **Done section**, grouped by completion day (today · yesterday · monday
  12 may · 12 may 2024); re-checking on a different day re-keys the day
- **Starred strip** on the home screen, tap to jump to the owning house
- **Persistence** via SwiftData (local, on-device)
- **Aesthetic** — warm vellum-dark palette, EB Garamond serif throughout,
  monospace structural labels, oxblood accent used sparingly

### What's deferred

- **The thinking partner** — per-house LLM conversation scoped to a calendar
  week, with prompt construction from house definition + `meta_md` + open
  todos + previous week's summary
- **`propose_todo` tool** — inline confirmation card for action-shaped items
  the LLM identifies in conversation
- **`meta_md` per house** — long-lived markdown context that survives weekly
  rollover and rides in every system prompt for that house
- **Weekly rollover** — Sunday 23:59 local lazy boundary, summary generation,
  summary card pinned at top of the new week
- **CloudKit sync** — cross-device, end-to-end encrypted
- **Voice input** — press-and-hold dictation in the chat composer (especially
  for Animus, Vinculum, Naturum)
- **Memory provocations** — seven directions for making the partner's memory
  better than week-deep, including a pyramid of summaries, `propose_meta_edit`,
  retrieval over the embedding store, a voice profile, cross-house bridges,
  and an explicit forgetting protocol. Detailed in
  [process/03-construction](./process/03-construction/) §IV

## Process

Design has been worked out in a series of single-use microsites — process
notes that articulate decisions before code, visually consistent with the app
itself.

- **[00 — Proposal](./process/00-proposal/)** · the founding brief, the twelve
  houses, the two screens, what we explicitly aren't building
- **[01 — Architecture](./process/01-architecture/)** · original (web-first)
  shape of the app, six core user journeys, the prompt contract
- **[02 — Philosophy](./process/02-philosophy/)** · twelve houses twelve
  clocks; the asymmetry of time, the asymmetry of action, the five verbs of
  attention, why the week, the epistemological argument against a dashboard
- **[03 — Construction](./process/03-construction/)** · pivot to iOS, the
  SwiftUI component tree, four committed communication patterns, seven
  provocations on how the houses should remember, a twelve-step build order

These render as static HTML. Open the `index.html` in a browser, or serve
locally with `python3 -m http.server` from inside `process/`.

## Build & run

### Requirements

- macOS · Xcode 15+
- Apple Developer team (free personal team is sufficient for device install)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) — `brew install xcodegen`

### Setup

```bash
cd Atrium

# Edit project.yml — change two lines to match your account:
#   DEVELOPMENT_TEAM:           your 10-char team ID (Xcode > Settings >
#                               Accounts > your Apple ID > team name)
#   PRODUCT_BUNDLE_IDENTIFIER:  any unique reverse-DNS string you own
#                               e.g. com.<yourname>.atrium

xcodegen generate
open Atrium.xcodeproj
```

Then in Xcode, select your iPhone in the device dropdown and hit `⌘R`.

On first install to a device, iOS will show an "Untrusted Developer" prompt
the first time you tap the app icon. Fix it once in
**Settings → General → VPN & Device Management → trust your developer
profile**, then tap the icon again.

## Stack

- **SwiftUI** · iOS 17+
- **SwiftData** on-device persistence
- **EB Garamond** (bundled, OFL-licensed) for all serif type; system
  monospaced for structural labels
- **Inject** (development-only) — wired up but a no-op on device; the
  scaffolding stays so we can use it cleanly when iterating in the Simulator
- No external runtime dependencies

## License

Code: [MIT](./LICENSE).

EB Garamond, bundled in `Atrium/Resources/Fonts/`, is licensed under the
SIL Open Font License 1.1. The full OFL text is in
[Atrium/Resources/Fonts/OFL.txt](./Atrium/Resources/Fonts/OFL.txt).
