// Pushes thread changes and the conversation from the phone to the sync server
// on the Mac (server/atrium-sync.mjs) over the home network. The phone stays the source of
// truth: away from home, or with the Mac asleep, dirty rows just wait and go up
// on the next attempt.

import * as SQLite from "expo-sqlite";

// The Mac's Bonjour name on the home network (`scutil --get LocalHostName`).
// The app's build allows plain HTTP to local-network hosts. Empty disables sync.
export const SYNC_URL = "http://Rits-MacBook-Pro.local:8787";

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

type ChatRow = {
  id: string;
  role: string;
  text: string;
  content: string;
  createdAt: number;
  updatedAt: number;
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
    if (!(await pushChat(db))) return false;
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

async function post(path: string, body: unknown) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SYNC_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return res.ok;
  } finally {
    clearTimeout(t);
  }
}

// The conversation, in small batches (a reply carries its full API content).
// Messages never change once written, so a sent row is simply clean.
async function pushChat(db: SQLite.SQLiteDatabase): Promise<boolean> {
  const has = await db.getFirstAsync("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'chat_messages'");
  if (!has) return true;
  for (;;) {
    const rows = await db.getAllAsync<ChatRow>(
      "SELECT id, role, text, content, createdAt, updatedAt FROM chat_messages WHERE dirty = 1 ORDER BY createdAt LIMIT 25",
    );
    if (!rows.length) return true;
    const messages = rows.map((r) => ({ ...r, content: JSON.parse(r.content) }));
    if (!(await post("/chat", { messages }))) return false;
    for (const r of rows) {
      await db.runAsync("UPDATE chat_messages SET dirty = 0 WHERE id = ? AND updatedAt = ?", [r.id, r.updatedAt]);
    }
    if (rows.length < 25) return true;
  }
}
