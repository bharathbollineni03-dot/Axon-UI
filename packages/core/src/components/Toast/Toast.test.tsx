import { renderToString } from 'react-dom/server';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import { ToastProvider, useToast, type ToastProviderProps } from './Toast';
import type { ToastApi } from './toastStore';

/** The toast functions, captured from inside the provider so tests can call them from anywhere. */
let toast: ToastApi;
function Capture() {
  toast = useToast();
  return null;
}

function setup(props: Partial<ToastProviderProps> = {}) {
  return render(
    <ToastProvider {...props}>
      <Capture />
    </ToastProvider>,
  );
}

/** Escape pressed wherever focus is, which is what a real key press targets. */
const pressEscape = () =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastProvider and useToast', () => {
  it('throws a helpful error when used outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Capture />)).toThrow('useToast must be used inside a <ToastProvider>.');
  });

  it('renders its children and no region until there is a toast', () => {
    render(
      <ToastProvider>
        <p>App</p>
      </ToastProvider>,
    );
    expect(screen.getByText('App')).toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('renders nothing but its children on the server', () => {
    // jsdom has a `window`, so Portal's layout effect is a real `useLayoutEffect` here and React
    // warns about it on the server. A real server has no `window` and uses a plain effect.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderToString(
      <ToastProvider>
        <p>App</p>
      </ToastProvider>,
    );
    expect(html).toContain('App');
    expect(html).not.toContain('axon-toast');
  });

  it('keeps the same API object across renders', () => {
    const seen = new Set<ToastApi>();
    function Probe() {
      toast = useToast();
      seen.add(toast);
      return null;
    }
    const { rerender } = render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    );
    act(() => {
      toast.show({ title: 'A' });
    });
    rerender(
      <ToastProvider duration={1000}>
        <Probe />
      </ToastProvider>,
    );
    expect(seen.size).toBe(1);
  });

  describe('showing', () => {
    it('shows a toast in a labelled region', () => {
      setup();
      act(() => {
        toast.show({ title: 'Saved', description: 'Your changes are live.' });
      });
      const region = screen.getByRole('region', { name: 'Notifications' });
      expect(region).toHaveTextContent('Saved');
      expect(region).toHaveTextContent('Your changes are live.');
    });

    it('returns an id for each toast', () => {
      setup();
      let first = '';
      let second = '';
      act(() => {
        first = toast.show({ title: 'One' });
        second = toast.show({ title: 'Two' });
      });
      expect(first).toBeTruthy();
      expect(first).not.toBe(second);
    });

    it('uses an id you give it', () => {
      setup();
      let id = '';
      act(() => {
        id = toast.show({ id: 'upload', title: 'Uploading' });
      });
      expect(id).toBe('upload');
    });

    it('shows the newest toast last', () => {
      setup();
      act(() => {
        toast.show({ title: 'First' });
        toast.show({ title: 'Second' });
      });
      const texts = screen.getAllByRole('status').map((el) => el.textContent);
      expect(texts).toEqual(['First', 'Second']);
    });

    it('has shorthands for each status', () => {
      setup({ limit: 4 });
      act(() => {
        toast.info('Info');
        toast.success('Success');
        toast.warning('Warning');
        toast.danger('Danger', { description: 'It broke.' });
      });
      expect(screen.getByText('Info').closest('.axon-toast')).toHaveClass('axon-toast--info');
      expect(screen.getByText('Success').closest('.axon-toast')).toHaveClass('axon-toast--success');
      expect(screen.getByText('Warning').closest('.axon-toast')).toHaveClass('axon-toast--warning');
      const danger = screen.getByText('Danger').closest('.axon-toast');
      expect(danger).toHaveClass('axon-toast--danger');
      expect(danger).toHaveTextContent('It broke.');
    });

    it('defaults to an info toast', () => {
      setup();
      act(() => {
        toast.show({ title: 'Hello' });
      });
      expect(screen.getByRole('status')).toHaveClass('axon-toast--info');
    });

    it('applies the placement to the region', () => {
      setup({ placement: 'top-center' });
      act(() => {
        toast.show({ title: 'Hello' });
      });
      expect(screen.getByRole('region')).toHaveClass(
        'axon-toast-region',
        'axon-toast-region--top-center',
      );
    });

    it('defaults to the bottom right and merges a className onto the region', () => {
      setup({ className: 'extra' });
      act(() => {
        toast.show({ title: 'Hello' });
      });
      expect(screen.getByRole('region')).toHaveClass('axon-toast-region--bottom-right', 'extra');
    });

    it('renders into a container you choose', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      setup({ container });
      act(() => {
        toast.show({ title: 'Hello' });
      });
      expect(container).toContainElement(screen.getByRole('region'));
      container.remove();
    });

    it('can hide the icon or replace it', () => {
      setup({ limit: 2 });
      act(() => {
        toast.show({ title: 'Plain', icon: false });
        toast.show({ title: 'Custom', icon: <svg data-testid="custom" /> });
      });
      expect(
        screen.getByText('Plain').closest('.axon-toast')?.querySelector('.axon-toast__icon'),
      ).toBeNull();
      expect(screen.getByTestId('custom').parentElement).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('announcing', () => {
    it('announces a danger toast with role="alert"', () => {
      setup();
      act(() => {
        toast.danger('Payment failed');
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Payment failed');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it.each(['info', 'success', 'warning'] as const)(
      'announces a %s toast politely with role="status"',
      (status) => {
        setup();
        act(() => {
          toast.show({ title: 'Message', status });
        });
        expect(screen.getByRole('status')).toHaveTextContent('Message');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      },
    );

    it('announces the whole toast, not just the part that changed', () => {
      setup();
      act(() => {
        toast.show({ title: 'Saved' });
      });
      expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
    });

    it('names the region and the close buttons, and lets you translate both', () => {
      setup({ label: 'Avisos', dismissLabel: 'Cerrar aviso' });
      act(() => {
        toast.show({ title: 'Hola' });
      });
      expect(screen.getByRole('region', { name: 'Avisos' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cerrar aviso' })).toBeInTheDocument();
    });
  });

  describe('auto-dismiss', () => {
    it('closes after 5 seconds by default', () => {
      setup();
      act(() => {
        toast.show({ title: 'Saved' });
      });
      advance(4999);
      expect(screen.getByText('Saved')).toBeInTheDocument();
      advance(1);
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });

    it('removes the region once the last toast has gone', () => {
      setup();
      act(() => {
        toast.show({ title: 'Saved' });
      });
      advance(5000);
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('uses the provider duration, and a toast can override it', () => {
      setup({ duration: 1000 });
      act(() => {
        toast.show({ title: 'Quick' });
        toast.show({ title: 'Slow', duration: 3000 });
      });
      advance(1000);
      expect(screen.queryByText('Quick')).not.toBeInTheDocument();
      expect(screen.getByText('Slow')).toBeInTheDocument();
      advance(2000);
      expect(screen.queryByText('Slow')).not.toBeInTheDocument();
    });

    it.each([0, Infinity])('stays until dismissed when the duration is %s', (duration) => {
      setup();
      act(() => {
        toast.show({ title: 'Sticky', duration });
      });
      advance(10 * 60 * 1000);
      expect(screen.getByText('Sticky')).toBeInTheDocument();
    });
  });

  describe('pausing', () => {
    it('stops the timer while the pointer is over the toast and resumes where it stopped', () => {
      setup();
      act(() => {
        toast.show({ title: 'Saved', duration: 4000 });
      });
      advance(3000);
      const element = screen.getByRole('status');
      fireEvent.pointerEnter(element);
      advance(60_000);
      expect(screen.getByText('Saved')).toBeInTheDocument();
      fireEvent.pointerLeave(element);
      advance(999);
      expect(screen.getByText('Saved')).toBeInTheDocument();
      advance(1);
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });

    it('only pauses the toast that is hovered', () => {
      setup();
      act(() => {
        toast.show({ title: 'First', duration: 1000 });
        toast.show({ title: 'Second', duration: 1000 });
      });
      fireEvent.pointerEnter(screen.getByText('First'));
      advance(1000);
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.queryByText('Second')).not.toBeInTheDocument();
    });

    it('stops the timer while focus is inside the toast', () => {
      setup();
      act(() => {
        toast.show({ title: 'Saved', duration: 2000 });
      });
      advance(1500);
      act(() => {
        screen.getByRole('button', { name: 'Dismiss notification' }).focus();
      });
      advance(60_000);
      expect(screen.getByText('Saved')).toBeInTheDocument();
      act(() => {
        screen.getByRole('button', { name: 'Dismiss notification' }).blur();
      });
      advance(500);
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });

    it('stays paused while the pointer leaves but focus is still inside', () => {
      setup();
      act(() => {
        toast.show({ title: 'Saved', duration: 1000 });
      });
      const close = screen.getByRole('button', { name: 'Dismiss notification' });
      fireEvent.pointerEnter(close);
      act(() => {
        close.focus();
      });
      fireEvent.pointerLeave(close);
      advance(60_000);
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });

  describe('dismissing', () => {
    it('closes from the close button', () => {
      setup();
      act(() => {
        toast.show({ title: 'Saved' });
      });
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });

    it('omits the close button when dismissible is false', () => {
      setup();
      act(() => {
        toast.show({ title: 'Saved', dismissible: false });
      });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('closes with Escape while focus is inside the toast', () => {
      setup();
      act(() => {
        toast.show({ title: 'First', duration: 0 });
        toast.show({ title: 'Second', duration: 0 });
      });
      act(() => {
        screen.getAllByRole('button', { name: 'Dismiss notification' })[0]!.focus();
      });
      pressEscape();
      expect(screen.queryByText('First')).not.toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });

    it('ignores Escape when focus is elsewhere', () => {
      setup();
      act(() => {
        toast.show({ title: 'Saved', duration: 0 });
      });
      pressEscape();
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('closes one toast by id', () => {
      setup();
      act(() => {
        toast.show({ id: 'a', title: 'A', duration: 0 });
        toast.show({ id: 'b', title: 'B', duration: 0 });
      });
      act(() => {
        toast.dismiss('a');
      });
      expect(screen.queryByText('A')).not.toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('ignores an id that is not showing', () => {
      setup();
      act(() => {
        toast.show({ title: 'A', duration: 0 });
      });
      act(() => {
        toast.dismiss('nope');
      });
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('closes everything, including toasts that are queued', () => {
      setup({ limit: 1 });
      act(() => {
        toast.show({ title: 'A', duration: 0 });
        toast.show({ title: 'B', duration: 0 });
      });
      act(() => {
        toast.dismissAll();
      });
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
      expect(screen.queryByText('B')).not.toBeInTheDocument();
    });

    describe('onDismiss', () => {
      it('reports "timeout"', () => {
        const onDismiss = vi.fn();
        setup();
        act(() => {
          toast.show({ title: 'Saved', onDismiss });
        });
        advance(5000);
        expect(onDismiss).toHaveBeenCalledExactlyOnceWith('timeout');
      });

      it('reports "close-button"', () => {
        const onDismiss = vi.fn();
        setup();
        act(() => {
          toast.show({ title: 'Saved', onDismiss });
        });
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
        expect(onDismiss).toHaveBeenCalledExactlyOnceWith('close-button');
      });

      it('reports "escape"', () => {
        const onDismiss = vi.fn();
        setup();
        act(() => {
          toast.show({ title: 'Saved', onDismiss });
        });
        act(() => {
          screen.getByRole('button', { name: 'Dismiss notification' }).focus();
        });
        pressEscape();
        expect(onDismiss).toHaveBeenCalledExactlyOnceWith('escape');
      });

      it('reports "programmatic" for dismiss and dismissAll', () => {
        const onDismiss = vi.fn();
        setup();
        act(() => {
          toast.show({ id: 'a', title: 'A', onDismiss });
          toast.show({ id: 'b', title: 'B', onDismiss });
        });
        act(() => {
          toast.dismiss('a');
        });
        expect(onDismiss).toHaveBeenLastCalledWith('programmatic');
        act(() => {
          toast.dismissAll();
        });
        expect(onDismiss).toHaveBeenCalledTimes(2);
        expect(onDismiss).toHaveBeenLastCalledWith('programmatic');
      });

      it('is called once per toast, and not when a toast is replaced', () => {
        const onDismiss = vi.fn();
        setup();
        act(() => {
          toast.show({ id: 'a', title: 'A', onDismiss });
        });
        act(() => {
          toast.show({ id: 'a', title: 'A again' });
        });
        expect(onDismiss).not.toHaveBeenCalled();
      });
    });
  });

  describe('actions', () => {
    it('runs the action, then closes the toast', () => {
      const onClick = vi.fn();
      const onDismiss = vi.fn();
      setup();
      act(() => {
        toast.show({ title: 'Message archived', action: { label: 'Undo', onClick }, onDismiss });
      });
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledExactlyOnceWith('action');
      expect(screen.queryByText('Message archived')).not.toBeInTheDocument();
    });
  });

  describe('queueing', () => {
    it('shows at most `limit` toasts and queues the rest', () => {
      setup({ limit: 2 });
      act(() => {
        toast.show({ title: 'One', duration: 0 });
        toast.show({ title: 'Two', duration: 0 });
        toast.show({ title: 'Three', duration: 0 });
        toast.show({ title: 'Four', duration: 0 });
      });
      expect(screen.getAllByRole('status')).toHaveLength(2);
      expect(screen.queryByText('Three')).not.toBeInTheDocument();
    });

    it('shows three at a time by default', () => {
      setup();
      act(() => {
        for (let i = 1; i <= 5; i++) toast.show({ title: `Toast ${i}`, duration: 0 });
      });
      expect(screen.getAllByRole('status')).toHaveLength(3);
    });

    it('shows queued toasts in order as room frees up', () => {
      setup({ limit: 2 });
      act(() => {
        toast.show({ id: 'one', title: 'One', duration: 0 });
        toast.show({ title: 'Two', duration: 0 });
        toast.show({ title: 'Three', duration: 0 });
        toast.show({ title: 'Four', duration: 0 });
      });
      act(() => {
        toast.dismiss('one');
      });
      expect(screen.getAllByRole('status').map((el) => el.textContent)).toEqual(['Two', 'Three']);
    });

    it('starts the timer of a queued toast only when it appears', () => {
      setup({ limit: 1 });
      act(() => {
        toast.show({ title: 'First', duration: 1000 });
        toast.show({ title: 'Second', duration: 1000 });
      });
      advance(1000);
      expect(screen.queryByText('First')).not.toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      advance(999);
      expect(screen.getByText('Second')).toBeInTheDocument();
      advance(1);
      expect(screen.queryByText('Second')).not.toBeInTheDocument();
    });

    it('treats a limit below 1 as 1', () => {
      setup({ limit: 0 });
      act(() => {
        toast.show({ title: 'One', duration: 0 });
        toast.show({ title: 'Two', duration: 0 });
      });
      expect(screen.getAllByRole('status')).toHaveLength(1);
    });
  });

  describe('replacing a toast by id', () => {
    it('updates the toast in place', () => {
      setup();
      act(() => {
        toast.show({ id: 'save', title: 'Saving…', duration: 0 });
        toast.show({ title: 'Other', duration: 0 });
      });
      act(() => {
        toast.show({ id: 'save', title: 'Saved', status: 'success', duration: 0 });
      });
      const toasts = screen.getAllByRole('status');
      expect(toasts.map((el) => el.textContent)).toEqual(['Saved', 'Other']);
      expect(toasts[0]).toHaveClass('axon-toast--success');
      expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
    });

    it('does not keep the old duration', () => {
      setup();
      act(() => {
        toast.show({ id: 'save', title: 'Saving…', duration: Infinity });
      });
      act(() => {
        toast.show({ id: 'save', title: 'Saved' });
      });
      advance(5000);
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });

    it('restarts the timer', () => {
      setup();
      act(() => {
        toast.show({ id: 'x', title: 'Hello', duration: 1000 });
      });
      advance(800);
      act(() => {
        toast.show({ id: 'x', title: 'Hello again', duration: 1000 });
      });
      advance(800);
      expect(screen.getByText('Hello again')).toBeInTheDocument();
      advance(200);
      expect(screen.queryByText('Hello again')).not.toBeInTheDocument();
    });

    it('replaces a toast that is still queued', () => {
      setup({ limit: 1 });
      act(() => {
        toast.show({ title: 'Front', duration: 0 });
        toast.show({ id: 'later', title: 'Draft', duration: 0 });
        toast.show({ id: 'later', title: 'Final', duration: 0 });
      });
      act(() => {
        toast.dismissAll();
      });
      expect(screen.queryByText('Draft')).not.toBeInTheDocument();
    });
  });

  it('has no accessibility violations', async () => {
    vi.useRealTimers();
    setup({ limit: 5 });
    act(() => {
      toast.info('Info', { description: 'Something to know.', duration: 0 });
      toast.success('Success', { duration: 0, action: { label: 'View', onClick: () => {} } });
      toast.warning('Warning', { duration: 0 });
      toast.danger('Danger', { description: 'It broke.', duration: 0 });
      toast.show({ title: 'No close', dismissible: false, duration: 0 });
    });
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
  });
});
