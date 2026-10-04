import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { night } from "@/theme";
import { TodosProvider } from "@/db/store";
import { ReflectionsProvider } from "@/db/reflections";
import { ThreadProvider } from "@/db/thread";
import { BricolageGrotesque_400Regular } from "@expo-google-fonts/bricolage-grotesque/400Regular";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque/800ExtraBold";
import { useOtaUpdates } from "@/lib/useOtaUpdates";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useOtaUpdates();

  const [fontsLoaded] = useFonts({
    "EBGaramond-Regular": require("../assets/fonts/EBGaramond-Regular.ttf"),
    "EBGaramond-Medium": require("../assets/fonts/EBGaramond-Medium.ttf"),
    "EBGaramond-Italic": require("../assets/fonts/EBGaramond-Italic.ttf"),
    "EBGaramond-MediumItalic": require("../assets/fonts/EBGaramond-MediumItalic.ttf"),
    "Bricolage-Regular": BricolageGrotesque_400Regular,
    "Bricolage-Bold": BricolageGrotesque_700Bold,
    "Bricolage-ExtraBold": BricolageGrotesque_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: night.bg }}>
      <SafeAreaProvider>
        <TodosProvider>
          <ReflectionsProvider>
            <ThreadProvider>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: night.bg },
                  animation: "slide_from_right",
                }}
              />
            </ThreadProvider>
          </ReflectionsProvider>
        </TodosProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
