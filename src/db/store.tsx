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
import { DEFAULT_PRIORITY, Priority, Todo } from "./types";

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
          completedAt INTEGER
        );
      `);
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
  addTodo: (houseID: string, text: string, priority: Priority) => Promise<void>;
  updateText: (id: string, text: string) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  setPriority: (id: string, priority: Priority) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  reorderWithin: (
    houseID: string,
    priority: number,
    orderedIds: string[],
  ) => Promise<void>;
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
    async (houseID: string, text: string, priority: Priority) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const db = await getDb();
      // New item goes to the bottom of its (house, priority) open cluster.
      const row = await db.getFirstAsync<{ maxPos: number | null }>(
        "SELECT MAX(position) AS maxPos FROM todos WHERE houseID = ? AND statusRaw = 0 AND priority = ?",
        [houseID, priority],
      );
      const position = (row?.maxPos ?? 0) + 1;
      await db.runAsync(
        "INSERT INTO todos (id, text, houseID, priority, position, statusRaw, starred, createdAt, completedAt) VALUES (?, ?, ?, ?, ?, 0, 0, ?, NULL)",
        [uuid(), trimmed, houseID, priority, position, Date.now()],
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
      if (t.statusRaw === 0) {
        // Marking done also unstars, mirroring the original.
        await db.runAsync(
          "UPDATE todos SET statusRaw = 1, completedAt = ?, starred = 0 WHERE id = ?",
          [Date.now(), id],
        );
      } else {
        await db.runAsync(
          "UPDATE todos SET statusRaw = 0, completedAt = NULL WHERE id = ?",
          [id],
        );
      }
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

  const setPriority = useCallback(
    async (id: string, priority: Priority) => {
      const db = await getDb();
      const t = await db.getFirstAsync<Todo>("SELECT * FROM todos WHERE id = ?", [id]);
      if (!t || t.priority === priority) return;
      // Reposition at the bottom of the new cluster (max + 1, no renumber).
      const row = await db.getFirstAsync<{ maxPos: number | null }>(
        "SELECT MAX(position) AS maxPos FROM todos WHERE houseID = ? AND statusRaw = 0 AND priority = ? AND id != ?",
        [t.houseID, priority, id],
      );
      const position = (row?.maxPos ?? 0) + 1;
      await db.runAsync("UPDATE todos SET priority = ?, position = ? WHERE id = ?", [
        priority,
        position,
        id,
      ]);
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

  const reorderWithin = useCallback(
    async (_houseID: string, _priority: number, orderedIds: string[]) => {
      const db = await getDb();
      // Renumber the cluster sequentially 0,1,2,… exactly like the Swift onMove.
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
      setPriority,
      deleteTodo,
      reorderWithin,
    }),
    [
      todos,
      ready,
      addTodo,
      updateText,
      toggleDone,
      toggleStar,
      setPriority,
      deleteTodo,
      reorderWithin,
    ],
  );

  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>;
}

export function useTodos(): Store {
  const ctx = useContext(TodosContext);
  if (!ctx) throw new Error("useTodos must be used within a TodosProvider");
  return ctx;
}

export { DEFAULT_PRIORITY };
