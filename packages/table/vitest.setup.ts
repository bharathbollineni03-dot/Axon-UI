/**
 * jsdom lays nothing out, so a virtualized grid would measure a scroll area of zero by zero and
 * render no rows. Tests give the grid a size through its `height` prop; this makes the element
 * report that size when something asks, and stubs `ResizeObserver` (which jsdom lacks) so the
 * virtualizer's observer can be created.
 */
if (typeof window !== 'undefined') {
  if (typeof window.ResizeObserver === 'undefined') {
    class TestResizeObserver implements ResizeObserver {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        // Report a size once so observers that wait for the first callback get going.
        this.callback(
          [
            {
              target,
              contentRect: target.getBoundingClientRect(),
              borderBoxSize: [],
              contentBoxSize: [],
              devicePixelContentBoxSize: [],
            } as ResizeObserverEntry,
          ],
          this,
        );
      }
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, 'ResizeObserver', {
      value: TestResizeObserver,
      configurable: true,
      writable: true,
    });
  }
}
