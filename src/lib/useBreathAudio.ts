import { useCallback, useEffect, useRef } from "react";
import { Audio } from "expo-av";

// Sine plucks that follow the 4-in / 6-out breath: a root F on each second of
// the inhale, and the fifth an octave below (C) on each second of the exhale.
const INHALE_MS = 4000;
const CYCLE_MS = 10000;

export function useBreathAudio() {
  const fRef = useRef<Audio.Sound | null>(null);
  const cRef = useRef<Audio.Sound | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const f = await Audio.Sound.createAsync(require("../../assets/audio/pluck-f.wav"));
        const c = await Audio.Sound.createAsync(require("../../assets/audio/pluck-c.wav"));
        if (mounted) {
          fRef.current = f.sound;
          cRef.current = c.sound;
        } else {
          f.sound.unloadAsync();
          c.sound.unloadAsync();
        }
      } catch {
        // audio unavailable — fail silently
      }
    })();
    return () => {
      mounted = false;
      if (tickRef.current) clearInterval(tickRef.current);
      fRef.current?.unloadAsync();
      cRef.current?.unloadAsync();
    };
  }, []);

  const pluck = useCallback((which: "f" | "c") => {
    const s = which === "f" ? fRef.current : cRef.current;
    s?.replayAsync().catch(() => {});
  }, []);

  const start = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    startRef.current = Date.now();
    pluck("f"); // first inhale beat at t=0
    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) % CYCLE_MS;
      pluck(elapsed < INHALE_MS ? "f" : "c");
    }, 1000);
  }, [pluck]);

  const stop = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    // let the last pluck ring out
  }, []);

  return { start, stop };
}
