import { useCallback, useEffect, useRef } from "react";
import { Audio } from "expo-av";

// The breath is one 10-second loop with the plucks baked in at exact sample
// positions (F on inhale seconds 0–3, C on exhale seconds 4–9). Looping a fixed
// buffer is sample-accurate, so the rhythm is perfectly metronomic — no
// per-beat JS timers to jitter.
export function useBreathAudio() {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/audio/breath-loop.wav"),
          { isLooping: true, shouldPlay: false },
        );
        if (mounted) soundRef.current = sound;
        else sound.unloadAsync();
      } catch {
        // audio unavailable — fail silently
      }
    })();
    return () => {
      mounted = false;
      soundRef.current?.unloadAsync();
    };
  }, []);

  const start = useCallback(() => {
    soundRef.current
      ?.setStatusAsync({ shouldPlay: true, positionMillis: 0, isLooping: true })
      .catch(() => {});
  }, []);

  const stop = useCallback(() => {
    soundRef.current?.setStatusAsync({ shouldPlay: false }).catch(() => {});
  }, []);

  return { start, stop };
}
