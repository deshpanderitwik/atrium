// Thread store — the day as one timeline: things named during a walkthrough and
// breath sessions, in the order they happened. Lives in atrium.db beside the
// older todos and reflections tables, which it leaves untouched.

import * as SQLite from "expo-sqlite";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { BreathPattern } from "@/lib/breath";

export type NameEntry = { id: string; kind: "name"; text: string; createdAt: number };
export type BreathEntry = {
  id: string;
  kind: "breath";
  pattern: BreathPattern;
  rounds: number; // full rounds completed
  seconds: number;
  silent: boolean;
  createdAt: number;
};
export type ThreadEntry = NameEntry | BreathEntry;

type Row = {
  id: string;
  kind: string;
  text: string | null;
  pattern: string | null;
  rounds: number | null;
  seconds: number | null;
  silent: number | null;
  createdAt: number;
};

const DB_NAME = "atrium.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS thread_entries (
          id TEXT PRIMARY KEY NOT NULL,
          kind TEXT NOT NULL,
          text TEXT,
          pattern TEXT,
          rounds INTEGER,
          seconds REAL,
          silent INTEGER,
          createdAt INTEGER NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function fromRow(r: Row): ThreadEntry {
  if (r.kind === "breath") {
    return {
      id: r.id,
      kind: "breath",
      pattern: r.pattern === "5-5" ? "5-5" : "4-6",
      rounds: r.rounds ?? 0,
      seconds: r.seconds ?? 0,
      silent: r.silent === 1,
      createdAt: r.createdAt,
    };
  }
  return { id: r.id, kind: "name", text: r.text ?? "", createdAt: r.createdAt };
}

type Store = {
  entries: ThreadEntry[]; // oldest first
  ready: boolean;
  addName: (text: string) => Promise<string>;
  renameName: (id: string, text: string) => Promise<void>;
  addBreath: (b: Omit<BreathEntry, "id" | "kind" | "createdAt">) => Promise<string>;
  removeEntry: (id: string) => Promise<void>;
};

const ThreadContext = createContext<Store | null>(null);

export function ThreadProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<ThreadEntry[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<Row>(
      "SELECT * FROM thread_entries ORDER BY createdAt ASC",
    );
    setEntries(rows.map(fromRow));
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setReady(true));
  }, [refresh]);

  const addName = useCallback(
    async (text: string) => {
      const id = uuid();
      const db = await getDb();
      await db.runAsync(
        "INSERT INTO thread_entries (id, kind, text, createdAt) VALUES (?, 'name', ?, ?)",
        [id, text, Date.now()],
      );
      await refresh();
      return id;
    },
    [refresh],
  );

  const renameName = useCallback(
    async (id: string, text: string) => {
      const db = await getDb();
      await db.runAsync("UPDATE thread_entries SET text = ? WHERE id = ?", [text, id]);
      await refresh();
    },
    [refresh],
  );

  const addBreath = useCallback(
    async (b: Omit<BreathEntry, "id" | "kind" | "createdAt">) => {
      const id = uuid();
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO thread_entries (id, kind, pattern, rounds, seconds, silent, createdAt)
         VALUES (?, 'breath', ?, ?, ?, ?, ?)`,
        [id, b.pattern, b.rounds, b.seconds, b.silent ? 1 : 0, Date.now()],
      );
      await refresh();
      return id;
    },
    [refresh],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      const db = await getDb();
      await db.runAsync("DELETE FROM thread_entries WHERE id = ?", [id]);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ entries, ready, addName, renameName, addBreath, removeEntry }),
    [entries, ready, addName, renameName, addBreath, removeEntry],
  );
  return <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>;
}

export function useThread() {
  const ctx = useContext(ThreadContext);
  if (!ctx) throw new Error("useThread must be used within ThreadProvider");
  return ctx;
}
