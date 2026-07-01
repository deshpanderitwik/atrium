// Ported from Atrium/Sources/Models/{Todo,Priority}.swift.

export const PRIORITIES = [0, 1, 2, 3] as const;
export type Priority = (typeof PRIORITIES)[number];
export const DEFAULT_PRIORITY: Priority = 0;
export const priorityLabel = (p: number) => `P${p}`;

// statusRaw: 0 = open, 1 = done. starred stored as 0/1 in SQLite.
// createdAt / completedAt are epoch-millisecond integers (nullable completedAt).
export type Todo = {
  id: string;
  text: string;
  houseID: string;
  priority: number; // 0..3
  position: number; // REAL — averaging lets us insert between siblings
  statusRaw: number; // 0 | 1
  starred: number; // 0 | 1
  createdAt: number;
  completedAt: number | null;
  // Focus-timer metrics.
  focusStartedAt: number | null; // when the task was first begun
  focusRunningSince: number | null; // timestamp the current run started (null if paused)
  focusAccumSeconds: number; // total active seconds worked
  focusBreaks: number; // number of pauses
};

export const isDone = (t: Todo) => t.statusRaw === 1;
