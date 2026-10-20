import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Keyboard, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { night } from "@/theme";
import { haptics } from "@/lib/haptics";
import { getSetting, setSetting } from "@/lib/settings";
import { BreathConfig, BreathPattern, cycleSeconds } from "@/lib/breath";
import { BreathResult, useBreathSession } from "@/lib/useBreathSession";
import { useThread } from "@/db/thread";
import { useChat } from "@/db/chat";
import { ThreadList } from "@/components/thread/ThreadList";
import { Belt, BeltMode } from "@/components/thread/Belt";

const PATTERN_KEY = "breathPattern";
const ROUNDS_KEY = "breathRounds"; // "0" = until stopped
const SILENT_KEY = "breathSilent";

// The station — the single home screen. One long conversation with Claude and
// the breath sessions between, with the belt at the bottom: breathe · text box
// · send. It opens ready to write, since you come here mid-slip.
export default function Thread() {
  const insets = useSafeAreaInsets();
  const { entries, addBreath } = useThread();
  const chat = useChat();
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
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

  return (
    <View style={{ flex: 1, backgroundColor: night.bg }}>
      <ScrollView
        ref={scrollRef}
        style={{ opacity: mode === "dock" ? 0 : 1 }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Pressable
          onPress={dismiss}
          style={{
            flexGrow: 1,
            paddingTop: insets.top + 16,
            paddingHorizontal: 18,
            paddingBottom: insets.bottom + 120,
          }}
        >
          <ThreadList
            breaths={entries}
            messages={chat.messages}
            live={chat.live}
            status={chat.status}
            onRetry={chat.retry}
            sinceMount={sinceMount}
          />
        </Pressable>
      </ScrollView>

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
      />

    </View>
  );
}
