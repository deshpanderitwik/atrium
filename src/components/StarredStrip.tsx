import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, garamond } from "@/theme";
import { useTodos } from "@/db/store";
import { starredOpen } from "@/db/selectors";
import { houseById } from "@/houses";

// Ported from StarredStrip.swift — pinned open todos across all houses; hidden
// when empty; tapping a row jumps to its owning house.
export function StarredStrip() {
  const router = useRouter();
  const { todos } = useTodos();
  const starred = starredOpen(todos);

  if (starred.length === 0) return null;

  return (
    <View style={{ paddingBottom: 32 }}>
      {starred.map((t) => {
        const house = houseById(t.houseID);
        return (
          <Pressable
            key={t.id}
            onPress={() => router.push(`/house/${t.houseID}`)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 9,
              borderBottomWidth: 1,
              borderBottomColor: colors.rule + "80",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, marginRight: 8 }}>★</Text>
            <Text
              numberOfLines={1}
              style={{ ...garamond.regular(18), color: colors.ink, flex: 1 }}
            >
              {t.text}
            </Text>
            <Text style={{ ...garamond.italic(15), color: colors.inkFaint, marginLeft: 8 }}>
              {house?.name ?? ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
