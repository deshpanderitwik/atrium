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

Re-platformed from native SwiftUI onto **Expo / React Native** so the front end
is JavaScript and can be updated **over-the-air** — edits ship to the phone via
`eas update` without an App Store round-trip. Distributed through **TestFlight**.
The original SwiftUI implementation is preserved under
[`archive/ios-swiftui/`](./archive/ios-swiftui/).

### What's built

- **Atrium home screen** — a meditation line at the top, a strip of starred
  items pulled from across the twelve houses, then the twelve doors with
  open-todo counts
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

## Develop

No Mac required — EAS builds in the cloud. Locally you just need Node and the
Expo CLI for fast iteration.

```bash
npm install
npx expo start        # press i for the iOS Simulator, or scan with a dev build
```

`npm run typecheck` runs `tsc`; `npm run doctor` runs `expo-doctor`.

## Ship to TestFlight (one-time setup)

These steps need your paid Apple Developer account but no Mac.

```bash
npm i -g eas-cli
eas login                                  # create a free expo.dev account first
eas init                                   # links the project, fills the EAS project id
eas build --platform ios --profile production   # cloud build; EAS manages signing
eas submit --platform ios                  # → App Store Connect → TestFlight
```

Accept the build in TestFlight on your phone and install. The bundle id is
`com.ritwikdeshpande.atrium` (change it in `app.config.ts` if needed).

## Iterate over the air (the phone edit loop)

Once a TestFlight build is installed, JS/asset changes ship without a rebuild:

```bash
eas update --branch production --message "tweak the tagline"
```

The app checks for updates on launch and whenever it returns to the foreground
(see `src/lib/useOtaUpdates.ts`), so the change lands on the next open.

This is automated in CI: pushing JS changes to `main` (or the working branch)
triggers [`.github/workflows/ota.yml`](./.github/workflows/ota.yml), which runs
`eas update` for you. Add an Expo access token as the `EXPO_TOKEN` repo secret to
enable it. That closes the loop — edit from anywhere (including the phone, via
the GitHub web UI or Claude Code), commit, and the update reaches the device.

**Native changes** (new native dependency, Expo SDK bump, icon, permissions)
can't ship over the air — they need a fresh build. The `runtimeVersion`
fingerprint policy enforces this, and
[`.github/workflows/build.yml`](./.github/workflows/build.yml) cuts a new
TestFlight binary on a `v*` tag or manual dispatch.

## Stack

- **Expo / React Native** · TypeScript · **expo-router** file-based navigation
- **expo-updates** (EAS Update) for over-the-air JS delivery
- **expo-sqlite** for local persistence (replaces SwiftData) — see `src/db/`
- **expo-haptics**, **react-native-gesture-handler** (swipe actions),
  **react-native-draggable-flatlist** (drag-to-reorder)
- **EB Garamond** (bundled in `assets/fonts/`, OFL-licensed) loaded via
  **expo-font**; system monospaced for structural labels

### Layout

- `app/` — routes (`index.tsx` is the atrium; `house/[id].tsx` is a house)
- `src/theme.ts`, `src/houses.ts` — palette/typography and the twelve houses
- `src/db/` — SQLite store, types, and the grouping/ordering selectors
- `src/components/` — the ported UI pieces
- `archive/ios-swiftui/` — the original SwiftUI app, kept intact

## License

Code: [MIT](./LICENSE).

EB Garamond, bundled in `assets/fonts/`, is licensed under the SIL Open Font
License 1.1. The full OFL text is in [assets/fonts/OFL.txt](./assets/fonts/OFL.txt).
