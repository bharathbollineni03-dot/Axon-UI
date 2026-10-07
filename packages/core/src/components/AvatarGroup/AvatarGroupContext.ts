import { createContext } from 'react';
import type { AxonColor } from '../../types';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'rounded';

/** Defaults an AvatarGroup shares with the avatars inside it; an avatar's own props win. */
export interface AvatarGroupContextValue {
  size?: AvatarSize;
  shape?: AvatarShape;
  color?: AxonColor;
}

export const AvatarGroupContext = createContext<AvatarGroupContextValue | null>(null);
