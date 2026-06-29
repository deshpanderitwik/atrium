import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { colors, mono } from "@/theme";
import { haptics } from "@/lib/haptics";
import { PRIORITIES, Priority, priorityLabel } from "@/db/types";

// Ported from PriorityChip.swift — a bordered label that opens a small menu of
// P0–P3 with a checkmark on the current value.
export function PriorityChip({
  priority,
  onChange,
}: {
  priority: Priority;
  onChange: (p: Priority) => void;
}) {
  const [open, setOpen] = useState(false);

  const select = (p: Priority) => {
    setOpen(false);
    if (p !== priority) {
      haptics.selection();
      onChange(p);
    }
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={6}>
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.rule,
            borderRadius: 3,
            paddingHorizontal: 8,
            paddingVertical: 4,
            minWidth: 34,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              ...mono(12, 1.4),
              color: colors.inkFaint,
              textAlign: "center",
              // offset the trailing letter-spacing so the glyphs sit centered
              paddingLeft: 1.4,
            }}
          >
            {priorityLabel(priority)}
          </Text>
        </View>
      </Pressable>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <View
              style={{
                backgroundColor: colors.paperWarm,
                borderWidth: 1,
                borderColor: colors.rule,
                borderRadius: 8,
                paddingVertical: 6,
                minWidth: 160,
              }}
            >
              {PRIORITIES.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => select(p)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ ...mono(13, 1.4), color: colors.ink }}>
                    {priorityLabel(p)}
                  </Text>
                  {p === priority ? (
                    <Text style={{ color: colors.oxblood, fontSize: 14 }}>✓</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
