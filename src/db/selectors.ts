// Pure derivations over the todo list — the SwiftData @Query filters/sorts and
// the grouping logic from TodoListPane, reproduced as plain functions.

import { PRIORITIES, Todo } from "./types";

const byPriorityThenPosition = (a: Todo, b: Todo) =>
  a.priority - b.priority || a.position - b.position;

export const openTodosForHouse = (todos: Todo[], houseID: string): Todo[] =>
  todos
    .filter((t) => t.houseID === houseID && t.statusRaw === 0)
    .sort(byPriorityThenPosition);

export const openCountForHouse = (todos: Todo[], houseID: string): number =>
  todos.filter((t) => t.houseID === houseID && t.statusRaw === 0).length;

export const starredOpen = (todos: Todo[]): Todo[] =>
  todos
    .filter((t) => t.starred === 1 && t.statusRaw === 0)
    .sort(byPriorityThenPosition);

// Open todos grouped into priority clusters P0→P3, position-ordered within each.
export type PriorityCluster = { priority: number; items: Todo[] };
export const openByPriority = (todos: Todo[], houseID: string): PriorityCluster[] => {
  const open = openTodosForHouse(todos, houseID);
  return PRIORITIES.map((priority) => ({
    priority,
    items: open.filter((t) => t.priority === priority),
  })).filter((c) => c.items.length > 0);
};

const startOfDay = (ms: number): number => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

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

// "today" / "yesterday" / "monday 12 may" / "12 may 2024" — lowercase, as before.
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
