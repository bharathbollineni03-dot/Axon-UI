import { forwardRef, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { cx } from '../../utils/cx';

export interface DividerProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed';
  /** Text shown in the middle of a horizontal divider. */
  children?: ReactNode;
  /** Lets a vertical divider stretch to the height of a flex row instead of 100% of the parent. */
  flexItem?: boolean;
  /** Marks the line as decoration only (no `separator` role), e.g. between purely visual blocks. */
  decorative?: boolean;
}

/** A thin line (or a line with a label) that separates content. */
export const Divider = forwardRef<HTMLElement, DividerProps>(function Divider(
  {
    orientation = 'horizontal',
    variant = 'solid',
    children,
    flexItem = false,
    decorative = false,
    className,
    ...rest
  },
  ref,
) {
  const classes = cx(
    'axon-divider',
    `axon-divider--${orientation}`,
    `axon-divider--${variant}`,
    Boolean(children) && 'axon-divider--labelled',
    flexItem && 'axon-divider--flex-item',
    className,
  );

  if (orientation === 'horizontal' && !children) {
    return (
      <hr
        {...rest}
        ref={ref as Ref<HTMLHRElement>}
        role={decorative ? 'presentation' : undefined}
        className={classes}
      />
    );
  }
  return (
    <div
      {...rest}
      ref={ref as Ref<HTMLDivElement>}
      role={decorative ? 'presentation' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      className={classes}
    >
      {children ? <span className="axon-divider__label">{children}</span> : null}
    </div>
  );
});
