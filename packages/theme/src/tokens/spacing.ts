/** Spacing steps; each key is a multiple of 0.25rem (so `4` is `1rem`). */
export const spacing = {
  '0': '0',
  '0.5': '0.125rem',
  '1': '0.25rem',
  '1.5': '0.375rem',
  '2': '0.5rem',
  '3': '0.75rem',
  '4': '1rem',
  '6': '1.5rem',
  '8': '2rem',
  '12': '3rem',
  '16': '4rem',
};

export type Spacing = typeof spacing;
export type SpacingKey = keyof Spacing;

/** Spacing keys in ascending order (object key order puts integer-like keys first). */
export const spacingKeys: readonly SpacingKey[] = [
  '0',
  '0.5',
  '1',
  '1.5',
  '2',
  '3',
  '4',
  '6',
  '8',
  '12',
  '16',
];
