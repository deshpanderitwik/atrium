// SQLite-backed store that mirrors the SwiftData behavior of the original app:
// a single Todo table, with the same ordering/grouping/repositioning rules.
//
// SwiftData exposed reactive `@Query` slices; here a TodosProvider holds every
// todo in React state and re-reads after each mutation. The dataset is tiny
// (one person's todos across twelve houses), so a full re-read is simplest and
// keeps every screen consistent.

import * as SQLite from "expo-sqlite";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Todo } from "./types";
import { DAY_MS, startOfDay } from "@/lib/cadence";

const DB_NAME = "atrium.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS todos (
          id TEXT PRIMARY KEY NOT NULL,
          text TEXT NOT NULL,
          houseID TEXT NOT NULL,
          priority INTEGER NOT NULL,
          position REAL NOT NULL,
          statusRaw INTEGER NOT NULL,
          starred INTEGER NOT NULL,
          createdAt INTEGER NOT NULL,
          completedAt INTEGER,
          cadenceDays INTEGER NOT NULL DEFAULT 0,
          nextDueAt INTEGER,
          lastCompletedAt INTEGER,
          timesCompleted INTEGER NOT NULL DEFAULT 0,
          focusStartedAt INTEGER,
          focusRunningSince INTEGER,
          focusAccumSeconds REAL NOT NULL DEFAULT 0,
          focusBreaks INTEGER NOT NULL DEFAULT 0
        );
      `);
      // Migrate older installs that predate later columns.
      const info = await db.getAllAsync<{ name: string }>("PRAGMA table_info(todos)");
      const have = new Set(info.map((c) => c.name));
      const newCols: [string, string][] = [
        ["cadenceDays", "INTEGER NOT NULL DEFAULT 0"],
        ["nextDueAt", "INTEGER"],
        ["lastCompletedAt", "INTEGER"],
        ["timesCompleted", "INTEGER NOT NULL DEFAULT 0"],
        ["focusStartedAt", "INTEGER"],
        ["focusRunningSince", "INTEGER"],
        ["focusAccumSeconds", "REAL NOT NULL DEFAULT 0"],
        ["focusBreaks", "INTEGER NOT NULL DEFAULT 0"],
      ];
      for (const [name, def] of newCols) {
        if (!have.has(name)) {
          await db.execAsync(`ALTER TABLE todos ADD COLUMN ${name} ${def}`);
        }
      }
      return db;
    })();
  }
  return dbPromise;
}

function uuid(): string {
  // RFC4122-ish v4; sufficient as a local primary key.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type Store = {
  todos: Todo[];
  ready: boolean;
  addTodo: (houseID: string, text: string, cadenceDays: number) => Promise<void>;
  updateText: (id: string, text: string) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  setCadence: (id: string, cadenceDays: number) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  focusResume: (id: string) => Promise<void>;
  focusPause: (id: string) => Promise<void>;
  reorderActive: (houseID: string, orderedIds: string[]) => Promise<void>;
};

const TodosContext = createContext<Store | null>(null);

export function TodosProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<Todo>("SELECT * FROM todos");
    setTodos(rows);
  }, []);

  useEffect(() => {
    (async () => {
      await getDb();
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const addTodo = useCallback(
    async (houseID: string, text: string, cadenceDays: number) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const db = await getDb();
      // New item goes to the bottom of the house's open list.
      const row = await db.getFirstAsync<{ maxPos: number | null }>(
        "SELECT MAX(position) AS maxPos FROM todos WHERE houseID = ? AND statusRaw = 0",
        [houseID],
      );
      const position = (row?.maxPos ?? 0) + 1;
      // priority column is retained but unused; default 0.
      await db.runAsync(
        "INSERT INTO todos (id, text, houseID, priority, position, statusRaw, starred, createdAt, completedAt, cadenceDays) VALUES (?, ?, ?, 0, ?, 0, 0, ?, NULL, ?)",
        [uuid(), trimmed, houseID, position, Date.now(), cadenceDays],
      );
      await refresh();
    },
    [refresh],
  );

  const updateText = useCallback(
    async (id: string, text: string) => {
      const db = await getDb();
      const trimmed = text.trim();
      if (!trimmed) {
        // Empty commit deletes the row, matching the Swift behavior.
        await db.runAsync("DELETE FROM todos WHERE id = ?", [id]);
      } else {
        await db.runAsync("UPDATE todos SET text = ? WHERE id = ?", [trimmed, id]);
      }
      await refresh();
    },
    [refresh],
  );

  const toggleDone = useCallback(
    async (id: string) => {
      const db = await getDb();
      const t = await db.getFirstAsync<Todo>("SELECT * FROM todos WHERE id = ?", [id]);
      if (!t) return;
      if (t.statusRaw === 1) {
        // Completed one-off → reopen.
        await db.runAsync(
          "UPDATE todos SET statusRaw = 0, completedAt = NULL WHERE id = ?",
          [id],
        );
      } else if (t.cadenceDays > 0) {
        // Recurring: complete this occurrence and rest until the next due date
        // (completion-anchored). Stays open; the focus timer resets for the
        // next cycle.
        const now = Date.now();
        const nextDue = startOfDay(now) + t.cadenceDays * DAY_MS;
        await db.runAsync(
          `UPDATE todos SET lastCompletedAt = ?, nextDueAt = ?, timesCompleted = timesCompleted + 1,
             focusStartedAt = NULL, focusRunningSince = NULL, focusAccumSeconds = 0, focusBreaks = 0
           WHERE id = ?`,
          [now, nextDue, id],
        );
      } else {
        // One-off: mark done, unstar, finalize any running focus timer.
        const running =
          t.focusRunningSince != null ? (Date.now() - t.focusRunningSince) / 1000 : 0;
        await db.runAsync(
          "UPDATE todos SET statusRaw = 1, completedAt = ?, starred = 0, focusAccumSeconds = focusAccumSeconds + ?, focusRunningSince = NULL WHERE id = ?",
          [Date.now(), running, id],
        );
      }
      await refresh();
    },
    [refresh],
  );

  // --- Focus-timer controls (persisted so they survive leaving the screen) ---
  const focusResume = useCallback(
    async (id: string) => {
      const db = await getDb();
      const t = await db.getFirstAsync<Todo>("SELECT * FROM todos WHERE id = ?", [id]);
      if (!t || t.focusRunningSince != null) return;
      const now = Date.now();
      await db.runAsync(
        "UPDATE todos SET focusRunningSince = ?, focusStartedAt = COALESCE(focusStartedAt, ?) WHERE id = ?",
        [now, now, id],
      );
      await refresh();
    },
    [refresh],
  );

  const focusPause = useCallback(
    async (id: string) => {
      const db = await getDb();
      const t = await db.getFirstAsync<Todo>("SELECT * FROM todos WHERE id = ?", [id]);
      if (!t || t.focusRunningSince == null) return;
      const add = (Date.now() - t.focusRunningSince) / 1000;
      // Each pause accumulates elapsed time and counts as a break.
      await db.runAsync(
        "UPDATE todos SET focusAccumSeconds = focusAccumSeconds + ?, focusRunningSince = NULL, focusBreaks = focusBreaks + 1 WHERE id = ?",
        [add, id],
      );
      await refresh();
    },
    [refresh],
  );

  const toggleStar = useCallback(
    async (id: string) => {
      const db = await getDb();
      await db.runAsync(
        "UPDATE todos SET starred = CASE starred WHEN 1 THEN 0 ELSE 1 END WHERE id = ?",
        [id],
      );
      await refresh();
    },
    [refresh],
  );

  const setCadence = useCallback(
    async (id: string, cadenceDays: number) => {
      const db = await getDb();
      const days = Math.max(0, Math.floor(cadenceDays));
      // Turning recurrence off clears the resting schedule; turning it on leaves
      // the task active (nextDueAt stays null until first completed).
      await db.runAsync(
        "UPDATE todos SET cadenceDays = ?, nextDueAt = CASE WHEN ? = 0 THEN NULL ELSE nextDueAt END WHERE id = ?",
        [days, days, id],
      );
      await refresh();
    },
    [refresh],
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      const db = await getDb();
      await db.runAsync("DELETE FROM todos WHERE id = ?", [id]);
      await refresh();
    },
    [refresh],
  );

  const reorderActive = useCallback(
    async (_houseID: string, orderedIds: string[]) => {
      const db = await getDb();
      // Renumber the active list sequentially 0,1,2,…
      await db.withTransactionAsync(async () => {
        for (let i = 0; i < orderedIds.length; i++) {
          await db.runAsync("UPDATE todos SET position = ? WHERE id = ?", [
            i,
            orderedIds[i],
          ]);
        }
      });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<Store>(
    () => ({
      todos,
      ready,
      addTodo,
      updateText,
      toggleDone,
      toggleStar,
      setCadence,
      deleteTodo,
      focusResume,
      focusPause,
      reorderActive,
    }),
    [
      todos,
      ready,
      addTodo,
      updateText,
      toggleDone,
      toggleStar,
      setCadence,
      deleteTodo,
      focusResume,
      focusPause,
      reorderActive,
    ],
  );

  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>;
}

export function useTodos(): Store {
  const ctx = useContext(TodosContext);
  if (!ctx) throw new Error("useTodos must be used within a TodosProvider");
  return ctx;
}
