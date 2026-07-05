// Reflections store — timestamped writings from the Arrive → reflect flow, plus
// a single persistent draft that survives leaving the writer until it is either
// submitted (filed into the timeline) or explicitly discarded.

import * as SQLite from "expo-sqlite";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Reflection = {
  id: string;
  body: string;
  createdAt: number;
  heldSeconds: number | null;
};

const DB_NAME = "atrium.db";
const DRAFT_KEY = "reflectionDraft";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reflections (
          id TEXT PRIMARY KEY NOT NULL,
          body TEXT NOT NULL,
          createdAt INTEGER NOT NULL,
          heldSeconds REAL
        );
        CREATE TABLE IF NOT EXISTS app_kv (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT
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

type Store = {
  reflections: Reflection[];
  ready: boolean;
  submitReflection: (body: string, heldSeconds?: number | null) => Promise<void>;
  deleteReflection: (id: string) => Promise<void>;
  getDraft: () => Promise<string>;
  saveDraft: (body: string) => Promise<void>;
  clearDraft: () => Promise<void>;
};

const ReflectionsContext = createContext<Store | null>(null);

export function ReflectionsProvider({ children }: { children: React.ReactNode }) {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<Reflection>(
      "SELECT * FROM reflections ORDER BY createdAt DESC",
    );
    setReflections(rows);
  }, []);

  useEffect(() => {
    (async () => {
      await getDb();
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const submitReflection = useCallback(
    async (body: string, heldSeconds: number | null = null) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const db = await getDb();
      await db.runAsync(
        "INSERT INTO reflections (id, body, createdAt, heldSeconds) VALUES (?, ?, ?, ?)",
        [uuid(), trimmed, Date.now(), heldSeconds],
      );
      await db.runAsync("DELETE FROM app_kv WHERE key = ?", [DRAFT_KEY]);
      await refresh();
    },
    [refresh],
  );

  const deleteReflection = useCallback(
    async (id: string) => {
      const db = await getDb();
      await db.runAsync("DELETE FROM reflections WHERE id = ?", [id]);
      await refresh();
    },
    [refresh],
  );

  const getDraft = useCallback(async () => {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_kv WHERE key = ?",
      [DRAFT_KEY],
    );
    return row?.value ?? "";
  }, []);

  const saveDraft = useCallback(async (body: string) => {
    const db = await getDb();
    await db.runAsync(
      "INSERT INTO app_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [DRAFT_KEY, body],
    );
  }, []);

  const clearDraft = useCallback(async () => {
    const db = await getDb();
    await db.runAsync("DELETE FROM app_kv WHERE key = ?", [DRAFT_KEY]);
  }, []);

  const value = useMemo<Store>(
    () => ({
      reflections,
      ready,
      submitReflection,
      deleteReflection,
      getDraft,
      saveDraft,
      clearDraft,
    }),
    [
      reflections,
      ready,
      submitReflection,
      deleteReflection,
      getDraft,
      saveDraft,
      clearDraft,
    ],
  );

  return (
    <ReflectionsContext.Provider value={value}>
      {children}
    </ReflectionsContext.Provider>
  );
}

export function useReflections(): Store {
  const ctx = useContext(ReflectionsContext);
  if (!ctx) throw new Error("useReflections must be used within a ReflectionsProvider");
  return ctx;
}
