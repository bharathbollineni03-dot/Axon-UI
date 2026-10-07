/** 0 is an empty password; 1 weak; 2 fair; 3 good; 4 strong. */
export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: PasswordScore;
}

const commonPasswords = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  'qwertyui',
  'qwerty123',
  'iloveyou',
  'letmein1',
  'admin123',
  'welcome1',
]);

/**
 * A quick estimate of how hard a password is to guess, from its length and the kinds of
 * characters it mixes. It is a hint for the person typing, not a security guarantee: pair it
 * with real rules in your schema, and check passwords against breach lists on your server.
 *
 * Under 8 characters, or a very common password, is weak (1). From 8 characters each of these
 * adds one: 12 or more characters, both letter cases, a digit, a symbol.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return { score: 0 };
  if (password.length < 8 || commonPasswords.has(password.toLowerCase())) return { score: 1 };

  let points = 0;
  if (password.length >= 12) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  return { score: Math.min(4, Math.max(1, points)) as PasswordScore };
}
