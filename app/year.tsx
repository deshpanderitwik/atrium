import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, garamond, mono } from "@/theme";
import { DAY_MS, startOfDay } from "@/lib/cadence";

const DOT = 12;
const GAP = 3;

// The year as a field of days — one circle per day, filled for days already
// spent, an accented dot for today, faint rings for the days still ahead.
// Reached by tapping the "hours left" label on Arrive.
export default function Year() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const now = new Date();
  const year = now.getFullYear();
  const jan1 = startOfDay(new Date(year, 0, 1).getTime());
  const nextJan1 = startOfDay(new Date(year + 1, 0, 1).getTime());
  const totalDays = Math.round((nextJan1 - jan1) / DAY_MS);
  const todayIndex = Math.round((startOfDay(now.getTime()) - jan1) / DAY_MS); // 0-based
  const dayOfYear = todayIndex + 1;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: insets.bottom + 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: insets.top + 24, paddingBottom: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ ...mono(11, 3), color: colors.inkFaint }}>← arrive</Text>
        </Pressable>
      </View>

      <Text style={{ ...garamond.medium(38), color: colors.ink, marginBottom: 6 }}>{year}</Text>
      <Text style={{ ...garamond.italic(17), color: colors.inkSoft, marginBottom: 28 }}>
        day {dayOfYear} of {totalDays}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: totalDays }).map((_, i) => {
          const isToday = i === todayIndex;
          const isPast = i < todayIndex;
          return (
            <View
              key={i}
              style={{
                width: DOT,
                height: DOT,
                borderRadius: DOT / 2,
                margin: GAP,
                backgroundColor: isToday
                  ? colors.ink
                  : isPast
                    ? colors.oxblood
                    : "transparent",
                borderWidth: isToday ? 2 : isPast ? 0 : 1,
                borderColor: isToday ? colors.oxblood : colors.inkFaint,
              }}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}
