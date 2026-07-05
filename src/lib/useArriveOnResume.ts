import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useRouter } from "expo-router";

// If the app was genuinely backgrounded for longer than this, reopening returns
// to the Arrive gate. Short window so an instant app-switch doesn't yank you out
// of what you were doing.
const GRACE_MS = 2000;

// Returns the navigation stack to the Arrive root when the app is reopened after
// being backgrounded — every real return to the app begins with arriving.
export function useArriveOnResume() {
  const router = useRouter();
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        backgroundedAt.current = Date.now();
      } else if (state === "active") {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (since != null && Date.now() - since > GRACE_MS) {
          try {
            if (router.canDismiss()) router.dismissAll();
          } catch {
            // no-op: already at the root
          }
        }
      }
    });
    return () => sub.remove();
  }, [router]);
}
