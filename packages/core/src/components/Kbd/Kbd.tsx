import { forwardRef, Fragment, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  /**
   * A key combination, shown as one `<kbd>` per key joined by "+": `keys={['Ctrl', 'K']}`.
   * Use `children` instead for a single key.
   */
  keys?: string[];
}

/** A keyboard key or shortcut. */
export const Kbd = forwardRef<HTMLElement, KbdProps>(function Kbd(
  { keys, className, children, ...rest },
  ref,
) {
  if (keys && keys.length > 0) {
    return (
      <kbd {...rest} ref={ref} className={cx('axon-kbd-group', className)}>
        {keys.map((key, index) => (
          <Fragment key={`${key}-${index}`}>
            {index > 0 ? <span className="axon-kbd-group__plus">+</span> : null}
            <kbd className="axon-kbd">{key}</kbd>
          </Fragment>
        ))}
      </kbd>
    );
  }
  return (
    <kbd {...rest} ref={ref} className={cx('axon-kbd', className)}>
      {children}
    </kbd>
  );
});
