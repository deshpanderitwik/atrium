import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import { colors, garamond, mono } from "@/theme";
import { haptics } from "@/lib/haptics";
import { formatDuration } from "@/lib/time";
import { dueInLabel, isResting } from "@/lib/cadence";
import { Todo, isDone } from "@/db/types";
import { TodoCheckbox } from "./TodoCheckbox";
import { WeeklyToggle } from "./WeeklyToggle";

// Checkbox, inline-editable text, and a weekly toggle; wrapped in
// swipe-to-delete (trailing). Open rows also support long-press drag to reorder.
export function TodoRow({
  todo,
  onToggleDone,
  onUpdateText,
  onSetCadence,
  onDelete,
  onStartTask,
  drag,
}: {
  todo: Todo;
  onToggleDone: () => void;
  onUpdateText: (text: string) => void;
  onSetCadence: (days: number) => void;
  onDelete: () => void;
  onStartTask?: () => void; // double-tap to zoom into the focus/timer view
  drag?: () => void;
}) {
  const done = isDone(todo);
  const resting = isResting(todo, Date.now());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const swipeRef = useRef<Swipeable>(null);

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
  //
  // Swiping left just reveals this button; deletion requires an explicit tap.
  const renderRightActions = () => (
    <View style={{ paddingVertical: 4, justifyContent: "center" }}>
      <Pressable
        onPress={() => {
          haptics.warning();
          onDelete();
        }}
        style={{
          flex: 1,
          backgroundColor: "#7a2018",
          borderRadius: 10,
          justifyContent: "center",
          alignItems: "flex-end",
          paddingHorizontal: 24,
          marginLeft: 4, // 4px gap between the delete button and the card
        }}
      >
        <Feather name="trash-2" size={18} color="#fff" />
      </Pressable>
    </View>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      rightThreshold={40}
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
            opacity: resting ? 0.5 : 1, // resting recurring tasks recede
          }}
        >
          <TodoCheckbox
            done={done}
            onPress={() => {
              done ? haptics.light() : haptics.success();
              onToggleDone();
            }}
          />

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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginLeft: 8,
                alignSelf: "center",
              }}
            >
              {resting && todo.nextDueAt != null ? (
                <Text style={{ ...mono(10, 0.5), color: colors.inkFaint, marginRight: 8 }}>
                  {dueInLabel(todo.nextDueAt, Date.now())}
                </Text>
              ) : null}
              <WeeklyToggle
                weekly={todo.cadenceDays > 0}
                onToggle={() => onSetCadence(todo.cadenceDays > 0 ? 0 : 7)}
              />
            </View>
          ) : todo.focusAccumSeconds > 0 ? (
            // Completed tasks that were timed show how long they took + breaks.
            <View style={{ marginLeft: 8, alignSelf: "center", alignItems: "flex-end" }}>
              <Text style={{ ...mono(11, 1), color: colors.inkSoft }}>
                {formatDuration(todo.focusAccumSeconds)}
              </Text>
              {todo.focusBreaks > 0 ? (
                <Text style={{ ...mono(9, 0.5), color: colors.inkFaint, marginTop: 2 }}>
                  {todo.focusBreaks} {todo.focusBreaks === 1 ? "break" : "breaks"}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Swipeable>
  );
}
