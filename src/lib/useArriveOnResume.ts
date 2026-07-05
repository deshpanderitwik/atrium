import { useEffect } from "react";
import { AppState } from "react-native";
import { useRouter } from "expo-router";

// Every return to the app begins at the Arrive gate. We reset the navigation
// stack when the app goes to the *background* (while it's hidden) rather than on
// resume, so reopening lands directly on Arrive with no visible slide.
//
// Only "background" triggers this — a control-center/notification pull emits
// "inactive" without "background", so those brief interruptions are left alone.
export function useArriveOnResume() {
  const router = useRouter();

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        try {
          if (router.canDismiss()) router.dismissAll();
        } catch {
          // no-op: already at the root
        }
      }
    });
    return () => sub.remove();
  }, [router]);
}
