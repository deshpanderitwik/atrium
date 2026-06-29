import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { colors, garamond } from "@/theme";
import { haptics } from "@/lib/haptics";
import { Priority, Todo, isDone } from "@/db/types";
import { TodoCheckbox } from "./TodoCheckbox";
import { PriorityChip } from "./PriorityChip";

// Ported from TodoRow.swift — checkbox, optional star, inline-editable text,
// and a priority chip; wrapped in swipe-to-star (leading) / swipe-to-delete
// (trailing). Open rows also support long-press drag to reorder.
export function TodoRow({
  todo,
  onToggleDone,
  onUpdateText,
  onSetPriority,
  onToggleStar,
  onDelete,
  onStartTask,
  drag,
}: {
  todo: Todo;
  onToggleDone: () => void;
  onUpdateText: (text: string) => void;
  onSetPriority: (p: Priority) => void;
  onToggleStar?: () => void; // omitted for done rows (no leading swipe)
  onDelete: () => void;
  onStartTask?: () => void; // double-tap to zoom into the focus/timer view
  drag?: () => void;
}) {
  const done = isDone(todo);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);

  // Distinguish single tap (edit) from double tap (start/focus): a tap waits
  // briefly to see if a second tap follows.
  const lastTap = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    },
    [],
  );

  const handlePress = () => {
    if (done) return;
    const now = Date.now();
    if (now - lastTap.current < 280) {
      // double tap → start the task
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      lastTap.current = 0;
      onStartTask?.();
    } else {
      lastTap.current = now;
      singleTapTimer.current = setTimeout(() => {
        singleTapTimer.current = null;
        setDraft(todo.text);
        setEditing(true);
      }, 280);
    }
  };

  const commit = () => {
    setEditing(false);
    onUpdateText(draft);
  };

  // Action backgrounds mirror the row card: same 4pt vertical inset and 10pt
  // radius, so a partial swipe reveals a tidy rounded edge instead of a raw
  // square rectangle poking past the card's corners.
  const renderLeftActions = onToggleStar
    ? () => (
        <View style={{ paddingVertical: 4, justifyContent: "center" }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.oxblood,
              borderRadius: 10,
              justifyContent: "center",
              paddingHorizontal: 24,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18 }}>★</Text>
          </View>
        </View>
      )
    : undefined;

  const renderRightActions = () => (
    <View style={{ paddingVertical: 4, justifyContent: "center" }}>
      <View
        style={{
          flex: 1,
          backgroundColor: "#7a2018",
          borderRadius: 10,
          justifyContent: "center",
          alignItems: "flex-end",
          paddingHorizontal: 24,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16 }}>delete</Text>
      </View>
    </View>
  );

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      leftThreshold={56}
      rightThreshold={56}
      onSwipeableOpen={(direction) => {
        if (direction === "left" && onToggleStar) {
          haptics.rigid();
          onToggleStar();
        } else if (direction === "right") {
          haptics.warning();
          onDelete();
        }
      }}
    >
      <View style={{ paddingVertical: 4 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            backgroundColor: colors.paperWarm,
            borderRadius: 10,
            paddingVertical: 12,
            paddingLeft: 4,
            paddingRight: 8,
          }}
        >
          <TodoCheckbox
            done={done}
            onPress={() => {
              done ? haptics.light() : haptics.success();
              onToggleDone();
            }}
          />

          {todo.starred === 1 && !done ? (
            <Pressable
              onPress={() => {
                haptics.rigid();
                onToggleStar?.();
              }}
              hitSlop={8}
              style={{ marginRight: 4 }}
            >
              {/* lineHeight matches the title so the star centers on its first line */}
              <Text style={{ fontSize: 14, lineHeight: 25, color: colors.oxblood }}>
                ★
              </Text>
            </Pressable>
          ) : null}

          {editing ? (
            <TextInput
              value={draft}
              onChangeText={setDraft}
              autoFocus
              multiline
              blurOnSubmit
              onSubmitEditing={commit}
              onBlur={commit}
              style={{
                ...garamond.regular(19),
                // match the display Text metrics exactly so editing doesn't shift
                lineHeight: 25,
                color: colors.ink,
                flex: 1,
                padding: 0,
                margin: 0,
                paddingRight: 4,
                textAlignVertical: "top",
              }}
            />
          ) : (
            <Pressable
              style={{ flex: 1, paddingRight: 4 }}
              onPress={handlePress}
              onLongPress={
                drag
                  ? () => {
                      haptics.soft();
                      drag();
                    }
                  : undefined
              }
              delayLongPress={300}
            >
              <Text
                style={{
                  ...garamond.regular(19),
                  lineHeight: 25,
                  color: done ? colors.inkFaint : todo.text ? colors.ink : colors.inkFaint,
                  textDecorationLine: done ? "line-through" : "none",
                }}
              >
                {todo.text || "—"}
              </Text>
            </Pressable>
          )}

          {!done ? (
            <View style={{ marginLeft: 8, alignSelf: "center" }}>
              <PriorityChip
                priority={todo.priority as Priority}
                onChange={onSetPriority}
              />
            </View>
          ) : null}
        </View>
      </View>
    </Swipeable>
  );
}
