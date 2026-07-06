// Tiny persistent key/value settings backed by the shared app_kv table in
// atrium.db. Self-contained: it ensures the table exists so it never races the
// reflections store's own initialization.

import * as SQLite from "expo-sqlite";

const DB_NAME = "atrium.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
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

export async function getSetting(key: string): Promise<string | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_kv WHERE key = ?",
      [key],
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      "INSERT INTO app_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value],
    );
  } catch {
    // best-effort persistence
  }
}

export async function getBoolSetting(key: string, fallback = false): Promise<boolean> {
  const v = await getSetting(key);
  return v == null ? fallback : v === "1";
}

export async function setBoolSetting(key: string, value: boolean): Promise<void> {
  await setSetting(key, value ? "1" : "0");
}
