import { createContext, useContext } from 'react';
import type { AxonColor } from '../../types';

/** Why a menu asked to close. Focus should go back to the trigger for everything but `outside`. */
export type MenuCloseReason = 'escape' | 'tab' | 'outside' | 'select';

/** Shared by a root menu and all of its submenus. */
export interface MenuTreeContextValue {
  /** Marks every panel of the tree so a press on a submenu does not count as "outside". */
  treeId: string;
  color: AxonColor;
  /** Closes the whole tree. */
  requestClose: (reason: MenuCloseReason) => void;
}

export const MenuTreeContext = createContext<MenuTreeContextValue | null>(null);

export function useMenuTree(): MenuTreeContextValue {
  const context = useContext(MenuTreeContext);
  if (!context) throw new Error('Menu items must be used inside <Menu> or <DropdownMenu>.');
  return context;
}

/** Per panel: which of its submenus is open (only one at a time). */
export interface MenuPanelContextValue {
  openSubmenu: string | null;
  setOpenSubmenu: (id: string | null) => void;
}

export const MenuPanelContext = createContext<MenuPanelContextValue | null>(null);

export interface MenuRadioContextValue {
  value: string | undefined;
  select: (value: string) => void;
}

export const MenuRadioContext = createContext<MenuRadioContextValue | null>(null);
