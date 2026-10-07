import { forwardRef, type FieldsetHTMLAttributes, type ReactNode } from 'react';
import { useId } from '@axon/core';

export interface FormSectionProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'title'
> {
  /** The section's heading. It names the group for screen readers. */
  title?: ReactNode;
  /** Supporting text under the title. Announced as the group's description. */
  description?: ReactNode;
  children?: ReactNode;
}

/** A titled group of related fields: a `fieldset` with a `legend`, and a description. */
export const FormSection = forwardRef<HTMLFieldSetElement, FormSectionProps>(function FormSection(
  { title, description, id, className, children, 'aria-describedby': describedBy, ...rest },
  ref,
) {
  const baseId = useId(id, 'axon-form-section');
  const descriptionId = `${baseId}-description`;
  return (
    <fieldset
      {...rest}
      ref={ref}
      id={baseId}
      aria-describedby={
        [describedBy, description ? descriptionId : undefined].filter(Boolean).join(' ') ||
        undefined
      }
      className={['axon-form-section', className].filter(Boolean).join(' ')}
    >
      {title ? <legend className="axon-form-section__title">{title}</legend> : null}
      {description ? (
        <p id={descriptionId} className="axon-form-section__description">
          {description}
        </p>
      ) : null}
      <div className="axon-form-section__body">{children}</div>
    </fieldset>
  );
});
