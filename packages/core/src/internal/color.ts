/**
 * Accepts `#rgb`, `rgb`, `#rrggbb` or `rrggbb` (any case) and returns lowercase `#rrggbb`,
 * or `null` when the text is not a hex color.
 */
export function normalizeHex(text: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!match) return null;
  const digits = match[1]!.toLowerCase();
  return digits.length === 3 ? `#${[...digits].map((d) => d + d).join('')}` : `#${digits}`;
}

/** WCAG relative luminance of a `#rrggbb` color (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Whether black text (rather than white) is the more readable choice on this color. */
export const prefersDarkText = (hex: string) => relativeLuminance(hex) > 0.179;
