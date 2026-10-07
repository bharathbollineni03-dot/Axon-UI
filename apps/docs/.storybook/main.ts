import path from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';
import remarkGfm from 'remark-gfm';
import { mergeConfig } from 'vite';
import { axonAliases } from '../../../tooling/aliases';

const root = path.resolve(__dirname, '../../..');

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(ts|tsx)',
    '../../../packages/*/src/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    // The docs addon is added by itself (not through essentials) to give it the markdown plugin.
    { name: '@storybook/addon-essentials', options: { docs: false } },
    {
      name: '@storybook/addon-docs',
      // GitHub-flavoured markdown, so the tables in the MDX pages render as tables.
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    '@storybook/addon-a11y',
  ],
  framework: { name: '@storybook/react-vite', options: {} },
  typescript: { reactDocgen: 'react-docgen-typescript' },
  // Stories import package sources directly, so Storybook never needs a prior build.
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { resolve: { alias: axonAliases(root) } }),
};

export default config;
