import { forwardRef, type CSSProperties, type ElementType, type ReactNode } from 'react';
import type { AxonColor } from '../../types';
import { cx } from '../../utils/cx';
import type { PolymorphicComponent } from '../../internal/polymorphic';

export type TypographyVariant =
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'bodySm' | 'caption' | 'overline';

/**
 * `muted` is secondary text. There is deliberately no "disabled" text color: disabled text fails
 * contrast requirements, so only disabled controls (which are exempt) should use it.
 */
export type TextColor = 'default' | 'muted' | AxonColor;
export type FontSizeToken = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

export interface TypographyOwnProps {
  /** A style from the type scale. Chooses the default element too: `h1`-`h6` render headings. */
  variant?: TypographyVariant;
  /** `muted` is secondary text; a color name uses that color's accessible text shade. */
  color?: TextColor;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  align?: 'start' | 'center' | 'end' | 'justify';
  /** Keeps the text on one line and ends it with an ellipsis. Needs a block-level element. */
  truncate?: boolean;
  /** Clamps the text to this many lines with an ellipsis. */
  lineClamp?: number;
  /** Overrides the font size with a step of the theme type scale. */
  size?: FontSizeToken;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const ELEMENTS: Record<TypographyVariant, ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body: 'p',
  bodySm: 'p',
  caption: 'span',
  overline: 'span',
};

/** Text styled from the theme type scale. `Heading` and `Text` are shortcuts for common cases. */
export const Typography = forwardRef<HTMLElement, TypographyOwnProps & { as?: ElementType }>(
  function Typography(
    {
      as,
      variant = 'body',
      color = 'default',
      weight,
      align,
      truncate,
      lineClamp,
      size,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const Component = as ?? ELEMENTS[variant];
    return (
      <Component
        {...rest}
        ref={ref}
        className={cx(
          'axon-text',
          `axon-text--${variant}`,
          color !== 'default' && `axon-text--color-${color}`,
          weight && `axon-text--weight-${weight}`,
          align && `axon-text--align-${align}`,
          size && `axon-text--size-${size}`,
          truncate && 'axon-text--truncate',
          lineClamp !== undefined && 'axon-text--clamp',
          className,
        )}
        style={
          lineClamp !== undefined ? { ['--axon-line-clamp' as string]: lineClamp, ...style } : style
        }
      />
    );
  },
) as unknown as PolymorphicComponent<'p', TypographyOwnProps>;

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingOwnProps extends Omit<TypographyOwnProps, 'variant'> {
  /** Which heading element to render (`h1`-`h6`) and the matching size. Defaults to 2. */
  level?: HeadingLevel;
}

/**
 * A heading. `level` sets both the element and the default size, so the visual size and the
 * document outline can be chosen separately with `size`.
 */
export const Heading = forwardRef<HTMLElement, HeadingOwnProps & { as?: ElementType }>(
  function Heading({ level = 2, ...rest }, ref) {
    return <Typography {...rest} ref={ref} variant={`h${level}`} />;
  },
) as unknown as PolymorphicComponent<'h2', HeadingOwnProps>;

export interface TextOwnProps extends Omit<TypographyOwnProps, 'variant'> {
  /** `body` (default), `bodySm`, `caption` or `overline`. */
  variant?: 'body' | 'bodySm' | 'caption' | 'overline';
}

/** Body text. Renders an inline `span` by default, so it can sit inside other text. */
export const Text = forwardRef<HTMLElement, TextOwnProps & { as?: ElementType }>(function Text(
  { as = 'span', variant = 'body', ...rest },
  ref,
) {
  return <Typography {...rest} ref={ref} as={as} variant={variant} />;
}) as unknown as PolymorphicComponent<'span', TextOwnProps>;
