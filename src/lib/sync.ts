// Pushes thread changes from the phone to the sync server on the Mac
// (server/atrium-sync.mjs), reached privately over Tailscale. The phone stays
// the source of truth: when the Mac is asleep or out of reach, dirty rows just
// wait and go up on the next attempt.

import * as SQLite from "expo-sqlite";

// The Mac's address on the tailnet, served over HTTPS by `tailscale serve`.
// Empty disables sync.
export const SYNC_URL = "";

const BATCH = 200;
const TIMEOUT_MS = 8000;

type Row = {
  id: string;
  kind: string;
  text: string | null;
  pattern: string | null;
  rounds: number | null;
  seconds: number | null;
  silent: number | null;
  createdAt: number;
  updatedAt: number | null;
  deletedAt: number | null;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
const getDb = () => (dbPromise ??= SQLite.openDatabaseAsync("atrium.db"));

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let again = false;

// Coalesces bursts of edits (naming five things in a row) into one upload.
export function scheduleSync(delayMs = 1500) {
  if (!SYNC_URL) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    syncNow();
  }, delayMs);
}

export async function syncNow(): Promise<boolean> {
  if (!SYNC_URL) return false;
  if (running) {
    again = true;
    return false;
  }
  running = true;
  try {
    const db = await getDb();
    for (;;) {
      const rows = await db.getAllAsync<Row>(
        `SELECT id, kind, text, pattern, rounds, seconds, silent, createdAt, updatedAt, deletedAt
         FROM thread_entries WHERE dirty = 1 ORDER BY updatedAt LIMIT ?`,
        [BATCH],
      );
      if (!rows.length) return true;
      const entries = rows.map((r) => ({
        ...r,
        updatedAt: r.updatedAt ?? r.createdAt,
        silent: r.silent === 1,
      }));
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      let ok = false;
      try {
        const res = await fetch(`${SYNC_URL}/entries`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ entries }),
          signal: ctrl.signal,
        });
        ok = res.ok;
      } finally {
        clearTimeout(t);
      }
      if (!ok) return false;
      // Clear only what was sent as-is; a row edited mid-flight stays dirty.
      for (const e of entries) {
        await db.runAsync(
          "UPDATE thread_entries SET dirty = 0 WHERE id = ? AND COALESCE(updatedAt, createdAt) = ?",
          [e.id, e.updatedAt],
        );
      }
      if (rows.length < BATCH) return true;
    }
  } catch {
    return false; // offline, Mac asleep, Tailscale off — try again later
  } finally {
    running = false;
    if (again) {
      again = false;
      scheduleSync(0);
    }
  }
}
