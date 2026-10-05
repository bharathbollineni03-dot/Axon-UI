import { buildThemeCss, themeToVars } from './css';
import { defaultTheme } from './theme';

const HEADER =
  '/* Generated from the @axon/theme tokens. Do not edit; run `pnpm --filter @axon/theme gen:css`. */\n\n';

/** Contents of `tokens.generated.css`: the default theme as CSS custom properties. */
export function generateTokensCss(): string {
  return HEADER + buildThemeCss(themeToVars(defaultTheme));
}
