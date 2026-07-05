import React from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, garamond, mono } from "@/theme";

// Placeholder for Brick 1. Brick 2 adds the writing surface + timestamped
// storage; Brick 3 adds the reflections log.
export default function Reflect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { held } = useLocalSearchParams<{ held?: string }>();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        paddingHorizontal: 32,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 28,
      }}
    >
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <Text style={{ ...mono(11, 3), color: colors.inkFaint }}>← back</Text>
      </Pressable>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text
          style={{
            ...garamond.italic(24),
            color: colors.ink,
            textAlign: "center",
            lineHeight: 34,
          }}
        >
          what are you experiencing?
        </Text>
        <Text style={{ ...mono(10, 2), color: colors.inkFaint, marginTop: 24 }}>
          a place to reflect · arriving next
        </Text>
        {held ? (
          <Text style={{ ...mono(9, 1), color: colors.inkFaint, marginTop: 12 }}>
            you breathed for {held}s
          </Text>
        ) : null}
      </View>
    </View>
  );
}
