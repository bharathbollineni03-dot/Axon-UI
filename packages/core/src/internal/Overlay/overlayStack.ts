import { useState, useSyncExternalStore } from 'react';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';

/**
 * The open modal overlays, oldest first. Only the last one (the topmost) reacts to Escape and
 * holds the focus trap, so a dialog opened from a dialog closes and traps on its own.
 */
const stack: symbol[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const isTopmostOverlay = (id: symbol) => stack[stack.length - 1] === id;

/** Registers an overlay while `active`, and says whether it is currently the topmost one. */
export function useOverlayStack(active = true): { id: symbol; topmost: boolean } {
  const [id] = useState(() => Symbol('axon-overlay'));

  useIsomorphicLayoutEffect(() => {
    if (!active) return undefined;
    stack.push(id);
    emit();
    return () => {
      stack.splice(stack.indexOf(id), 1);
      emit();
    };
  }, [active, id]);

  const topmost = useSyncExternalStore(
    subscribe,
    () => isTopmostOverlay(id),
    () => false,
  );
  return { id, topmost };
}
