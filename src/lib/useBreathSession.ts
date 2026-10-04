// The breath engine, lifted out of the old Arrive screen and generalized to any
// inhale/exhale split. One self-correcting beat per second across each 70s
// round: phase changes and haptics on the beat, the orb eased once per cycle.

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { haptics } from "@/lib/haptics";
import { useBreathAudio } from "@/lib/useBreathAudio";
import {
  BREATH_SECONDS,
  BreathConfig,
  PATTERNS,
  PERIOD_SECONDS,
} from "@/lib/breath";

// The heard audio trails its reported playback position by the device's output
// latency, so after calibration the tap still lands slightly early. This trim
// delays the haptic grid to compensate.
const HAPTIC_TRIM_MS = 45;

export type BreathPhase = "in" | "out" | "rest";

export type BreathResult = { config: BreathConfig; seconds: number; rounds: number };

export function useBreathSession(onFinish: (r: BreathResult) => void) {
  const audio = useBreathAudio();
  const scale = useSharedValue(1);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<BreathPhase>("in");
  const [elapsed, setElapsed] = useState(0);

  const configRef = useRef<BreathConfig | null>(null);
  const startRef = useRef(0);
  const beatRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calibRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (calibRef.current) clearTimeout(calibRef.current);
    timeoutRef.current = null;
    calibRef.current = null;
  };

  const easeCycle = useCallback(
    (inhale: number, exhale: number) => {
      scale.value = withSequence(
        withTiming(1.6, { duration: inhale * 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: exhale * 1000, easing: Easing.inOut(Easing.ease) }),
      );
    },
    [scale],
  );

  const stop = useCallback(() => {
    const config = configRef.current;
    if (!config) return;
    configRef.current = null;
    clearTimers();
    audio.stop();
    cancelAnimation(scale);
    scale.value = withTiming(1, { duration: 400 });
    setRunning(false);
    const seconds = Math.max(0, (Date.now() - startRef.current) / 1000);
    const capped = config.rounds ? Math.min(seconds, config.rounds * PERIOD_SECONDS) : seconds;
    finishRef.current({
      config,
      seconds: capped,
      rounds: Math.floor(capped / PERIOD_SECONDS + 1e-6),
    });
  }, [audio, scale]);

  const beat = useCallback(
    (b: number, config: BreathConfig) => {
      const { inhale, exhale } = PATTERNS[config.pattern];
      const pos = b % PERIOD_SECONDS;
      if (pos < BREATH_SECONDS) {
        const local = pos % (inhale + exhale);
        if (local === 0) {
          setPhase("in");
          easeCycle(inhale, exhale);
        } else if (local === inhale) {
          setPhase("out");
        }
        // Silent mode marks every breath second by touch: a firm double-tap on
        // the inhale, a single soft tap on the exhale. Audio mode uses the
        // plucks instead.
        if (config.silent) {
          if (local < inhale) {
            haptics.rigid();
            setTimeout(() => {
              if (configRef.current?.silent) haptics.rigid();
            }, 90);
          } else {
            haptics.soft();
          }
        }
      } else {
        if (pos === BREATH_SECONDS) {
          setPhase("rest");
          cancelAnimation(scale);
          scale.value = withTiming(1, { duration: 500 });
        }
        // Audio mode taps out the rest seconds; silent mode's rest is fully quiet.
        if (!config.silent) haptics.rigid();
      }
    },
    [easeCycle, scale],
  );

  const start = useCallback(
    (config: BreathConfig) => {
      if (configRef.current) return;
      configRef.current = config;
      startRef.current = Date.now() + HAPTIC_TRIM_MS;
      beatRef.current = 0;
      setElapsed(0);
      setPhase("in");
      setRunning(true);
      if (!config.silent) {
        audio.start(config.pattern);
        // Shift the beat grid onto the audio's true onset.
        calibRef.current = setTimeout(async () => {
          const pos = await audio.getPositionMillis();
          const after = Date.now();
          if (!configRef.current || pos == null || pos <= 0) return;
          const audioStart = after - pos + HAPTIC_TRIM_MS;
          if (Math.abs(audioStart - startRef.current) < 500) startRef.current = audioStart;
        }, 350);
      }
      const tick = () => {
        const current = configRef.current;
        if (!current) return;
        if (current.rounds != null && beatRef.current >= current.rounds * PERIOD_SECONDS) {
          stop();
          return;
        }
        beat(beatRef.current, current);
        beatRef.current += 1;
        setElapsed(beatRef.current - 1);
        const nextAt = startRef.current + beatRef.current * 1000;
        timeoutRef.current = setTimeout(tick, Math.max(0, nextAt - Date.now()));
      };
      tick();
    },
    [audio, beat, stop],
  );

  // Leaving the app (not just pulling down Control Center) ends the session;
  // it is logged if it got far enough.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" && configRef.current) stop();
    });
    return () => sub.remove();
  }, [stop]);

  useEffect(
    () => () => {
      clearTimers();
      cancelAnimation(scale);
    },
    [scale],
  );

  const round = Math.floor(elapsed / PERIOD_SECONDS) + 1;
  const restLeft = PERIOD_SECONDS - (elapsed % PERIOD_SECONDS);

  return { running, phase, elapsed, round, restLeft, scale, start, stop };
}
