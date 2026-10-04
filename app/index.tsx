import React, { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { night } from "@/theme";
import { haptics } from "@/lib/haptics";
import { getSetting, setSetting } from "@/lib/settings";
import { BreathConfig, BreathPattern, cycleSeconds } from "@/lib/breath";
import { BreathResult, useBreathSession } from "@/lib/useBreathSession";
import { NameEntry, useThread } from "@/db/thread";
import { Frame, ThreadList } from "@/components/thread/ThreadList";
import { LiftedName } from "@/components/thread/LiftedName";
import { Belt, BeltMode } from "@/components/thread/Belt";

const PATTERN_KEY = "breathPattern";
const ROUNDS_KEY = "breathRounds"; // "0" = until stopped
const SILENT_KEY = "breathSilent";

// The thread — the single home screen. The day in time order (named things and
// breath sessions), with the belt at the bottom: breathe · text box · send.
export default function Thread() {
  const insets = useSafeAreaInsets();
  const { entries, addName, renameName, addBreath, removeEntry } = useThread();
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [lifted, setLifted] = useState<{ entry: NameEntry; frame: Frame } | null>(null);
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
      const id = await addBreath({
        pattern: c.pattern,
        rounds,
        seconds: Math.round(seconds),
        silent: c.silent,
      });
      setFreshId(id);
    },
    [addBreath],
  );
  const session = useBreathSession(onFinish);

  const send = async (submitted?: string) => {
    const v = (submitted ?? textRef.current).trim().replace(/\s+/g, " ");
    if (!v) {
      setWarn((w) => w + 1);
      haptics.warning();
      return;
    }
    if (editingId) {
      await renameName(editingId, v);
      setEditingId(null);
      clearText();
      Keyboard.dismiss();
      return;
    }
    clearText();
    haptics.light();
    const id = await addName(v);
    setFreshId(id);
  };

  // Tapping the thread puts away whatever is open.
  const dismiss = () => {
    if (mode === "setup") {
      setMode("compose");
      return;
    }
    Keyboard.dismiss();
    if (editingId) {
      setEditingId(null);
      clearText();
    }
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

  const onLongPressName = (entry: NameEntry, frame: Frame) => {
    if (mode !== "compose") return;
    Keyboard.dismiss();
    haptics.rigid();
    setLifted({ entry, frame });
  };

  const editLifted = () => {
    if (!lifted) return;
    setEditingId(lifted.entry.id);
    setText(lifted.entry.text);
    setLifted(null);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const deleteLifted = () => {
    if (!lifted) return;
    const id = lifted.entry.id;
    setLifted(null);
    haptics.light();
    removeEntry(id);
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
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 16,
          paddingHorizontal: 18,
          paddingBottom: insets.bottom + 120,
        }}
      >
        <Pressable onPress={dismiss} style={{ flexGrow: 1 }}>
          <ThreadList
            entries={entries}
            freshId={freshId}
            liftedId={lifted?.entry.id ?? null}
            onLongPressName={onLongPressName}
          />
        </Pressable>
      </ScrollView>

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
        editing={editingId != null}
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

      {lifted && (
        <LiftedName
          entry={lifted.entry}
          frame={lifted.frame}
          onEdit={editLifted}
          onDelete={deleteLifted}
          onDismiss={() => setLifted(null)}
        />
      )}
    </View>
  );
}
