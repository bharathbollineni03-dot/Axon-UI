import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { useMergedRef } from '../../utils/mergeRefs';
import { useControllableState } from '../../hooks/useControllableState';
import { useId } from '../../hooks/useId';
import { panelId, tabId, TabsContext, useTabsContext } from './TabsContext';

export interface TabsProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** The selected tab's `value`. Controlled. */
  value?: string;
  /** The tab selected first. Without it, the first enabled tab is selected after mount. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  /** `automatic` (default) selects a tab as soon as it gets focus; `manual` waits for Enter or Space. */
  activation?: 'automatic' | 'manual';
  /** `line` underlines the selected tab, `solid` fills it, `pills` rounds each tab. */
  variant?: 'line' | 'solid' | 'pills';
  size?: AxonSize;
  color?: AxonColor;
  /** Renders a panel's children only once its tab has been selected for the first time. */
  lazy?: boolean;
  /** With `lazy`, also drops a panel's children again when its tab is deselected. */
  unmountOnHide?: boolean;
  children?: ReactNode;
}

/**
 * Tabs following the WAI-ARIA tabs pattern. Compose `TabList` with `Tab`s and one `TabPanel`
 * per tab; a tab and its panel share the same `value`.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    value: valueProp,
    defaultValue,
    onChange,
    orientation = 'horizontal',
    activation = 'automatic',
    variant = 'line',
    size = 'md',
    color = 'primary',
    lazy = false,
    unmountOnHide = false,
    className,
    id,
    children,
    ...rest
  },
  ref,
) {
  const baseId = useId(id, 'axon-tabs');
  const [value, setValue] = useControllableState<string | null>({
    value: valueProp,
    defaultValue: defaultValue ?? null,
    onChange: (next) => {
      if (next !== null) onChange?.(next);
    },
  });

  const context = useMemo(
    () => ({
      value,
      select: (next: string) => setValue(next),
      orientation,
      activation,
      baseId,
      lazy,
      unmountOnHide,
      size,
      color,
      variant,
    }),
    [value, setValue, orientation, activation, baseId, lazy, unmountOnHide, size, color, variant],
  );

  return (
    <TabsContext.Provider value={context}>
      <div
        {...rest}
        ref={ref}
        id={id}
        className={cx(
          'axon-tabs',
          `axon-tabs--${orientation}`,
          `axon-tabs--${variant}`,
          `axon-tabs--${size}`,
          `axon-tabs--${color}`,
          className,
        )}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
});

export type TabListProps = HTMLAttributes<HTMLDivElement>;

/** The row (or column) of tabs. Give it an `aria-label` when the page has several tab lists. */
export const TabList = forwardRef<HTMLDivElement, TabListProps>(function TabList(
  { className, onKeyDown, ...rest },
  ref,
) {
  const { value, select, orientation, activation } = useTabsContext('TabList');
  const listRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRef(ref, listRef);

  const enabledTabs = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)') ?? []);

  // With no initial value, select the first enabled tab once the tabs are in the DOM.
  useEffect(() => {
    if (value !== null) return;
    const first = enabledTabs()[0];
    if (first?.dataset['value'] !== undefined) select(first.dataset['value']);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const tabs = enabledTabs();
    const current = tabs.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;
    const [previousKey, nextKey] =
      orientation === 'vertical' ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
    let target: number;
    switch (event.key) {
      case nextKey:
        target = (current + 1) % tabs.length;
        break;
      case previousKey:
        target = (current - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const next = tabs[target]!;
    next.focus();
    if (activation === 'automatic' && next.dataset['value'] !== undefined) {
      select(next.dataset['value']);
    }
  };

  return (
    // The tabs inside are the focusable elements (roving tabindex); the list only handles their keys.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      {...rest}
      ref={mergedRef}
      role="tablist"
      aria-orientation={orientation}
      className={cx('axon-tabs__list', className)}
      onKeyDown={handleKeyDown}
    />
  );
});

export interface TabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** Identifies the tab and links it to the `TabPanel` with the same value. */
  value: string;
  /** Shown before the label. Decorative. */
  icon?: ReactNode;
}

export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { value: tabValue, icon, className, children, onClick, ...rest },
  ref,
) {
  const { value, select, baseId } = useTabsContext('Tab');
  const selected = value === tabValue;
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="tab"
      id={tabId(baseId, tabValue)}
      data-value={tabValue}
      aria-selected={selected}
      aria-controls={panelId(baseId, tabValue)}
      tabIndex={selected ? 0 : -1}
      className={cx('axon-tabs__tab', selected && 'axon-tabs__tab--selected', className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) select(tabValue);
      }}
    >
      {icon ? (
        <span className="axon-tabs__tab-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
});

export interface TabPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'value'> {
  /** The `value` of the tab that controls this panel. */
  value: string;
}

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(function TabPanel(
  { value: panelValue, className, children, ...rest },
  ref,
) {
  const { value, baseId, lazy, unmountOnHide } = useTabsContext('TabPanel');
  const selected = value === panelValue;
  const [visited, setVisited] = useState(selected);
  useEffect(() => {
    if (selected) setVisited(true);
  }, [selected]);

  const render = selected || (!unmountOnHide && (!lazy || visited));

  return (
    <div
      {...rest}
      ref={ref}
      role="tabpanel"
      id={panelId(baseId, panelValue)}
      aria-labelledby={tabId(baseId, panelValue)}
      hidden={!selected}
      tabIndex={0}
      className={cx('axon-tabs__panel', className)}
    >
      {render ? children : null}
    </div>
  );
});
