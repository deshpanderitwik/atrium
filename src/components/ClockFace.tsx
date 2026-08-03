import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { colors, mono } from "@/theme";

// Whole hours remaining until midnight.
function hoursUntilMidnight(now: Date): number {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0); // next midnight
  return Math.floor((end.getTime() - now.getTime()) / 3_600_000);
}

// A hand (or tick) is a bar inside a full-size, center-aligned container; the
// bar hangs from the clock's center, and rotating the container spins it about
// that center — no transform-origin math needed.
function Spoke({
  size,
  length,
  width,
  color,
  angle,
  fromTop = false,
}: {
  size: number;
  length: number;
  width: number;
  color: string;
  angle: number;
  fromTop?: boolean; // ticks hang from the rim; hands rise from the center
}) {
  const center = size / 2;
  return (
    <View
      style={{
        position: "absolute",
        width: size,
        height: size,
        alignItems: "center",
        transform: [{ rotate: `${angle}deg` }],
      }}
      pointerEvents="none"
    >
      <View
        style={{
          width,
          height: length,
          borderRadius: width / 2,
          backgroundColor: color,
          marginTop: fromTop ? 5 : center - length,
        }}
      />
    </View>
  );
}

// A minimal analog clock face — hour/minute/second hands ticking once a second,
// twelve rim ticks, and a small center cap. Self-contained: owns its interval.
export function ClockFace({ size = 120 }: { size?: number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const s = now.getSeconds();
  const m = now.getMinutes();
  const h = now.getHours();
  const r = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: 12 }).map((_, i) => {
        const major = i % 3 === 0;
        return (
          <Spoke
            key={i}
            size={size}
            length={major ? 8 : 4}
            width={major ? 2 : 1}
            color={major ? colors.inkSoft : colors.inkFaint}
            angle={i * 30}
            fromTop
          />
        );
      })}
      <Spoke size={size} length={r * 0.5} width={3.5} color={colors.ink} angle={(h % 12) * 30 + m * 0.5} />
      <Spoke size={size} length={r * 0.72} width={2.5} color={colors.ink} angle={m * 6 + s * 0.1} />
      <Spoke size={size} length={r * 0.82} width={1.5} color={colors.oxblood} angle={s * 6} />
      <View
        style={{
          position: "absolute",
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: colors.oxblood,
          top: r - 3.5,
          left: r - 3.5,
        }}
      />
    </View>
  );
}

// A "draining" level inside the orb: full at midnight, emptying to nothing by
// the next midnight. The wash marks time remaining; the clear space above it is
// how much of the day has already passed. Meant to sit behind the clock hands,
// clipped by the orb's rounded edge (parent needs overflow: "hidden").
export function DayFill() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const elapsed = (now.getTime() - start.getTime()) / 86_400_000; // 0..1
  const remaining = Math.max(0, Math.min(1, 1 - elapsed));

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: `${remaining * 100}%`,
        backgroundColor: colors.oxblood + "33", // ~20% warm wash
      }}
    />
  );
}

// The label under the orb: how many whole hours remain before the day ends.
export function HoursLeftLabel({ dimmed = false }: { dimmed?: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const left = hoursUntilMidnight(now);
  const label =
    left <= 0 ? "less than an hour left" : left === 1 ? "1 hour left" : `${left} hours left`;

  return (
    <Text style={{ ...mono(11, 2), color: colors.inkFaint, opacity: dimmed ? 0 : 1 }}>
      {label}
    </Text>
  );
}
