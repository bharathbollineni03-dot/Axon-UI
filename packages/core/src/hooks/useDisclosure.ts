import { useCallback, useMemo } from 'react';
import { useControllableState } from './useControllableState';

export interface UseDisclosureOptions {
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface UseDisclosureReturn {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  setOpen: (open: boolean) => void;
}

/** Open/closed state for dialogs, drawers, menus and collapsible sections. */
export function useDisclosure({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onOpen: onOpenCallback,
  onClose: onCloseCallback,
}: UseDisclosureOptions = {}): UseDisclosureReturn {
  const [open, setOpenState] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: (next) => {
      onOpenChange?.(next);
      if (next) onOpenCallback?.();
      else onCloseCallback?.();
    },
  });

  const onOpen = useCallback(() => setOpenState(true), [setOpenState]);
  const onClose = useCallback(() => setOpenState(false), [setOpenState]);
  const onToggle = useCallback(() => setOpenState((current) => !current), [setOpenState]);

  return useMemo(
    () => ({ open, onOpen, onClose, onToggle, setOpen: setOpenState }),
    [open, onOpen, onClose, onToggle, setOpenState],
  );
}
