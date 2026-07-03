import React, { useRef, useState } from "react";
import { Dimensions, Modal, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, mono } from "@/theme";
import { haptics } from "@/lib/haptics";
import { humanizeCadence } from "@/lib/cadence";

const MENU_WIDTH = 200;
const GAP = 6;

// Replaces the old priority chip. Shows a task's recurrence and opens an
// anchored popover to set it: once / daily / weekly / custom "every N days".
export function RecurrenceChip({
  cadenceDays,
  onChange,
}: {
  cadenceDays: number;
  onChange: (days: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [draft, setDraft] = useState(cadenceDays > 0 ? cadenceDays : 3);
  const triggerRef = useRef<View>(null);

  const recurring = cadenceDays > 0;

  const openMenu = () => {
    setDraft(cadenceDays > 0 ? cadenceDays : 3);
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  };

  const pick = (days: number) => {
    haptics.selection();
    onChange(days);
    setOpen(false);
  };

  const step = (delta: number) => {
    const next = Math.max(1, draft + delta);
    setDraft(next);
    haptics.selection();
    onChange(next); // live — keep the popover open for more adjustments
  };

  const screen = Dimensions.get("window");
  const menuHeight = 260;
  let top = anchor.y + anchor.h + GAP;
  if (top + menuHeight > screen.height - 16) {
    top = Math.max(16, anchor.y - menuHeight - GAP);
  }
  let left = anchor.x + anchor.w - MENU_WIDTH;
  if (left < 8) left = 8;
  if (left + MENU_WIDTH > screen.width - 8) left = screen.width - 8 - MENU_WIDTH;

  const rowStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
  };

  return (
    <>
      <Pressable ref={triggerRef} onPress={openMenu} hitSlop={6}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.rule,
            borderRadius: 3,
            paddingHorizontal: 7,
            paddingVertical: 4,
            minWidth: 34,
            justifyContent: "center",
          }}
        >
          <Feather
            name="repeat"
            size={11}
            color={recurring ? colors.oxblood : colors.inkFaint}
          />
          {recurring ? (
            <Text style={{ ...mono(11, 1), color: colors.inkFaint, marginLeft: 5 }}>
              {humanizeCadence(cadenceDays)}
            </Text>
          ) : null}
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
            <Pressable style={rowStyle} onPress={() => pick(0)}>
              <Text style={{ ...mono(13, 1), color: colors.ink }}>once</Text>
              {!recurring ? (
                <Text style={{ color: colors.oxblood, fontSize: 14 }}>✓</Text>
              ) : null}
            </Pressable>

            <View style={{ height: 1, backgroundColor: colors.rule, marginVertical: 2 }} />

            <Pressable style={rowStyle} onPress={() => pick(1)}>
              <Text style={{ ...mono(13, 1), color: colors.ink }}>daily</Text>
              {cadenceDays === 1 ? (
                <Text style={{ color: colors.oxblood, fontSize: 14 }}>✓</Text>
              ) : null}
            </Pressable>
            <Pressable style={rowStyle} onPress={() => pick(7)}>
              <Text style={{ ...mono(13, 1), color: colors.ink }}>weekly</Text>
              {cadenceDays === 7 ? (
                <Text style={{ color: colors.oxblood, fontSize: 14 }}>✓</Text>
              ) : null}
            </Pressable>

            <View style={{ height: 1, backgroundColor: colors.rule, marginVertical: 2 }} />

            {/* custom "every N days" stepper */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Text style={{ ...mono(12, 1), color: colors.inkFaint }}>every</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Pressable onPress={() => step(-1)} hitSlop={8}>
                  <Feather name="minus" size={16} color={colors.ink} />
                </Pressable>
                <Text
                  style={{
                    ...mono(13, 1),
                    color: colors.ink,
                    minWidth: 52,
                    textAlign: "center",
                  }}
                >
                  {draft}d
                </Text>
                <Pressable onPress={() => step(1)} hitSlop={8}>
                  <Feather name="plus" size={16} color={colors.ink} />
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
