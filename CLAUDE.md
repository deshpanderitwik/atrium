# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Atrium is a SwiftUI iOS 17+ app — a contemplative todo app organized around twelve fixed "houses" (life domains: corpus, animus, tempus, … ludus). The home screen (atrium) lists the twelve doors; each door opens a per-house todo list. SwiftData persists on-device. There are no tests, no CI, no external runtime dependencies beyond the dev-only `Inject` package.

The README's "What this is not" section is load-bearing: do not introduce streaks, scores, dashboards, nudges, or coaching tone. Features that would make the app evaluate the user are out of scope.

## Build & run

The Xcode project is generated from `Atrium/project.yml` via XcodeGen and is gitignored. Always regenerate after editing `project.yml`:

```bash
cd Atrium
xcodegen generate     # rebuild Atrium.xcodeproj from project.yml
open Atrium.xcodeproj # then ⌘R in Xcode
```

`brew install xcodegen` if missing. There is no command-line test target — the app is built and run from Xcode against a device or Simulator. There is no linter configured.

Source-only changes do not require regenerating the project. Regenerate only when `project.yml` changes or files are added/removed/renamed under `Atrium/Sources` or `Atrium/Resources`.

The repo's `DEVELOPMENT_TEAM` and `PRODUCT_BUNDLE_IDENTIFIER` in `project.yml` are personal to the maintainer; do not modify them as part of unrelated work.

## Architecture

### Single SwiftData model, "house" as a string tag

There is one `@Model`: `Todo` (`Atrium/Sources/Models/Todo.swift`). Houses are **not** a SwiftData entity — they are a hardcoded catalog (`HouseCatalog.houses`) of twelve `House` value structs (`id`, `name`, `definition`). A todo belongs to a house via the `houseID: String` foreign-tag. All per-house views filter by `#Predicate<Todo> { $0.houseID == id }`.

Consequences for any change:
- Adding "house-level" state (e.g. `meta_md`, weekly summaries, the deferred LLM thinking partner) means introducing a `House` `@Model` and migrating, **or** adding a parallel `HouseMeta` model keyed by the same string ID. Don't silently break the catalog contract.
- The order of `HouseCatalog.houses` is structural (self outward to world) and is referenced in the README and process notes. Do not reorder or rename without intent.

### Todo schema quirks worth knowing before editing

- `statusRaw: Int` (0/1), **not** `Bool`. SwiftData `#Predicate` filtering on Bool was avoided; predicates throughout (`HouseDoor`, `TodoListPane`, `StarredStrip`) rely on `statusRaw == 0` / `== 1`. The `isDone: Bool` computed property is the API everywhere else.
- `priority: Int` (0–3) for the same reason; the `Priority` enum is the API, `priorityValue` is the bridge.
- `position: Double` — manual ordering within a `(houseID, priority)` cluster. New items are appended via `max(position) + 1`. Drag-to-reorder rewrites positions as contiguous integers (`reorderWithin` in `TodoListPane`). Doubles are deliberate so future insertions can average between two siblings without renumbering.
- Changing a todo's priority calls `repositionAtBottom(of:)` in `TodoRow` so it lands at the end of the destination cluster — do this in any code path that mutates `priorityValue`.
- `completedAt` is set/cleared inside the `isDone` setter. Reopening a done todo on a different day re-keys it into today's day-group on the Done section (driven by `doneByDay` in `TodoListPane`).

### View tree

Three screens, each backed by SwiftData `@Query` initialized in the view's `init` with the houseID captured into the predicate (otherwise SwiftData can't compile the predicate):

- `AtriumView` — home; renders `StarredStrip` + twelve `HouseDoor`s in a `NavigationStack`. Tapping a door (or a starred row) pushes `HouseView`.
- `HouseView` — header (definition, ← atrium) + `TodoListPane`. Hides nav bar; re-enables the system left-edge swipe-back via `.swipeBackEnabled()` (see below).
- `TodoListPane` — input row, one `Section` per non-empty priority cluster (P0…P3), then Done grouped by day. Swipe-left deletes, swipe-right toggles starred.

Reusable pieces live in `Components/`. They are leaves — no further composition expected.

### Two conventions that touch every view

1. **`Inject` hot-reload scaffolding.** Every `View` has `@ObserveInjection var inject` and ends with `.enableInjection()`. This is a no-op on device; in the Simulator with InjectionIII it lets you edit SwiftUI without rebuilding. Add the same two lines to any new view so the rhythm is preserved. The `OTHER_LDFLAGS: -Xlinker -interposable` Debug setting in `project.yml` is part of this — don't strip it.
2. **`.swipeBackEnabled()` on pushed destinations.** SwiftUI disables the interactive pop gesture when `.toolbar(.hidden, for: .navigationBar)` is set. `SwipeBackEnabler` is a UIViewControllerRepresentable that reaches into the hosting `UINavigationController` to turn it back on. Any pushed view that hides the nav bar must call `.swipeBackEnabled()`.

### Theme

`Theme.swift` defines the entire palette (warm dark, `paper` / `ink` / `oxblood`, etc.) and font helpers (`Garamond.*`, `Mono.label`). Do not introduce ad-hoc colors or system fonts in views — extend `Theme.swift`. The app is locked to dark via `.preferredColorScheme(.dark)` at the root and `UIUserInterfaceStyle: Dark` in `project.yml`; do not add light-mode variants.

EB Garamond TTFs are bundled under `Resources/Fonts/` and registered through `UIAppFonts` in `project.yml`. Adding a font file requires both copying it in and adding its filename to `UIAppFonts`.

## Repo layout

- `Atrium/Sources/` — app code (`Models`, `Screens`, `Components`, `Theme`, `Utils`, `AtriumApp.swift`)
- `Atrium/Resources/` — `Info.plist`, fonts
- `Atrium/project.yml` — XcodeGen spec; source of truth for the project file
- `process/` — static HTML microsites (00-proposal, 01-architecture, 02-philosophy, 03-construction) documenting design decisions. Not built or shipped with the app; serve with `python3 -m http.server` inside `process/` to view. Treat them as design context, not a spec to mechanically implement — section §IV of `03-construction` covers the deferred LLM thinking-partner work.
