import React, { useEffect, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { colors } from "@/theme";
import { TodosProvider } from "@/db/store";
import { useOtaUpdates } from "@/lib/useOtaUpdates";
import { useArriveOnResume } from "@/lib/useArriveOnResume";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useOtaUpdates();
  useArriveOnResume();

  const [fontsLoaded] = useFonts({
    "EBGaramond-Regular": require("../assets/fonts/EBGaramond-Regular.ttf"),
    "EBGaramond-Medium": require("../assets/fonts/EBGaramond-Medium.ttf"),
    "EBGaramond-Italic": require("../assets/fonts/EBGaramond-Italic.ttf"),
    "EBGaramond-MediumItalic": require("../assets/fonts/EBGaramond-MediumItalic.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaProvider>
        <TodosProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.paper },
              animation: "slide_from_right",
            }}
          />
          <BackgroundCover />
        </TodosProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Covers the screen with plain paper whenever the app isn't active, so the
// backgrounded snapshot and the resume frame never show the previous screen —
// the stack resets to Arrive underneath, and we reveal it with no flash.
function BackgroundCover() {
  const [covered, setCovered] = useState(AppState.currentState !== "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setCovered(state !== "active");
    });
    return () => sub.remove();
  }, []);

  if (!covered) return null;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.paper }]}
    />
  );
}
