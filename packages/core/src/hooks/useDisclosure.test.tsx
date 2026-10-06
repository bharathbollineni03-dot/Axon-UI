import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDisclosure } from './useDisclosure';

describe('useDisclosure', () => {
  it('starts closed, or open with defaultOpen', () => {
    expect(renderHook(() => useDisclosure()).result.current.open).toBe(false);
    expect(renderHook(() => useDisclosure({ defaultOpen: true })).result.current.open).toBe(true);
  });

  it('opens, closes and toggles', () => {
    const { result } = renderHook(() => useDisclosure());
    act(() => result.current.onOpen());
    expect(result.current.open).toBe(true);
    act(() => result.current.onClose());
    expect(result.current.open).toBe(false);
    act(() => result.current.onToggle());
    expect(result.current.open).toBe(true);
    act(() => result.current.onToggle());
    expect(result.current.open).toBe(false);
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
  });

  it('calls onOpenChange, onOpen and onClose only on real changes', () => {
    const onOpenChange = vi.fn();
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() => useDisclosure({ onOpenChange, onOpen, onClose }));
    act(() => result.current.onClose()); // already closed: no change
    expect(onOpenChange).not.toHaveBeenCalled();
    act(() => result.current.onOpen());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(onOpen).toHaveBeenCalledTimes(1);
    act(() => result.current.onClose());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('can be controlled', () => {
    const onOpenChange = vi.fn();
    const { result, rerender } = renderHook(({ open }) => useDisclosure({ open, onOpenChange }), {
      initialProps: { open: false },
    });
    act(() => result.current.onOpen());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(result.current.open).toBe(false);
    rerender({ open: true });
    expect(result.current.open).toBe(true);
  });

  it('returns stable callbacks', () => {
    const { result, rerender } = renderHook(() => useDisclosure());
    const { onOpen, onClose, onToggle } = result.current;
    rerender();
    expect(result.current.onOpen).toBe(onOpen);
    expect(result.current.onClose).toBe(onClose);
    expect(result.current.onToggle).toBe(onToggle);
  });
});
