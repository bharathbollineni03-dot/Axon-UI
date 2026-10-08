# @axonui/theme

Design tokens, `ThemeProvider` and light/dark mode for Axon UI.

```bash
pnpm add @axonui/theme
```

```tsx
import { ThemeProvider } from '@axonui/theme';
import '@axonui/theme/styles.css';

export function App() {
  return (
    <ThemeProvider defaultMode="system" storageKey="axon-mode">
      {/* your app */}
    </ThemeProvider>
  );
}
```

## Tokens

All tokens are exported as TypeScript objects and emitted as CSS custom properties in `styles.css`:

| Group                  | Variables                                                                       |
| ---------------------- | ------------------------------------------------------------------------------- |
| Palettes (50-950)      | `--axon-color-{primary,secondary,success,warning,danger,info,neutral}-{shade}`   |
| Semantic (mode-aware)  | `--axon-color-{background,surface,surface-raised,border,text-primary,...}`       |
| Typography             | `--axon-font-{sans,mono}`, `--axon-font-size-*`, `--axon-font-weight-*`, ...     |
| Spacing                | `--axon-space-{0,0-5,1,1-5,2,3,4,6,8,12,16}`                                    |
| Radius / shadow        | `--axon-radius-*`, `--axon-shadow-*`                                            |
| Layers / motion        | `--axon-z-*`, `--axon-duration-*`, `--axon-ease-*`                              |
| Breakpoints (JS only)  | `--axon-breakpoint-*`                                                           |

## Color modes

`ThemeProvider` renders a `div.axon-root` carrying `data-axon-theme="light" | "dark" | "system"`.
`system` follows `prefers-color-scheme` in pure CSS, so there is no flash before hydration.
The CSS also works without React: set `data-axon-theme` on any element.

- `mode` / `defaultMode` / `onModeChange`: controlled and uncontrolled usage.
- `storageKey`: persist the chosen mode in `localStorage` (uncontrolled only; SSR safe).
- `useTheme()` returns `{ tokens, mode, resolvedMode, setMode }`.

## Custom themes

```tsx
import { createTheme, ThemeProvider } from '@axonui/theme';

const theme = createTheme({
  palette: { primary: { 500: '#0d9488' } },
  radius: { md: '0.75rem' },
  semantic: { dark: { background: '#0b1020' } },
});

<ThemeProvider theme={theme}>...</ThemeProvider>;
```

`createTheme` deep-merges onto the default theme without mutating it. `ThemeProvider` emits only the changed variables as scoped CSS, so overrides work per mode (including `system`).

## Development

`src/tokens.generated.css` is generated from the tokens (`pnpm --filter @axonui/theme gen:css`, run automatically by `build`); a test fails if it is out of date.
