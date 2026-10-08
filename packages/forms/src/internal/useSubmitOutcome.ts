import { useCallback, useState } from 'react';
import type { FieldValues } from 'react-hook-form';
import type { FormProps } from '../components/Form/Form';
import { isSubmitErrors } from './serverErrors';

/**
 * Tells a successful submit from a failed one, for forms that replace themselves with a
 * confirmation ("Check your email"). A submit succeeded when `onSubmit` returned without errors
 * and without calling `helpers.setError` or `helpers.setFormError`; a thrown error never reaches
 * the end of the wrapper, so it counts as a failure too.
 */
export function useSubmitOutcome<TValues extends FieldValues>(
  onSubmit: FormProps<FieldValues, TValues>['onSubmit'],
) {
  const [outcome, setOutcome] = useState<{ values: TValues } | null>(null);

  const handleSubmit = useCallback<FormProps<FieldValues, TValues>['onSubmit']>(
    async (values, helpers) => {
      let failed = false;
      const result = await onSubmit(values, {
        ...helpers,
        setError: (name, message) => {
          failed = true;
          helpers.setError(name, message);
        },
        setFormError: (message) => {
          failed = true;
          helpers.setFormError(message);
        },
      });
      if (!failed && !isSubmitErrors(result)) setOutcome({ values });
      return result;
    },
    [onSubmit],
  );

  const reset = useCallback(() => setOutcome(null), []);

  return {
    /** Whether the last submit worked. */
    succeeded: outcome !== null,
    /** The values of the submit that worked. */
    values: outcome?.values,
    /** Goes back to showing the form. */
    reset,
    /** Pass this to the form in place of `onSubmit`. */
    onSubmit: handleSubmit,
  };
}
