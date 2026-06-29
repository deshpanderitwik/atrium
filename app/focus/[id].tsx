import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, garamond, mono } from "@/theme";
import { houseById } from "@/houses";
import { haptics } from "@/lib/haptics";
import { formatDuration } from "@/lib/time";
import { useTodos } from "@/db/store";

// The "do it now" view — double-tap a task to zoom in here, run a timer while
// you work, then mark it complete. Timer state is persisted on the todo, so it
// survives leaving the screen.
export default function Focus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { todos, toggleDone, focusResume, focusPause } = useTodos();

  const todo = todos.find((t) => t.id === id);
  const running = todo?.focusRunningSince != null;

  // Tick once a second while running so the displayed time updates.
  const [, force] = useState(0);
  useEffect(() => {
    if (!running) return;
    const handle = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(handle);
  }, [running]);

  if (!todo) return null;
  const house = houseById(todo.houseID);

  const elapsed =
    todo.focusAccumSeconds +
    (todo.focusRunningSince != null
      ? (Date.now() - todo.focusRunningSince) / 1000
      : 0);

  const begun = todo.focusStartedAt != null;
  const timerLabel = running ? "pause" : begun ? "resume" : "begin";

  const toggleTimer = () => {
    haptics.light();
    if (running) focusPause(todo.id);
    else focusResume(todo.id);
  };

  const complete = () => {
    haptics.success();
    toggleDone(todo.id); // finalizes any running time, marks done
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
            marginBottom: 48,
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
            marginBottom: 12,
          }}
        >
          {formatDuration(elapsed)}
        </Text>

        <Text style={{ ...mono(11, 2), color: colors.inkFaint, marginBottom: 36, minHeight: 14 }}>
          {todo.focusBreaks > 0
            ? `${todo.focusBreaks} ${todo.focusBreaks === 1 ? "break" : "breaks"}`
            : ""}
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
