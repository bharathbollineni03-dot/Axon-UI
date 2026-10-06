/** Stable identity for a `File`, used to key per-file upload state. */
export const getFileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

/**
 * Whether a file matches an `accept` string such as `image/*,.pdf,application/json`:
 * extensions (`.pdf`), exact types (`image/png`) and wildcards (`image/*`). An empty `accept`
 * matches everything.
 */
export function matchesAccept(file: Pick<File, 'name' | 'type'>, accept?: string): boolean {
  const tokens = (accept ?? '')
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** `1536` -> `"1.5 KB"` (powers of 1024). */
export function formatBytes(bytes: number, locale = 'en-US'): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
  return `${formatted} ${UNITS[unit]}`;
}
