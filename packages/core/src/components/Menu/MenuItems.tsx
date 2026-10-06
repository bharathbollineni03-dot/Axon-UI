import {
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import { useControllableState } from '../../hooks/useControllableState';
import { useId } from '../../hooks/useId';
import { CheckIcon, ChevronRightIcon } from '../../internal/icons';
import {
  MenuPanelContext,
  MenuRadioContext,
  useMenuTree,
  type MenuRadioContextValue,
} from './MenuContext';
import { getMenuItems, MenuPanel } from './MenuPanel';

type ItemRole = 'menuitem' | 'menuitemcheckbox' | 'menuitemradio';

interface MenuItemBaseProps extends Omit<HTMLAttributes<HTMLElement>, 'onClick' | 'role'> {
  role: ItemRole;
  href?: string;
  disabled?: boolean;
  icon?: ReactNode;
  /** Replaces the icon slot with a check or radio mark that is shown while the item is on. */
  indicator?: ReactNode;
  shortcut?: ReactNode;
  /** Shown after the label and the shortcut: the submenu arrow. */
  trailing?: ReactNode;
  destructive?: boolean;
  /** Submenu triggers keep the menu open; other items close the whole tree when `true`. */
  closeOnSelect: boolean;
  isSubmenuTrigger?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

const MenuItemBase = forwardRef<HTMLElement, MenuItemBaseProps>(function MenuItemBase(
  {
    role,
    href,
    disabled = false,
    icon,
    indicator,
    shortcut,
    trailing,
    destructive = false,
    closeOnSelect,
    isSubmenuTrigger = false,
    onClick,
    onMouseMove,
    onKeyDown,
    className,
    children,
    ...rest
  },
  ref,
) {
  const tree = useMenuTree();
  const panel = useContext(MenuPanelContext);
  const Component = href !== undefined ? 'a' : 'button';

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
    if (closeOnSelect && !isSubmenuTrigger) tree.requestClose('select');
  };

  const handleMouseMove = (event: MouseEvent<HTMLElement>) => {
    onMouseMove?.(event);
    if (disabled) return;
    // Hovering an item highlights it the same way arrow keys do, and closes a sibling's submenu.
    if (event.currentTarget !== event.currentTarget.ownerDocument.activeElement) {
      event.currentTarget.focus({ preventScroll: true });
    }
    if (!isSubmenuTrigger && panel?.openSubmenu) panel.setOpenSubmenu(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    // A link does not activate on Space by itself, but a menu item should.
    if (!event.defaultPrevented && event.key === ' ' && Component === 'a') {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <Component
      {...(rest as HTMLAttributes<HTMLElement>)}
      ref={ref as never}
      role={role}
      tabIndex={-1}
      href={disabled ? undefined : href}
      type={Component === 'button' ? 'button' : undefined}
      aria-disabled={disabled || undefined}
      className={cx(
        'axon-menu__item',
        destructive && 'axon-menu__item--destructive',
        disabled && 'axon-menu__item--disabled',
        className,
      )}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
    >
      {indicator !== undefined ? (
        <span className="axon-menu__indicator" aria-hidden="true">
          {indicator}
        </span>
      ) : icon ? (
        <span className="axon-menu__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="axon-menu__label">{children}</span>
      {shortcut ? <span className="axon-menu__shortcut">{shortcut}</span> : null}
      {trailing}
    </Component>
  );
});

export interface MenuItemProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'onClick' | 'role' | 'onSelect'
> {
  /** Shown before the label. Decorative. */
  icon?: ReactNode;
  /** A hint for the item's keyboard shortcut, shown at the end, e.g. "⌘C". It is not bound for you. */
  shortcut?: ReactNode;
  /** Renders a link (`<a>`) instead of a button. */
  href?: string;
  /** Skipped by arrow keys and typeahead, and does nothing when pressed. */
  disabled?: boolean;
  /** Styles the item as a dangerous action, such as "Delete". */
  destructive?: boolean;
  /** Closes the whole menu after the item is chosen. Defaults to `true`. */
  closeOnSelect?: boolean;
  /** Called when the item is chosen by click, Enter or Space. */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

/** An action in a menu. */
export const MenuItem = forwardRef<HTMLElement, MenuItemProps>(function MenuItem(
  { closeOnSelect = true, ...rest },
  ref,
) {
  return <MenuItemBase {...rest} ref={ref} role="menuitem" closeOnSelect={closeOnSelect} />;
});

export interface MenuCheckboxItemProps extends Omit<MenuItemProps, 'href' | 'icon'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/** A menu item that toggles an option on and off. Keeps the menu open by default. */
export const MenuCheckboxItem = forwardRef<HTMLElement, MenuCheckboxItemProps>(
  function MenuCheckboxItem(
    {
      checked: checkedProp,
      defaultChecked = false,
      onCheckedChange,
      closeOnSelect = false,
      onClick,
      ...rest
    },
    ref,
  ) {
    const [checked, setChecked] = useControllableState<boolean>({
      value: checkedProp,
      defaultValue: defaultChecked,
      onChange: onCheckedChange,
    });
    return (
      <MenuItemBase
        {...rest}
        ref={ref}
        role="menuitemcheckbox"
        aria-checked={checked}
        indicator={checked ? <CheckIcon /> : null}
        closeOnSelect={closeOnSelect}
        onClick={(event) => {
          onClick?.(event);
          if (!rest.disabled) setChecked(!checked);
        }}
      />
    );
  },
);

export interface MenuGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** A heading for the group, also its accessible name. */
  label?: ReactNode;
}

/** A labelled run of related items. */
export const MenuGroup = forwardRef<HTMLDivElement, MenuGroupProps>(function MenuGroup(
  { label, className, children, ...rest },
  ref,
) {
  const labelId = useId(undefined, 'axon-menu-group');
  return (
    <div
      aria-labelledby={label ? labelId : undefined}
      {...rest}
      ref={ref}
      role="group"
      className={cx('axon-menu__group', className)}
    >
      {label ? (
        <div id={labelId} role="presentation" className="axon-menu__group-label">
          {label}
        </div>
      ) : null}
      {children}
    </div>
  );
});

export interface MenuRadioGroupProps extends Omit<MenuGroupProps, 'onChange' | 'defaultValue'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

/** A group of mutually exclusive `MenuRadioItem`s. */
export const MenuRadioGroup = forwardRef<HTMLDivElement, MenuRadioGroupProps>(
  function MenuRadioGroup({ value: valueProp, defaultValue, onValueChange, ...rest }, ref) {
    const [value, setValue] = useControllableState<string | undefined>({
      value: valueProp,
      defaultValue,
      onChange: (next) => {
        if (next !== undefined) onValueChange?.(next);
      },
    });
    const context = useMemo<MenuRadioContextValue>(
      () => ({ value, select: setValue }),
      [value, setValue],
    );
    return (
      <MenuRadioContext.Provider value={context}>
        <MenuGroup {...rest} ref={ref} />
      </MenuRadioContext.Provider>
    );
  },
);

export interface MenuRadioItemProps extends Omit<MenuItemProps, 'href' | 'icon'> {
  /** The value this item sets on its `MenuRadioGroup`. */
  value: string;
}

/** One choice in a `MenuRadioGroup`. Keeps the menu open by default. */
export const MenuRadioItem = forwardRef<HTMLElement, MenuRadioItemProps>(function MenuRadioItem(
  { value, closeOnSelect = false, onClick, ...rest },
  ref,
) {
  const group = useContext(MenuRadioContext);
  if (!group) throw new Error('MenuRadioItem must be used inside <MenuRadioGroup>.');
  const checked = group.value === value;
  return (
    <MenuItemBase
      {...rest}
      ref={ref}
      role="menuitemradio"
      aria-checked={checked}
      indicator={checked ? <span className="axon-menu__radio-dot" /> : null}
      closeOnSelect={closeOnSelect}
      onClick={(event) => {
        onClick?.(event);
        if (!rest.disabled) group.select(value);
      }}
    />
  );
});

/** A thin line between groups of items. */
export const MenuSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function MenuSeparator({ className, ...rest }, ref) {
    return (
      <div {...rest} ref={ref} role="separator" className={cx('axon-menu__separator', className)} />
    );
  },
);

/** How long the pointer rests on a submenu item before it opens. */
const SUBMENU_HOVER_DELAY = 120;

export interface SubMenuProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onClick' | 'onSelect'
> {
  /** The submenu item's text. */
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
}

/** An item that opens a nested menu: with the pointer, `→`, Enter or Space; `←` and Esc go back. */
export const SubMenu = forwardRef<HTMLDivElement, SubMenuProps>(function SubMenu(
  { label, icon, disabled = false, children, ...panelProps },
  ref,
) {
  const tree = useMenuTree();
  const parent = useContext(MenuPanelContext);
  const id = useId(undefined, 'axon-submenu');
  const panelId = `${id}-panel`;
  const triggerId = `${id}-trigger`;
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const [initialFocus, setInitialFocus] = useState<'first' | 'none'>('none');
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const open = parent?.openSubmenu === id;

  const openSubmenu = (focusFirst: boolean) => {
    if (disabled || !parent) return;
    if (open) {
      // Already open from hovering: move focus in rather than reopening.
      if (focusFirst) {
        getMenuItems(trigger?.ownerDocument.getElementById(panelId) ?? null)[0]?.focus();
      }
      return;
    }
    setInitialFocus(focusFirst ? 'first' : 'none');
    parent.setOpenSubmenu(id);
  };

  const closeSubmenu = () => {
    parent?.setOpenSubmenu(null);
    trigger?.focus();
  };

  return (
    <>
      <MenuItemBase
        ref={setTrigger}
        id={triggerId}
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        icon={icon}
        trailing={
          <span className="axon-menu__chevron" aria-hidden="true">
            <ChevronRightIcon />
          </span>
        }
        disabled={disabled}
        closeOnSelect={false}
        isSubmenuTrigger
        className="axon-menu__item--submenu"
        // Enter and Space reach here as a click without a pointer (`detail` is 0).
        onClick={(event) => openSubmenu(event.detail === 0)}
        onMouseEnter={() => {
          clearTimeout(hoverTimer.current);
          hoverTimer.current = setTimeout(() => openSubmenu(false), SUBMENU_HOVER_DELAY);
        }}
        onMouseLeave={() => clearTimeout(hoverTimer.current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            event.stopPropagation();
            openSubmenu(true);
          }
        }}
      >
        {label}
      </MenuItemBase>
      <MenuPanel
        {...panelProps}
        ref={ref}
        id={panelId}
        aria-labelledby={triggerId}
        open={open}
        reference={trigger}
        placement="right-start"
        isRoot={false}
        initialFocus={initialFocus}
        onRequestClose={(reason) => {
          if (reason === 'escape' || reason === 'arrow-left') closeSubmenu();
          else tree.requestClose(reason);
        }}
      >
        {children}
      </MenuPanel>
    </>
  );
});
