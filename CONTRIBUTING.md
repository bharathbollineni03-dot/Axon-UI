# Contributing to Axon UI

Thank you for helping. This guide covers setting up, how the code is organised, what a good change looks like, and how releases work. Please also read the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setting up

You need Node 20 or 22 and [pnpm](https://pnpm.io) 10.

```bash
git clone https://github.com/bharathbollineni03-dot/Axon-UI.git
cd Axon-UI
pnpm install
pnpm storybook      # the documentation and the place to try components, http://localhost:6006
```

| Command                | What it does                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `pnpm test`            | Vitest in every package (jsdom, Testing Library, jest-axe)                           |
| `pnpm lint`            | ESLint with typescript-eslint, react, react-hooks and jsx-a11y; no warnings allowed   |
| `pnpm typecheck`       | `tsc --noEmit` in every package                                                      |
| `pnpm build`           | Builds every package (ESM, CJS, types, CSS), Storybook and the Next.js example       |
| `pnpm format`          | Prettier                                                                             |
| `pnpm size`            | size-limit budgets for every package                                                 |
| `pnpm verify:treeshake`| Proves that importing one component does not pull in the library                     |
| `pnpm test:a11y`       | axe-core on every story in light and dark mode (needs `pnpm --filter @axon/docs build`) |
| `pnpm test:visual`     | Screenshot comparison of representative stories (same build needed)                  |

Turborepo caches every task, so a second run is quick. The packages' own scripts (`pnpm --filter @axon/table test`) work too, and `pnpm --filter @axon/core exec vitest` runs one test file in watch mode.

## How the repository is laid out

```
packages/theme     design tokens, ThemeProvider
packages/core      base components
packages/forms     form engine and prebuilt forms        (builds on core)
packages/chat      AI chat components                    (builds on core and forms)
packages/charts    SVG charts                            (builds on core)
packages/table     Table and DataGrid                    (builds on core)
apps/docs          Storybook: the docs pages, the examples and every package's stories
examples/next-app  a Next.js app router project that uses every package
tooling/           shared Vitest, tsup and alias config, and the verification scripts
tests/             Playwright: accessibility and visual checks against the built Storybook
```

Each component lives in its own folder: `Component.tsx`, `Component.css`, `Component.test.tsx`, `Component.stories.tsx`, and an `index.ts` where the package needs one. Stories and tests import the source, so you never rebuild to see a change.

## What a good change looks like

- **A test that fails without it.** Behaviour is tested through the DOM the way a user meets it (Testing Library, `userEvent`), including keyboard use. Components also run `axe` in the states that matter.
- **Accessibility is part of the work, not a follow-up.** Follow the WAI-ARIA authoring practices for the pattern, give every control a name, make every pointer action available from the keyboard, and announce changes politely. See the [Accessibility](apps/docs/src/Accessibility.mdx) page for the conventions.
- **A story for each state** that matters (default, with the optional props, loading, empty, error, dark mode), and `argTypes` for the knobs worth turning. The `a11y` check runs axe over every story in both colour modes, so a new story must pass.
- **Theming through tokens.** Colours, spacing, radii and motion come from `--axon-*` variables. No hard-coded colours, and nothing that only works in light mode.
- **Plain CSS** with `axon-` prefixed, BEM-like class names, one file per component, imported from the package's `styles.css`.
- **The same API shape as its neighbours.** `size` is `sm | md | lg`; `color` is `primary | secondary | success | warning | danger | neutral`; components forward `ref` and merge `className` and `style`; state is controlled (`value` + `onChange`) or uncontrolled (`defaultValue`). Look at a similar component before inventing a prop.
- **Small bundles.** Don't add a dependency lightly; `pnpm size` has budgets. A top-level `forwardRef` call is annotated automatically at build time, but other top-level calls that run at import time (`new Set(...)`, `Object.keys(...)`) keep code alive: mark them `/* @__PURE__ */` when they only compute a value. `pnpm verify:treeshake` catches the regressions.
- **Server-safe.** Nothing may read `window` or `document` while rendering.
- **Works on React 18 and 19.** CI runs everything against both. Ref types in particular differ; write `{ current: T | null }` where a package's own hook returns a ref.

### Commit messages and pull requests

Write what the change does and why, in the imperative ("Add DataGrid infinite scroll"). Keep a pull request to one idea. The template asks for the things reviewers look for: what changed, how you tested it, whether it changes the public API, and a changeset.

## Changesets: how releases work

Every change to a published package needs a changeset, a small file that says which packages change and whether it is a patch, minor or major release:

```bash
pnpm changeset
```

Commit the generated file in `.changeset/` with your pull request. Documentation, tests and the examples don't need one.

On every push to `main`, the Release workflow either opens (or updates) a "version packages" pull request that applies the pending changesets (version bumps and each package's `CHANGELOG.md`), or, when that pull request is merged, publishes the new versions to npm with provenance and deploys Storybook. Maintainers: see [RELEASING.md](RELEASING.md).

Axon UI follows [semantic versioning](https://semver.org). While the packages are below 1.0 a minor release may contain breaking changes; the changeset says so.

## Visual regression baselines

`pnpm test:visual` compares screenshots of representative stories, light and dark, against baselines in `tests/visual/__screenshots__`. Baselines are rendered on Linux, so a maintainer makes them with the **Update visual baselines** workflow (Actions tab, "Run workflow"), downloads the artifact and commits the files. Don't commit screenshots made on your own machine: they carry your platform's name and the CI job ignores them.

## Reporting bugs and asking for features

Use the issue templates. For a bug, a link to a minimal reproduction (a Storybook story edit or a CodeSandbox) is worth more than a long description. For a security problem, don't open a public issue: see [SECURITY.md](SECURITY.md).
