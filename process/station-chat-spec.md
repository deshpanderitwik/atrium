# The station chat: interaction spec

How the conversation in Atrium should move and feel. Each rule is written so it
can be checked by hand in the chat lab (`../chat-lab`) before anything ships to
the real thread.

The bar is that nothing in the thread moves unless you moved it, or something
new arrived and you were already watching the bottom.

## The model

The screen has three layers, from back to front:

1. **The thread.** A vertical list of everything, oldest at the top.
2. **The belt.** Breathe · text box · send, floating above the bottom edge.
3. **The keyboard**, when it's up.

Two lengths drive everything:

- **Bottom inset** = belt height + gap + keyboard height (or the home-indicator
  safe area when the keyboard is down). The thread's usable bottom edge is
  always exactly this far above the screen's bottom.
- **Distance from bottom** = how far the thread is scrolled up from its end.

The one state that matters is **pinned**: distance from bottom ≤ 24 pt. Every
rule below either keeps you pinned or deliberately leaves you where you are.

## Rules

### R1 — The conversation rests on the belt
- When the thread is shorter than the screen, it stacks up from the belt, not
  down from the top. The newest message sits just above the belt, with a
  12 pt gap.
- When it's longer, the end of the newest message is that same 12 pt above the
  belt while pinned.
- *Check:* fresh thread with 2 messages; they sit just above the belt, not
  under the status bar.

### R2 — Nothing hides under the belt or the keyboard
- The bottom inset is applied as scroll inset, not layout padding. The last
  line of the last message is never covered, in any state.
- The belt grows as you write up to 5 lines. As it grows, the inset grows with
  it, in the same frame, and a pinned thread rises with it.
- *Check:* type a 5-line message; the last reply stays fully visible above the
  growing belt.

### R3 — The keyboard carries the thread, frame for frame
- Opening the keyboard: the belt and (if pinned) the thread's bottom rise on
  the keyboard's own curve and duration, in lockstep. No lag, no overshoot, no
  second correction.
- Not pinned: the keyboard covers more of the thread, but the message at the
  top of the screen stays where it is.
- Swipe down on the thread to dismiss: the keyboard follows the finger
  (interactive), and the belt and thread follow the keyboard every frame,
  including when the swipe is abandoned and the keyboard springs back.
- *Check:* scroll to the bottom, tap the box; the last message rises with the
  keyboard edge. Drag the keyboard halfway down and back up; the belt never
  detaches from it.

### R4 — Pinned means following
- While pinned, anything that makes the thread longer keeps you pinned: your
  message arriving, the listening dot, a reply streaming in, the belt growing,
  the keyboard opening.
- Following a streaming reply is continuous. There's no per-token jump and no
  animated re-scroll fighting the next token. The bottom edge holds and the
  text grows upward from it.
- *Check:* while pinned, a 6-sentence reply streams in; the newest line stays
  just above the belt the whole time, without stutter.

### R5 — Scrolled up means left alone
- Once you scroll up past the pinned threshold, new content never moves what
  you're reading. A reply streaming in below doesn't shift a pixel above it.
- A **latest** pill appears above the belt, centred: quiet when nothing is
  new, hot (orange) when something arrived while you were up. Tapping it
  scrolls to the bottom (an eased 300 ms) and you're pinned again.
- Scrolling back to the bottom yourself re-pins you. The pill fades out.
- *Check:* scroll halfway up, send a message from the lab's "remote reply"
  button; the view doesn't move, and the pill turns orange.

### R6 — Sending always pins
- Sending a message snaps you to pinned wherever you were, with a short eased
  scroll if you were far up. Your message appears in place at the bottom,
  then the listening dot, then the reply.
- The keyboard stays up after sending, so the next thought can follow.
- *Check:* scroll far up, type, send; you land at the bottom with your message
  visible.

### R7 — Opening lands at the bottom
- Cold launch, returning from the background, and coming back from a breath
  session all show the thread already at the bottom: no visible scroll from
  the top, no flash of old messages.
- The keyboard comes up on launch and on return (R3 carries the thread with
  it).
- *Check:* a seeded thread of 300 messages; open the lab. The first frame
  shows the bottom.

### R8 — Long history stays fast
- The thread is virtualised: only what's near the screen is rendered.
  Scrolling a year of messages stays at 60 fps, and opening doesn't render
  everything first.
- Scrolling up into older history loads it in place without any jump.
- *Check:* 300 seeded messages; fling to the top and back with no blank
  flashes and no stutter.

### R9 — Arrivals feel placed, not dropped
- Your message fades in over 200 ms where it lands (no slide, which would
  fight the scroll).
- The reply reveals at an even pace with a settling tail (as now), and its
  growth is what R4 follows.
- Day headings and time labels are part of the list, not overlays, and they
  scroll with it.

### R10 — Touch
- Tapping empty thread space dismisses the keyboard (as now) but never
  scrolls.
- Long-pressing a message selects its text for copying (system behaviour).
- The scroll bar is hidden. Overscroll bounce stays on: it's how the thread
  feels like an object.

## Out of scope for now

Editing or deleting messages, search, jumping to a date, and attachments.

## Implementation notes

- **Keyboard:** `react-native-keyboard-controller` drives the belt and the
  bottom inset from the UI thread (`useKeyboardHandler` /
  `useReanimatedKeyboardAnimation`), and handles the interactive dismissal.
  It's a native module, so shipping it needs a new app build (0.3.0).
- **List:** `@legendapp/list`, with content aligned to the end and kept at the
  end while pinned (`alignItemsAtEnd`, `maintainScrollAtEnd`), and the
  visible position held while scrolled up (`maintainVisibleContentPosition`).
  It's plain JavaScript.
- **The pinned state is ours,** computed from scroll events and kept in a
  shared value, so the pill and the follow behaviour agree.
