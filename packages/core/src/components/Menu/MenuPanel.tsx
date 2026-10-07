import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  size as sizeMiddleware,
  useFloating,
  type Placement,
} from '@floating-ui/react';
import { cx } from '../../utils/cx';
import { useMergedRef } from '../../utils/mergeRefs';
import { getPortalRoot } from '../../internal/portal';
import { findByTypeahead, isPrintable } from '../../internal/Listbox/typeahead';
import { MenuPanelContext, useMenuTree, type MenuCloseReason } from './MenuContext';

export type MenuInitialFocus = 'first' | 'last' | 'panel' | 'none';

export interface MenuPanelProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  /** The element the panel is anchored to: the trigger, or the submenu item. */
  reference: HTMLElement | null;
  placement: Placement;
  /** The root panel of a tree handles outside presses; submenus do not. */
  isRoot: boolean;
  /** What receives focus when the panel opens. */
  initialFocus?: MenuInitialFocus;
  onRequestClose: (reason: MenuCloseReason | 'arrow-left') => void;
}

const ITEM_SELECTOR =
  '[role="menuitem"]:not([aria-disabled="true"]), [role="menuitemcheckbox"]:not([aria-disabled="true"]), [role="menuitemradio"]:not([aria-disabled="true"])';

/** The enabled items of one panel, in DOM order. Submenus are portaled, so they are never included. */
export const getMenuItems = (panel: HTMLElement | null): HTMLElement[] =>
  panel ? Array.from(panel.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) : [];

const focusItem = (item: HTMLElement | undefined) => item?.focus();

/** How long typed characters keep extending the search. */
const TYPEAHEAD_TIMEOUT = 500;

/**
 * The floating `menu` shared by `Menu` and submenus: positioning, roving focus between items,
 * typeahead, and the keys that close it. Items take DOM focus (the "roving" pattern, with
 * `tabindex="-1"` on every item and focus moved by the panel).
 */
export const MenuPanel = forwardRef<HTMLDivElement, MenuPanelProps>(function MenuPanel(
  {
    open,
    reference,
    placement,
    isRoot,
    initialFocus = 'panel',
    onRequestClose,
    className,
    style,
    children,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const tree = useMenuTree();
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const { refs, floatingStyles } = useFloating({
    open,
    elements: { reference },
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      // Submenus overlap their parent's edge by a few pixels so the pointer never crosses a gap.
      offset(isRoot ? 4 : { mainAxis: -2, alignmentAxis: -5 }),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      sizeMiddleware({
        padding: 8,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${Math.max(120, availableHeight)}px`;
        },
      }),
    ],
  });
  const mergedRef = useMergedRef<HTMLDivElement>(ref, setPanel, refs.setFloating);

  const onRequestCloseRef = useRef(onRequestClose);
  onRequestCloseRef.current = onRequestClose;
  const initialFocusRef = useRef(initialFocus);
  initialFocusRef.current = initialFocus;

  // The panel mounts a render after `open` (the portal node is created first), so focus is
  // moved when the element itself appears.
  useEffect(() => {
    if (!panel) return;
    const items = getMenuItems(panel);
    const target =
      initialFocusRef.current === 'first'
        ? items[0]
        : initialFocusRef.current === 'last'
          ? items[items.length - 1]
          : initialFocusRef.current === 'panel'
            ? panel
            : undefined;
    target?.focus({ preventScroll: true });
  }, [panel]);

  useEffect(() => {
    if (!open) setOpenSubmenu(null);
  }, [open]);

  // A press outside the whole tree closes it. Presses on the trigger are the trigger's to handle.
  useEffect(() => {
    if (!open || !isRoot) return undefined;
    const doc = (reference ?? panel)?.ownerDocument;
    if (!doc) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target || reference?.contains(target)) return;
      if (target.closest?.(`[data-axon-menu-tree="${tree.treeId}"]`)) return;
      onRequestCloseRef.current('outside');
    };
    doc.addEventListener('pointerdown', handlePointerDown, true);
    return () => doc.removeEventListener('pointerdown', handlePointerDown, true);
  }, [open, isRoot, reference, panel, tree.treeId]);

  const search = useRef({
    text: '',
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  });
  useEffect(() => () => clearTimeout(search.current.timer), []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    // Events from a submenu bubble through React's tree to its parent; only act on our own DOM.
    if (event.defaultPrevented || !panel || !panel.contains(event.target as Node)) return;

    const items = getMenuItems(panel);
    const index = items.indexOf(panel.ownerDocument.activeElement as HTMLElement);
    const count = items.length;

    switch (event.key) {
      case 'ArrowDown':
        focusItem(items[index === -1 ? 0 : (index + 1) % count]);
        break;
      case 'ArrowUp':
        focusItem(items[index <= 0 ? count - 1 : index - 1]);
        break;
      case 'Home':
        focusItem(items[0]);
        break;
      case 'End':
        focusItem(items[count - 1]);
        break;
      case 'Escape':
        onRequestClose('escape');
        break;
      case 'Tab':
        onRequestClose('tab');
        break;
      case 'ArrowLeft':
        if (isRoot) return;
        onRequestClose('arrow-left');
        break;
      default: {
        if (!isPrintable(event)) return;
        // A space starts an activation, not a search, unless a search is already under way.
        if (event.key === ' ' && search.current.text === '') return;
        search.current.text += event.key.toLowerCase();
        clearTimeout(search.current.timer);
        search.current.timer = setTimeout(() => {
          search.current.text = '';
        }, TYPEAHEAD_TIMEOUT);
        const options = items.map((item, i) => ({
          value: String(i),
          label: (item.textContent ?? '').trim(),
        }));
        const match = findByTypeahead(options, search.current.text, index);
        if (match !== -1) focusItem(items[match]);
      }
    }
    // Handled here: the page (or a dialog around the menu) must not react to the same key.
    event.preventDefault();
    event.stopPropagation();
  };

  const context = useMemo(() => ({ openSubmenu, setOpenSubmenu }), [openSubmenu]);

  if (!open) return null;

  return (
    <FloatingPortal root={getPortalRoot(reference)}>
      <MenuPanelContext.Provider value={context}>
        {/* The menu role makes this interactive; focus is managed by the key handler. */}
        <div
          aria-orientation="vertical"
          {...rest}
          ref={mergedRef}
          role="menu"
          tabIndex={-1}
          data-axon-menu-tree={tree.treeId}
          style={{ ...floatingStyles, ...style }}
          className={cx('axon-menu', `axon-menu--${tree.color}`, className)}
          onKeyDown={handleKeyDown}
        >
          {children}
        </div>
      </MenuPanelContext.Provider>
    </FloatingPortal>
  );
});
