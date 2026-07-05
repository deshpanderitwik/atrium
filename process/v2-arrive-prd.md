# Atrium v2 — "Arrive" · Product Requirements

> Status: draft for review. This document guides the v2 redesign. It is built to
> be executed **brick by brick**; each brick is independently shippable over the
> air.

## 1. Why v2 exists

v1 is a *doing* tool — lists, a focus timer, recurring rhythm. It answers **"what
do I need to do?"**

The felt problem is upstream of that. The mind wanders and gets **hijacked** —
pulled out of the present into reactivity and the actions that follow, and the
suffering that comes with it. So the app's first job changes:

**Anchor me to the present moment and to my body first. Only from that anchored
place, gently steer me toward what each house asks.**

Tasks become *downstream of presence*, not the entry point.

## 2. North star & principles

- **Presence is the gate.** You arrive before you act. The *atrium* — a Roman
  house's open threshold you pass through to reach the rooms — finally does its
  literal job.
- **The app must not itself hijack.** No streaks, badges, dopamine pings, or
  infinite surfaces. It is calm, finite, and **quick to leave**. A quiet success
  metric is *how little you need it* and *how fast it returns you to living*.
- **Body-first.** The anchor is the breath, not words.
- **Self-paced, never a toll.** You breathe as long as you want; the app invites,
  it does not enforce or score.
- **Continuity of feel.** The vellum-dark palette, EB Garamond, and no-chrome
  restraint carry straight over.

## 3. The core loop

```
ARRIVE  →  choose:  REFLECT   (write what you're experiencing → logged)
(breathe)          or ACT     (pick a task → focus timer → complete)
                                → RETURN (come back whenever you notice you've wandered)
```

## 4. Flows

### 4.1 Arrive (the new home screen)

- On every open, the root screen is **Arrive** — not the house list.
- **Guiding text** brings attention back to the here-and-now and to the body
  (a short, rotating or fixed line — tone: gentle, plain, not preachy).
- A large **"arrive"** button invites **press-and-hold**.
- While held, a **4-in / 6-out breath guide** runs (see 4.2). It loops for **as
  long as you hold** — no target, no countdown.
- On **release**, two paths appear: **reflect** and **perform a task**.

### 4.2 Breath guidance

- Cycle: **inhale 4s → exhale 6s** (10s loop), looping while held.
- Visual: a single form (orb / ring / line) that **expands over 4s, contracts
  over 6s**, with quiet "in" / "out" cueing. No numbers competing for attention.
- Optional gentle **haptic** at each phase turn (in→out, out→in).
- On release, it settles/fades; the two choices surface.

### 4.3 Reflect

- A calm writing surface, prompt along the lines of *"what are you
  experiencing?"* — free text, no formatting, no length pressure.
- **Save** stores a **timestamped reflection** locally.
- Optionally captures how long you breathed before writing (`heldSeconds`).

### 4.4 Reflections log

- A menu listing reflections, **reverse-chronological**, each **timestamped**.
- Read a full entry; delete an entry. (Edit/search: later.)
- Reachable from Arrive (a quiet affordance, not a prominent tab).

### 4.5 Perform a task

- Routes into **task selection** — the existing atrium (houses → tasks) — which
  leads into the existing **focus timer**, unchanged.
- All of v1's task machinery (houses, recurrence/rhythm, focus metrics, done log)
  is **retained**, just repositioned *behind* Arrive.

## 5. What changes structurally

| v1 | v2 |
|---|---|
| Root = the atrium (house list) | Root = **Arrive** |
| — | Arrive → Reflect / Act |
| Houses / tasks / recurrence / focus | unchanged, now reached via "perform a task" |
| — | **Reflections** store + log |

Routing (proposed): `/` = Arrive · `/atrium` = house list · `/house/[id]` ·
`/focus/[id]` · `/reflect` · `/reflections`.

## 6. Data additions

- New table **`reflections`**: `id`, `body`, `createdAt`, `heldSeconds?`,
  `houseID?` (nullable, for later linking). Same migration pattern as the timer
  fields.
- No change required to the `todos` table for the core Arrive flow.

## 7. Open questions (resolve before/within the relevant brick)

1. **Minimum hold?** Should releasing instantly (no real breath) still show the
   two choices, or is a short minimum required? *Lean: no hard minimum — the
   visual invites holding; a forced minimum becomes a toll.*
2. **After Reflect, where do you land?** Back to Arrive, into the atrium, or a
   quiet confirmation then close? *Lean: back to a settled Arrive.*
3. **Is Act reachable without arriving?** Must you press-and-release the button
   to get the choices (soft gate), or is there a bypass straight to tasks? *Lean:
   soft gate — the button is the only path, but holding is optional.*
4. **Guiding text:** one fixed line, or a small rotating set? Who writes them?
5. **Breath form & haptics:** which visual metaphor, and haptics on/off by
   default?
6. **Reflections:** delete-only, or also edit? Any privacy affordance?

## 8. Explicitly deferred (not v2 core)

- **Bells / notifications** that reach into your day. (Most direct lever on
  mind-wandering, but the most dangerous — a presence app that pings risks
  becoming the hijacker. Revisit deliberately, later.)
- **LLM "steward"** that helps you notice and choose.
- Reframing every task as practice; linking reflections to houses; any analytics.

## 9. Brick-by-brick build plan

Each brick is shippable on its own via `eas update`.

- **Brick 1 — Arrive as the new root.** Guiding text + press-and-hold "arrive"
  button + 4/6 breath guide (basic visual) + on release show **reflect** /
  **perform a task**. Wire "perform a task" to the existing atrium (house list
  moves to `/atrium`). Reflect can be a stub for now. *Ships the new spine.*
- **Brick 2 — Reflect + storage.** The writing surface, `reflections` table +
  migration, save with timestamp (and `heldSeconds`).
- **Brick 3 — Reflections log.** List view, reverse-chronological, timestamped,
  read + delete.
- **Brick 4 — Presence polish.** Breath visual/haptics, hold feedback, arrival
  transitions, empty/first-run states, guiding-text set.
- **Brick 5+ — Deferred threads** (bells, steward, task-as-practice) taken up
  deliberately, one at a time.

## 10. Success signals & non-goals

- **Signals:** you pause before acting; reflections quietly accumulate; you leave
  the app fast.
- **Non-goals:** engagement, streaks, notifications-by-default, scoring presence.
