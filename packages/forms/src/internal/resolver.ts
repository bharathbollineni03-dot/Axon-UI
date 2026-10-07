import { zodResolver } from '@hookform/resolvers/zod';
import { set, type FieldErrors, type FieldValues, type Resolver } from 'react-hook-form';
import type { z } from 'zod';

/**
 * Errors a custom validator returns: a message per field, keyed by field name. Nested fields use
 * dots (`"address.street"`). Use the key `"root"` for an error that belongs to the whole form.
 */
export type FormValidationErrors = Record<string, string>;

/**
 * A custom validator. Return `undefined` (or an empty object) when the values are valid, or the
 * errors to show. It may be async, for a check that needs a lookup.
 */
export type FormValidator<TValues extends FieldValues> = (
  values: TValues,
) => FormValidationErrors | undefined | void | Promise<FormValidationErrors | undefined | void>;

type SchemaOf<TInput extends FieldValues, TOutput extends FieldValues> = z.ZodType<TOutput, TInput>;

/**
 * Builds the resolver react-hook-form validates with: a zod `schema`, a custom `validate`
 * function, or both. The schema runs first; the custom validator only runs on values the schema
 * accepted, and receives the schema's parsed output.
 */
export function createResolver<TInput extends FieldValues, TOutput extends FieldValues = TInput>(
  schema: SchemaOf<TInput, TOutput> | undefined,
  validate: FormValidator<TOutput> | undefined,
): Resolver<TInput, unknown, TOutput> | undefined {
  if (!schema && !validate) return undefined;
  const fromSchema = schema
    ? (zodResolver(schema as never) as unknown as Resolver<TInput, unknown, TOutput>)
    : undefined;

  return async (values, context, options) => {
    let parsed = values as unknown as TOutput;
    if (fromSchema) {
      const result = await fromSchema(values, context, options);
      if (Object.keys(result.errors).length > 0) return result;
      parsed = result.values as TOutput;
    }
    if (!validate) return { values: parsed, errors: {} };

    const found = await validate(parsed);
    if (!found || Object.keys(found).length === 0) return { values: parsed, errors: {} };

    const errors: Record<string, unknown> = {};
    for (const [name, message] of Object.entries(found)) {
      set(errors, name, { type: 'validate', message });
    }
    return { values: {}, errors: errors as FieldErrors<TInput> };
  };
}
