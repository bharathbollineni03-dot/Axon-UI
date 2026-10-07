import { createRef, forwardRef } from 'react';
import { render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getElementRef, mergeRefs, useMergedRef } from './mergeRefs';

describe('mergeRefs', () => {
  it('sets object refs and calls callback refs, ignoring undefined', () => {
    const object = createRef<HTMLDivElement>();
    const callback = vi.fn();
    const node = document.createElement('div');
    mergeRefs<HTMLDivElement>(object, callback, undefined)(node);
    expect(object.current).toBe(node);
    expect(callback).toHaveBeenCalledWith(node);
    mergeRefs<HTMLDivElement>(object, callback)(null);
    expect(object.current).toBeNull();
    expect(callback).toHaveBeenLastCalledWith(null);
  });
});

describe('useMergedRef', () => {
  it('returns the same callback while the refs are the same', () => {
    const a = createRef<HTMLDivElement>();
    const { result, rerender } = renderHook(() => useMergedRef(a));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe('getElementRef', () => {
  it('reads the ref of an element whatever the React version', () => {
    const Box = forwardRef<HTMLDivElement, object>(function Box(_props, ref) {
      return <div ref={ref} />;
    });
    const ref = createRef<HTMLDivElement>();
    const element = <Box ref={ref} />;
    expect(getElementRef(element)).toBe(ref);
    render(element);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('is empty when the element has no ref', () => {
    expect(getElementRef(<div />) ?? null).toBeNull();
  });
});
