import { useCallback, useState } from 'react';

/**
 * A message for a polite live region. Saying the same thing twice in a row still has to be
 * announced, so every message ends with a zero-width space that alternates between calls.
 */
export function useAnnouncer(): [string, (message: string) => void] {
  const [state, setState] = useState({ message: '', flip: false });
  const announce = useCallback((message: string) => {
    setState((previous) => ({ message, flip: !previous.flip }));
  }, []);
  return [state.message ? `${state.message}${state.flip ? '​' : ''}` : '', announce];
}
