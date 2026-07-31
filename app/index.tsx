import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Modal, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
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
import { getBoolSetting, setBoolSetting } from "@/lib/settings";
import { DeclaredStrip } from "@/components/DeclaredStrip";

const SILENT_KEY = "breathSilent";

const INHALE_MS = 4000;
const EXHALE_MS = 6000;
const BREATH_SECONDS = 60; // 6 breath cycles of audio
const PERIOD_SECONDS = 70; // + a 10s rest

// The heard audio trails its reported playback position by the device's output
// latency, so after calibration the tap still lands slightly early. This trim
// delays the haptic grid to compensate — tune to taste.
const HAPTIC_TRIM_MS = 45;

const HOLD_MS = 260; // a press sustained beyond this opens the rounds selector

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
  const [roundsModal, setRoundsModal] = useState(false);
  const [rounds, setRounds] = useState(3);
  const [silent, setSilent] = useState(false);

  const scale = useSharedValue(1);
  const startRef = useRef(0);
  const beatRef = useRef(0);
  const holdingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calibRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Gesture state: a single tap starts/stops a session, a long press opens the
  // rounds selector. roundsLimitRef null = run indefinitely.
  const breathingRef = useRef(false);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const roundsLimitRef = useRef<number | null>(null);
  const silentRef = useRef(false);
  const breathAudio = useBreathAudio();

  // Restore the last-used silent preference so it carries across sessions.
  useEffect(() => {
    getBoolSetting(SILENT_KEY).then(setSilent);
  }, []);

  const stopTick = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (calibRef.current) {
      clearTimeout(calibRef.current);
      calibRef.current = null;
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
        longPressFiredRef.current = false;
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        roundsLimitRef.current = null;
        silentRef.current = false;
        stopTick();
        breathAudio.stop();
        cancelAnimation(scale);
        scale.value = 1;
        setBreathing(false);
        setRoundsModal(false);
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
      const silentMode = silentRef.current;
      if (pos < BREATH_SECONDS) {
        const local = pos % 10;
        if (pos === 0) {
          setPhase("in");
          if (b > 0) startBreathAnim(); // breath resumes after a rest
        } else if (local === 0) {
          setPhase("in");
        } else if (local === 4) {
          setPhase("out");
        }
        // Silent mode marks every breath second by touch: a firm double-tap on
        // the inhale, a single soft tap on the exhale. Audio mode uses the
        // plucks (no haptics).
        if (silentMode) {
          if (local < 4) {
            haptics.rigid();
            setTimeout(() => {
              if (breathingRef.current && silentRef.current) haptics.rigid();
            }, 90);
          } else {
            haptics.soft();
          }
        }
      } else {
        if (pos === BREATH_SECONDS) {
          setPhase("rest");
          stopBreathAnim();
        }
        // Audio mode taps out the rest seconds; silent mode's rest is fully quiet.
        if (!silentMode) haptics.rigid();
      }
    },
    [startBreathAnim, stopBreathAnim],
  );

  // rounds === null runs indefinitely; otherwise stop after that many rounds
  // (a round = one 70s period: 60s breath + 10s rest).
  const startBreath = (roundsLimit: number | null, silentMode: boolean) => {
    silentRef.current = silentMode;
    breathingRef.current = true;
    roundsLimitRef.current = roundsLimit;
    startRef.current = Date.now() + HAPTIC_TRIM_MS;
    holdingRef.current = true;
    setPhase("in");
    setBreathing(true);
    if (!silentMode) {
      breathAudio.start();
      calibrateToAudio(); // only needed to sync haptics to audio
    }
    startBreathAnim();
    beatRef.current = 0;
    const tick = () => {
      handleBeat(beatRef.current);
      beatRef.current += 1;
      if (
        roundsLimitRef.current != null &&
        beatRef.current >= roundsLimitRef.current * PERIOD_SECONDS
      ) {
        stopBreath(); // reached the requested number of rounds
        return;
      }
      const nextAt = startRef.current + beatRef.current * 1000;
      timeoutRef.current = setTimeout(tick, Math.max(0, nextAt - Date.now()));
    };
    tick(); // beat 0 fires immediately (start of the inhale)
  };

  const stopBreath = () => {
    breathingRef.current = false;
    roundsLimitRef.current = null;
    silentRef.current = false;
    holdingRef.current = false;
    stopTick();
    breathAudio.stop();
    stopBreathAnim();
    setBreathing(false);
  };

  // A single tap starts or stops a session immediately (running the selected
  // number of rounds, honoring the last-used silent setting); a long press
  // opens the rounds selector instead.
  const onOrbPressIn = () => {
    longPressFiredRef.current = false;
    if (!breathingRef.current && !roundsModal) {
      holdTimeoutRef.current = setTimeout(() => {
        holdTimeoutRef.current = null;
        longPressFiredRef.current = true;
        haptics.rigid();
        setRoundsModal(true);
      }, HOLD_MS);
    }
  };

  const onOrbPressOut = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false; // long press opened the modal; not a tap
      return;
    }
    if (breathingRef.current) stopBreath();
    else startBreath(rounds, silent);
  };

  const beginRounds = () => {
    setRoundsModal(false);
    startBreath(rounds, silent);
  };

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const goReflect = () => {
    router.push("/reflect");
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

        <Pressable onPressIn={onOrbPressIn} onPressOut={onOrbPressOut} hitSlop={24}>
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

        {/* The three declared tasks, under the breath. Recede while breathing
            so nothing competes with the orb. */}
        <DeclaredStrip dimmed={breathing} />

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

      {/* Rounds modal (long-press) */}
      <Modal
        transparent
        visible={roundsModal}
        animationType="fade"
        onRequestClose={() => setRoundsModal(false)}
      >
        <Pressable
          onPress={() => setRoundsModal(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: 260,
              backgroundColor: colors.paperWarm,
              borderWidth: 1,
              borderColor: colors.rule,
              borderRadius: 14,
              paddingVertical: 28,
              paddingHorizontal: 28,
              alignItems: "center",
            }}
          >
            <Text style={{ ...garamond.italic(20), color: colors.ink, marginBottom: 22 }}>
              how many rounds?
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 28,
                marginBottom: 26,
              }}
            >
              <Pressable onPress={() => setRounds((r) => Math.max(1, r - 1))} hitSlop={14}>
                <Feather name="minus" size={22} color={colors.ink} />
              </Pressable>
              <Text
                style={{ ...mono(26, 2), color: colors.ink, minWidth: 44, textAlign: "center" }}
              >
                {rounds}
              </Text>
              <Pressable onPress={() => setRounds((r) => Math.min(20, r + 1))} hitSlop={14}>
                <Feather name="plus" size={22} color={colors.ink} />
              </Pressable>
            </View>

            {/* Silent mode toggle — haptics-only breath, no audio */}
            <Pressable
              onPress={() =>
                setSilent((s) => {
                  const next = !s;
                  setBoolSetting(SILENT_KEY, next);
                  return next;
                })
              }
              hitSlop={8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                marginBottom: 26,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: silent ? colors.oxblood : colors.rule,
                  backgroundColor: silent ? colors.oxblood : "transparent",
                  justifyContent: "center",
                  paddingHorizontal: 2,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: silent ? "#fff" : colors.inkFaint,
                    alignSelf: silent ? "flex-end" : "flex-start",
                  }}
                />
              </View>
              <Text style={{ ...mono(11, 2), color: colors.inkFaint }}>silent</Text>
            </Pressable>

            <Pressable
              onPress={beginRounds}
              style={{
                borderWidth: 1,
                borderColor: colors.rule,
                borderRadius: 10,
                paddingVertical: 14,
                paddingHorizontal: 48,
              }}
            >
              <Text style={{ ...mono(12, 3), color: colors.ink }}>begin</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
