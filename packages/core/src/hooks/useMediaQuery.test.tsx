import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from './useMediaQuery';

function mockMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }));
  return {
    set(value: boolean) {
      matches = value;
      act(() => listeners.forEach((cb) => cb()));
    },
    listenerCount: () => listeners.size,
  };
}

describe('useMediaQuery', () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it('returns whether the query matches', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
  });

  it('updates when the match changes', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
    media.set(true);
    expect(result.current).toBe(true);
    media.set(false);
    expect(result.current).toBe(false);
  });

  it('follows a changed query', () => {
    mockMatchMedia(true);
    const { rerender } = renderHook(({ q }) => useMediaQuery(q), {
      initialProps: { q: '(min-width: 100px)' },
    });
    rerender({ q: '(min-width: 200px)' });
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 200px)');
  });

  it('stops listening on unmount', () => {
    const media = mockMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(media.listenerCount()).toBe(1);
    unmount();
    expect(media.listenerCount()).toBe(0);
  });

  it('falls back to the default value without matchMedia', () => {
    // @ts-expect-error simulate an environment without matchMedia
    window.matchMedia = undefined;
    expect(renderHook(() => useMediaQuery('(min-width: 1px)')).result.current).toBe(false);
    expect(renderHook(() => useMediaQuery('(min-width: 1px)', true)).result.current).toBe(true);
  });
});
