import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, garamond } from "@/theme";
import { HOUSES } from "@/houses";
import { useTodos } from "@/db/store";
import { openCountForHouse } from "@/db/selectors";
import { HouseDoor } from "@/components/HouseDoor";
import { StarredStrip } from "@/components/StarredStrip";

// Ported from AtriumView.swift — the home "atrium": tagline, starred strip,
// the twelve doors, a quiet footer.
export default function Atrium() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { todos } = useTodos();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingHorizontal: 28 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ alignItems: "center", paddingTop: insets.top + 64, paddingBottom: 40 }}>
        <Text
          style={{
            ...garamond.italic(26),
            color: colors.ink,
            textAlign: "center",
            lineHeight: 34,
            paddingHorizontal: 24,
          }}
        >
          tend each house in its own time
        </Text>
        <View
          style={{ width: 1, height: 40, backgroundColor: colors.rule, marginTop: 28 }}
        />
      </View>

      <StarredStrip />

      {HOUSES.map((house) => (
        <Pressable key={house.id} onPress={() => router.push(`/house/${house.id}`)}>
          <HouseDoor house={house} openCount={openCountForHouse(todos, house.id)} />
        </Pressable>
      ))}

      {/* Footer */}
      <View style={{ alignItems: "center", paddingTop: 56, paddingBottom: insets.bottom + 48 }}>
        <Text style={{ ...garamond.regular(20), color: colors.inkFaint }}>·</Text>
      </View>
    </ScrollView>
  );
}
