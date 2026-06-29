import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, garamond, mono } from "@/theme";
import { houseById } from "@/houses";
import { haptics } from "@/lib/haptics";
import { useTodos } from "@/db/store";

const pad = (n: number) => String(n).padStart(2, "0");
const format = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

// The "do it now" view — long-press a task to zoom in here, run a timer while
// you work, then mark it complete.
export default function Focus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { todos, toggleDone } = useTodos();

  const todo = todos.find((t) => t.id === id);

  const [elapsed, setElapsed] = useState(0); // seconds
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const handle = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(handle);
  }, [running]);

  if (!todo) return null;
  const house = houseById(todo.houseID);

  const started = elapsed > 0 || running;
  const timerLabel = !started ? "begin" : running ? "pause" : "resume";

  const toggleTimer = () => {
    haptics.light();
    setRunning((r) => !r);
  };

  const complete = () => {
    haptics.success();
    toggleDone(todo.id);
    router.back();
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        paddingHorizontal: 28,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 28,
      }}
    >
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <Text style={{ ...mono(11, 3), color: colors.inkFaint }}>← back</Text>
      </Pressable>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {house ? (
          <Text style={{ ...mono(11, 3), color: colors.inkFaint, marginBottom: 18 }}>
            {house.name.toUpperCase()}
          </Text>
        ) : null}

        <Text
          style={{
            ...garamond.medium(30),
            color: colors.ink,
            textAlign: "center",
            lineHeight: 38,
            marginBottom: 56,
          }}
        >
          {todo.text}
        </Text>

        <Text
          style={{
            fontFamily: "Courier",
            fontWeight: "500",
            fontSize: 60,
            letterSpacing: 4,
            color: running ? colors.ink : colors.inkSoft,
            marginBottom: 48,
          }}
        >
          {format(elapsed)}
        </Text>

        <Pressable
          onPress={toggleTimer}
          style={{
            borderWidth: 1,
            borderColor: colors.rule,
            borderRadius: 8,
            paddingVertical: 14,
            paddingHorizontal: 44,
          }}
        >
          <Text style={{ ...mono(13, 3), color: colors.ink }}>
            {timerLabel.toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={complete}
        style={{
          backgroundColor: colors.oxblood,
          borderRadius: 10,
          paddingVertical: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ ...mono(13, 3), color: "#fff" }}>COMPLETE</Text>
      </Pressable>
    </View>
  );
}
