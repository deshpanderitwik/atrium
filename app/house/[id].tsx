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
import { DEFAULT_PRIORITY, Priority, Todo, priorityLabel } from "@/db/types";
import {
  doneByDay,
  houseHasAnyTodos,
  openByPriority,
} from "@/db/selectors";
import { TodoRow } from "@/components/TodoRow";
import { PriorityChip } from "@/components/PriorityChip";
import { PrioritySectionHeader } from "@/components/PrioritySectionHeader";
import { DayHeader } from "@/components/DayHeader";

// Ported from HouseView.swift + TodoListPane.swift.
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
    setPriority,
    deleteTodo,
    reorderWithin,
  } = useTodos();

  const [newText, setNewText] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>(DEFAULT_PRIORITY);
  const inputRef = useRef<TextInput>(null);

  if (!house) return null;

  const clusters = openByPriority(todos, house.id);
  const days = doneByDay(todos, house.id);
  const empty = !houseHasAnyTodos(todos, house.id);

  const commitNew = async () => {
    const text = newText.trim();
    if (!text) return;
    await addTodo(house.id, text, newPriority);
    haptics.light();
    setNewText("");
    inputRef.current?.focus(); // keep adding; priority stays sticky
  };

  const renderOpenItem = ({ item, drag }: RenderItemParams<Todo>) => (
    <TodoRow
      todo={item}
      drag={drag}
      onToggleDone={() => toggleDone(item.id)}
      onUpdateText={(t) => updateText(item.id, t)}
      onSetPriority={(p) => setPriority(item.id, p)}
      onToggleStar={() => toggleStar(item.id)}
      onDelete={() => deleteTodo(item.id)}
    />
  );

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
          <PriorityChip priority={newPriority} onChange={setNewPriority} />
        </View>
      </View>

      {/* Open todos by priority */}
      {clusters.map((cluster) => (
        <View key={cluster.priority}>
          <PrioritySectionHeader label={priorityLabel(cluster.priority)} />
          <NestableDraggableFlatList
            data={cluster.items}
            keyExtractor={(t) => t.id}
            renderItem={renderOpenItem}
            onDragEnd={({ data }) => {
              haptics.soft();
              reorderWithin(house.id, cluster.priority, data.map((t) => t.id));
            }}
            activationDistance={12}
          />
        </View>
      ))}

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
                  onSetPriority={() => {}}
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
