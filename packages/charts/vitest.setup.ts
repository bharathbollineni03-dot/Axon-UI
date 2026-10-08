/**
 * jsdom does not implement `PointerEvent`, so a pointer event would reach a handler with no
 * coordinates. Charts follow the pointer, so give the tests a minimal one: a mouse event that also
 * carries the pointer fields.
 */
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class TestPointerEvent extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'mouse';
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  Object.defineProperty(window, 'PointerEvent', {
    value: TestPointerEvent,
    configurable: true,
    writable: true,
  });
}
