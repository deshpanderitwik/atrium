// Thread store — the day as one timeline: things named during a walkthrough and
// breath sessions, in the order they happened. Lives in atrium.db beside the
// older todos and reflections tables, which it leaves untouched.
//
// The phone is the source of truth and works offline. Every change marks its
// row dirty and bumps updatedAt; deletes are soft (deletedAt) so they can sync
// too. src/lib/sync.ts pushes dirty rows to the Mac whenever it can reach it.

import * as SQLite from "expo-sqlite";
import { AppState } from "react-native";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { BreathPattern } from "@/lib/breath";
import { scheduleSync } from "@/lib/sync";

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
      // Sync bookkeeping, added after the first release. Existing rows start
      // dirty so everything already on the phone gets uploaded once.
      const info = await db.getAllAsync<{ name: string }>("PRAGMA table_info(thread_entries)");
      const have = new Set(info.map((c) => c.name));
      if (!have.has("updatedAt")) {
        await db.execAsync("ALTER TABLE thread_entries ADD COLUMN updatedAt INTEGER");
        await db.execAsync("UPDATE thread_entries SET updatedAt = createdAt");
      }
      if (!have.has("deletedAt")) {
        await db.execAsync("ALTER TABLE thread_entries ADD COLUMN deletedAt INTEGER");
      }
      if (!have.has("dirty")) {
        await db.execAsync("ALTER TABLE thread_entries ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1");
      }
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
      "SELECT * FROM thread_entries WHERE deletedAt IS NULL ORDER BY createdAt ASC",
    );
    setEntries(rows.map(fromRow));
  }, []);

  useEffect(() => {
    // Upload anything waiting once the store (and its migrations) is ready, and
    // again whenever the app comes back.
    refresh()
      .catch(() => {})
      .finally(() => {
        setReady(true);
        scheduleSync(0);
      });
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") scheduleSync(0);
    });
    return () => sub.remove();
  }, [refresh]);

  const addName = useCallback(
    async (text: string) => {
      const id = uuid();
      const now = Date.now();
      const db = await getDb();
      await db.runAsync(
        "INSERT INTO thread_entries (id, kind, text, createdAt, updatedAt, dirty) VALUES (?, 'name', ?, ?, ?, 1)",
        [id, text, now, now],
      );
      await refresh();
      scheduleSync();
      return id;
    },
    [refresh],
  );

  const renameName = useCallback(
    async (id: string, text: string) => {
      const db = await getDb();
      await db.runAsync(
        "UPDATE thread_entries SET text = ?, updatedAt = ?, dirty = 1 WHERE id = ?",
        [text, Date.now(), id],
      );
      await refresh();
      scheduleSync();
    },
    [refresh],
  );

  const addBreath = useCallback(
    async (b: Omit<BreathEntry, "id" | "kind" | "createdAt">) => {
      const id = uuid();
      const now = Date.now();
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO thread_entries (id, kind, pattern, rounds, seconds, silent, createdAt, updatedAt, dirty)
         VALUES (?, 'breath', ?, ?, ?, ?, ?, ?, 1)`,
        [id, b.pattern, b.rounds, b.seconds, b.silent ? 1 : 0, now, now],
      );
      await refresh();
      scheduleSync();
      return id;
    },
    [refresh],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      const db = await getDb();
      const now = Date.now();
      await db.runAsync(
        "UPDATE thread_entries SET deletedAt = ?, updatedAt = ?, dirty = 1 WHERE id = ?",
        [now, now, id],
      );
      await refresh();
      scheduleSync();
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
