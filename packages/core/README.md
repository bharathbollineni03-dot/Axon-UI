# @axon/core

Base components for Axon UI: buttons, text inputs and (in progress) choice controls, pickers, layout, navigation, overlays and feedback.

```bash
pnpm add @axon/core @axon/theme
```

```tsx
import { ThemeProvider } from '@axon/theme';
import { Button, TextField } from '@axon/core';
import '@axon/theme/styles.css';
import '@axon/core/styles.css';

export function App() {
  return (
    <ThemeProvider>
      <TextField label="Email" type="email" required helperText="We'll never share it." />
      <Button>Continue</Button>
    </ThemeProvider>
  );
}
```

## Available components

**Batch A: buttons and text** (Step 3)

| Component     | Notes                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| `Button`      | `solid`/`outline`/`ghost`/`link`, sizes, colors, `loading`, icons, `fullWidth`, `href` link |
| `IconButton`  | Requires `aria-label`; `round` or `square`                                                 |
| `ButtonGroup` | Attached or spaced; shares `size`/`variant`/`color`/`disabled` with its buttons            |
| `Label`       | `htmlFor`, required marker, hint text                                                      |
| `TextField`   | Label, helper/error text, adornments, `clearable`, counter, password toggle                |
| `TextArea`    | `autoResize` with `minRows`/`maxRows`, counter                                             |
| `NumberInput` | `min`/`max`/`step`/`precision`, steppers, arrow, Page and Home/End keys                    |

## Conventions

- Every component forwards its `ref` and merges `className`/`style`. For form controls (`TextField`, `TextArea`, `NumberInput`) `className` and `style` apply to the outer wrapper, `ref` and all other props go to the native control.
- `size` is `"sm" | "md" | "lg"` and `color` is `"primary" | "secondary" | "success" | "warning" | "danger" | "neutral"`.
- Controlled (`value` + `onChange`) and uncontrolled (`defaultValue`) usage are both supported.
- Colors come from the mode-aware accent tokens in `@axon/theme` (`--axon-color-<color>-solid`, `-text`, `-subtle`, ...), which meet WCAG AA contrast in light and dark mode.

## Hooks

`useControllableState({ value, defaultValue, onChange })` powers controlled/uncontrolled behavior and is exported for your own components.
