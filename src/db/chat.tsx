// The conversation — one long thread with Claude, kept in atrium.db beside the
// breath sessions. Each message stores the exact API content it was sent or
// received with, so the whole history replays unchanged on every turn (see
// src/lib/claude.ts). Rows are marked dirty and pushed to the Mac like the
// thread entries (src/lib/sync.ts).

import * as SQLite from "expo-sqlite";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { haptics } from "@/lib/haptics";
import { getSetting, setSetting } from "@/lib/settings";
import { scheduleSync } from "@/lib/sync";
import { Block, Turn, isAuthError, reply } from "@/lib/claude";
import { patternLabel } from "@/lib/breath";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string; // what the thread shows
  createdAt: number;
};

// idle · waiting (sent, nothing back yet) · streaming · failed (tap to retry) ·
// refused · nokey (paste one to begin) · badkey (the key was rejected)
export type ChatStatus = "idle" | "waiting" | "streaming" | "failed" | "refused" | "nokey" | "badkey";

type Row = { id: string; role: string; text: string; content: string; createdAt: number };

const DB_NAME = "atrium.db";
const KEY_SETTING = "anthropicKey";
// A pasted API key is saved, never posted to the thread.
const looksLikeKey = (s: string) => /^sk-ant-[\w-]{20,}$/.test(s.trim());

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY NOT NULL,
          role TEXT NOT NULL,          -- 'user' | 'assistant'
          text TEXT NOT NULL,          -- display text
          content TEXT NOT NULL,       -- JSON: the exact API content blocks
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          dirty INTEGER NOT NULL DEFAULT 1
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

// "[Tue 20 Oct 2026, 11:40 pm]" — the local time, at the head of each message.
function stamp(t: number) {
  const d = new Date(t);
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  return `[${day}, ${time}]`;
}

// Breath sessions finished since the last message (or in the last two hours,
// before the first one), as lines Claude can read.
async function breathNotes(db: SQLite.SQLiteDatabase, since: number) {
  const rows = await db
    .getAllAsync<{ pattern: string; rounds: number; seconds: number }>(
      `SELECT pattern, rounds, seconds FROM thread_entries
       WHERE kind = 'breath' AND deletedAt IS NULL AND createdAt > ? ORDER BY createdAt`,
      [since],
    )
    .catch(() => []);
  return rows.map((b) => {
    const p = patternLabel(b.pattern === "5-5" ? "5-5" : "4-6");
    const what = b.rounds ? `${b.rounds} round${b.rounds > 1 ? "s" : ""} of ${p}` : `${Math.round(b.seconds)}s of ${p}`;
    return `[breathed: ${what}]`;
  });
}

type Store = {
  messages: ChatMessage[]; // oldest first
  live: { id: string; text: string } | null; // the reply as it streams in
  status: ChatStatus;
  hasKey: boolean;
  send: (text: string) => Promise<"sent" | "key">;
  retry: () => void;
};

const ChatContext = createContext<Store | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [live, setLive] = useState<{ id: string; text: string } | null>(null);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [hasKey, setHasKey] = useState(true);
  const inFlight = useRef(false);
  const again = useRef(false);

  const refresh = useCallback(async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<Row>(
      "SELECT id, role, text, content, createdAt FROM chat_messages ORDER BY createdAt ASC",
    );
    setMessages(
      rows.map((r) => ({
        id: r.id,
        role: r.role === "assistant" ? "assistant" : "user",
        text: r.text,
        createdAt: r.createdAt,
      })),
    );
    return rows;
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    getSetting(KEY_SETTING).then((k) => {
      setHasKey(!!k);
      if (!k) setStatus("nokey");
    });
  }, [refresh]);

  // Ask for a reply to everything so far. A message sent while a reply is
  // streaming waits, then gets its own reply.
  const answer = useCallback(async () => {
    if (inFlight.current) {
      again.current = true;
      return;
    }
    const key = await getSetting(KEY_SETTING);
    if (!key) {
      setStatus("nokey");
      return;
    }
    inFlight.current = true;
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<Row>(
        "SELECT role, content FROM chat_messages ORDER BY createdAt ASC",
      );
      if (!rows.length || rows[rows.length - 1].role !== "user") return;
      const turns: Turn[] = rows.map((r) => ({
        role: r.role === "assistant" ? "assistant" : "user",
        content: JSON.parse(r.content) as Block[],
      }));

      // The reply keeps this id once stored, so the thread keeps the same
      // element and its reveal runs on without a swap.
      const id = uuid();
      setStatus("waiting");
      setLive({ id, text: "" });
      let started = false;
      const result = await reply(key, turns, (delta) => {
        if (!started) {
          started = true;
          haptics.soft();
          setStatus("streaming");
        }
        setLive((s) => (s ? { id: s.id, text: s.text + delta } : s));
      });

      if (result.kind === "refused") {
        setLive(null);
        setStatus("refused");
        return;
      }
      const now = Date.now();
      await db.runAsync(
        "INSERT INTO chat_messages (id, role, text, content, createdAt, updatedAt, dirty) VALUES (?, 'assistant', ?, ?, ?, ?, 1)",
        [id, result.text, JSON.stringify(result.content), now, now],
      );
      await refresh();
      setLive(null);
      setStatus("idle");
      scheduleSync();
    } catch (e) {
      setLive(null);
      setStatus(isAuthError(e) ? "badkey" : "failed");
    } finally {
      inFlight.current = false;
      if (again.current) {
        again.current = false;
        answer();
      }
    }
  }, [refresh]);

  const send = useCallback(
    async (raw: string): Promise<"sent" | "key"> => {
      const text = raw.trim();
      if (looksLikeKey(text)) {
        await setSetting(KEY_SETTING, text);
        setHasKey(true);
        setStatus("idle");
        haptics.success();
        answer(); // anything still waiting for a reply gets one now
        return "key";
      }
      const db = await getDb();
      const now = Date.now();
      const last = await db.getFirstAsync<{ createdAt: number }>(
        "SELECT MAX(createdAt) AS createdAt FROM chat_messages",
      );
      const notes = await breathNotes(db, last?.createdAt ?? now - 2 * 60 * 60 * 1000);
      const content: Block[] = [{ type: "text", text: [stamp(now), ...notes].join(" ") + "\n" + text }];
      await db.runAsync(
        "INSERT INTO chat_messages (id, role, text, content, createdAt, updatedAt, dirty) VALUES (?, 'user', ?, ?, ?, ?, 1)",
        [uuid(), text, JSON.stringify(content), now, now],
      );
      await refresh();
      scheduleSync();
      answer();
      return "sent";
    },
    [answer, refresh],
  );

  const retry = useCallback(() => {
    haptics.light();
    answer();
  }, [answer]);

  const value = useMemo(
    () => ({ messages, live, status, hasKey, send, retry }),
    [messages, live, status, hasKey, send, retry],
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
