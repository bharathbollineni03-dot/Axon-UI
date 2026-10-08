import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResponsiveContainer, type ChartSize } from './ResponsiveContainer';

const original = globalThis.ResizeObserver;
afterEach(() => {
  globalThis.ResizeObserver = original;
});

/** A ResizeObserver the test can drive. */
function stubObserver() {
  const state = {
    callback: (() => {}) as ResizeObserverCallback,
    disconnect: vi.fn(),
    observed: 0,
  };
  globalThis.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) {
      state.callback = callback;
    }
    observe() {
      state.observed += 1;
    }
    unobserve() {}
    disconnect() {
      state.disconnect();
    }
  } as never;
  return {
    state,
    resize: (width: number) =>
      act(() =>
        state.callback([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver),
      ),
  };
}

const Size = ({ size }: { size: ChartSize }) => <output>{`${size.width}x${size.height}`}</output>;

describe('ResponsiveContainer', () => {
  it('uses the fallback width until it can measure, as on the server', () => {
    // jsdom has no layout, so every measurement is 0.
    render(
      <ResponsiveContainer height={200}>{(size) => <Size size={size} />}</ResponsiveContainer>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('600x200');
  });

  it('takes a different fallback', () => {
    render(
      <ResponsiveContainer height={100} fallbackWidth={320}>
        {(size) => <Size size={size} />}
      </ResponsiveContainer>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('320x100');
  });

  it('follows the width its observer reports', () => {
    const { resize } = stubObserver();
    render(
      <ResponsiveContainer height={200}>{(size) => <Size size={size} />}</ResponsiveContainer>,
    );
    resize(480.7);
    expect(screen.getByRole('status')).toHaveTextContent('480x200');
    resize(300);
    expect(screen.getByRole('status')).toHaveTextContent('300x200');
  });

  it('ignores a report of 0, which means it is not laid out', () => {
    const { resize } = stubObserver();
    render(
      <ResponsiveContainer height={200}>{(size) => <Size size={size} />}</ResponsiveContainer>,
    );
    resize(400);
    resize(0);
    expect(screen.getByRole('status')).toHaveTextContent('400x200');
  });

  it('does not observe at all with a fixed width', () => {
    const { state } = stubObserver();
    render(
      <ResponsiveContainer height={200} width={250}>
        {(size) => <Size size={size} />}
      </ResponsiveContainer>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('250x200');
    expect(state.observed).toBe(0);
  });

  it('never gets narrower than minWidth', () => {
    const { resize } = stubObserver();
    render(
      <ResponsiveContainer height={200} minWidth={300}>
        {(size) => <Size size={size} />}
      </ResponsiveContainer>,
    );
    resize(120);
    expect(screen.getByRole('status')).toHaveTextContent('300x200');
  });

  it('stops observing when it unmounts', () => {
    const { state } = stubObserver();
    const { unmount } = render(<ResponsiveContainer height={100}>{null}</ResponsiveContainer>);
    unmount();
    expect(state.disconnect).toHaveBeenCalled();
  });

  it('reports its size', () => {
    const onResize = vi.fn();
    const { resize } = stubObserver();
    render(
      <ResponsiveContainer height={100} onResize={onResize}>
        {null}
      </ResponsiveContainer>,
    );
    expect(onResize).toHaveBeenCalledWith({ width: 600, height: 100 });
    resize(350);
    expect(onResize).toHaveBeenLastCalledWith({ width: 350, height: 100 });
  });

  it('is as tall as asked, fills its parent and takes a class and style', () => {
    const { container } = render(
      <ResponsiveContainer height={180} className="mine" style={{ opacity: 0.5 }}>
        {null}
      </ResponsiveContainer>,
    );
    const element = container.firstElementChild as HTMLElement;
    expect(element).toHaveClass('mine');
    expect(element).toHaveStyle({ height: '180px', width: '100%', opacity: '0.5' });
  });

  it('accepts plain children and forwards a ref', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <ResponsiveContainer height={100} ref={ref}>
        <p>Inside</p>
      </ResponsiveContainer>,
    );
    expect(screen.getByText('Inside')).toBeInTheDocument();
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
