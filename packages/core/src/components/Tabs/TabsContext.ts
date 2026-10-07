import { createContext, useContext } from 'react';
import type { AxonColor, AxonSize } from '../../types';

export interface TabsContextValue {
  /** The selected tab's value, or `null` until one is chosen. */
  value: string | null;
  select: (value: string) => void;
  orientation: 'horizontal' | 'vertical';
  /** `automatic`: moving focus selects. `manual`: Enter or Space selects. */
  activation: 'automatic' | 'manual';
  baseId: string;
  lazy: boolean;
  unmountOnHide: boolean;
  size: AxonSize;
  color: AxonColor;
  variant: 'line' | 'solid' | 'pills';
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext(component: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`${component} must be used inside <Tabs>.`);
  return context;
}

/** Ids shared by a tab and its panel. Values are sanitized so they are safe in `id` attributes. */
export const tabId = (baseId: string, value: string) =>
  `${baseId}-tab-${encodeURIComponent(value)}`;
export const panelId = (baseId: string, value: string) =>
  `${baseId}-panel-${encodeURIComponent(value)}`;
