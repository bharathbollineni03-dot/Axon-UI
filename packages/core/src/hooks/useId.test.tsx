import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useId } from './useId';

describe('useId', () => {
  it('returns a prefixed id without characters that need escaping in selectors', () => {
    const { result } = renderHook(() => useId());
    expect(result.current).toMatch(/^axon-[A-Za-z0-9_-]+$/);
  });

  it('supports a custom prefix', () => {
    const { result } = renderHook(() => useId(undefined, 'field'));
    expect(result.current).toMatch(/^field-/);
  });

  it('is stable across renders and unique across calls', () => {
    const { result, rerender } = renderHook(() => [useId(), useId()] as const);
    const [first, second] = result.current;
    expect(first).not.toBe(second);
    rerender();
    expect(result.current).toEqual([first, second]);
  });

  it('uses the id a caller supplies', () => {
    const { result } = renderHook(() => useId('my-id'));
    expect(result.current).toBe('my-id');
  });
});
