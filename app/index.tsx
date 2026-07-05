import React, { useCallback, useEffect, useRef, useState } from "react";
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
const BREATH_SECONDS = 60; // 6 breath cycles of audio
const PERIOD_SECONDS = 70; // + a 10s rest

// The heard audio trails its reported playback position by the device's output
// latency, so after calibration the tap still lands slightly early. This trim
// delays the haptic grid to compensate — tune to taste.
const HAPTIC_TRIM_MS = 45;

const HOLD_MS = 220; // a press sustained beyond this = hold-to-breathe
const DOUBLE_TAP_MS = 300; // two taps within this = hands-free toggle

type Phase = "in" | "out" | "rest";

// Arrive — the single home screen. Guiding text, a press-and-hold breath orb
// (4 in / 6 out with plucks), and the two paths + reflections entry, all at
// once. The breath is available but never gates anything.
export default function Arrive() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [line, setLine] = useState(pickGuidingLine);
  const [breathing, setBreathing] = useState(false);
  const [phase, setPhase] = useState<Phase>("in");

  const scale = useSharedValue(1);
  const startRef = useRef(0);
  const heldRef = useRef(0);
  const beatRef = useRef(0);
  const holdingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calibRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Gesture state: hold vs. double-tap (hands-free).
  const modeRef = useRef<"hold" | "free" | null>(null);
  const breathingRef = useRef(false);
  const pressedRef = useRef(false);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);
  const breathAudio = useBreathAudio();

  const stopTick = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (calibRef.current) {
      clearTimeout(calibRef.current);
      calibRef.current = null;
    }
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  // Shift the beat grid so it lands on the audio's true onset rather than the
  // press moment (audio has output latency; haptics don't).
  const calibrateToAudio = () => {
    calibRef.current = setTimeout(async () => {
      const pos = await breathAudio.getPositionMillis();
      const after = Date.now();
      if (!holdingRef.current || pos == null || pos <= 0) return;
      const audioStart = after - pos + HAPTIC_TRIM_MS;
      // only apply a sane correction
      if (Math.abs(audioStart - startRef.current) < 500) {
        startRef.current = audioStart;
      }
    }, 350);
  };

  const startBreathAnim = useCallback(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: INHALE_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: EXHALE_MS, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [scale]);

  const stopBreathAnim = useCallback(() => {
    cancelAnimation(scale);
    scale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
  }, [scale]);

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
        holdingRef.current = false;
        breathingRef.current = false;
        modeRef.current = null;
        pressedRef.current = false;
        lastTapRef.current = 0;
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

  // One self-correcting beat per second across the 70s period: breath-phase
  // haptics during the 60s of breathing, a tap on each of the 10 rest seconds.
  const handleBeat = useCallback(
    (b: number) => {
      const pos = b % PERIOD_SECONDS; // 0..69
      if (pos < BREATH_SECONDS) {
        // Breath: drive the visual phase only — no haptics during breathing.
        const local = pos % 10;
        if (pos === 0) {
          setPhase("in");
          if (b > 0) startBreathAnim(); // breath resumes after a rest
        } else if (local === 0) {
          setPhase("in");
        } else if (local === 4) {
          setPhase("out");
        }
      } else {
        if (pos === BREATH_SECONDS) {
          setPhase("rest");
          stopBreathAnim();
        }
        haptics.light(); // haptics only mark the rest seconds
      }
    },
    [startBreathAnim, stopBreathAnim],
  );

  const startBreath = (mode: "hold" | "free") => {
    modeRef.current = mode;
    breathingRef.current = true;
    startRef.current = Date.now() + HAPTIC_TRIM_MS;
    holdingRef.current = true;
    setPhase("in");
    setBreathing(true);
    breathAudio.start();
    startBreathAnim();
    calibrateToAudio();
    beatRef.current = 0;
    const tick = () => {
      handleBeat(beatRef.current);
      beatRef.current += 1;
      const nextAt = startRef.current + beatRef.current * 1000;
      timeoutRef.current = setTimeout(tick, Math.max(0, nextAt - Date.now()));
    };
    tick(); // beat 0 fires immediately (start of the inhale)
  };

  const stopBreath = () => {
    modeRef.current = null;
    breathingRef.current = false;
    holdingRef.current = false;
    stopTick();
    breathAudio.stop();
    heldRef.current = Math.round((Date.now() - startRef.current) / 1000);
    stopBreathAnim();
    setBreathing(false);
  };

  // Press-and-hold breathes while held; a sustained press past HOLD_MS starts
  // it, releasing stops it. A quick double-tap toggles a hands-free session.
  const onPressIn = () => {
    pressedRef.current = true;
    if (!breathingRef.current) {
      holdTimeoutRef.current = setTimeout(() => {
        if (pressedRef.current && !breathingRef.current) startBreath("hold");
      }, HOLD_MS);
    }
  };

  const onPressOut = () => {
    pressedRef.current = false;
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (modeRef.current === "hold") {
      stopBreath(); // hold released
      return;
    }
    // short press → tap; two quick taps toggle the hands-free session
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      if (breathingRef.current) stopBreath();
      else startBreath("free");
    } else {
      lastTapRef.current = now;
    }
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
