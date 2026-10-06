import { forwardRef, useContext, type HTMLAttributes, type ReactNode } from 'react';
import type { AxonColor } from '../../types';
import { cx } from '../../utils/cx';
import { useImageStatus } from '../../internal/useImageStatus';
import {
  AvatarGroupContext,
  type AvatarShape,
  type AvatarSize,
} from '../AvatarGroup/AvatarGroupContext';

export type { AvatarShape, AvatarSize };
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color' | 'children'> {
  /** Image URL. If it is missing or fails to load, the initials (or `fallback`) are shown. */
  src?: string;
  /** The person's or entity's name: used for the initials and as the accessible name. */
  name?: string;
  /** Alternative text when there is no `name`. */
  alt?: string;
  size?: AvatarSize;
  /** Background tint of the initials fallback. */
  color?: AxonColor;
  shape?: AvatarShape;
  /** A presence dot in the bottom-right corner. */
  status?: AvatarStatus;
  /** Text for the status, used in the accessible name. Defaults to the status word. */
  statusLabel?: string;
  /** Shown when there is no image and no name, e.g. an icon. */
  fallback?: ReactNode;
}

/** Up to two letters taken from the first and last word of a name. */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const letters = (word: string) => Array.from(word)[0] ?? '';
  const first = letters(words[0]!);
  const last = words.length > 1 ? letters(words[words.length - 1]!) : '';
  return (first + last).toLocaleUpperCase();
}

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" className="axon-avatar__icon" aria-hidden="true" focusable="false">
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z" />
  </svg>
);

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  {
    src,
    name,
    alt,
    size: sizeProp,
    color: colorProp,
    shape: shapeProp,
    status,
    statusLabel,
    fallback,
    className,
    'aria-label': ariaLabelProp,
    ...rest
  },
  ref,
) {
  const group = useContext(AvatarGroupContext);
  const size = sizeProp ?? group?.size ?? 'md';
  const shape = shapeProp ?? group?.shape ?? 'circle';
  const color = colorProp ?? group?.color ?? 'neutral';
  const { failed, imgProps } = useImageStatus(src);

  const label = name ?? alt;
  const accessibleName = label
    ? status
      ? `${label}, ${statusLabel ?? status}`
      : label
    : undefined;
  const initials = name ? getInitials(name) : '';

  return (
    <span
      {...rest}
      ref={ref}
      role={accessibleName || ariaLabelProp ? 'img' : undefined}
      aria-label={accessibleName ?? ariaLabelProp}
      aria-hidden={accessibleName || ariaLabelProp ? undefined : true}
      className={cx(
        'axon-avatar',
        `axon-avatar--${size}`,
        `axon-avatar--${shape}`,
        `axon-avatar--${color}`,
        className,
      )}
    >
      {src && !failed ? (
        <img {...imgProps} src={src} alt="" className="axon-avatar__image" />
      ) : initials ? (
        <span className="axon-avatar__initials" aria-hidden="true">
          {initials}
        </span>
      ) : (
        <span className="axon-avatar__fallback" aria-hidden="true">
          {fallback ?? <PersonIcon />}
        </span>
      )}
      {status ? (
        <span
          className={cx('axon-avatar__status', `axon-avatar__status--${status}`)}
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
});
