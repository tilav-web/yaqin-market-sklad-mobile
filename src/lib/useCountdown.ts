import { useEffect, useState } from 'react';

/** Whole seconds remaining until `deadlineMs` (epoch ms), floored at 0, ticking every second. */
export function useCountdown(deadlineMs: number): number {
  const compute = () => Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(compute);

  useEffect(() => {
    setRemaining(compute());
    const id = setInterval(() => setRemaining(compute()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs]);

  return remaining;
}
