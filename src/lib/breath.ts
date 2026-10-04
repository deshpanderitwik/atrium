// Breath patterns and the session shape shared by the engine, the belt and the
// thread. A round is 60s of breathing followed by 10s of rest.

export type BreathPattern = "4-6" | "5-5";

export const PATTERNS: Record<BreathPattern, { inhale: number; exhale: number }> = {
  "4-6": { inhale: 4, exhale: 6 },
  "5-5": { inhale: 5, exhale: 5 },
};

export const BREATH_SECONDS = 60;
export const PERIOD_SECONDS = 70;

// rounds === null runs until stopped.
export type BreathConfig = {
  pattern: BreathPattern;
  rounds: number | null;
  silent: boolean;
};

export const cycleSeconds = (p: BreathPattern) => PATTERNS[p].inhale + PATTERNS[p].exhale;

export const patternLabel = (p: BreathPattern) => p.replace("-", "–");

export const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
