import type { ReactNode } from 'react';
import type { Status } from '../../internal/StatusIcon/StatusIcon';

export type ToastStatus = Status;

/** Why a toast went away, passed to `onDismiss`. */
export type ToastDismissReason = 'timeout' | 'close-button' | 'action' | 'escape' | 'programmatic';

export interface ToastAction {
  label: ReactNode;
  /** Runs when the action is pressed. The toast is dismissed afterwards. */
  onClick: () => void;
}

export interface ToastOptions {
  /**
   * Gives the toast an id you choose. Showing a toast with the id of one that is already on
   * screen (or waiting in the queue) replaces it in place and restarts its timer, which is how a
   * "Saving…" toast becomes "Saved".
   */
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  /** Sets the color, the icon and how the toast is announced. Defaults to `info`. */
  status?: ToastStatus;
  /** Replaces the status icon, or pass `false` to show none. Decorative. */
  icon?: ReactNode | false;
  /**
   * Milliseconds before the toast closes itself. `0` or `Infinity` keeps it until it is
   * dismissed. Defaults to the provider's `duration`.
   */
  duration?: number;
  action?: ToastAction;
  /** Shows a close button. Defaults to true. */
  dismissible?: boolean;
  onDismiss?: (reason: ToastDismissReason) => void;
}

/** A toast as the store keeps it. `version` goes up each time the toast is replaced. */
export interface ToastEntry extends ToastOptions {
  id: string;
  version: number;
}

type ShorthandOptions = Omit<ToastOptions, 'status' | 'title'>;

export interface ToastApi {
  /** Shows a toast and returns its id. */
  show: (options: ToastOptions) => string;
  info: (title: ReactNode, options?: ShorthandOptions) => string;
  success: (title: ReactNode, options?: ShorthandOptions) => string;
  warning: (title: ReactNode, options?: ShorthandOptions) => string;
  danger: (title: ReactNode, options?: ShorthandOptions) => string;
  /** Closes a toast, whether it is showing or still queued. Does nothing for an unknown id. */
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export interface ToastStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => readonly ToastEntry[];
  /** Like `api.dismiss`, with the reason reported to `onDismiss`. */
  remove: (id: string, reason: ToastDismissReason) => void;
  /** Stable for the life of the store, so it is safe in dependency arrays. */
  api: ToastApi;
}

/**
 * The toasts, outside of React state so that the functions in `api` never change and can be
 * called from anywhere (event handlers, effects, timers) without stale closures. Components read
 * it with `useSyncExternalStore`. Callbacks run after the store has updated, never during render.
 */
export function createToastStore(): ToastStore {
  let toasts: readonly ToastEntry[] = [];
  let counter = 0;
  const listeners = new Set<() => void>();

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const show = (options: ToastOptions): string => {
    const id = options.id ?? `axon-toast-${++counter}`;
    const exists = toasts.some((toast) => toast.id === id);
    toasts = exists
      ? toasts.map((toast) =>
          toast.id === id ? { ...options, id, version: toast.version + 1 } : toast,
        )
      : [...toasts, { ...options, id, version: 0 }];
    notify();
    return id;
  };

  const remove = (id: string, reason: ToastDismissReason) => {
    const toast = toasts.find((candidate) => candidate.id === id);
    if (!toast) return;
    toasts = toasts.filter((candidate) => candidate.id !== id);
    notify();
    toast.onDismiss?.(reason);
  };

  const dismissAll = () => {
    const removed = toasts;
    if (removed.length === 0) return;
    toasts = [];
    notify();
    removed.forEach((toast) => toast.onDismiss?.('programmatic'));
  };

  const withStatus =
    (status: ToastStatus) =>
    (title: ReactNode, options?: ShorthandOptions): string =>
      show({ ...options, status, title });

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => toasts,
    remove,
    api: {
      show,
      info: withStatus('info'),
      success: withStatus('success'),
      warning: withStatus('warning'),
      danger: withStatus('danger'),
      dismiss: (id) => remove(id, 'programmatic'),
      dismissAll,
    },
  };
}
