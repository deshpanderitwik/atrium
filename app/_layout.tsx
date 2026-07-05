import React, { useEffect } from "react";
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
        </TodosProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
