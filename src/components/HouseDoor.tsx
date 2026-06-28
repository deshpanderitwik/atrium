import React from "react";
import { Text, View } from "react-native";
import { colors, garamond, mono } from "@/theme";
import { House } from "@/houses";

// Ported from HouseDoor.swift — name, definition, and open-todo count ("—" at 0).
export function HouseDoor({ house, openCount }: { house: House; openCount: number }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.rule,
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ ...garamond.medium(24), color: colors.ink, marginBottom: 4 }}>
          {house.name}
        </Text>
        <Text style={{ ...garamond.italic(16), color: colors.inkFaint, lineHeight: 22 }}>
          {house.definition}
        </Text>
      </View>
      <Text style={{ ...mono(11, 2), color: colors.inkFaint, paddingTop: 6 }}>
        {openCount === 0 ? "—" : String(openCount)}
      </Text>
    </View>
  );
}
