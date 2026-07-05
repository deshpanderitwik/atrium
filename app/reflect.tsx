import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, garamond, mono } from "@/theme";
import { haptics } from "@/lib/haptics";
import { useReflections } from "@/db/reflections";

// A calm, full-screen plain-text writing surface. The text is a persistent
// draft: leaving keeps it, "keep" files it into the timeline, "discard" throws
// it away.
export default function Reflect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { held } = useLocalSearchParams<{ held?: string }>();
  const { getDraft, saveDraft, clearDraft, submitReflection } = useReflections();

  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const textRef = useRef("");
  textRef.current = text;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Once kept or discarded, don't let unmount re-save the text as a draft.
  const finalizedRef = useRef(false);

  // Resume any existing draft.
  useEffect(() => {
    (async () => {
      const d = await getDraft();
      setText(d);
      setLoaded(true);
    })();
  }, [getDraft]);

  // Debounced autosave while typing.
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(textRef.current), 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [text, loaded, saveDraft]);

  // Leaving the writer (back-swipe, background) keeps the draft — unless it was
  // already kept or discarded.
  useEffect(
    () => () => {
      if (!finalizedRef.current) saveDraft(textRef.current);
    },
    [saveDraft],
  );

  const keep = async () => {
    finalizedRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const t = text.trim();
    if (t) {
      await submitReflection(t, held ? Number(held) : null);
      haptics.success();
    } else {
      await clearDraft();
    }
    router.back();
  };

  const discard = async () => {
    finalizedRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    textRef.current = "";
    await clearDraft();
    haptics.warning();
    router.back();
  };

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.paper }}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: 28,
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 20,
          }}
        >
          <Pressable onPress={discard} hitSlop={10}>
            <Text style={{ ...mono(11, 2), color: colors.inkFaint }}>discard</Text>
          </Pressable>
          <Pressable onPress={keep} hitSlop={10}>
            <Text style={{ ...mono(11, 2), color: colors.ink }}>keep</Text>
          </Pressable>
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          autoFocus
          multiline
          placeholder="what are you experiencing?"
          placeholderTextColor={colors.inkFaint}
          textAlignVertical="top"
          scrollEnabled
          style={{
            flex: 1,
            ...garamond.regular(20),
            lineHeight: 31,
            color: colors.ink,
            padding: 0,
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
