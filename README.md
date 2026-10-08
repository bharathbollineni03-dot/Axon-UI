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
| [`apps/docs`](apps/docs)             | Storybook: guides, examples and every component |
| [`examples/next-app`](examples/next-app) | A Next.js app router project that uses every package |

## Documentation

The documentation is a Storybook, with a props table and live controls for every component, guides for [getting started](apps/docs/src/GettingStarted.mdx), [theming](apps/docs/src/Theming.mdx) and [accessibility](apps/docs/src/Accessibility.mdx), and three complete example pages: an admin dashboard, the auth pages and an AI chat app. Each package also has a README with install and usage. Run it locally with `pnpm storybook`.

## Getting started

Requires Node 18.18+ (CI runs 20 and 22) and [pnpm](https://pnpm.io) 10.

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
| `pnpm size`          | size-limit budgets for every package (brotli)      |
| `pnpm verify:treeshake` | Importing one component must not pull in the rest |
| `pnpm verify:package` | `use client` banners, exports map, publint        |
| `pnpm test:a11y`      | axe-core on every story, light and dark (build Storybook first) |
| `pnpm test:visual`    | Screenshot comparison of representative stories    |
| `pnpm changeset`      | Record a change for the next release               |
| `pnpm release`        | Build and publish via Changesets (CI does this)    |

## Conventions

- Plain CSS per component, using `--axon-*` custom properties from `@axon/theme`; class names are `axon-` prefixed and BEM-like.
- Each package ships `dist/styles.css`; import it alongside the JS: `import '@axon/core/styles.css'`.
- Each component folder holds `Component.tsx`, `Component.css`, `Component.test.tsx`, `Component.stories.tsx`, `index.ts`.
- Shared tooling (Vitest, tsup, path aliases) lives in [`tooling/`](tooling).

## Contributing and releases

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to work on the library, [RELEASING.md](RELEASING.md) for how releases are made, [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
