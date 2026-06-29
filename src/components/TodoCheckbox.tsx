import React from "react";
import { Pressable, View } from "react-native";
import { colors } from "@/theme";

// Ported from TodoCheckbox.swift — a ring with an inner dot when done.
export function TodoCheckbox({
  done,
  onPress,
}: {
  done: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      focusable={false}
      style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1,
          borderColor: colors.inkFaint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done ? (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.inkSoft,
              opacity: 0.7,
            }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
