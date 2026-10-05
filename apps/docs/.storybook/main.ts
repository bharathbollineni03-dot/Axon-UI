import path from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import { axonAliases } from '../../../tooling/aliases';

const root = path.resolve(__dirname, '../../..');

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../../../packages/*/src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  typescript: { reactDocgen: 'react-docgen-typescript' },
  // Stories import package sources directly, so Storybook never needs a prior build.
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { resolve: { alias: axonAliases(root) } }),
};

export default config;
