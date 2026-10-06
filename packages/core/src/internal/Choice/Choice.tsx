import { useId, type ReactNode } from 'react';

/** Ids for a choice control (checkbox, radio, switch) and its description. */
export function useChoiceIds(idProp?: string) {
  const generated = useId();
  const id = idProp ?? generated;
  return { id, labelId: `${id}-label`, descriptionId: `${id}-description` };
}

export interface ChoiceTextProps {
  /** BEM block, e.g. `axon-checkbox`. */
  block: string;
  label?: ReactNode;
  description?: ReactNode;
  labelId: string;
  descriptionId: string;
}

/**
 * Label and optional description shown beside a choice control. The input is named from the
 * label span (`aria-labelledby`), so the description is not read as part of its name.
 */
export function ChoiceText({ block, label, description, labelId, descriptionId }: ChoiceTextProps) {
  if (!label && !description) return null;
  return (
    <span className={`${block}__text axon-choice__text`}>
      {label ? (
        <span id={labelId} className={`${block}__label axon-choice__label`}>
          {label}
        </span>
      ) : null}
      {description ? (
        <span id={descriptionId} className={`${block}__description axon-choice__description`}>
          {description}
        </span>
      ) : null}
    </span>
  );
}
