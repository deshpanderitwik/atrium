// The day as one thread: day headings, then blocks in time order — a breath
// capsule for each session, and runs of named things as wrapping pills. A new
// entry unrolls from its left edge, box first, letters after.

import React, { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  EntryExitAnimationFunction,
  LinearTransition,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { brico, label, night } from "@/theme";
import { BreathEntry, NameEntry, ThreadEntry } from "@/db/thread";
import { clock, patternLabel } from "@/lib/breath";

const RUN_GAP_MS = 30 * 60 * 1000; // names further apart than this start a new run
const OUT = Easing.bezier(0.25, 0.8, 0.3, 1);

type Block =
  | { kind: "breath"; time: number; entry: BreathEntry }
  | { kind: "names"; time: number; items: NameEntry[] };
type Day = { key: string; label: string; blocks: Block[] };

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

function group(entries: ThreadEntry[]): Day[] {
  const days: Day[] = [];
  for (const e of entries) {
    let day = days[days.length - 1];
    if (!day || day.key !== dayKey(e.createdAt)) {
      day = { key: dayKey(e.createdAt), label: dayLabel(e.createdAt), blocks: [] };
      days.push(day);
    }
    const last = day.blocks[day.blocks.length - 1];
    if (e.kind === "breath") {
      day.blocks.push({ kind: "breath", time: e.createdAt, entry: e });
    } else if (
      last?.kind === "names" &&
      e.createdAt - last.items[last.items.length - 1].createdAt < RUN_GAP_MS
    ) {
      last.items.push(e);
    } else {
      day.blocks.push({ kind: "names", time: e.createdAt, items: [e] });
    }
  }
  return days;
}

export const breathCaption = (b: BreathEntry) =>
  (b.rounds ? `${b.rounds} round${b.rounds > 1 ? "s" : ""} · ` : "") +
  `${patternLabel(b.pattern)} · ${clock(b.seconds)}` +
  (b.silent ? " · silent" : "");

const unroll: EntryExitAnimationFunction = () => {
  "worklet";
  return {
    initialValues: { transform: [{ scaleX: 0 }], opacity: 0.4 },
    animations: {
      transform: [{ scaleX: withTiming(1, { duration: 340, easing: OUT }) }],
      opacity: withTiming(1, { duration: 120 }),
    },
  };
};

const rollUp: EntryExitAnimationFunction = () => {
  "worklet";
  return {
    initialValues: { transform: [{ scaleX: 1 }], opacity: 1 },
    animations: {
      transform: [{ scaleX: withTiming(0, { duration: 240 }) }],
      opacity: withTiming(0.2, { duration: 240 }),
    },
  };
};

const letterIn =
  (i: number): EntryExitAnimationFunction =>
  () => {
    "worklet";
    return {
      initialValues: { opacity: 0, transform: [{ translateX: -7 }] },
      animations: {
        opacity: withDelay(230 + i * 22, withTiming(1, { duration: 200 })),
        transform: [
          { translateX: withDelay(230 + i * 22, withTiming(0, { duration: 200, easing: OUT })) },
        ],
      },
    };
  };

function NamePill({
  entry,
  fresh,
  lifted,
  onLongPress,
}: {
  entry: NameEntry;
  fresh: boolean;
  lifted: boolean;
  onLongPress: (entry: NameEntry, node: View) => void;
}) {
  const ref = useRef<View>(null);
  return (
    <Animated.View
      ref={ref}
      entering={fresh ? unroll : undefined}
      exiting={rollUp}
      layout={LinearTransition.duration(280).easing(Easing.bezierFn(0.25, 0.8, 0.3, 1))}
      style={{ transformOrigin: "left", opacity: lifted ? 0 : 1 }}
    >
      <Pressable
        delayLongPress={380}
        onLongPress={() => ref.current && onLongPress(entry, ref.current)}
        style={{
          flexDirection: "row",
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: night.hotLine,
          backgroundColor: night.hotWash,
        }}
      >
        {fresh ? (
          [...entry.text].map((ch, i) => (
            <Animated.Text
              key={i}
              entering={letterIn(i)}
              style={{ ...brico(16), color: night.hotText }}
            >
              {ch}
            </Animated.Text>
          ))
        ) : (
          <Text style={{ ...brico(16), color: night.hotText }}>{entry.text}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function BreathCapsule({ entry, fresh }: { entry: BreathEntry; fresh: boolean }) {
  return (
    <Animated.View
      entering={fresh ? unroll : undefined}
      style={{
        alignSelf: "flex-start",
        transformOrigin: "left",
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
    </Animated.View>
  );
}

export type Frame = { x: number; y: number; width: number; height: number };

export function ThreadList({
  entries,
  freshId,
  liftedId,
  onLongPressName,
}: {
  entries: ThreadEntry[];
  freshId: string | null;
  liftedId: string | null;
  onLongPressName: (entry: NameEntry, node: View) => void;
}) {
  if (!entries.length) {
    return (
      <View style={{ paddingTop: 8 }}>
        <Text style={{ ...label(), marginBottom: 14 }}>TODAY</Text>
        <Text style={{ ...brico(20), color: night.faint, lineHeight: 27, maxWidth: 280 }}>
          Name what you see, or breathe. Both land here, in the order they happen.
        </Text>
      </View>
    );
  }
  return (
    <View>
      {group(entries).map((day) => (
        <View key={day.key} style={{ marginBottom: 10 }}>
          <Text style={{ ...label(), marginBottom: 14 }}>{day.label}</Text>
          {day.blocks.map((block) => (
            <Animated.View
              key={block.kind === "breath" ? block.entry.id : block.items[0].id}
              layout={LinearTransition.duration(280).easing(Easing.bezierFn(0.25, 0.8, 0.3, 1))}
              style={{ marginBottom: 16 }}
            >
              <Text style={{ ...label(), marginBottom: 6 }}>{hhmm(block.time)}</Text>
              {block.kind === "breath" ? (
                <BreathCapsule entry={block.entry} fresh={block.entry.id === freshId} />
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                  {block.items.map((n) => (
                    <NamePill
                      key={n.id}
                      entry={n}
                      fresh={n.id === freshId}
                      lifted={n.id === liftedId}
                      onLongPress={onLongPressName}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          ))}
        </View>
      ))}
    </View>
  );
}
