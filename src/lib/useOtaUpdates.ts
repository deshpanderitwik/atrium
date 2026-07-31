import { useEffect } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

// Checks for an EAS Update on launch and whenever the app returns to the
// foreground, then fetches + reloads if one is available. This is what makes a
// pushed `eas update` land on the phone without reopening from cold.
async function checkOnce() {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch {
    // Offline or no update server configured yet — ignore and keep running.
  }
}

export function useOtaUpdates() {
  useEffect(() => {
    checkOnce();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkOnce();
    });
    return () => sub.remove();
  }, []);
}
