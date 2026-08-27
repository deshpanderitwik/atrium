import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, garamond, mono } from "@/theme";
import { DAY_MS, startOfDay } from "@/lib/cadence";

const DOT = 12;
const GAP = 3;

// A personal 90-day commitment, anchored to a fixed start so it marks this
// specific window rather than recurring every July.
const COMMIT_YEAR = 2026;
const COMMIT_MONTH = 6; // July (0-based)
const COMMIT_DAY = 21;
const COMMIT_DAYS = 90;

const fmtDay = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toLowerCase();

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

  // The commitment window mapped into this year's day indices.
  const commitStartMs = startOfDay(new Date(COMMIT_YEAR, COMMIT_MONTH, COMMIT_DAY).getTime());
  const commitStartIdx = Math.round((commitStartMs - jan1) / DAY_MS);
  const commitLastMs = commitStartMs + (COMMIT_DAYS - 1) * DAY_MS;
  const showCommit = commitStartIdx < totalDays && commitStartIdx + COMMIT_DAYS > 0;

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
      <Text
        style={{
          ...garamond.italic(17),
          color: colors.inkSoft,
          marginBottom: showCommit ? 4 : 28,
        }}
      >
        day {dayOfYear} of {totalDays}
      </Text>
      {showCommit ? (
        <Text style={{ ...mono(10, 2), color: colors.inkSoft, marginBottom: 28 }}>
          {fmtDay(commitStartMs)} – {fmtDay(commitLastMs)} · a commitment
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: totalDays }).map((_, i) => {
          const isToday = i === todayIndex;
          const isPast = i < todayIndex;
          const isCommit = i >= commitStartIdx && i < commitStartIdx + COMMIT_DAYS;
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
                    ? isCommit
                      ? colors.inkSoft
                      : colors.oxblood
                    : "transparent",
                borderWidth: isToday ? 2 : isPast ? 0 : 1,
                borderColor: isToday
                  ? isCommit
                    ? colors.inkSoft
                    : colors.oxblood
                  : isCommit
                    ? colors.inkSoft
                    : colors.inkFaint,
              }}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}
