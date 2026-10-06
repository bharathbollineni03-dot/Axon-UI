import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('a', 100));
    expect(result.current).toBe('a');
  });

  it('only updates after the value has been stable for the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    act(() => vi.advanceTimersByTime(60));
    rerender({ value: 'c' });
    act(() => vi.advanceTimersByTime(60));
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(40));
    expect(result.current).toBe('c');
  });

  it('updates right away when the delay is 0', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 0), {
      initialProps: { value: 1 },
    });
    rerender({ value: 2 });
    expect(result.current).toBe(2);
  });
});
