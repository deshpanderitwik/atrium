import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, garamond, mono } from "@/theme";
import { haptics } from "@/lib/haptics";
import { useReflections } from "@/db/reflections";
import { startOfDay } from "@/lib/cadence";
import { dayLabel } from "@/db/selectors";

const timeOfDay = (ms: number) =>
  new Date(ms)
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .toLowerCase();

// Left strip reserved for the OS back-swipe — horizontal swipes that begin here
// are ignored so they can pop the screen instead of cycling.
const EDGE = 28;

// Full-read view of a single reflection, with a discreet delete. A horizontal
// swipe anywhere but the left edge cycles to the previous/next reflection.
export default function ReflectionView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reflections, deleteReflection } = useReflections();

  // Track the shown reflection locally so swiping swaps it in place.
  const [currentId, setCurrentId] = useState(id);
  const index = reflections.findIndex((r) => r.id === currentId);
  const reflection = index >= 0 ? reflections[index] : undefined;

  const startX = useSharedValue(0);

  const cycle = (dir: number) => {
    const n = reflections.length;
    if (n <= 1 || index < 0) return;
    const next = (index + dir + n) % n; // wrap around
    haptics.selection();
    setCurrentId(reflections[next].id);
  };

  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20]) // claim horizontal drags
    .failOffsetY([-16, 16]) // yield to vertical scrolling
    .hitSlop({ left: -EDGE }) // keep the left edge free for the back-swipe
    .onBegin((e) => {
      startX.value = e.absoluteX;
    })
    .onEnd((e) => {
      if (startX.value < EDGE) return; // began at the edge → leave it to the OS
      if (Math.abs(e.translationX) < 48) return; // ignore small drags
      // swipe left → next in the list, swipe right → previous
      runOnJS(cycle)(e.translationX < 0 ? 1 : -1);
    });

  if (!reflection) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;

  const remove = async () => {
    haptics.warning();
    await deleteReflection(reflection.id);
    router.back();
  };

  return (
    <GestureDetector gesture={swipe}>
      <ScrollView
        key={currentId} // remount on swap so each reflection opens scrolled to top
        style={{ flex: 1, backgroundColor: colors.paper }}
        contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: insets.bottom + 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + 24, paddingBottom: 20 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={{ ...mono(11, 3), color: colors.inkFaint }}>← reflections</Text>
          </Pressable>
        </View>

        <Text style={{ ...mono(10, 2), color: colors.inkFaint, marginBottom: 24 }}>
          {dayLabel(startOfDay(reflection.createdAt))} · {timeOfDay(reflection.createdAt)}
        </Text>

        <Text style={{ ...garamond.regular(20), color: colors.ink, lineHeight: 31 }}>
          {reflection.body}
        </Text>

        <Pressable onPress={remove} hitSlop={10} style={{ paddingTop: 48 }}>
          <Text style={{ ...mono(10, 2), color: colors.inkFaint }}>delete</Text>
        </Pressable>
      </ScrollView>
    </GestureDetector>
  );
}
