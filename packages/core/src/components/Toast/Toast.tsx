import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { Portal } from '../Portal';
import { ToastItem } from './ToastItem';
import { createToastStore, type ToastApi, type ToastEntry } from './toastStore';

export type ToastPlacement =
  'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface ToastProviderProps {
  children?: ReactNode;
  placement?: ToastPlacement;
  /** Default milliseconds before a toast closes itself. `0` or `Infinity` means never. Defaults to 5000. */
  duration?: number;
  /**
   * The most toasts on screen at once. Newer ones wait in a queue and appear, in order, as
   * others close. Defaults to 3.
   */
  limit?: number;
  /** Accessible name of the region that holds the toasts. */
  label?: string;
  /** Accessible name of each toast's close button. */
  dismissLabel?: string;
  /** Where to render the toasts. Defaults to the closest `.axon-root`, or `<body>`. */
  container?: HTMLElement | null;
  /** Class name for the region that holds the toasts. */
  className?: string;
}

const ToastContext = createContext<ToastApi | null>(null);

const noToasts: readonly ToastEntry[] = [];
const getServerSnapshot = () => noToasts;

/**
 * Shows toasts: brief messages that appear over the page and close themselves. Put it once near
 * the root of your app, inside `ThemeProvider`, and call `useToast()` anywhere below it.
 *
 * Toasts queue past `limit`, stop their timer while hovered or focused, and close with Esc when
 * focused. Each one is announced by itself: `danger` toasts are `role="alert"`, the others
 * `role="status"`. The region around them is a labelled landmark that exists only while there
 * is something to show.
 */
export function ToastProvider({
  children,
  placement = 'bottom-right',
  duration = 5000,
  limit = 3,
  label = 'Notifications',
  dismissLabel = 'Dismiss notification',
  container,
  className,
}: ToastProviderProps) {
  const [store] = useState(createToastStore);
  const toasts = useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
  const visible = toasts.slice(0, Math.max(1, Math.floor(limit)));

  return (
    <ToastContext.Provider value={store.api}>
      {children}
      <Portal container={container}>
        {visible.length > 0 ? (
          <div
            role="region"
            aria-label={label}
            className={cx('axon-toast-region', `axon-toast-region--${placement}`, className)}
          >
            {visible.map((toast) => (
              <ToastItem
                key={toast.id}
                toast={toast}
                defaultDuration={duration}
                dismissLabel={dismissLabel}
                onDismiss={store.remove}
              />
            ))}
          </div>
        ) : null}
      </Portal>
    </ToastContext.Provider>
  );
}

/**
 * The functions that show and close toasts. The same object is returned on every render, so it
 * can go in a dependency array. Must be used below a `ToastProvider`.
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside a <ToastProvider>.');
  return api;
}
