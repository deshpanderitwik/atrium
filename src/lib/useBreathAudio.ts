import { useCallback, useEffect, useRef } from "react";
import { Audio } from "expo-av";
import type { BreathPattern } from "@/lib/breath";

// Each pattern is one baked track: four 70s rounds (60s of breath with a pluck
// on every second — F while breathing in, C while breathing out — then 10s of
// silence), looped. Looping a fixed buffer is sample-accurate, so the rhythm is
// perfectly metronomic — no per-beat JS timers to jitter.
const SOURCES: Record<BreathPattern, number> = {
  "4-6": require("../../assets/audio/breath-loop.wav"),
  "5-5": require("../../assets/audio/breath-loop-55.wav"),
};

export function useBreathAudio() {
  const soundsRef = useRef<Partial<Record<BreathPattern, Audio.Sound>>>({});
  const activeRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        for (const pattern of Object.keys(SOURCES) as BreathPattern[]) {
          const { sound } = await Audio.Sound.createAsync(SOURCES[pattern], {
            isLooping: true,
            shouldPlay: false,
          });
          if (mounted) soundsRef.current[pattern] = sound;
          else sound.unloadAsync();
        }
      } catch {
        // audio unavailable — fail silently
      }
    })();
    return () => {
      mounted = false;
      Object.values(soundsRef.current).forEach((s) => s?.unloadAsync());
    };
  }, []);

  const start = useCallback((pattern: BreathPattern) => {
    const sound = soundsRef.current[pattern] ?? null;
    activeRef.current = sound;
    sound
      ?.setStatusAsync({ shouldPlay: true, positionMillis: 0, isLooping: true })
      .catch(() => {});
  }, []);

  const stop = useCallback(() => {
    activeRef.current?.setStatusAsync({ shouldPlay: false }).catch(() => {});
    activeRef.current = null;
  }, []);

  // Current playback position in ms — used to align the haptic clock to the
  // audio's true onset (accounts for output latency).
  const getPositionMillis = useCallback(async (): Promise<number | null> => {
    try {
      const s = await activeRef.current?.getStatusAsync();
      if (s && "isLoaded" in s && s.isLoaded) return s.positionMillis ?? null;
    } catch {
      // ignore
    }
    return null;
  }, []);

  return { start, stop, getPositionMillis };
}
