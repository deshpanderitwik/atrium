// Long-pressing a name lifts it off the thread: everything else dims, and the
// pill rises in place — solid orange, white type — widening to show edit and
// delete inside it. It floats over its neighbours rather than pushing them.

import React, { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { brico, night } from "@/theme";
import { NameEntry } from "@/db/thread";
import type { Frame } from "./ThreadList";

const OUT = Easing.bezier(0.25, 0.8, 0.3, 1);

export function LiftedName({
  entry,
  frame,
  onEdit,
  onDelete,
  onDismiss,
}: {
  entry: NameEntry;
  frame: Frame;
  onEdit: () => void;
  onDelete: () => void;
  onDismiss: () => void;
}) {
  const { width: screenW } = useWindowDimensions();
  const [fullWidth, setFullWidth] = useState<number | null>(null);
  const lift = useSharedValue(0);

  // Widen toward the left when the expanded pill would run off the screen.
  const left = fullWidth ? Math.max(12, Math.min(frame.x, screenW - 12 - fullWidth)) : frame.x;

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * lift.value }, { scale: 1 + 0.06 * lift.value }],
    shadowOpacity: 0.7 * lift.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(160)}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Pressable
        onPress={onDismiss}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(14,13,12,0.78)" }}
      />
      <Animated.View
        onLayout={(e) => {
          if (fullWidth == null) {
            setFullWidth(e.nativeEvent.layout.width);
            lift.value = withTiming(1, { duration: 260, easing: OUT });
          }
        }}
        style={[
          {
            position: "absolute",
            top: frame.y,
            left,
            height: frame.height,
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: 12,
            paddingRight: 3,
            borderRadius: 999,
            backgroundColor: night.hot,
            shadowColor: "#000",
            shadowRadius: 15,
            shadowOffset: { width: 0, height: 14 },
          },
          style,
        ]}
      >
        <Text style={{ ...brico(16, "bold"), color: "#fff" }}>{entry.text}</Text>
        <View style={{ flexDirection: "row", gap: 3, marginLeft: 10 }}>
          <Action icon="edit-2" color={night.ink} onPress={onEdit} label="Edit" />
          <Action icon="trash-2" color={night.danger} onPress={onDelete} label="Delete" />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function Action({
  icon,
  color,
  onPress,
  label,
}: {
  icon: "edit-2" | "trash-2";
  color: string;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? color : night.bg,
        transform: [{ scale: pressed ? 1.12 : 1 }],
      })}
    >
      {({ pressed }) => <Feather name={icon} size={14} color={pressed ? night.bg : color} />}
    </Pressable>
  );
}
