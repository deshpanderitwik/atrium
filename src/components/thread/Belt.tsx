// The belt: one surface at the bottom of the thread that becomes whatever the
// moment needs. At rest it is a composer — breathe · text box · send. Tapping
// breathe opens the breath setup in place; starting rises it over the thread as
// the session dock; ending sinks it back.

import React, { forwardRef, useEffect, useMemo, useRef } from "react";
import { Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  SharedValue,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { brico, label, night } from "@/theme";
import { BreathConfig, BreathPattern, PATTERNS, clock } from "@/lib/breath";
import type { BreathPhase } from "@/lib/useBreathSession";

const OUT = Easing.bezier(0.25, 0.8, 0.3, 1);
const MORPH = LinearTransition.duration(340).easing(Easing.bezierFn(0.25, 0.8, 0.3, 1));
const BTN = 54;
const PAD = 6;

export type BeltMode = "compose" | "setup" | "dock";

type Props = {
  mode: BeltMode;
  // compose
  text: string;
  onChangeText: (t: string) => void;
  onSend: (submitted?: string) => void;
  onOpenSetup: () => void;
  focused: boolean;
  onFocusChange: (f: boolean) => void;
  editing: boolean;
  warn: number; // bumps on each empty send; 0 once typing resumes
  // setup
  config: BreathConfig;
  onConfig: (patch: Partial<BreathConfig>) => void;
  onStart: () => void;
  onCloseSetup: () => void;
  // dock
  phase: BreathPhase;
  elapsed: number;
  round: number;
  restLeft: number;
  scale: SharedValue<number>;
  onEnd: () => void;
};

export const Belt = forwardRef<TextInput, Props>(function Belt(p, inputRef) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const keyboard = useAnimatedKeyboard();
  const rest = Math.max(insets.bottom, 12) + 8;

  // Ride on top of the keyboard while it is up.
  const lift = useAnimatedStyle(() => ({
    bottom: Math.max(keyboard.height.value + 8, rest),
  }));

  const dockHeight = screenH - insets.top - 12 - rest;

  // The outer view only tracks the keyboard; the inner one morphs between modes,
  // growing upward from the bottom edge.
  return (
    <Animated.View style={[{ position: "absolute", left: 10, right: 10 }, lift]}>
      <Animated.View
        layout={MORPH}
        style={{
          borderRadius: p.mode === "compose" ? (BTN + PAD * 2) / 2 : 34,
          backgroundColor: p.mode === "dock" ? night.dock : night.panel,
          overflow: "hidden",
          height: p.mode === "dock" ? dockHeight : undefined,
        }}
      >
        {p.mode === "compose" && <Composer {...p} ref={inputRef} />}
        {p.mode === "setup" && <Setup {...p} />}
        {p.mode === "dock" && <Dock {...p} />}
      </Animated.View>
    </Animated.View>
  );
});

const Composer = forwardRef<TextInput, Props>(function Composer(p, ref) {
  const breatheW = useSharedValue(BTN);
  const shake = useSharedValue(0);

  useEffect(() => {
    breatheW.value = withTiming(p.focused ? 0 : BTN, { duration: 280, easing: OUT });
  }, [p.focused, breatheW]);

  useEffect(() => {
    if (p.warn) {
      shake.value = withSequence(
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(-3, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
  }, [p.warn, shake]);

  const breatheStyle = useAnimatedStyle(() => ({
    width: breatheW.value,
    marginRight: (breatheW.value / BTN) * PAD,
    opacity: breatheW.value / BTN,
    transform: [{ scale: 0.4 + 0.6 * (breatheW.value / BTN) }],
  }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const empty = !p.text.trim();

  return (
    <Animated.View
      entering={FadeIn.delay(90).duration(220)}
      exiting={FadeOut.duration(80)}
      style={{ flexDirection: "row", alignItems: "center", padding: PAD }}
    >
      <Animated.View style={[{ height: BTN, overflow: "hidden" }, breatheStyle]}>
        <Pressable
          onPress={p.onOpenSetup}
          accessibilityLabel="Breathe"
          style={{
            width: BTN,
            height: BTN,
            borderRadius: BTN / 2,
            backgroundColor: night.hot,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff" }} />
        </Pressable>
      </Animated.View>
      <Animated.View style={[{ flex: 1 }, shakeStyle]}>
        <TextInput
          ref={ref}
          value={p.text}
          onChangeText={p.onChangeText}
          onFocus={() => p.onFocusChange(true)}
          onBlur={() => p.onFocusChange(false)}
          onSubmitEditing={(e) => p.onSend(e.nativeEvent.text)}
          submitBehavior="submit"
          returnKeyType={p.editing ? "done" : "send"}
          placeholder={p.warn && !p.text ? "type a name first" : p.editing ? "rename" : "what do you see"}
          placeholderTextColor={p.warn && !p.text ? night.danger : night.faint}
          keyboardAppearance="dark"
          autoCapitalize="none"
          selectionColor={night.hot}
          style={{
            height: BTN,
            borderRadius: BTN / 2,
            backgroundColor: night.well,
            color: night.ink,
            paddingHorizontal: 18,
            ...brico(17),
          }}
        />
      </Animated.View>
      <Pressable
        onPress={() => p.onSend()}
        accessibilityLabel={p.editing ? "Save name" : "Send"}
        style={{
          width: BTN,
          height: BTN,
          marginLeft: PAD,
          borderRadius: BTN / 2,
          backgroundColor: night.ink,
          alignItems: "center",
          justifyContent: "center",
          opacity: empty ? 0.35 : 1,
        }}
      >
        <Feather name={p.editing ? "check" : "arrow-up"} size={22} color={night.bg} />
      </Pressable>
    </Animated.View>
  );
});

function Segmented<T extends string | number | null>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View
      style={{ flexDirection: "row", backgroundColor: night.well, borderRadius: 999, padding: 3, gap: 2 }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: on ? night.ink : "transparent",
            }}
          >
            <Text style={{ ...brico(15, "bold"), color: on ? night.bg : night.dim }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Setup(p: Props) {
  const c = p.config;
  // Swipe the panel down to put it away. Built once: rebuilding the gesture on
  // every render re-attaches it and can swallow a quick follow-up tap.
  const close = useRef(p.onCloseSetup);
  close.current = p.onCloseSetup;
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetY(12)
        .onEnd((e) => {
          if (e.translationY > 40) close.current();
        }),
    [],
  );
  return (
    <GestureDetector gesture={swipe}>
      <Animated.View entering={FadeIn.delay(90).duration(220)} exiting={FadeOut.duration(80)}>
        <View
          style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: "#3a332d", alignSelf: "center", marginTop: 8 }}
        />
        <View style={{ paddingHorizontal: 16, paddingTop: 2 }}>
          <Text style={{ ...label(), marginTop: 12, marginBottom: 6 }}>PATTERN</Text>
          <Segmented<BreathPattern>
            options={(Object.keys(PATTERNS) as BreathPattern[]).map((k) => ({
              label: `${PATTERNS[k].inhale} in · ${PATTERNS[k].exhale} out`,
              value: k,
            }))}
            value={c.pattern}
            onChange={(pattern) => p.onConfig({ pattern })}
          />
          <Text style={{ ...label(), marginTop: 12, marginBottom: 6 }}>
            ROUNDS · 60S BREATH + 10S REST
          </Text>
          <Segmented<number | null>
            options={[
              { label: "1", value: 1 },
              { label: "3", value: 3 },
              { label: "5", value: 5 },
              { label: "∞", value: null },
            ]}
            value={c.rounds}
            onChange={(rounds) => p.onConfig({ rounds })}
          />
          <Pressable
            onPress={() => p.onConfig({ silent: !c.silent })}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 14,
              marginBottom: 8,
              marginHorizontal: 2,
            }}
          >
            <Text style={{ ...brico(15), color: night.soft }}>Silent · haptics only</Text>
            <View
              style={{
                width: 42,
                height: 24,
                borderRadius: 12,
                padding: 3,
                backgroundColor: c.silent ? night.hot : "#2c2722",
                alignItems: c.silent ? "flex-end" : "flex-start",
              }}
            >
              <View
                style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.silent ? "#fff" : night.dim }}
              />
            </View>
          </Pressable>
        </View>
        <View style={{ padding: 7 }}>
          <Pressable
            onPress={p.onStart}
            style={{
              height: BTN,
              borderRadius: BTN / 2,
              backgroundColor: night.hot,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#fff" }} />
            <Text style={{ ...brico(17, "bold"), color: "#fff" }}>start</Text>
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function Dock(p: Props) {
  const { inhale, exhale } = PATTERNS[p.config.pattern];
  const orb = useAnimatedStyle(() => ({ transform: [{ scale: p.scale.value }] }));
  const rounds = p.config.rounds;
  return (
    <Animated.View
      entering={FadeIn.delay(120).duration(260)}
      exiting={FadeOut.duration(80)}
      style={{ flex: 1, paddingTop: 18, paddingHorizontal: 7, paddingBottom: 7 }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12 }}>
        <Text style={label()}>
          {`${inhale} IN · ${exhale} OUT${p.config.silent ? " · SILENT" : ""}`}
        </Text>
        <Text style={label()}>{rounds ? `ROUND ${p.round} / ${rounds}` : `ROUND ${p.round}`}</Text>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 48 }}>
        <Animated.View
          style={[
            {
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: p.phase === "rest" ? night.rest : night.hot,
            },
            orb,
          ]}
        />
        <View style={{ alignItems: "center" }}>
          <Text style={{ ...brico(34, "extraBold"), color: night.ink, letterSpacing: -0.6 }}>
            {p.phase === "rest" ? `rest · ${p.restLeft}` : p.phase}
          </Text>
          <Text style={{ ...label(), marginTop: 6 }}>{clock(p.elapsed)}</Text>
        </View>
      </View>
      <Pressable
        onPress={p.onEnd}
        style={{
          height: BTN,
          borderRadius: BTN / 2,
          backgroundColor: night.ghost,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ ...brico(17, "bold"), color: night.soft }}>end session</Text>
      </Pressable>
    </Animated.View>
  );
}
