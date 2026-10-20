import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Keyboard, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, useSharedValue } from "react-native-reanimated";
import { KeyboardAwareLegendList } from "@legendapp/list/keyboard";
import { brico, night } from "@/theme";
import { haptics } from "@/lib/haptics";
import { getSetting, setSetting } from "@/lib/settings";
import { BreathConfig, BreathPattern, cycleSeconds } from "@/lib/breath";
import { BreathResult, useBreathSession } from "@/lib/useBreathSession";
import { useThread } from "@/db/thread";
import { useChat } from "@/db/chat";
import { EmptyThread, Row, ThreadRow, threadRows } from "@/components/thread/ThreadList";
import { Belt, BeltMode, COMPOSE_HEIGHT, KEYBOARD_GAP, beltRest } from "@/components/thread/Belt";

// Between the newest message and the top of the belt.
const GAP = 12;

type ListHandle = { scrollToEnd(o?: { animated?: boolean }): Promise<void> };

const PATTERN_KEY = "breathPattern";
const ROUNDS_KEY = "breathRounds"; // "0" = until stopped
const SILENT_KEY = "breathSilent";

// The station — the single home screen. One long conversation with Claude and
// the breath sessions between, with the belt at the bottom: breathe · text box
// · send. It opens ready to write, since you come here mid-slip.
//
// How it scrolls is specified in process/station-chat-spec.md (worked out in
// ../chat-lab): the thread is a KeyboardAwareLegendList that rests on the belt,
// stays pinned while things grow, holds still when you've scrolled up, and
// lifts with the keyboard only when you're at the end.
export default function Thread() {
  const insets = useSafeAreaInsets();
  const { entries, addBreath } = useThread();
  const chat = useChat();
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<ListHandle>(null);
  const [sinceMount] = useState(() => Date.now());

  const [mode, setMode] = useState<BeltMode>("compose");
  const [text, setTextState] = useState("");
  // The live value, so a send never reads a stale render.
  const textRef = useRef("");
  const setText = (t: string) => {
    textRef.current = t;
    setTextState(t);
  };
  // Clearing through state alone is a no-op when the render lagged the native
  // field, so clear the field itself too.
  const clearText = () => {
    inputRef.current?.clear();
    setText("");
  };
  const [focused, setFocused] = useState(false);
  const [warn, setWarn] = useState(0);
  const [config, setConfig] = useState<BreathConfig>({ pattern: "4-6", rounds: 3, silent: false });

  // Restore the last-used breath setup.
  useEffect(() => {
    (async () => {
      const [pattern, rounds, silent] = await Promise.all([
        getSetting(PATTERN_KEY),
        getSetting(ROUNDS_KEY),
        getSetting(SILENT_KEY),
      ]);
      setConfig({
        pattern: pattern === "5-5" ? "5-5" : ("4-6" as BreathPattern),
        rounds: rounds == null ? 3 : Number(rounds) || null,
        silent: silent === "1",
      });
    })();
  }, []);

  // Merge rather than replace, so quick taps across rows never undo each other.
  const updateConfig = (patch: Partial<BreathConfig>) => {
    haptics.selection();
    setConfig((prev) => {
      const c = { ...prev, ...patch };
      setSetting(PATTERN_KEY, c.pattern);
      setSetting(ROUNDS_KEY, String(c.rounds ?? 0));
      setSetting(SILENT_KEY, c.silent ? "1" : "0");
      return c;
    });
  };

  // A session is logged only once a full in-and-out cycle is done, so an
  // accidental start leaves no trace.
  const onFinish = useCallback(
    async ({ config: c, seconds, rounds }: BreathResult) => {
      setMode("compose");
      if (seconds < cycleSeconds(c.pattern)) return;
      haptics.success();
      await addBreath({
        pattern: c.pattern,
        rounds,
        seconds: Math.round(seconds),
        silent: c.silent,
      });
    },
    [addBreath],
  );
  const session = useBreathSession(onFinish);

  // Come back ready to write: on open, and whenever the app returns.
  // Twice: on a cold start the belt's text box can mount after the first try.
  const focusComposer = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 250);
    setTimeout(() => inputRef.current?.focus(), 800);
  }, []);
  useEffect(() => {
    focusComposer();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && mode === "compose") focusComposer();
    });
    return () => sub.remove();
  }, [focusComposer, mode]);

  // Send keeps the keyboard up, so the next thought can follow.
  const send = async (submitted?: string) => {
    const v = (submitted ?? textRef.current).trim();
    if (!v) {
      setWarn((w) => w + 1);
      haptics.warning();
      return;
    }
    clearText();
    haptics.light();
    await chat.send(v);
    // R6: sending always pins.
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  // Tapping the thread puts away whatever is open.
  const dismiss = () => {
    if (mode === "setup") {
      setMode("compose");
      return;
    }
    Keyboard.dismiss();
  };

  const openSetup = () => {
    Keyboard.dismiss();
    haptics.light();
    setMode("setup");
  };

  const start = () => {
    haptics.rigid();
    setMode("dock");
    session.start(config);
  };

  // R2: the thread's end inset is the composer plus its resting distance
  // plus a gap, tracked as the composer grows.
  const rest = beltRest(insets.bottom);
  const endInset = useSharedValue(COMPOSE_HEIGHT + rest + GAP);

  // Pinned = the end of the thread is in view. Scrolled up, a "latest" pill
  // appears, turning hot when something arrives below.
  const [pinned, setPinned] = useState(true);
  const [fresh, setFresh] = useState(false);
  const onEndVisible = useCallback((visible: boolean) => {
    setPinned(visible);
    if (visible) setFresh(false);
  }, []);
  const rows = useMemo(
    () =>
      threadRows({
        breaths: entries,
        messages: chat.messages,
        live: chat.live,
        status: chat.status,
        sinceMount,
      }),
    [entries, chat.messages, chat.live, chat.status, sinceMount],
  );
  const lastKey = rows[rows.length - 1]?.key;
  const seenKey = useRef(lastKey);
  useEffect(() => {
    if (lastKey !== seenKey.current && !pinned) setFresh(true);
    seenKey.current = lastKey;
  }, [lastKey, pinned]);

  // R10: a tap on the thread puts away whatever is open; it never scrolls.
  const tap = Gesture.Tap().maxDuration(250).runOnJS(true).onEnd(dismiss);

  return (
    <View style={{ flex: 1, backgroundColor: night.bg }}>
      <GestureDetector gesture={tap}>
        <View style={{ flex: 1, opacity: mode === "dock" ? 0 : 1 }}>
          <KeyboardAwareLegendList
            ref={listRef as never}
            data={rows}
            renderItem={({ item }: { item: Row }) => <ThreadRow row={item} onRetry={chat.retry} />}
            keyExtractor={(r: Row) => r.key}
            estimatedItemSize={64}
            recycleItems={false}
            alignItemsAtEnd
            initialScrollAtEnd
            maintainScrollAtEnd
            maintainScrollAtEndThreshold={0.05}
            maintainVisibleContentPosition
            keyboardLiftBehavior="whenAtEnd"
            keyboardOffset={rest - KEYBOARD_GAP}
            contentInsetEndAdjustment={endInset}
            onEndVisible={onEndVisible}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyThread status={chat.status} onRetry={chat.retry} />}
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 18 }}
          />
        </View>
      </GestureDetector>
      {/* Keeps the scrolled thread from running under the clock: solid behind the
          status bar, then a short fade. */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, opacity: mode === "dock" ? 0 : 1 }}
      >
        <View style={{ height: insets.top + 4, backgroundColor: night.bg }} />
        {[0.85, 0.6, 0.35, 0.12].map((o) => (
          <View key={o} style={{ height: 4, backgroundColor: night.bg, opacity: o }} />
        ))}
      </View>

      <Belt
        ref={inputRef}
        mode={mode}
        text={text}
        onChangeText={(t) => {
          setText(t);
          if (warn) setWarn(0);
        }}
        onSend={send}
        onOpenSetup={openSetup}
        focused={focused}
        onFocusChange={setFocused}
        editing={false}
        hint={chat.hasKey ? "what's here" : "paste your API key"}
        warn={warn}
        config={config}
        onConfig={updateConfig}
        onStart={start}
        onCloseSetup={() => setMode("compose")}
        phase={session.phase}
        elapsed={session.elapsed}
        round={session.round}
        restLeft={session.restLeft}
        scale={session.scale}
        onEnd={session.stop}
        onComposeHeight={(h) => {
          endInset.value = h + rest + GAP;
        }}
        above={
          !pinned && (
            <Animated.View
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(160)}
              style={{ alignItems: "center", marginBottom: 10 }}
            >
              <Pressable
                onPress={() => listRef.current?.scrollToEnd({ animated: true })}
                hitSlop={8}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: fresh ? night.hot : night.panel,
                }}
              >
                <Text style={{ ...brico(14), color: fresh ? "#fff" : night.dim }}>latest</Text>
              </Pressable>
            </Animated.View>
          )
        }
      />

    </View>
  );
}
