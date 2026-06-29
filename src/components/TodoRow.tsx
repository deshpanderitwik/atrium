import React, { useState } from "react";
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
  drag,
}: {
  todo: Todo;
  onToggleDone: () => void;
  onUpdateText: (text: string) => void;
  onSetPriority: (p: Priority) => void;
  onToggleStar?: () => void; // omitted for done rows (no leading swipe)
  onDelete: () => void;
  drag?: () => void;
}) {
  const done = isDone(todo);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);

  const commit = () => {
    setEditing(false);
    onUpdateText(draft);
  };

  const renderLeftActions = onToggleStar
    ? () => (
        <View
          style={{
            backgroundColor: colors.oxblood,
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18 }}>★</Text>
        </View>
      )
    : undefined;

  const renderRightActions = () => (
    <View
      style={{
        backgroundColor: "#7a2018",
        justifyContent: "center",
        alignItems: "flex-end",
        paddingHorizontal: 24,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 16 }}>delete</Text>
    </View>
  );

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      leftThreshold={48}
      rightThreshold={48}
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
            <Text style={{ color: "#fff", fontSize: 13, marginTop: 2, marginRight: 4 }}>
              ★
            </Text>
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
                color: colors.ink,
                flex: 1,
                paddingRight: 4,
                padding: 0,
              }}
            />
          ) : (
            <Pressable
              focusable={false}
              style={{ flex: 1, paddingRight: 4 }}
              onPress={() => {
                if (!done) {
                  setDraft(todo.text);
                  setEditing(true);
                }
              }}
              onLongPress={drag}
              delayLongPress={200}
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
            <View style={{ marginLeft: 8 }}>
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
