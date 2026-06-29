import React, { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, garamond } from "@/theme";
import { haptics } from "@/lib/haptics";
import { useTodos } from "@/db/store";
import { starredOpen } from "@/db/selectors";
import { House, houseById } from "@/houses";
import { Todo } from "@/db/types";
import { TodoCheckbox } from "./TodoCheckbox";

// Ported from StarredStrip.swift — pinned open todos across all houses; hidden
// when empty. Tap the checkbox to complete; single-tap a row to open its house;
// double-tap to zoom into the focus/timer view.
export function StarredStrip() {
  const router = useRouter();
  const { todos, toggleDone } = useTodos();
  const starred = starredOpen(todos);

  if (starred.length === 0) return null;

  return (
    <View style={{ paddingBottom: 32 }}>
      {starred.map((t) => (
        <StarredRow
          key={t.id}
          todo={t}
          house={houseById(t.houseID)}
          onComplete={() => {
            haptics.success();
            toggleDone(t.id);
          }}
          onOpenHouse={() => router.push(`/house/${t.houseID}`)}
          onStart={() => router.push(`/focus/${t.id}`)}
        />
      ))}
    </View>
  );
}

function StarredRow({
  todo,
  house,
  onComplete,
  onOpenHouse,
  onStart,
}: {
  todo: Todo;
  house: House | undefined;
  onComplete: () => void;
  onOpenHouse: () => void;
  onStart: () => void;
}) {
  // Single tap opens the house; double tap starts the task. The single-tap
  // action waits briefly to see if a second tap follows.
  const lastTap = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    },
    [],
  );

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      lastTap.current = 0;
      onStart();
    } else {
      lastTap.current = now;
      singleTapTimer.current = setTimeout(() => {
        singleTapTimer.current = null;
        onOpenHouse();
      }, 280);
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors.rule + "80",
      }}
    >
      <TodoCheckbox done={false} onPress={onComplete} />
      <Pressable
        onPress={handlePress}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 9,
        }}
      >
        <Text
          numberOfLines={1}
          style={{ ...garamond.regular(18), color: colors.ink, flex: 1 }}
        >
          {todo.text}
        </Text>
        <Text style={{ ...garamond.italic(15), color: colors.inkFaint, marginLeft: 8 }}>
          {house?.name ?? ""}
        </Text>
      </Pressable>
    </View>
  );
}
