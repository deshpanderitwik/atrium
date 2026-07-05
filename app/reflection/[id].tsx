import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
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

// Full-read view of a single reflection, with a discreet delete.
export default function ReflectionView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reflections, deleteReflection } = useReflections();

  const reflection = reflections.find((r) => r.id === id);
  if (!reflection) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;

  const remove = async () => {
    haptics.warning();
    await deleteReflection(reflection.id);
    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: insets.bottom + 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: insets.top + 24, paddingBottom: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ ...mono(11, 3), color: colors.inkFaint }}>← reflections</Text>
        </Pressable>
      </View>

      <Text style={{ ...mono(10, 2), color: colors.inkFaint, marginBottom: 4 }}>
        {dayLabel(startOfDay(reflection.createdAt))} · {timeOfDay(reflection.createdAt)}
      </Text>
      {reflection.heldSeconds ? (
        <Text style={{ ...mono(9, 1), color: colors.inkFaint, marginBottom: 20 }}>
          breathed {reflection.heldSeconds}s
        </Text>
      ) : (
        <View style={{ height: 20 }} />
      )}

      <Text style={{ ...garamond.regular(20), color: colors.ink, lineHeight: 31 }}>
        {reflection.body}
      </Text>

      <Pressable onPress={remove} hitSlop={10} style={{ paddingTop: 48 }}>
        <Text style={{ ...mono(10, 2), color: colors.inkFaint }}>delete</Text>
      </Pressable>
    </ScrollView>
  );
}
