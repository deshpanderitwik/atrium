import React from "react";
import { Text } from "react-native";
import { colors, garamond } from "@/theme";
import { dayLabel } from "@/db/selectors";

// Ported from DayHeader.swift — today / yesterday / monday 12 may / 12 may 2024.
export function DayHeader({ day }: { day: number }) {
  return (
    <Text
      style={{
        ...garamond.italic(16),
        color: colors.inkFaint,
        paddingLeft: 12,
        paddingTop: 12,
        paddingBottom: 4,
      }}
    >
      {dayLabel(day)}
    </Text>
  );
}
