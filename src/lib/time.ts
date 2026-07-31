const pad = (n: number) => String(n).padStart(2, "0");

// Seconds → "m:ss" (or "h:mm:ss" past an hour). Shared by the focus timer and
// the completed-task metrics.
export const formatDuration = (secs: number): string => {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
};
