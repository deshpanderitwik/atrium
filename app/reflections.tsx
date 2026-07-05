import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, garamond, mono } from "@/theme";
import { useReflections, Reflection } from "@/db/reflections";
import { startOfDay } from "@/lib/cadence";
import { dayLabel } from "@/db/selectors";
import { DayHeader } from "@/components/DayHeader";

const timeOfDay = (ms: number) =>
  new Date(ms)
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .toLowerCase();

// The reflections timeline — reverse-chronological, grouped by day.
export default function Reflections() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reflections } = useReflections();

  const groups = useMemo(() => {
    const m = new Map<number, Reflection[]>();
    for (const r of reflections) {
      const day = startOfDay(r.createdAt);
      const arr = m.get(day);
      if (arr) arr.push(r);
      else m.set(day, [r]);
    }
    return [...m.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([day, items]) => ({ day, items }));
  }, [reflections]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: insets.bottom + 60 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: insets.top + 24, paddingBottom: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ ...mono(11, 3), color: colors.inkFaint }}>← arrive</Text>
        </Pressable>
      </View>

      <Text style={{ ...garamond.medium(32), color: colors.ink, paddingBottom: 8 }}>
        reflections
      </Text>

      {reflections.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 80 }}>
          <Text style={{ ...garamond.italic(16), color: colors.inkFaint }}>
            nothing written yet
          </Text>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.day}>
            <DayHeader day={group.day} />
            {group.items.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/reflection/${r.id}`)}
                style={{
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.rule + "80",
                }}
              >
                <Text style={{ ...mono(9, 1.5), color: colors.inkFaint, marginBottom: 6 }}>
                  {timeOfDay(r.createdAt)}
                </Text>
                <Text
                  numberOfLines={2}
                  style={{ ...garamond.regular(18), color: colors.ink, lineHeight: 26 }}
                >
                  {r.body}
                </Text>
              </Pressable>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}
