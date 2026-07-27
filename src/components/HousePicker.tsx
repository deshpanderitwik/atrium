import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, garamond, mono } from "@/theme";
import { haptics } from "@/lib/haptics";
import { HOUSES, houseById } from "@/houses";

// The house a new task is assigned to. Shows the current house as a small pill;
// tapping opens a list of all twelve to choose from.
export function HousePicker({
  houseID,
  onChange,
}: {
  houseID: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const house = houseById(houseID);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={6}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.rule,
            borderRadius: 3,
            paddingHorizontal: 9,
            paddingVertical: 4,
          }}
        >
          <Text style={{ ...mono(11, 1), color: colors.inkSoft }}>
            {house ? house.name.toLowerCase() : "house"}
          </Text>
          <Feather name="chevron-down" size={11} color={colors.inkFaint} style={{ marginLeft: 4 }} />
        </View>
      </Pressable>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: 260,
              maxHeight: "72%",
              backgroundColor: colors.paperWarm,
              borderWidth: 1,
              borderColor: colors.rule,
              borderRadius: 14,
              paddingVertical: 8,
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {HOUSES.map((h) => (
                <Pressable
                  key={h.id}
                  onPress={() => {
                    haptics.selection();
                    onChange(h.id);
                    setOpen(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ ...garamond.regular(19), color: colors.ink }}>{h.name}</Text>
                  {h.id === houseID ? (
                    <Text style={{ color: colors.oxblood, fontSize: 15 }}>✓</Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
