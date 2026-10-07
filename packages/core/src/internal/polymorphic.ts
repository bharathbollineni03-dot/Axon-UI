import type {
  ComponentPropsWithRef,
  ComponentPropsWithoutRef,
  ElementType,
  ReactElement,
} from 'react';

/** Props of a component that can render as another element through `as`. */
export type PolymorphicProps<T extends ElementType, Own extends object = object> = Own & {
  /** The element or component to render instead of the default. */
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, keyof Own | 'as'>;

export type PolymorphicRef<T extends ElementType> = ComponentPropsWithRef<T>['ref'];

/** The call signature of a polymorphic `forwardRef` component. */
export type PolymorphicComponent<
  DefaultElement extends ElementType,
  Own extends object = object,
> = {
  <T extends ElementType = DefaultElement>(
    props: PolymorphicProps<T, Own> & { ref?: PolymorphicRef<T> },
  ): ReactElement | null;
  displayName?: string;
};
