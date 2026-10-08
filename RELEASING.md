# Releasing Axon UI

For maintainers. Contributors only need to add a changeset (`pnpm changeset`); see [CONTRIBUTING.md](CONTRIBUTING.md).

## How a release happens

1. Pull requests that change a published package include a changeset file in `.changeset/`.
2. When they merge to `main`, the **Release** workflow opens (or updates) one pull request titled "chore: version packages". It holds the version bumps and the changelog entries written from the changesets.
3. Merging that pull request runs the workflow again, which builds, then runs `changeset publish`: every package whose version is not on npm yet is published with [provenance](https://docs.npmjs.com/generating-provenance-statements), and git tags and GitHub releases are created.
4. After a publish, the **Deploy Storybook** workflow publishes the documentation to GitHub Pages.

Nothing is published by merging an ordinary pull request, and nothing is published without the version pull request being merged.

## One-time setup

### 1. The npm scope

The packages are published under the `@axonui` scope (`@axonui/theme`, `@axonui/core`, `@axonui/forms`, `@axonui/chat`, `@axonui/charts`, `@axonui/table`). The plain `@axon` scope belongs to someone else on npm.

- The `axonui` organisation is created at [npmjs.com/org/create](https://www.npmjs.com/org/create) (the free plan is enough for public packages). The account that owns the token below must be a member with publish rights.
- Class names (`axon-button`) and CSS variables (`--axon-*`) keep the short `axon` prefix: they are the library's vocabulary, not its npm name.

### 2. Publishing credentials

In the repository's **Settings → Secrets and variables → Actions**, add `NPM_TOKEN`: an npm [automation token](https://docs.npmjs.com/creating-and-viewing-access-tokens) for an account that is a member of the scope with publish rights (a granular token limited to the scope's packages is better). Two-factor authentication stays on for the account; automation tokens bypass the one-time prompt in CI.

Provenance needs nothing extra: the workflow has `id-token: write` and sets `NPM_CONFIG_PROVENANCE`, and each package's `publishConfig` has `"provenance": true`. The `repository` field of each package.json must point at this repository, which it does.

(npm also supports [trusted publishing](https://docs.npmjs.com/trusted-publishers) from GitHub Actions without a long-lived token. When you move to it, remove `NPM_TOKEN` and `NODE_AUTH_TOKEN` from `release.yml`.)

### 3. GitHub settings

- **Actions → General → Workflow permissions**: allow read and write, and allow GitHub Actions to create pull requests (the version pull request needs it).
- **Pages → Source**: GitHub Actions, for the Storybook deployment.
- **Branch protection on `main`**: require the CI jobs (`verify`, `quality`, `react`, `next`, `a11y`) before merging.

## Before the first release

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test
pnpm build
pnpm size && pnpm verify:treeshake && pnpm verify:package
pnpm --filter @axonui/example-next verify
```

`.changeset/first-release.md` makes every package 0.1.0. To look at what would be published without publishing, run `pnpm changeset version` on a scratch branch and `pnpm -r pack --dry-run`, or `npm pack --dry-run` inside a package: only `dist/`, the README and the licence should be in the tarball.

## Pre-releases

```bash
pnpm changeset pre enter next
# merge version pull requests, publish as usual: versions look like 0.2.0-next.0
pnpm changeset pre exit
```

## If a publish goes wrong

- A failed publish can be re-run: `changeset publish` skips versions that are already on npm.
- Never reuse a version number. A broken release is fixed with a patch release; `npm deprecate` marks the bad version.
- To undo a publish within 72 hours: `npm unpublish @axonui/<name>@<version>`, then release a fix. After that window, deprecate instead.
