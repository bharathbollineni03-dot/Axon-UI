import { useCallback, useEffect, useState } from 'react';

/**
 * Counts down from `seconds` to 0, one step a second, for a "resend in 30s" button. It starts
 * running at once unless `startRunning` is false; `restart()` begins again from `seconds`.
 */
export function useCountdown(seconds: number, startRunning = true) {
  const [remaining, setRemaining] = useState(startRunning ? seconds : 0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const restart = useCallback(() => setRemaining(seconds), [seconds]);
  return { remaining, restart };
}
