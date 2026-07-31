// Pure derivations over the todo list: the active/resting/done slices and the
// done-by-day grouping.

import { Todo } from "./types";
import { isResting, startOfDay } from "@/lib/cadence";

const byPosition = (a: Todo, b: Todo) => a.position - b.position;

// Open and due now: one-offs plus recurring tasks whose next occurrence has
// arrived. Ordered by manual position.
export const activeTodos = (todos: Todo[], houseID: string, now = Date.now()): Todo[] =>
  todos
    .filter((t) => t.houseID === houseID && t.statusRaw === 0 && !isResting(t, now))
    .sort(byPosition);

// Recurring tasks that were done recently and are waiting for their next due
// date. Ordered by soonest-due.
export const restingTodos = (todos: Todo[], houseID: string, now = Date.now()): Todo[] =>
  todos
    .filter((t) => t.houseID === houseID && isResting(t, now))
    .sort((a, b) => (a.nextDueAt ?? 0) - (b.nextDueAt ?? 0));

// The house-door count reflects what's actually to-do now (active only).
export const activeCountForHouse = (todos: Todo[], houseID: string, now = Date.now()): number =>
  todos.filter((t) => t.houseID === houseID && t.statusRaw === 0 && !isResting(t, now)).length;

// Starred + open + due now (resting starred tasks aren't actionable yet).
// This is the slice Arrive shows.
export const starredOpen = (todos: Todo[], now = Date.now()): Todo[] =>
  todos
    .filter((t) => t.starred === 1 && t.statusRaw === 0 && !isResting(t, now))
    .sort(byPosition);

// Every declared task, resting or not — what the three-slot cap counts against.
// Wider than starredOpen(): a starred recurring task still occupies a slot
// while it rests, otherwise its return could push the strip past three.
export const declaredOpen = (todos: Todo[]): Todo[] =>
  todos.filter((t) => t.starred === 1 && t.statusRaw === 0);

// Done todos grouped by completion day, most-recent day first, newest within.
export type DayGroup = { day: number; items: Todo[] };
export const doneByDay = (todos: Todo[], houseID: string): DayGroup[] => {
  const done = todos
    .filter((t) => t.houseID === houseID && t.statusRaw === 1)
    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));

  const groups = new Map<number, Todo[]>();
  for (const t of done) {
    const key = startOfDay(t.completedAt ?? t.createdAt);
    const arr = groups.get(key);
    if (arr) arr.push(t);
    else groups.set(key, [t]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([day, items]) => ({ day, items }));
};

export const houseHasAnyTodos = (todos: Todo[], houseID: string): boolean =>
  todos.some((t) => t.houseID === houseID);

// All done todos across every house, grouped by completion day.
export const doneByDayAll = (todos: Todo[]): DayGroup[] => {
  const done = todos
    .filter((t) => t.statusRaw === 1)
    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));

  const groups = new Map<number, Todo[]>();
  for (const t of done) {
    const key = startOfDay(t.completedAt ?? t.createdAt);
    const arr = groups.get(key);
    if (arr) arr.push(t);
    else groups.set(key, [t]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([day, items]) => ({ day, items }));
};

// "today" / "yesterday" / "monday 12 may" / "12 may 2024" — lowercase.
export const dayLabel = (dayMs: number): string => {
  const today = startOfDay(Date.now());
  const oneDay = 86_400_000;
  if (dayMs === today) return "today";
  if (dayMs === today - oneDay) return "yesterday";

  const d = new Date(dayMs);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" }).toLowerCase();
  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "long" }).toLowerCase();
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return sameYear
    ? `${weekday} ${day} ${month}`
    : `${day} ${month} ${d.getFullYear()}`;
};
