// The thread: the conversation and the breath sessions, in the order they
// happened, under day headings, as rows for the virtualised list. Your words sit on the right in the hot wash;
// Claude's sit on the left in Garamond, and arrive as they are written — a
// steady reveal whose last few letters are still settling into ink.

import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { brico, garamond, label, night } from "@/theme";
import { BreathEntry } from "@/db/thread";
import { ChatMessage, ChatStatus } from "@/db/chat";
import { clock, patternLabel } from "@/lib/breath";

const GAP_MS = 30 * 60 * 1000; // a quiet stretch this long gets a time label

type Item =
  | { kind: "breath"; id: string; time: number; entry: BreathEntry }
  | { kind: "message"; id: string; time: number; message: ChatMessage }
  | { kind: "live"; id: string; time: number; text: string };

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const dayKey = (t: number) => new Date(t).toDateString();
function dayLabel(t: number) {
  const today = new Date();
  const d = new Date(t);
  if (d.toDateString() === today.toDateString()) return "TODAY";
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "YESTERDAY";
  return d
    .toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
    .toUpperCase();
}

export const breathCaption = (b: BreathEntry) =>
  (b.rounds ? `${b.rounds} round${b.rounds > 1 ? "s" : ""} · ` : "") +
  `${patternLabel(b.pattern)} · ${clock(b.seconds)}` +
  (b.silent ? " · silent" : "");

function BreathCapsule({ entry }: { entry: BreathEntry }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 6,
        paddingLeft: 6,
        paddingRight: 13,
        borderRadius: 999,
        backgroundColor: night.hot,
      }}
    >
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff" }} />
      <Text style={{ ...brico(14, "bold"), color: "#fff" }}>{breathCaption(entry)}</Text>
    </View>
  );
}

function Yours({ text }: { text: string }) {
  return (
    <View
      style={{
        alignSelf: "flex-end",
        maxWidth: "84%",
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: night.hotWash,
      }}
    >
      <Text style={{ ...brico(17), lineHeight: 23, color: night.hotText }}>{text}</Text>
    </View>
  );
}

// Letters still settling: the newest ones are fainter, in three steps.
const TAIL = 18;
const SETTLE = ["rgba(242,238,230,0.72)", "rgba(242,238,230,0.46)", "rgba(242,238,230,0.2)"];
const INK = night.ink;
const voiceStyle = { ...garamond.regular(20), lineHeight: 28, color: INK };

// Claude's words. A reply that is still arriving (or has only just arrived)
// reveals at an even pace however the network delivers it, then lets its tail
// settle; anything older renders whole.
function Theirs({ text, reveal }: { text: string; reveal: boolean }) {
  const pos = useRef(reveal ? 0 : Infinity);
  const [, tick] = useState(0);
  const target = useRef(text.length + TAIL);
  target.current = text.length + TAIL;
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!reveal || frame.current != null) return;
    const step = () => {
      const t = target.current;
      if (pos.current >= t) {
        frame.current = null;
        return;
      }
      pos.current = Math.min(t, pos.current + Math.max(1.2, (t - pos.current) * 0.12));
      tick((n) => n + 1);
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [text, reveal]);
  useEffect(
    () => () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const v = pos.current;
  const shown = Math.min(Math.floor(v), text.length);
  const bright = Math.max(0, Math.min(shown, Math.floor(v) - TAIL));
  const third = TAIL / 3;
  const parts: { s: string; c: string }[] = [];
  for (let i = 0; i < 3; i++) {
    const a = Math.max(bright, Math.floor(v) - TAIL + Math.round(third * i));
    const b = Math.min(shown, Math.floor(v) - TAIL + Math.round(third * (i + 1)));
    if (b > a) parts.push({ s: text.slice(a, b), c: SETTLE[i] });
  }
  return (
    <View style={{ alignSelf: "flex-start", maxWidth: "94%" }}>
      <Text style={voiceStyle}>
        {text.slice(0, bright)}
        {parts.map((p, i) => (
          <Text key={i} style={{ color: p.c }}>
            {p.s}
          </Text>
        ))}
      </Text>
    </View>
  );
}

// Sent, nothing back yet: one dot, breathing.
function Listening() {
  const o = useSharedValue(0.25);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: 0.8 + 0.2 * o.value }] }));
  return (
    <Animated.View
      style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: night.hot, marginTop: 9, marginLeft: 2 }, style]}
    />
  );
}

const NOTES: Partial<Record<ChatStatus, string>> = {
  failed: "didn't go through · tap to try again",
  refused: "that one couldn't be answered · try saying it another way",
  nokey: "paste your Anthropic API key below to begin",
  badkey: "that key was turned away · paste a new one below",
};

function Note({ status, onRetry }: { status: ChatStatus; onRetry: () => void }) {
  const w = NOTES[status];
  if (!w) return null;
  return (
    <Animated.View entering={FadeIn.duration(260)}>
      <Pressable disabled={status !== "failed"} onPress={onRetry} hitSlop={10}>
        <Text style={{ ...label(12, 0.5), color: status === "failed" ? night.hotText : night.dim }}>{w}</Text>
      </Pressable>
    </Animated.View>
  );
}

// One row of the virtualised thread. Day headings and quiet-stretch times are
// rows too, so they scroll with everything else.
export type Row =
  | { key: string; kind: "day"; label: string; first: boolean }
  | { key: string; kind: "time"; label: string }
  | { key: string; kind: "breath"; entry: BreathEntry; fresh: boolean }
  | { key: string; kind: "yours"; text: string; fresh: boolean }
  | { key: string; kind: "theirs"; text: string; reveal: boolean }
  | { key: string; kind: "listening" }
  | { key: string; kind: "note"; status: ChatStatus };

export function threadRows({
  breaths,
  messages,
  live,
  status,
  sinceMount,
}: {
  breaths: BreathEntry[];
  messages: ChatMessage[];
  live: { id: string; text: string } | null;
  status: ChatStatus;
  sinceMount: number; // items newer than this arrived while the thread was open
}): Row[] {
  const items: Item[] = [
    ...breaths.map((b) => ({ kind: "breath" as const, id: b.id, time: b.createdAt, entry: b })),
    ...messages
      .filter((m) => m.id !== live?.id)
      .map((m) => ({ kind: "message" as const, id: m.id, time: m.createdAt, message: m })),
  ].sort((a, b) => a.time - b.time);
  if (live) items.push({ kind: "live", id: live.id, time: Date.now(), text: live.text });

  const rows: Row[] = [];
  let prev: Item | null = null;
  for (const it of items) {
    if (!prev || dayKey(prev.time) !== dayKey(it.time)) {
      rows.push({ key: `day-${dayKey(it.time)}`, kind: "day", label: dayLabel(it.time), first: !prev });
    } else if (it.time - prev.time > GAP_MS) {
      rows.push({ key: `gap-${it.id}`, kind: "time", label: hhmm(it.time) });
    }
    const fresh = it.time > sinceMount;
    // A reply keeps its key from first word to stored message, so its row —
    // and its reveal — carry straight on.
    if (it.kind === "breath") rows.push({ key: it.id, kind: "breath", entry: it.entry, fresh });
    else if (it.kind === "live") {
      rows.push(it.text ? { key: it.id, kind: "theirs", text: it.text, reveal: true } : { key: it.id, kind: "listening" });
    } else if (it.message.role === "user") rows.push({ key: it.id, kind: "yours", text: it.message.text, fresh });
    else rows.push({ key: it.id, kind: "theirs", text: it.message.text, reveal: fresh });
    prev = it;
  }
  if (rows.length && NOTES[status]) rows.push({ key: "note", kind: "note", status });
  return rows;
}

export function ThreadRow({ row, onRetry }: { row: Row; onRetry: () => void }) {
  switch (row.kind) {
    case "day":
      return <Text style={{ ...label(), marginTop: row.first ? 0 : 18, marginBottom: 14 }}>{row.label}</Text>;
    case "time":
      return <Text style={{ ...label(), marginTop: 10, marginBottom: 12 }}>{row.label}</Text>;
    case "note":
      return <Note status={row.status} onRetry={onRetry} />;
  }
  const body =
    row.kind === "breath" ? (
      <BreathCapsule entry={row.entry} />
    ) : row.kind === "yours" ? (
      <Yours text={row.text} />
    ) : row.kind === "listening" ? (
      <Listening />
    ) : (
      <Theirs text={row.text} reveal={row.reveal} />
    );
  // Your words fade in where they land; a slide would fight the scroll.
  const fades = (row.kind === "yours" || row.kind === "breath") && row.fresh;
  return (
    <Animated.View entering={fades ? FadeIn.duration(200) : undefined} style={{ marginBottom: 14 }}>
      {body}
    </Animated.View>
  );
}

// Shown when there's nothing in the thread yet.
export function EmptyThread({ status, onRetry }: { status: ChatStatus; onRetry: () => void }) {
  return (
    <View style={{ paddingTop: 8 }}>
      <Text style={{ ...label(), marginBottom: 14 }}>TODAY</Text>
      <Text style={{ ...garamond.regular(22), color: night.faint, lineHeight: 30, maxWidth: 300 }}>
        Here, now. Say what's happening, or breathe.
      </Text>
      <View style={{ marginTop: 18 }}>
        <Note status={status} onRetry={onRetry} />
      </View>
    </View>
  );
}
