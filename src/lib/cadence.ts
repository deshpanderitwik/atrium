import { Todo } from "@/db/types";

export const DAY_MS = 86_400_000;

export const startOfDay = (ms: number): number => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// cadenceDays → short label for the chip. 1 = daily, 7 = weekly, multiples of 7
// as weeks, otherwise days. 0 = one-off (no recurrence).
export const humanizeCadence = (days: number): string => {
  if (days <= 0) return "once";
  if (days === 1) return "daily";
  if (days === 7) return "weekly";
  if (days % 7 === 0) return `${days / 7}w`;
  return `${days}d`;
};

// A recurring task is resting while its next occurrence is still in the future.
export const isResting = (t: Todo, now: number): boolean =>
  t.statusRaw === 0 &&
  t.cadenceDays > 0 &&
  t.nextDueAt != null &&
  t.nextDueAt > startOfDay(now);

// Whole days from today until the task is due again (>= 1 when resting).
export const daysUntilDue = (nextDueAt: number, now: number): number =>
  Math.max(0, Math.round((nextDueAt - startOfDay(now)) / DAY_MS));

export const dueInLabel = (nextDueAt: number, now: number): string => {
  const d = daysUntilDue(nextDueAt, now);
  if (d <= 0) return "due";
  if (d === 1) return "next tomorrow";
  return `next in ${d}d`;
};
