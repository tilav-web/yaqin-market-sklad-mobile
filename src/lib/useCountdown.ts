import { useEffect, useState } from 'react';

function secondsUntil(deadlineMs: number): number {
  return Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
}

/** Whole seconds remaining until `deadlineMs` (epoch ms), floored at 0, ticking every second. */
export function useCountdown(deadlineMs: number): number {
  const [remaining, setRemaining] = useState(() => secondsUntil(deadlineMs));
  const [trackedDeadline, setTrackedDeadline] = useState(deadlineMs);

  // Resync during render rather than in an effect: a new deadline takes effect
  // on the same frame instead of showing the previous one's value first.
  if (trackedDeadline !== deadlineMs) {
    setTrackedDeadline(deadlineMs);
    setRemaining(secondsUntil(deadlineMs));
  }

  useEffect(() => {
    const id = setInterval(() => setRemaining(secondsUntil(deadlineMs)), 1000);
    return () => clearInterval(id);
  }, [deadlineMs]);

  return remaining;
}
