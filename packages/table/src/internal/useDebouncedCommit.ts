import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A value that follows what the user is typing at once but is handed on (`commit`) only after they
 * pause, so a filter does not re-run on every key. When the committed value changes from outside
 * (a "clear filters" button) the typed value follows it.
 *
 * A delay of 0 or less commits immediately.
 */
export function useDebouncedCommit<Value>(
  external: Value,
  commit: (value: Value) => void,
  delay: number,
  same: (a: Value, b: Value) => boolean = Object.is,
): [Value, (value: Value) => void] {
  const [local, setLocal] = useState(external);
  const committed = useRef(external);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    if (!same(external, committed.current)) {
      clearTimeout(timer.current);
      committed.current = external;
      setLocal(external);
    }
    // `same` is a pure comparison that callers may write inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [external]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const set = useCallback(
    (value: Value) => {
      setLocal(value);
      clearTimeout(timer.current);
      const send = () => {
        committed.current = value;
        commitRef.current(value);
      };
      if (delay <= 0) send();
      else timer.current = setTimeout(send, delay);
    },
    [delay],
  );

  return [local, set];
}
