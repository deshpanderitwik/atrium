import React, { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, garamond, mono } from "@/theme";
import { houseById } from "@/houses";
import { haptics } from "@/lib/haptics";
import { useTodos } from "@/db/store";
import { Todo } from "@/db/types";
import { activeTodos, doneByDay, houseHasAnyTodos, restingTodos } from "@/db/selectors";
import { TodoRow } from "@/components/TodoRow";
import { RecurrenceChip } from "@/components/RecurrenceChip";
import { PrioritySectionHeader } from "@/components/PrioritySectionHeader";
import { DayHeader } from "@/components/DayHeader";

// House view — an active list (drag-orderable), a dimmed "resting" list of
// recurring tasks waiting for their next turn, and the done-by-day history.
export default function HouseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const house = houseById(id);

  const {
    todos,
    addTodo,
    updateText,
    toggleDone,
    toggleStar,
    setCadence,
    deleteTodo,
    reorderActive,
  } = useTodos();

  const [newText, setNewText] = useState("");
  const [newCadence, setNewCadence] = useState(0); // one-off by default
  const inputRef = useRef<TextInput>(null);

  if (!house) return null;

  const active = activeTodos(todos, house.id);
  const resting = restingTodos(todos, house.id);
  const days = doneByDay(todos, house.id);
  const empty = !houseHasAnyTodos(todos, house.id);

  const commitNew = async () => {
    const text = newText.trim();
    if (!text) return;
    await addTodo(house.id, text, newCadence);
    haptics.light();
    setNewText("");
    inputRef.current?.focus(); // keep adding; cadence stays sticky
  };

  const rowFor = (item: Todo, drag?: () => void) => (
    <TodoRow
      todo={item}
      drag={drag}
      onStartTask={() => router.push(`/focus/${item.id}`)}
      onToggleDone={() => toggleDone(item.id)}
      onUpdateText={(t) => updateText(item.id, t)}
      onSetCadence={(d) => setCadence(item.id, d)}
      onToggleStar={() => toggleStar(item.id)}
      onDelete={() => deleteTodo(item.id)}
    />
  );

  const renderActiveItem = ({ item, drag }: RenderItemParams<Todo>) =>
    rowFor(item, drag);

  return (
    <NestableScrollContainer
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: insets.bottom + 80 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ paddingTop: insets.top + 24 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ paddingBottom: 18 }}>
          <Text style={{ ...mono(11, 3), color: colors.inkFaint }}>← atrium</Text>
        </Pressable>
        <Text style={{ ...garamond.medium(38), color: colors.ink, marginBottom: 8 }}>
          {house.name}
        </Text>
        <Text style={{ ...garamond.italic(17), color: colors.inkSoft, lineHeight: 25, paddingBottom: 20 }}>
          {house.definition}
        </Text>
      </View>

      <View style={{ height: 1, backgroundColor: colors.rule }} />

      {/* Input row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingLeft: 4,
          paddingRight: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.rule,
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            ...garamond.regular(24),
            color: colors.inkFaint,
            width: 32,
            textAlign: "center",
          }}
        >
          +
        </Text>
        <TextInput
          ref={inputRef}
          value={newText}
          onChangeText={setNewText}
          placeholder="add"
          placeholderTextColor={colors.inkFaint}
          onSubmitEditing={commitNew}
          blurOnSubmit={false}
          returnKeyType="done"
          style={{ ...garamond.regular(19), color: colors.ink, flex: 1, padding: 0 }}
        />
        <View style={{ marginLeft: 8 }}>
          <RecurrenceChip cadenceDays={newCadence} onChange={setNewCadence} />
        </View>
      </View>

      {/* Active */}
      {active.length > 0 ? (
        <NestableDraggableFlatList
          data={active}
          keyExtractor={(t) => t.id}
          renderItem={renderActiveItem}
          onDragEnd={({ data }) => {
            haptics.soft();
            reorderActive(house.id, data.map((t) => t.id));
          }}
          activationDistance={12}
        />
      ) : null}

      {/* Resting (recurring tasks waiting for their next turn) */}
      {resting.length > 0 ? (
        <View>
          <PrioritySectionHeader label="RESTING" topPadding={28} bottomPadding={4} />
          {resting.map((item) => (
            <View key={item.id}>{rowFor(item)}</View>
          ))}
        </View>
      ) : null}

      {/* Empty state */}
      {empty ? (
        <View style={{ alignItems: "center", paddingTop: 64, paddingBottom: 32 }}>
          <View
            style={{ width: 40, height: 1, backgroundColor: colors.rule, marginBottom: 16 }}
          />
          <Text style={{ ...garamond.italic(15), color: colors.inkFaint }}>
            the room is empty
          </Text>
        </View>
      ) : null}

      {/* Done */}
      {days.length > 0 ? (
        <View>
          <PrioritySectionHeader label="DONE" topPadding={56} bottomPadding={4} />
          {days.map((group) => (
            <View key={group.day}>
              <DayHeader day={group.day} />
              {group.items.map((item) => (
                <TodoRow
                  key={item.id}
                  todo={item}
                  onToggleDone={() => toggleDone(item.id)}
                  onUpdateText={() => {}}
                  onSetCadence={() => {}}
                  onDelete={() => deleteTodo(item.id)}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </NestableScrollContainer>
  );
}
