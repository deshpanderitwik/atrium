// Atrium sync server — receives thread entries from the phone and keeps them in
// one SQLite file on this Mac, where Claude can read them and dashboards can be
// built from them. Zero dependencies: node:http + node:sqlite (Node >= 22.13).
//
// By default it listens on 127.0.0.1 only. With HOST=0.0.0.0 (what install.sh
// sets) it also answers on the home network, where the phone reaches it at
// http://<this Mac>.local:8787 — the router keeps it off the internet.
//
// The data lives outside the repo (which is public):
//   ~/Library/Application Support/Atrium/atrium.db   (override: ATRIUM_DATA_DIR)

import http from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const DIR = process.env.ATRIUM_DATA_DIR || join(homedir(), "Library", "Application Support", "Atrium");
const MAX_BODY = 5_000_000;

mkdirSync(DIR, { recursive: true });
const db = new DatabaseSync(join(DIR, "atrium.db"));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS thread_entries (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,            -- 'name' | 'breath'
    text TEXT,                     -- name entries
    pattern TEXT,                  -- breath: '4-6' | '5-5'
    rounds INTEGER,                -- breath: full rounds completed
    seconds REAL,                  -- breath: session length
    silent INTEGER,                -- breath: 1 = haptics only
    createdAt INTEGER NOT NULL,    -- ms since epoch, on the phone
    updatedAt INTEGER NOT NULL,
    deletedAt INTEGER,             -- set when removed on the phone
    receivedAt INTEGER NOT NULL    -- when this Mac last heard about it
  );
`);

// Last write wins: an older copy of an entry never overwrites a newer one.
const upsert = db.prepare(`
  INSERT INTO thread_entries
    (id, kind, text, pattern, rounds, seconds, silent, createdAt, updatedAt, deletedAt, receivedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    kind = excluded.kind, text = excluded.text, pattern = excluded.pattern,
    rounds = excluded.rounds, seconds = excluded.seconds, silent = excluded.silent,
    createdAt = excluded.createdAt, updatedAt = excluded.updatedAt,
    deletedAt = excluded.deletedAt, receivedAt = excluded.receivedAt
  WHERE excluded.updatedAt >= thread_entries.updatedAt
`);
const count = db.prepare("SELECT COUNT(*) AS n FROM thread_entries WHERE deletedAt IS NULL");
// Categories for the named things. Claude writes these rows; the objects page
// groups the names under them, in position order. A name with no category
// (say, one just named on the phone) shows under "not sorted yet".
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    key TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS object_categories (
    entryId TEXT PRIMARY KEY NOT NULL, -- thread_entries.id of a name
    category TEXT NOT NULL             -- categories.key
  );
`);
const categories = db.prepare("SELECT key, title FROM categories ORDER BY position");
const objects = db.prepare(`
  SELECT e.id, e.text, e.createdAt, c.category
  FROM thread_entries e LEFT JOIN object_categories c ON c.entryId = e.id
  WHERE e.kind = 'name' AND e.deletedAt IS NULL
  ORDER BY e.createdAt
`);

// The day's plan: time blocks for a given date, plus parked loops (date NULL)
// each with its first step. Claude writes these rows; the Today page reads
// them and toggles done.
db.exec(`
  CREATE TABLE IF NOT EXISTS plan_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,                 -- 'YYYY-MM-DD' for a block, NULL for a parked loop
    position INTEGER NOT NULL,
    time TEXT,                 -- '15:50' start, blocks only
    title TEXT NOT NULL,
    note TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    doneAt INTEGER,            -- ms since epoch, when it was tapped done
    approx INTEGER NOT NULL DEFAULT 0, -- 1 = doneAt was estimated afterwards
    held INTEGER NOT NULL DEFAULT 0,   -- 1 = paused; skipped when finding "now"
    kind TEXT NOT NULL DEFAULT 'task'  -- 'task', or 'open': unstructured time, nothing to tap
  );
`);
{
  const cols = new Set(db.prepare("PRAGMA table_info(plan_items)").all().map((c) => c.name));
  if (!cols.has("doneAt")) db.exec("ALTER TABLE plan_items ADD COLUMN doneAt INTEGER");
  if (!cols.has("approx")) db.exec("ALTER TABLE plan_items ADD COLUMN approx INTEGER NOT NULL DEFAULT 0");
  if (!cols.has("held")) db.exec("ALTER TABLE plan_items ADD COLUMN held INTEGER NOT NULL DEFAULT 0");
  if (!cols.has("kind")) db.exec("ALTER TABLE plan_items ADD COLUMN kind TEXT NOT NULL DEFAULT 'task'");
}
const planBlocks = db.prepare(
  "SELECT id, time, title, note, done, doneAt, approx, held, kind FROM plan_items WHERE date = ? ORDER BY position",
);
const planLoops = db.prepare(
  "SELECT id, title, note, done, doneAt FROM plan_items WHERE date IS NULL ORDER BY position",
);
const toggleItem = db.prepare(
  "UPDATE plan_items SET done = 1 - done, doneAt = CASE WHEN done = 0 THEN ? ELSE NULL END, approx = 0 WHERE id = ?",
);
// The station's conversation with Claude, pushed from the phone. Kept apart
// from thread_entries (the archive of named things and breaths). Rows never
// change once written; content is the exact API content as JSON.
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY NOT NULL,
    role TEXT NOT NULL,            -- 'user' | 'assistant'
    text TEXT NOT NULL,            -- what the thread shows
    content TEXT NOT NULL,         -- JSON content blocks, as sent or received
    createdAt INTEGER NOT NULL,    -- ms since epoch, on the phone
    updatedAt INTEGER NOT NULL,
    receivedAt INTEGER NOT NULL
  );
`);
const upsertChat = db.prepare(`
  INSERT INTO chat_messages (id, role, text, content, createdAt, updatedAt, receivedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    role = excluded.role, text = excluded.text, content = excluded.content,
    createdAt = excluded.createdAt, updatedAt = excluded.updatedAt, receivedAt = excluded.receivedAt
  WHERE excluded.updatedAt >= chat_messages.updatedAt
`);

function validateChat(m) {
  if (!m || typeof m !== "object") return null;
  const id = str(m.id, 64);
  const role = m.role === "user" || m.role === "assistant" ? m.role : null;
  const text = str(m.text, 200_000);
  if (!id || !role || text == null || !Array.isArray(m.content)) return null;
  if (!isInt(m.createdAt) || !isInt(m.updatedAt)) return null;
  return [id, role, text, JSON.stringify(m.content), m.createdAt, m.updatedAt, Date.now()];
}

// A scratch week plan for the /week page: one-off, separate from plan_items so
// it can be thrown away without touching the Today page.
db.exec(`
  CREATE TABLE IF NOT EXISTS week_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,        -- 'YYYY-MM-DD'
    start TEXT NOT NULL,       -- '08:00'
    end TEXT NOT NULL,         -- '16:00'; '24:00' for midnight
    title TEXT NOT NULL,
    note TEXT,
    kind TEXT NOT NULL DEFAULT 'fixed' -- 'fixed', 'maybe' (tentative), 'plan', or 'open'
  );
`);
const weekBlocks = db.prepare(
  "SELECT id, date, start, end, title, note, kind FROM week_blocks WHERE date BETWEEN ? AND ? ORDER BY date, start",
);
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Pages for looking at the data, served from public/ next to this file. Only
// these exact paths are served.
const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "public");
const PAGES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/today": ["today.html", "text/html; charset=utf-8"],
  "/week": ["week.html", "text/html; charset=utf-8"],
  "/fonts/BricolageGrotesque_400Regular.ttf": ["fonts/BricolageGrotesque_400Regular.ttf", "font/ttf"],
};

const isInt = (v) => Number.isInteger(v) && v >= 0;
const str = (v, max) => (typeof v === "string" && v.length <= max ? v : null);

function validate(e) {
  if (!e || typeof e !== "object") return null;
  const id = str(e.id, 64);
  const kind = e.kind === "name" || e.kind === "breath" ? e.kind : null;
  if (!id || !kind || !isInt(e.createdAt) || !isInt(e.updatedAt)) return null;
  return [
    id,
    kind,
    kind === "name" ? str(e.text, 500) : null,
    kind === "breath" && (e.pattern === "4-6" || e.pattern === "5-5") ? e.pattern : null,
    kind === "breath" && isInt(e.rounds) ? e.rounds : null,
    kind === "breath" && typeof e.seconds === "number" && e.seconds >= 0 ? e.seconds : null,
    kind === "breath" ? (e.silent ? 1 : 0) : null,
    e.createdAt,
    e.updatedAt,
    isInt(e.deletedAt) ? e.deletedAt : null,
    Date.now(),
  ];
}

// Reads a JSON body (up to MAX_BODY) and hands it to `then`.
function readJson(req, res, then) {
  let size = 0;
  const chunks = [];
  req.on("data", (c) => {
    size += c.length;
    if (size > MAX_BODY) req.destroy();
    else chunks.push(c);
  });
  req.on("end", () => {
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return send(res, 400, { ok: false, error: "Body must be JSON" });
    }
    then(body);
  });
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, { ok: true, entries: count.get().n });
  }
  if (req.method === "GET" && req.url === "/api/objects") {
    return send(res, 200, { categories: categories.all(), objects: objects.all() });
  }
  if (req.method === "GET" && req.url === "/api/today") {
    const date = localDate();
    return send(res, 200, { date, blocks: planBlocks.all(date), loops: planLoops.all() });
  }
  if (req.method === "GET" && req.url.startsWith("/api/week?")) {
    const q = new URL(req.url, "http://x").searchParams;
    const from = q.get("from");
    const to = q.get("to");
    if (!isDate(from) || !isDate(to)) return send(res, 400, { ok: false, error: "from and to must be YYYY-MM-DD" });
    return send(res, 200, weekBlocks.all(from, to));
  }
  const toggle = req.method === "POST" && /^\/api\/plan\/(\d+)\/toggle$/.exec(req.url);
  if (toggle) {
    const r = toggleItem.run(Date.now(), Number(toggle[1]));
    return send(res, r.changes ? 200 : 404, { ok: r.changes > 0 });
  }
  if (req.method === "GET" && PAGES[req.url]) {
    const [file, type] = PAGES[req.url];
    try {
      const body = readFileSync(join(PUBLIC, file));
      res.writeHead(200, { "content-type": type, "cache-control": "no-cache" });
      return res.end(body);
    } catch {
      return send(res, 404, { ok: false, error: "not found" });
    }
  }
  if (req.method === "POST" && req.url === "/chat") {
    return readJson(req, res, (body) => {
      const list = body?.messages;
      if (!Array.isArray(list)) return send(res, 400, { ok: false, error: "messages must be an array" });
      const rows = list.map(validateChat);
      const bad = rows.findIndex((r) => r === null);
      if (bad !== -1) return send(res, 400, { ok: false, error: `message ${bad} is malformed` });
      db.exec("BEGIN");
      try {
        for (const r of rows) upsertChat.run(...r);
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        return send(res, 500, { ok: false, error: String(err) });
      }
      console.log(`${new Date().toISOString()} stored ${rows.length} chat message${rows.length === 1 ? "" : "s"}`);
      return send(res, 200, { ok: true, accepted: rows.length });
    });
  }
  if (req.method === "POST" && req.url === "/entries") {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) req.destroy();
      else chunks.push(c);
    });
    req.on("end", () => {
      let entries;
      try {
        entries = JSON.parse(Buffer.concat(chunks).toString("utf8")).entries;
      } catch {
        return send(res, 400, { ok: false, error: "Body must be JSON: {entries: [...]}" });
      }
      if (!Array.isArray(entries)) return send(res, 400, { ok: false, error: "entries must be an array" });
      const rows = entries.map(validate);
      const bad = rows.findIndex((r) => r === null);
      if (bad !== -1) return send(res, 400, { ok: false, error: `entry ${bad} is malformed` });
      db.exec("BEGIN");
      try {
        for (const r of rows) upsert.run(...r);
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        return send(res, 500, { ok: false, error: String(err) });
      }
      console.log(`${new Date().toISOString()} stored ${rows.length} entr${rows.length === 1 ? "y" : "ies"}`);
      return send(res, 200, { ok: true, accepted: rows.length });
    });
    return;
  }
  send(res, 404, { ok: false, error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`atrium-sync on http://${HOST}:${PORT} → ${join(DIR, "atrium.db")}`);
});
