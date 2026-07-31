// Guiding lines shown on the Arrive screen. Written in the spirit of Ram Dass —
// present, embodied, gently loving; an invitation, never an instruction.
export const GUIDING_LINES: string[] = [
  "You are already here. Let the rest of you arrive.",
  "Nowhere to go, nothing to fix. Just this breath, just this body.",
  "Feel your feet. Feel the breath moving. You are home.",
  "The thinking can settle now, like silt in still water.",
  "This moment is not asking anything of you yet. Rest in it.",
  "Come back to the breath — it has been waiting for you all along.",
  "Soften. The present is wide enough to hold all of you.",
  "The mind wanders everywhere but here. Here is where you are loved.",
  "Be here now. Everything else can wait a few breaths.",
];

// A stable-per-mount pick. (Callers choose when to reroll — e.g. on each open.)
export const pickGuidingLine = (): string =>
  GUIDING_LINES[Math.floor(Math.random() * GUIDING_LINES.length)];
