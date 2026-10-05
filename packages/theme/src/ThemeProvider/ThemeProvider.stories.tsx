import type { Meta, StoryObj } from '@storybook/react';
import { createTheme } from '../theme';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from './useTheme';

const meta = {
  title: 'Theme/ThemeProvider',
  component: ThemeProvider,
  parameters: { layout: 'padded' },
  argTypes: {
    mode: { control: 'inline-radio', options: ['light', 'dark', 'system'] },
  },
} satisfies Meta<typeof ThemeProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

function ModeSwitcher() {
  const { mode, resolvedMode, setMode, tokens } = useTheme();
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)', padding: 'var(--axon-space-4)' }}>
      <p style={{ margin: 0 }}>
        Mode: <strong>{mode}</strong> (showing {resolvedMode}). Primary 500:{' '}
        <code>{tokens.palette.primary[500]}</code>
      </p>
      <div style={{ display: 'flex', gap: 'var(--axon-space-2)' }}>
        {(['light', 'dark', 'system'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

export const Playground: Story = {
  args: { defaultMode: 'light' },
  render: (args) => (
    <ThemeProvider {...args}>
      <ModeSwitcher />
    </ThemeProvider>
  ),
};

export const CustomTheme: Story = {
  render: (args) => (
    <ThemeProvider
      {...args}
      theme={createTheme({
        palette: { primary: { 500: '#0d9488' } },
        radius: { md: '0.75rem' },
        semantic: { dark: { background: '#0b1020' } },
      })}
    >
      <ModeSwitcher />
    </ThemeProvider>
  ),
};
