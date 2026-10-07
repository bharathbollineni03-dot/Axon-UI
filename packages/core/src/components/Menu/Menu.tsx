import { forwardRef, useMemo, useRef, type HTMLAttributes } from 'react';
import type { Placement } from '@floating-ui/react';
import type { AxonColor } from '../../types';
import { useId } from '../../hooks/useId';
import { MenuTreeContext, type MenuCloseReason, type MenuTreeContextValue } from './MenuContext';
import { MenuPanel, type MenuInitialFocus } from './MenuPanel';

export type MenuPlacement = Placement;

export interface MenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  open: boolean;
  /** The element the menu is anchored to and positioned against. */
  anchor: HTMLElement | null;
  /**
   * Called when the menu asks to close: Esc, Tab, an outside press, or an item being chosen.
   * You decide what closing means; `DropdownMenu` does this for you.
   */
  onClose: (reason: MenuCloseReason) => void;
  placement?: MenuPlacement;
  /** What receives focus when the menu opens. Defaults to the first item. */
  initialFocus?: MenuInitialFocus;
  /** Color of the check and radio marks. */
  color?: AxonColor;
}

/**
 * A floating menu of actions that you open and position yourself (a context menu, say). For the
 * usual button-opens-a-menu case use `DropdownMenu`. Fill it with `MenuItem`, `MenuCheckboxItem`,
 * `MenuRadioGroup`, `MenuGroup`, `MenuSeparator` and `SubMenu`.
 */
export const Menu = forwardRef<HTMLDivElement, MenuProps>(function Menu(
  {
    open,
    anchor,
    onClose,
    placement = 'bottom-start',
    initialFocus = 'first',
    color = 'primary',
    children,
    ...rest
  },
  ref,
) {
  const treeId = useId(undefined, 'axon-menu-tree');
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const tree = useMemo<MenuTreeContextValue>(
    () => ({ treeId, color, requestClose: (reason) => onCloseRef.current(reason) }),
    [treeId, color],
  );

  return (
    <MenuTreeContext.Provider value={tree}>
      <MenuPanel
        {...rest}
        ref={ref}
        open={open}
        reference={anchor}
        placement={placement}
        isRoot
        initialFocus={initialFocus}
        onRequestClose={(reason) => {
          // Only submenus ask to go back one level; the root never sees `arrow-left`.
          if (reason !== 'arrow-left') onClose(reason);
        }}
      >
        {children}
      </MenuPanel>
    </MenuTreeContext.Provider>
  );
});
