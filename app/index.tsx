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

const INHALE_MS = 4000;
const EXHALE_MS = 6000;
const CYCLE_MS = INHALE_MS + EXHALE_MS;

// Arrive — the single home screen. Guiding text, a press-and-hold breath orb
// (4 in / 6 out with plucks), and the two paths + reflections entry, all at
// once. The breath is available but never gates anything.
export default function Arrive() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [line, setLine] = useState(pickGuidingLine);
  const [breathing, setBreathing] = useState(false);
  const [phase, setPhase] = useState<"in" | "out">("in");

  const scale = useSharedValue(1);
  const startRef = useRef(0);
  const heldRef = useRef(0);
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

  // Returning to the app resets a fresh, settled gate with a new guiding line.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        stopTick();
        breathAudio.stop();
        cancelAnimation(scale);
        scale.value = 1;
        setBreathing(false);
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
    setBreathing(true);
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
    heldRef.current = Math.round((Date.now() - startRef.current) / 1000);
    cancelAnimation(scale);
    scale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    setBreathing(false);
  };

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const goReflect = () => {
    const held = heldRef.current;
    router.push(
      held > 0 ? { pathname: "/reflect", params: { held: String(held) } } : "/reflect",
    );
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        paddingHorizontal: 32,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 20,
      }}
    >
      {/* Text · orb · buttons, with equal spacers above and below the orb */}
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text
          style={{
            ...garamond.italic(23),
            color: breathing ? colors.inkFaint : colors.ink,
            textAlign: "center",
            lineHeight: 32,
            marginTop: 44,
          }}
        >
          {line}
        </Text>

        <View style={{ flex: 1 }} />

        <Pressable onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={24}>
          <Animated.View
            style={[
              {
                width: 140,
                height: 140,
                borderRadius: 70,
                borderWidth: 1.5,
                borderColor: colors.oxblood,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.paperWarm,
              },
              orbStyle,
            ]}
          >
            <Text style={{ ...mono(13, 4), color: colors.ink }}>
              {breathing ? phase : "arrive"}
            </Text>
          </Animated.View>
        </Pressable>

        <View style={{ flex: 1 }} />

        <View style={{ width: "100%", alignItems: "center", gap: 12 }}>
          <ChoiceButton label="reflect" onPress={goReflect} />
          <ChoiceButton label="perform a task" onPress={() => router.push("/atrium")} />
        </View>
      </View>

      {/* Reflections footer */}
      <Pressable
        onPress={() => router.push("/reflections")}
        hitSlop={12}
        style={{ alignSelf: "center", paddingTop: 16 }}
      >
        <Text style={{ ...mono(10, 3), color: colors.inkFaint }}>reflections</Text>
      </Pressable>
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
