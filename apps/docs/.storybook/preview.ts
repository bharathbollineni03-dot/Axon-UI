import type { Preview } from '@storybook/react';
import '@axon/theme/styles.css';
import '@axon/core/styles.css';
import '@axon/forms/styles.css';
import '@axon/chat/styles.css';
import '@axon/charts/styles.css';
import '@axon/table/styles.css';

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    layout: 'centered',
  },
};

export default preview;
