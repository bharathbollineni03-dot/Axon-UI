import { useEffect, useLayoutEffect } from 'react';

/** `useLayoutEffect` in the browser and `useEffect` on the server, where the first would warn. */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
