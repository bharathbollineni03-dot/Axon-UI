import { useCallback, useEffect, useRef } from 'react';
import type { ListboxOption } from './options';

/**
 * Collects typed characters into a search string that resets after `timeout` ms of silence.
 * Returns a function that appends a character and gives the current string.
 */
export function useTypeaheadBuffer(timeout = 500) {
  const buffer = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return useCallback(
    (character: string) => {
      buffer.current += character.toLowerCase();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        buffer.current = '';
      }, timeout);
      return buffer.current;
    },
    [timeout],
  );
}

/**
 * Finds the option whose label starts with `search`, scanning from `activeIndex` and wrapping.
 * Repeating one character ("aaa") cycles through options starting with that character.
 */
export function findByTypeahead(
  options: ListboxOption[],
  search: string,
  activeIndex: number,
): number {
  const repeated = search.length > 1 && [...search].every((c) => c === search[0]);
  const query = repeated ? search[0]! : search;
  const start = repeated ? activeIndex + 1 : Math.max(activeIndex, 0);
  for (let offset = 0; offset < options.length; offset += 1) {
    const index = (start + offset) % options.length;
    const option = options[index]!;
    if (!option.disabled && option.label.toLowerCase().startsWith(query)) return index;
  }
  return -1;
}

/** True for a single printable character typed without a command modifier. */
export const isPrintable = (event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}) => event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
