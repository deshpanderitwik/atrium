import React from "react";
import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, mono } from "@/theme";
import { haptics } from "@/lib/haptics";

// A binary "weekly or not" control. Off = a one-off task; on = it recurs weekly
// (completion-anchored, resting until the next week). Replaces the older
// once/daily/weekly/custom cadence chip in the simplified task view.
export function WeeklyToggle({
  weekly,
  onToggle,
}: {
  weekly: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onToggle();
      }}
      hitSlop={6}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: weekly ? colors.oxblood : colors.rule,
          borderRadius: 3,
          paddingHorizontal: 7,
          paddingVertical: 4,
          minWidth: 34,
          justifyContent: "center",
        }}
      >
        <Feather name="repeat" size={11} color={weekly ? colors.oxblood : colors.inkFaint} />
        {weekly ? (
          <Text style={{ ...mono(11, 1), color: colors.oxblood, marginLeft: 5 }}>weekly</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
