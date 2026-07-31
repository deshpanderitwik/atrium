import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, garamond, mono } from "@/theme";
import { HOUSES } from "@/houses";
import { haptics } from "@/lib/haptics";
import { getBoolSetting, getSetting, setBoolSetting, setSetting } from "@/lib/settings";
import { useTodos } from "@/db/store";
import { Todo } from "@/db/types";
import { activeTodos, doneByDayAll, restingTodos } from "@/db/selectors";
import { TodoRow } from "@/components/TodoRow";
import { WeeklyToggle } from "@/components/WeeklyToggle";
import { HousePicker } from "@/components/HousePicker";
import { PrioritySectionHeader } from "@/components/PrioritySectionHeader";
import { DayHeader } from "@/components/DayHeader";

const HOUSE_KEY = "taskHouse";
const WEEKLY_KEY = "taskWeekly";

// The single task view — reached from Arrive via "perform a task". You add a
// task (setting weekly-or-not and its house), and the stack below is grouped by
// house with a subheader over each cluster, drag-orderable within a house.
export default function Atrium() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    todos,
    addTodo,
    updateText,
    toggleDone,
    setCadence,
    deleteTodo,
    reorderActive,
  } = useTodos();

  const [newText, setNewText] = useState("");
  const [weekly, setWeekly] = useState(false);
  const [houseID, setHouseID] = useState(HOUSES[0].id);
  const inputRef = useRef<TextInput>(null);

  // Restore the last-used house + weekly setting so batching tasks is sticky.
  useEffect(() => {
    getSetting(HOUSE_KEY).then((h) => {
      if (h && HOUSES.some((x) => x.id === h)) setHouseID(h);
    });
    getBoolSetting(WEEKLY_KEY).then(setWeekly);
  }, []);

  const pickHouse = (id: string) => {
    setHouseID(id);
    setSetting(HOUSE_KEY, id);
  };
  const toggleWeekly = () => {
    setWeekly((w) => {
      const next = !w;
      setBoolSetting(WEEKLY_KEY, next);
      return next;
    });
  };

  const commitNew = async () => {
    const text = newText.trim();
    if (!text) return;
    await addTodo(houseID, text, weekly ? 7 : 0);
    haptics.light();
    setNewText("");
    inputRef.current?.focus(); // keep adding; house + weekly stay sticky
  };

  // Houses that currently hold anything to show, in catalog order.
  const groups = HOUSES.map((house) => ({
    house,
    active: activeTodos(todos, house.id),
    resting: restingTodos(todos, house.id),
  })).filter((g) => g.active.length > 0 || g.resting.length > 0);

  const days = doneByDayAll(todos);
  const empty = groups.length === 0 && days.length === 0;

  const rowFor = (item: Todo, drag?: () => void) => (
    <TodoRow
      todo={item}
      drag={drag}
      onStartTask={() => router.push(`/focus/${item.id}`)}
      onToggleDone={() => toggleDone(item.id)}
      onUpdateText={(t) => updateText(item.id, t)}
      onSetCadence={(d) => setCadence(item.id, d)}
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
          <Text style={{ ...mono(11, 3), color: colors.inkFaint }}>← arrive</Text>
        </Pressable>
      </View>

      {/* Add row: text on its own line, weekly · house below it */}
      <View
        style={{
          paddingVertical: 12,
          paddingLeft: 4,
          paddingRight: 8,
          borderTopWidth: 1,
          borderTopColor: colors.rule,
          borderBottomWidth: 1,
          borderBottomColor: colors.rule,
          marginBottom: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              ...garamond.regular(24),
              color: colors.inkFaint,
              width: 28,
              textAlign: "center",
            }}
          >
            +
          </Text>
          <TextInput
            ref={inputRef}
            value={newText}
            onChangeText={setNewText}
            placeholder="add a task"
            placeholderTextColor={colors.inkFaint}
            onSubmitEditing={commitNew}
            blurOnSubmit={false}
            returnKeyType="done"
            style={{ ...garamond.regular(19), color: colors.ink, flex: 1, padding: 0 }}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            marginLeft: 28,
          }}
        >
          <WeeklyToggle weekly={weekly} onToggle={toggleWeekly} />
          <HousePicker houseID={houseID} onChange={pickHouse} />
        </View>
      </View>

      {/* Empty state */}
      {empty ? (
        <View style={{ alignItems: "center", paddingTop: 80 }}>
          <View style={{ width: 40, height: 1, backgroundColor: colors.rule, marginBottom: 16 }} />
          <Text style={{ ...garamond.italic(16), color: colors.inkFaint }}>
            nothing to tend yet
          </Text>
        </View>
      ) : null}

      {/* House groups: subheader · active (drag) · resting */}
      {groups.map((group) => (
        <View key={group.house.id} style={{ marginTop: 18 }}>
          <Text
            style={{
              ...garamond.medium(22),
              color: colors.ink,
              marginBottom: 4,
            }}
          >
            {group.house.name}
          </Text>

          {group.active.length > 0 ? (
            <NestableDraggableFlatList
              data={group.active}
              keyExtractor={(t) => t.id}
              renderItem={({ item, drag }: RenderItemParams<Todo>) => rowFor(item, drag)}
              onDragEnd={({ data }) => {
                haptics.soft();
                reorderActive(group.house.id, data.map((t) => t.id));
              }}
              activationDistance={12}
            />
          ) : null}

          {group.resting.length > 0 ? (
            <View>
              <PrioritySectionHeader label="RESTING" topPadding={16} bottomPadding={2} />
              {group.resting.map((item) => (
                <View key={item.id}>{rowFor(item)}</View>
              ))}
            </View>
          ) : null}
        </View>
      ))}

      {/* Done — all houses, by day */}
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
