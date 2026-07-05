import React, { useEffect, useRef, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, garamond, mono } from "@/theme";
import { haptics } from "@/lib/haptics";
import { pickGuidingLine } from "@/lib/guidance";
import { useBreathAudio } from "@/lib/useBreathAudio";

type Mode = "idle" | "breathing" | "choose";
const INHALE_MS = 4000;
const EXHALE_MS = 6000;
const CYCLE_MS = INHALE_MS + EXHALE_MS;

// Arrive — the new root. Guiding text pulls you to the body; press and hold the
// orb to breathe (4 in / 6 out) for as long as you like; on release, choose to
// reflect or to perform a task.
export default function Arrive() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [line, setLine] = useState(pickGuidingLine);
  const [mode, setMode] = useState<Mode>("idle");
  const [phase, setPhase] = useState<"in" | "out">("in");

  const scale = useSharedValue(1);
  const startRef = useRef(0);
  const phaseRef = useRef<"in" | "out">("in");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathAudio = useBreathAudio();

  const stopTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  useEffect(
    () => () => {
      stopTick();
      cancelAnimation(scale);
    },
    [scale],
  );

  // Returning to the app lands on a fresh, idle gate with a new guiding line.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        stopTick();
        breathAudio.stop();
        cancelAnimation(scale);
        scale.value = 1;
        setMode("idle");
        setPhase("in");
        setLine(pickGuidingLine());
      }
    });
    return () => sub.remove();
  }, [scale]);

  const onPressIn = () => {
    startRef.current = Date.now();
    phaseRef.current = "in";
    setPhase("in");
    setMode("breathing");
    haptics.light();
    breathAudio.start();
    scale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: INHALE_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: EXHALE_MS, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    stopTick();
    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) % CYCLE_MS;
      const next = elapsed < INHALE_MS ? "in" : "out";
      if (next !== phaseRef.current) {
        phaseRef.current = next;
        setPhase(next);
        haptics.soft();
      }
    }, 150);
  };

  const onPressOut = () => {
    stopTick();
    breathAudio.stop();
    cancelAnimation(scale);
    scale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    setMode("choose");
  };

  const orbLabel = mode === "breathing" ? phase : "arrive";
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const goReflect = () => {
    const held = Math.round((Date.now() - startRef.current) / 1000);
    router.push({ pathname: "/reflect", params: { held: String(held) } });
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        paddingHorizontal: 32,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 24,
      }}
    >
      {/* Guiding text */}
      <View style={{ flex: 1, justifyContent: "flex-end", alignItems: "center" }}>
        <Text
          style={{
            ...garamond.italic(23),
            color: mode === "breathing" ? colors.inkFaint : colors.ink,
            textAlign: "center",
            lineHeight: 32,
          }}
        >
          {line}
        </Text>
      </View>

      {/* Breath orb / press-and-hold target */}
      <View style={{ flex: 1.4, alignItems: "center", justifyContent: "center" }}>
        <Pressable onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={24}>
          <Animated.View
            style={[
              {
                width: 150,
                height: 150,
                borderRadius: 75,
                borderWidth: 1.5,
                borderColor: colors.oxblood,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.paperWarm,
              },
              orbStyle,
            ]}
          >
            <Text style={{ ...mono(13, 4), color: colors.ink }}>{orbLabel}</Text>
          </Animated.View>
        </Pressable>

        {/* Reserve the hint's space always so the orb never reflows/nudges. */}
        <Text
          style={{
            ...mono(10, 2),
            color: colors.inkFaint,
            marginTop: 28,
            opacity: mode === "idle" ? 1 : 0,
          }}
        >
          press · hold · breathe
        </Text>
      </View>

      {/* Choices (after release) + a quiet entry to past reflections */}
      <View style={{ flex: 1, justifyContent: "flex-start", alignItems: "center" }}>
        {mode === "choose" ? (
          <View style={{ width: "100%", alignItems: "center", gap: 14 }}>
            <ChoiceButton label="reflect" onPress={goReflect} />
            <ChoiceButton label="perform a task" onPress={() => router.push("/atrium")} />
          </View>
        ) : null}
        {mode !== "breathing" ? (
          <Pressable
            onPress={() => router.push("/reflections")}
            hitSlop={12}
            style={{ position: "absolute", bottom: 0 }}
          >
            <Text style={{ ...mono(10, 3), color: colors.inkFaint }}>reflections</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ChoiceButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "100%",
        maxWidth: 280,
        borderWidth: 1,
        borderColor: colors.rule,
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: "center",
      }}
    >
      <Text style={{ ...mono(12, 3), color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}
