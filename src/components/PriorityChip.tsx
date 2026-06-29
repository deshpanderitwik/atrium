import React, { useRef, useState } from "react";
import { Dimensions, Modal, Pressable, Text, View } from "react-native";
import { colors, mono } from "@/theme";
import { haptics } from "@/lib/haptics";
import { PRIORITIES, Priority, priorityLabel } from "@/db/types";

const MENU_WIDTH = 150;
const ITEM_HEIGHT = 44;
const MENU_PAD = 12;
const GAP = 6;

// Ported from PriorityChip.swift — a bordered label that opens a small menu of
// P0–P3 with a checkmark on the current value. The menu pops up anchored to the
// chip rather than centered on screen.
export function PriorityChip({
  priority,
  onChange,
}: {
  priority: Priority;
  onChange: (p: Priority) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const triggerRef = useRef<View>(null);

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  };

  const select = (p: Priority) => {
    setOpen(false);
    if (p !== priority) {
      haptics.selection();
      onChange(p);
    }
  };

  // Position the menu under the chip, flipping above if it would overflow the
  // bottom, and right-aligned to the chip but clamped within the screen.
  const screen = Dimensions.get("window");
  const menuHeight = ITEM_HEIGHT * PRIORITIES.length + MENU_PAD;
  let top = anchor.y + anchor.h + GAP;
  if (top + menuHeight > screen.height - 16) {
    top = Math.max(16, anchor.y - menuHeight - GAP);
  }
  let left = anchor.x + anchor.w - MENU_WIDTH;
  if (left < 8) left = 8;
  if (left + MENU_WIDTH > screen.width - 8) left = screen.width - 8 - MENU_WIDTH;

  return (
    <>
      <Pressable ref={triggerRef} onPress={openMenu} hitSlop={6}>
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
          <View
            style={{
              position: "absolute",
              top,
              left,
              width: MENU_WIDTH,
              backgroundColor: colors.paperWarm,
              borderWidth: 1,
              borderColor: colors.rule,
              borderRadius: 8,
              paddingVertical: 6,
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
        </Pressable>
      </Modal>
    </>
  );
}
