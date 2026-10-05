import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTheme } from '../theme';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from './useTheme';

function Probe() {
  const { mode, resolvedMode, setMode, tokens } = useTheme();
  return (
    <div>
      <output data-testid="mode">{mode}</output>
      <output data-testid="resolved">{resolvedMode}</output>
      <output data-testid="primary">{tokens.palette.primary[500]}</output>
      <button onClick={() => setMode('dark')}>dark</button>
      <button onClick={() => setMode('light')}>light</button>
      <button onClick={() => setMode('system')}>system</button>
    </div>
  );
}

function mockMatchMedia(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<() => void>();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return query.includes('dark') ? dark : false;
    },
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }));
  return {
    setDark(value: boolean) {
      dark = value;
      act(() => listeners.forEach((cb) => cb()));
    },
  };
}

const root = () => document.querySelector('.axon-root') as HTMLElement;

describe('ThemeProvider', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders an axon-root wrapper with the light mode attribute by default', () => {
    render(
      <ThemeProvider data-testid="provider" className="extra">
        content
      </ThemeProvider>,
    );
    const el = screen.getByTestId('provider');
    expect(el).toHaveClass('axon-root', 'extra');
    expect(el).toHaveAttribute('data-axon-theme', 'light');
    expect(el).not.toHaveAttribute('data-axon-scope');
  });

  it('forwards its ref and spreads props onto the root element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<ThemeProvider ref={ref} id="app" style={{ padding: 4 }} />);
    expect(ref.current).toBe(root());
    expect(ref.current).toHaveAttribute('id', 'app');
    expect(ref.current).toHaveStyle({ padding: '4px' });
  });

  it('applies a controlled mode', () => {
    const { rerender } = render(
      <ThemeProvider mode="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(root()).toHaveAttribute('data-axon-theme', 'dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    rerender(
      <ThemeProvider mode="light">
        <Probe />
      </ThemeProvider>,
    );
    expect(root()).toHaveAttribute('data-axon-theme', 'light');
  });

  it('switches mode in uncontrolled usage via setMode', async () => {
    const onModeChange = vi.fn();
    render(
      <ThemeProvider defaultMode="light" onModeChange={onModeChange}>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'dark' }));
    expect(root()).toHaveAttribute('data-axon-theme', 'dark');
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(onModeChange).toHaveBeenCalledWith('dark');
  });

  it('only reports changes when controlled', async () => {
    const onModeChange = vi.fn();
    render(
      <ThemeProvider mode="light" onModeChange={onModeChange}>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'dark' }));
    expect(onModeChange).toHaveBeenCalledWith('dark');
    expect(root()).toHaveAttribute('data-axon-theme', 'light');
  });

  it('resolves the system mode from prefers-color-scheme and follows changes', () => {
    const media = mockMatchMedia(true);
    render(
      <ThemeProvider mode="system">
        <Probe />
      </ThemeProvider>,
    );
    expect(root()).toHaveAttribute('data-axon-theme', 'system');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    media.setDark(false);
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
  });

  it('persists the mode when storageKey is set and restores it on mount', async () => {
    const { unmount } = render(
      <ThemeProvider storageKey="axon-mode">
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'system' }));
    expect(window.localStorage.getItem('axon-mode')).toBe('system');
    unmount();

    render(
      <ThemeProvider storageKey="axon-mode">
        <Probe />
      </ThemeProvider>,
    );
    expect(root()).toHaveAttribute('data-axon-theme', 'system');
  });

  it('ignores invalid stored values and storage failures', async () => {
    window.localStorage.setItem('axon-mode', 'purple');
    render(
      <ThemeProvider storageKey="axon-mode" defaultMode="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(root()).toHaveAttribute('data-axon-theme', 'dark');

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    await userEvent.click(screen.getByRole('button', { name: 'light' }));
    expect(root()).toHaveAttribute('data-axon-theme', 'light');
  });

  it('emits no override styles for the default theme', () => {
    render(<ThemeProvider />);
    expect(root().querySelector('style')).toBeNull();
  });

  it('emits scoped CSS for custom tokens and exposes them through useTheme', () => {
    const theme = createTheme({
      palette: { primary: { 500: '#ff00aa' } },
      semantic: { dark: { background: '#101010' } },
    });
    render(
      <ThemeProvider theme={theme}>
        <Probe />
      </ThemeProvider>,
    );
    const scope = root().getAttribute('data-axon-scope');
    expect(scope).toBeTruthy();
    const css = root().querySelector('style')?.textContent ?? '';
    expect(css).toContain(`[data-axon-scope="${scope}"] {`);
    expect(css).toContain('--axon-color-primary-500: #ff00aa;');
    expect(css).toContain('--axon-color-background: #101010;');
    expect(screen.getByTestId('primary')).toHaveTextContent('#ff00aa');
  });

  it('throws a helpful error when useTheme is used outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ThemeProvider/);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ThemeProvider theme={createTheme({ radius: { md: '1rem' } })}>
        <Probe />
      </ThemeProvider>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
