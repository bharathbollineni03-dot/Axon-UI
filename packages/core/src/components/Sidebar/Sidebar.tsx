import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { AxonColor } from '../../types';
import { cx } from '../../utils/cx';
import { useControllableState } from '../../hooks/useControllableState';
import { useId } from '../../hooks/useId';
import { ChevronsLeftIcon, ChevronsRightIcon } from '../../internal/icons';
import type { PolymorphicComponent } from '../../internal/polymorphic';

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => undefined,
});

export interface SidebarProps extends Omit<HTMLAttributes<HTMLElement>, 'color'> {
  /** Whether the sidebar is narrowed to icons only. Controlled. */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Width when expanded. A number is pixels. Defaults to 16rem. */
  width?: number | string;
  /** Width when collapsed. A number is pixels. Defaults to 4rem. */
  collapsedWidth?: number | string;
  /** Color of the active item. */
  color?: AxonColor;
  /** Pinned above the scrolling items: a logo, a workspace switcher. */
  header?: ReactNode;
  /** Pinned below the scrolling items: the user's account, a collapse toggle. */
  footer?: ReactNode;
  children?: ReactNode;
}

const toLength = (value: number | string) => (typeof value === 'number' ? `${value}px` : value);

/**
 * Side navigation: a `navigation` landmark of links that can be narrowed to icons. Give it an
 * `aria-label` when the page has more than one navigation landmark.
 */
export const Sidebar = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  {
    collapsed: collapsedProp,
    defaultCollapsed = false,
    onCollapsedChange,
    width,
    collapsedWidth,
    color = 'primary',
    header,
    footer,
    className,
    style,
    children,
    'aria-label': ariaLabel = 'Sidebar',
    ...rest
  },
  ref,
) {
  const [collapsed, setCollapsed] = useControllableState<boolean>({
    value: collapsedProp,
    defaultValue: defaultCollapsed,
    onChange: onCollapsedChange,
  });
  const context = useMemo(() => ({ collapsed, setCollapsed }), [collapsed, setCollapsed]);

  const vars = {
    ...(width !== undefined ? { '--axon-sidebar-width': toLength(width) } : null),
    ...(collapsedWidth !== undefined
      ? { '--axon-sidebar-collapsed-width': toLength(collapsedWidth) }
      : null),
    ...style,
  } as CSSProperties;

  return (
    <SidebarContext.Provider value={context}>
      <nav
        {...rest}
        ref={ref}
        aria-label={ariaLabel}
        style={vars}
        className={cx(
          'axon-sidebar',
          `axon-sidebar--${color}`,
          collapsed && 'axon-sidebar--collapsed',
          className,
        )}
      >
        {header ? <div className="axon-sidebar__header">{header}</div> : null}
        <div className="axon-sidebar__body">{children}</div>
        {footer ? <div className="axon-sidebar__footer">{footer}</div> : null}
      </nav>
    </SidebarContext.Provider>
  );
});

export interface SidebarSectionProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** The section's heading. Stays available to screen readers while the sidebar is collapsed. */
  title?: ReactNode;
}

/** A labelled group of sidebar items. */
export const SidebarSection = forwardRef<HTMLDivElement, SidebarSectionProps>(
  function SidebarSection({ title, className, children, id, ...rest }, ref) {
    const titleId = useId(id, 'axon-sidebar-section');
    return (
      <div
        {...rest}
        ref={ref}
        id={id}
        role="group"
        aria-labelledby={title ? `${titleId}-title` : undefined}
        className={cx('axon-sidebar__section', className)}
      >
        {title ? (
          <div id={`${titleId}-title`} className="axon-sidebar__section-title">
            {title}
          </div>
        ) : null}
        {children}
      </div>
    );
  },
);

export interface SidebarItemOwnProps {
  label: ReactNode;
  /** Shown before the label and kept when the sidebar is collapsed. Decorative. */
  icon?: ReactNode;
  /** Marks the item for the current page: `aria-current="page"` and highlighted. */
  active?: boolean;
  /** Shown after the label, e.g. a count. */
  badge?: ReactNode;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  className?: string;
}

/**
 * One destination in the sidebar. Renders an `<a>` when given an `href` and a `<button>`
 * otherwise; pass `as` to use a router link component.
 */
type SidebarItemProps = SidebarItemOwnProps & {
  as?: ElementType;
  href?: string;
} & Omit<HTMLAttributes<HTMLElement>, keyof SidebarItemOwnProps>;

export const SidebarItem = forwardRef<HTMLElement, SidebarItemProps>(function SidebarItem(
  { label, icon, active = false, badge, disabled = false, onClick, className, as, href, ...rest },
  ref,
) {
  const { collapsed } = useContext(SidebarContext);
  const Component: ElementType = as ?? (href ? 'a' : 'button');
  const isButton = Component === 'button';
  const isAnchor = Component === 'a';

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <Component
      {...rest}
      ref={ref}
      href={disabled ? undefined : href}
      type={isButton ? 'button' : undefined}
      role={disabled && isAnchor ? 'link' : undefined}
      tabIndex={disabled && !isButton ? -1 : undefined}
      disabled={isButton ? disabled : undefined}
      aria-disabled={disabled && !isButton ? true : undefined}
      aria-current={active ? 'page' : undefined}
      // Without its label showing, a hover tooltip tells sighted users where the icon leads.
      title={collapsed && typeof label === 'string' ? label : undefined}
      className={cx(
        'axon-sidebar__item',
        active && 'axon-sidebar__item--active',
        disabled && 'axon-sidebar__item--disabled',
        className,
      )}
      onClick={handleClick}
    >
      {icon ? (
        <span className="axon-sidebar__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={cx('axon-sidebar__label', collapsed && 'axon-visually-hidden')}>
        {label}
      </span>
      {badge ? <span className="axon-sidebar__badge">{badge}</span> : null}
    </Component>
  );
}) as unknown as PolymorphicComponent<'a', SidebarItemOwnProps & { href?: string }>;

export interface SidebarToggleProps extends Omit<
  HTMLAttributes<HTMLButtonElement>,
  'children' | 'onClick'
> {
  /** Accessible names for the two states. They describe the action the button will take. */
  collapseLabel?: string;
  expandLabel?: string;
}

/** A button that collapses and expands the sidebar it is placed in. */
export const SidebarToggle = forwardRef<HTMLButtonElement, SidebarToggleProps>(
  function SidebarToggle(
    { collapseLabel = 'Collapse sidebar', expandLabel = 'Expand sidebar', className, ...rest },
    ref,
  ) {
    const { collapsed, setCollapsed } = useContext(SidebarContext);
    return (
      <button
        type="button"
        {...rest}
        ref={ref}
        aria-label={collapsed ? expandLabel : collapseLabel}
        className={cx('axon-sidebar__toggle', className)}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronsRightIcon /> : <ChevronsLeftIcon />}
      </button>
    );
  },
);
