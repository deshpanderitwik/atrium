// The belt: one surface at the bottom of the thread that becomes whatever the
// moment needs. At rest it is a composer — breathe · text box · send. Tapping
// breathe opens the breath setup in place; starting rises it over the thread as
// the session dock; ending sinks it back.

import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  LayoutChangeEvent,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  EntryExitAnimationFunction,
  SharedValue,
  ZoomIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { brico, label, night } from "@/theme";
import { BreathConfig, BreathPattern, PATTERNS, clock } from "@/lib/breath";
import type { BreathPhase } from "@/lib/useBreathSession";

const OUT = Easing.bezier(0.25, 0.8, 0.3, 1);
// Near-critically damped: settles without a wobble, but never feels mechanical.
const SPRING = { damping: 26, stiffness: 230, mass: 1 };
const BTN = 54;
const PAD = 6;
const COMPOSE_H = BTN + PAD * 2;
// Close to the curve iOS animates its keyboard with.
const KEYBOARD_EASE = Easing.bezier(0.38, 0.7, 0.125, 1);

// Each mode's content is a layer pinned to the belt's bottom edge. Layers cross:
// the outgoing one sinks and fades while the incoming one rises in, so the belt
// never shows a hard swap. Setup skips the layer fade — its start button is the
// orb, already in place — and staggers its own controls in instead.
const layerIn: EntryExitAnimationFunction = () => {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 12 }] },
    animations: {
      opacity: withDelay(70, withTiming(1, { duration: 240 })),
      transform: [{ translateY: withDelay(70, withSpring(0, SPRING)) }],
    },
  };
};
// Quick: an outgoing layer keeps its offset from the shell's top, so while the
// shell grows it would ride upward — gone before that can read as motion.
const layerOut: EntryExitAnimationFunction = () => {
  "worklet";
  return {
    initialValues: { opacity: 1 },
    animations: { opacity: withTiming(0, { duration: 80 }) },
  };
};
const rise =
  (delay: number): EntryExitAnimationFunction =>
  () => {
    "worklet";
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 14 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: 260 })),
        transform: [{ translateY: withDelay(delay, withSpring(0, SPRING)) }],
      },
    };
  };

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
  const rest = Math.max(insets.bottom, 12) + 8;

  // Ride on top of the keyboard, moving with it from wherever the belt is. Driven
  // by the keyboard's own will-show/will-hide events (its real height, duration
  // and curve): a frame-by-frame keyboard tracker briefly reports a bogus height
  // as the keyboard starts to hide, which flung the belt to the top of the screen.
  const keyboard = useSharedValue(0);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", (e) => {
      keyboard.value = withTiming(e.endCoordinates.height, {
        duration: e.duration || 250,
        easing: KEYBOARD_EASE,
      });
    });
    const hide = Keyboard.addListener("keyboardWillHide", (e) => {
      keyboard.value = withTiming(0, { duration: e.duration || 250, easing: KEYBOARD_EASE });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboard]);

  const lift = useAnimatedStyle(() => ({
    bottom: Math.max(keyboard.value + 8, rest),
  }));

  const dockHeight = screenH - insets.top - 12 - rest;

  // The shell's height springs to whatever the incoming layer measures.
  const [measured, setMeasured] = useState({ compose: COMPOSE_H, setup: 0 });
  const target = p.mode === "dock" ? dockHeight : measured[p.mode];
  const height = useSharedValue(COMPOSE_H);
  const docked = useSharedValue(0);
  useEffect(() => {
    if (target > 0) height.value = withSpring(target, SPRING);
  }, [target, height]);
  useEffect(() => {
    docked.value = withTiming(p.mode === "dock" ? 1 : 0, { duration: 320 });
  }, [p.mode, docked]);

  const shell = useAnimatedStyle(() => ({
    height: height.value,
    backgroundColor: interpolateColor(docked.value, [0, 1], [night.panel, night.dock]),
  }));

  const measure = (m: "compose" | "setup") => (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    setMeasured((prev) => (prev[m] === h ? prev : { ...prev, [m]: h }));
  };

  // The outer view only tracks the keyboard; the shell grows upward from the
  // bottom edge while the layers cross inside it.
  return (
    <Animated.View style={[{ position: "absolute", left: 10, right: 10 }, lift]}>
      <Animated.View
        style={[{ borderRadius: p.mode === "compose" ? COMPOSE_H / 2 : 34, overflow: "hidden" }, shell]}
      >
        <Animated.View
          key={p.mode}
          entering={p.mode === "setup" ? undefined : layerIn}
          exiting={layerOut}
          onLayout={p.mode === "dock" ? undefined : measure(p.mode)}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: p.mode === "dock" ? dockHeight : undefined,
          }}
        >
          {p.mode === "compose" && <Composer {...p} ref={inputRef} />}
          {p.mode === "setup" && <Setup {...p} />}
          {p.mode === "dock" && <Dock {...p} />}
        </Animated.View>
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
    <View style={{ flexDirection: "row", alignItems: "center", padding: PAD }}>
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
    </View>
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
      <View>
        <Animated.View entering={rise(40)}>
          <View
            style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: "#3a332d", alignSelf: "center", marginTop: 8 }}
          />
        </Animated.View>
        <View style={{ paddingHorizontal: 16, paddingTop: 2 }}>
          <Animated.View entering={rise(70)}>
            <Text style={{ ...label(), marginTop: 12, marginBottom: 6 }}>PATTERN</Text>
            <Segmented<BreathPattern>
              options={(Object.keys(PATTERNS) as BreathPattern[]).map((k) => ({
                label: `${PATTERNS[k].inhale} in · ${PATTERNS[k].exhale} out`,
                value: k,
              }))}
              value={c.pattern}
              onChange={(pattern) => p.onConfig({ pattern })}
            />
          </Animated.View>
          <Animated.View entering={rise(120)}>
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
          </Animated.View>
          <Animated.View entering={rise(170)}>
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
          </Animated.View>
        </View>
        <OrbToStart onPress={p.onStart} />
      </View>
    </GestureDetector>
  );
}

// The start button is the breathe orb, stretched: it begins exactly where the
// orb sat — same size, same white dot — and widens across the panel as "start"
// slides in beside the dot.
function OrbToStart({ onPress }: { onPress: () => void }) {
  const grow = useSharedValue(0);
  const full = useSharedValue(BTN);
  const [labelW, setLabelW] = useState(0);
  const started = useRef(false);

  const begin = (rowWidth: number) => {
    full.value = rowWidth;
    if (started.current || !labelW) return;
    started.current = true;
    grow.value = withDelay(30, withSpring(1, SPRING));
  };
  const rowWidth = useRef(0);
  useEffect(() => {
    if (labelW && rowWidth.current) begin(rowWidth.current);
  }, [labelW]); // eslint-disable-line react-hooks/exhaustive-deps

  const button = useAnimatedStyle(() => ({
    width: BTN + grow.value * Math.max(0, full.value - BTN),
  }));
  const word = useAnimatedStyle(() => ({
    width: grow.value * labelW,
    marginLeft: grow.value * 8,
    opacity: grow.value * grow.value,
  }));

  return (
    <View
      style={{ padding: PAD }}
      onLayout={(e) => {
        rowWidth.current = e.nativeEvent.layout.width - PAD * 2;
        begin(rowWidth.current);
      }}
    >
      {/* measures the word once, off-screen */}
      <Text
        onLayout={(e) => setLabelW(Math.ceil(e.nativeEvent.layout.width))}
        style={{ ...brico(17, "bold"), position: "absolute", opacity: 0, left: -999 }}
      >
        start
      </Text>
      <Animated.View style={[{ height: BTN, borderRadius: BTN / 2, overflow: "hidden" }, button]}>
        <Pressable
          onPress={onPress}
          accessibilityLabel="Start breathing"
          style={{
            flex: 1,
            backgroundColor: night.hot,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff" }} />
          <Animated.View style={[{ overflow: "hidden" }, word]}>
            <Text numberOfLines={1} style={{ ...brico(17, "bold"), color: "#fff", width: labelW || undefined }}>
              start
            </Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Dock(p: Props) {
  const { inhale, exhale } = PATTERNS[p.config.pattern];
  const orb = useAnimatedStyle(() => ({ transform: [{ scale: p.scale.value }] }));
  const rounds = p.config.rounds;
  return (
    <View style={{ flex: 1, paddingTop: 18, paddingHorizontal: PAD, paddingBottom: PAD }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12 }}>
        <Text style={label()}>
          {`${inhale} IN · ${exhale} OUT${p.config.silent ? " · SILENT" : ""}`}
        </Text>
        <Text style={label()}>{rounds ? `ROUND ${p.round} / ${rounds}` : `ROUND ${p.round}`}</Text>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 48 }}>
        <Animated.View entering={ZoomIn.delay(140).springify().damping(18).stiffness(160)}>
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
        </Animated.View>
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
    </View>
  );
}
