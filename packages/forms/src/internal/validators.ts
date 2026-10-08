import { z } from 'zod';

/** Messages for an email field. */
export interface EmailMessages {
  required: string;
  invalid: string;
}

/** A required, trimmed email address. */
export const emailField = (messages: EmailMessages) =>
  z.string().trim().min(1, messages.required).pipe(z.email(messages.invalid));

/** A required, trimmed piece of text. */
export const requiredText = (message: string) => z.string().trim().min(1, message);

/** What a password must contain. Everything but `minLength` is off unless asked for. */
export interface PasswordRules {
  /** Fewest characters. Defaults to 8. */
  minLength?: number;
  requireLowercase?: boolean;
  requireUppercase?: boolean;
  requireNumber?: boolean;
  requireSymbol?: boolean;
}

export interface PasswordMessages {
  required: string;
  tooShort: (min: number) => string;
  lowercase: string;
  uppercase: string;
  number: string;
  symbol: string;
}

export const defaultPasswordMessages: PasswordMessages = {
  required: 'Enter a password.',
  tooShort: (min) => `Use at least ${min} characters.`,
  lowercase: 'Include a lowercase letter.',
  uppercase: 'Include an uppercase letter.',
  number: 'Include a number.',
  symbol: 'Include a symbol, such as ! or #.',
};

/** A password that follows `rules`. Failures are reported in a fixed order, length first. */
export function passwordField(rules: PasswordRules = {}, messages: Partial<PasswordMessages> = {}) {
  const text = { ...defaultPasswordMessages, ...messages };
  const { minLength = 8, requireLowercase, requireUppercase, requireNumber, requireSymbol } = rules;
  let schema = z.string().min(1, text.required).min(minLength, text.tooShort(minLength));
  if (requireLowercase) schema = schema.regex(/[a-z]/, text.lowercase);
  if (requireUppercase) schema = schema.regex(/[A-Z]/, text.uppercase);
  if (requireNumber) schema = schema.regex(/\d/, text.number);
  if (requireSymbol) schema = schema.regex(/[^A-Za-z0-9]/, text.symbol);
  return schema;
}
