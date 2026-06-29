import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, garamond } from "@/theme";
import { haptics } from "@/lib/haptics";
import { useTodos } from "@/db/store";
import { starredOpen } from "@/db/selectors";
import { houseById } from "@/houses";
import { TodoCheckbox } from "./TodoCheckbox";

// Ported from StarredStrip.swift — pinned open todos across all houses; hidden
// when empty. Tap a row to jump to its house, or tap the checkbox to complete
// it right from the home screen (which removes it from the strip).
export function StarredStrip() {
  const router = useRouter();
  const { todos, toggleDone } = useTodos();
  const starred = starredOpen(todos);

  if (starred.length === 0) return null;

  return (
    <View style={{ paddingBottom: 32 }}>
      {starred.map((t) => {
        const house = houseById(t.houseID);
        return (
          <View
            key={t.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderBottomWidth: 1,
              borderBottomColor: colors.rule + "80",
            }}
          >
            <TodoCheckbox
              done={false}
              onPress={() => {
                haptics.success();
                toggleDone(t.id);
              }}
            />
            <Pressable
              onPress={() => router.push(`/house/${t.houseID}`)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: colors.oxblood, fontSize: 12, marginRight: 8 }}>
                ★
              </Text>
              <Text
                numberOfLines={1}
                style={{ ...garamond.regular(18), color: colors.ink, flex: 1 }}
              >
                {t.text}
              </Text>
              <Text
                style={{ ...garamond.italic(15), color: colors.inkFaint, marginLeft: 8 }}
              >
                {house?.name ?? ""}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
