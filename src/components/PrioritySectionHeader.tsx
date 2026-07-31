import React from "react";
import { Text } from "react-native";
import { colors, mono } from "@/theme";

// Ported from PrioritySectionHeader.swift.
export function PrioritySectionHeader({
  label,
  topPadding = 22,
  bottomPadding = 6,
}: {
  label: string;
  topPadding?: number;
  bottomPadding?: number;
}) {
  return (
    <Text
      style={{
        ...mono(11, 3),
        color: colors.inkFaint,
        paddingLeft: 12,
        paddingTop: topPadding,
        paddingBottom: bottomPadding,
      }}
    >
      {label}
    </Text>
  );
}
