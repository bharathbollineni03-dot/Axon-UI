# Axon UI

An open-source React component library with prebuilt forms, AI chat interfaces, charts and data tables.

| Package                              | Purpose                                              |
| ------------------------------------ | ---------------------------------------------------- |
| [`@axon/theme`](packages/theme)      | Design tokens, `ThemeProvider`, light/dark mode      |
| [`@axon/core`](packages/core)        | Base controls (Button, TextField, Checkbox, ...)     |
| [`@axon/forms`](packages/forms)      | Form engine and prebuilt forms                       |
| [`@axon/chat`](packages/chat)        | AI chat window and related components                |
| [`@axon/charts`](packages/charts)    | SVG charts                                           |
| [`@axon/table`](packages/table)      | Data grid                                            |
| [`apps/docs`](apps/docs)             | Storybook documentation                              |

## Getting started

Requires Node 18.18+ and [pnpm](https://pnpm.io) 10.

```bash
pnpm install
pnpm storybook   # http://localhost:6006
```

## Scripts

| Script               | What it does                                       |
| -------------------- | -------------------------------------------------- |
| `pnpm dev`           | Watch-build every package and run Storybook        |
| `pnpm build`         | Build all packages (ESM + CJS + types + CSS) and Storybook |
| `pnpm test`          | Run Vitest in every package                        |
| `pnpm lint`          | ESLint (typescript-eslint, react, react-hooks, jsx-a11y) |
| `pnpm typecheck`     | `tsc --noEmit` in every package                    |
| `pnpm storybook`     | Start Storybook                                    |
| `pnpm changeset`     | Record a change for the next release               |
| `pnpm release`       | Build and publish via Changesets                   |

## Conventions

- Plain CSS per component, using `--axon-*` custom properties from `@axon/theme`; class names are `axon-` prefixed and BEM-like.
- Each package ships `dist/styles.css`; import it alongside the JS: `import '@axon/core/styles.css'`.
- Each component folder holds `Component.tsx`, `Component.css`, `Component.test.tsx`, `Component.stories.tsx`, `index.ts`.
- Shared tooling (Vitest, tsup, path aliases) lives in [`tooling/`](tooling).

## License

[MIT](LICENSE)
