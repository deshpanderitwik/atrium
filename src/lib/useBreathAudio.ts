import { useCallback, useEffect, useRef } from "react";
import { Audio } from "expo-av";

// Sine plucks on a fixed 1-second grid following the 4-in / 6-out breath.
// Beats 0–3 of each 10-beat cycle are the root F (inhale); beats 4–9 are the
// fifth an octave below, C (exhale).
const INHALE_BEATS = 4;
const CYCLE_BEATS = 10;

export function useBreathAudio() {
  const fRef = useRef<Audio.Sound | null>(null);
  const cRef = useRef<Audio.Sound | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);
  const beatRef = useRef(0);

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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      fRef.current?.unloadAsync();
      cRef.current?.unloadAsync();
    };
  }, []);

  const pluck = useCallback((which: "f" | "c") => {
    const s = which === "f" ? fRef.current : cRef.current;
    // set position to 0 then play — lower, more consistent latency than replay
    s?.setStatusAsync({ shouldPlay: true, positionMillis: 0 }).catch(() => {});
  }, []);

  const start = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    startRef.current = Date.now();
    beatRef.current = 0;
    // Self-correcting scheduler: each beat targets an absolute grid time
    // (start + n×1000), so timer drift can never accumulate.
    const tick = () => {
      const beat = beatRef.current;
      pluck(beat % CYCLE_BEATS < INHALE_BEATS ? "f" : "c");
      beatRef.current = beat + 1;
      const nextAt = startRef.current + beatRef.current * 1000;
      const delay = Math.max(0, nextAt - Date.now());
      timeoutRef.current = setTimeout(tick, delay);
    };
    tick(); // beat 0 fires immediately, on the press
  }, [pluck]);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // let the last pluck ring out
  }, []);

  return { start, stop };
}
