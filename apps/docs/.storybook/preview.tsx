import { useEffect } from 'react';
import type { Decorator, Preview } from '@storybook/react';
import { ThemeProvider, THEME_ATTRIBUTE, type ThemeMode } from '@axon/theme';
import '@axon/theme/styles.css';
import '@axon/core/styles.css';
import '@axon/forms/styles.css';
import '@axon/chat/styles.css';
import '@axon/charts/styles.css';
import '@axon/table/styles.css';

/** Wraps every story in ThemeProvider and mirrors the mode onto <html> so the canvas follows it. */
const withTheme: Decorator = (Story, context) => {
  const mode = (context.globals['theme'] ?? 'light') as ThemeMode;

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute(THEME_ATTRIBUTE, mode);
    document.body.style.backgroundColor = 'var(--axon-color-background)';
    document.body.style.color = 'var(--axon-color-text-primary)';
  }, [mode]);

  return (
    <ThemeProvider mode={mode} style={{ background: 'transparent' }}>
      <Story />
    </ThemeProvider>
  );
};

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Axon color mode',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        dynamicTitle: true,
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
          { value: 'system', title: 'System', icon: 'browser' },
        ],
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    layout: 'centered',
  },
};

export default preview;
