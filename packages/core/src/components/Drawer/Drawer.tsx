import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import { cx } from '../../utils/cx';
import { useId } from '../../hooks/useId';
import { Overlay } from '../../internal/Overlay/Overlay';
import { DialogLayout, type DialogTitleTag } from '../../internal/Overlay/DialogLayout';

export type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'full';

/** Why the drawer asked to close. */
export type DrawerCloseReason = 'escape' | 'backdrop' | 'close-button';

interface DrawerBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'role'> {
  open: boolean;
  /** The user asked to close the drawer. You decide what that means: usually set `open` to false. */
  onClose: (reason: DrawerCloseReason) => void;
  /** The edge the drawer slides in from. Defaults to `right`. */
  placement?: DrawerPlacement;
  /**
   * Width of a left or right drawer, height of a top or bottom one. A preset, or any CSS length
   * (a number is pixels).
   */
  size?: DrawerSize | number | string;
  description?: ReactNode;
  footer?: ReactNode;
  titleAs?: DialogTitleTag;
  showCloseButton?: boolean;
  closeLabel?: string;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  container?: HTMLElement | null;
  children?: ReactNode;
}

/** A drawer needs a name: a `title`, or an `aria-label` / `aria-labelledby`. */
type DrawerLabel =
  | { title: ReactNode }
  | { title?: undefined; 'aria-label': string }
  | { title?: undefined; 'aria-labelledby': string };

export type DrawerProps = DrawerBaseProps & DrawerLabel;

const PRESETS: ReadonlySet<string> = new Set(['sm', 'md', 'lg', 'full']);

/**
 * A panel that slides in from an edge of the screen, with everything a `Modal` does: it dims the
 * page, traps focus, locks scroll, closes on Esc or a backdrop press and returns focus.
 * Good for filters, details and navigation on small screens.
 */
export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(function Drawer(
  {
    open,
    onClose,
    placement = 'right',
    size = 'md',
    title,
    titleAs,
    description,
    footer,
    showCloseButton = true,
    closeLabel = 'Close',
    closeOnEscape = true,
    closeOnBackdrop = true,
    initialFocusRef,
    container,
    id,
    className,
    style,
    children,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const baseId = useId(id, 'axon-drawer');
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;

  const preset = typeof size === 'string' && PRESETS.has(size) ? size : undefined;
  const surfaceStyle = {
    ...(preset === undefined
      ? { '--axon-drawer-size': typeof size === 'number' ? `${size}px` : size }
      : null),
    ...style,
  } as CSSProperties;

  return (
    <Overlay
      {...rest}
      ref={ref}
      open={open}
      id={baseId}
      style={surfaceStyle}
      container={container}
      initialFocusRef={initialFocusRef}
      closeOnEscape={closeOnEscape}
      closeOnBackdrop={closeOnBackdrop}
      onDismiss={onClose}
      aria-labelledby={title ? titleId : ariaLabelledBy}
      aria-label={title ? undefined : ariaLabel}
      aria-describedby={description ? descriptionId : ariaDescribedBy}
      containerClassName={cx('axon-drawer__scroll', `axon-drawer__scroll--${placement}`)}
      surfaceClassName={cx(
        'axon-drawer',
        `axon-drawer--${placement}`,
        preset && `axon-drawer--${preset}`,
        className,
      )}
    >
      <DialogLayout
        title={title}
        titleAs={titleAs}
        titleId={titleId}
        description={description}
        descriptionId={descriptionId}
        footer={footer}
        showCloseButton={showCloseButton}
        closeLabel={closeLabel}
        onCloseClick={() => onClose('close-button')}
      >
        {children}
      </DialogLayout>
    </Overlay>
  );
});
