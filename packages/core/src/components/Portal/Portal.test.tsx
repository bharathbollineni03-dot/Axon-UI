import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getPortalRoot } from '../../internal/portal';
import { Portal } from './Portal';

describe('Portal', () => {
  it('renders its children outside the parent, in <body> by default', () => {
    render(
      <div data-testid="parent">
        <Portal>
          <p>Hello</p>
        </Portal>
      </div>,
    );
    const hello = screen.getByText('Hello');
    expect(screen.getByTestId('parent')).not.toContainElement(hello);
    expect(hello.parentElement).toBe(document.body);
  });

  it('renders into the closest .axon-root so theme variables apply', () => {
    render(
      <div className="axon-root" data-testid="root">
        <div>
          <Portal>
            <p>Hello</p>
          </Portal>
        </div>
      </div>,
    );
    expect(screen.getByText('Hello').parentElement).toBe(screen.getByTestId('root'));
  });

  it('prefers a modal overlay around it to the .axon-root', () => {
    render(
      <div className="axon-root">
        <div data-axon-overlay="" data-testid="overlay">
          <Portal>
            <p>Hello</p>
          </Portal>
        </div>
      </div>,
    );
    expect(screen.getByText('Hello').parentElement).toBe(screen.getByTestId('overlay'));
  });

  it('renders into a given container', () => {
    const container = document.createElement('section');
    document.body.appendChild(container);
    render(
      <Portal container={container}>
        <p>Hello</p>
      </Portal>,
    );
    expect(screen.getByText('Hello').parentElement).toBe(container);
    container.remove();
  });

  it('renders in place when disabled', () => {
    render(
      <div data-testid="parent">
        <Portal disabled>
          <p>Hello</p>
        </Portal>
      </div>,
    );
    expect(screen.getByTestId('parent')).toContainElement(screen.getByText('Hello'));
  });

  it('keeps the children in the React tree, so events bubble to the parent', async () => {
    const calls: string[] = [];
    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={() => calls.push('parent')}>
        <Portal>
          <button onClick={() => calls.push('child')}>Press</button>
        </Portal>
      </div>,
    );
    screen.getByRole('button', { name: 'Press' }).click();
    expect(calls).toEqual(['child', 'parent']);
  });

  it('renders nothing but the marker on the server', () => {
    // jsdom has a window, so React warns that the layout effect does not run on the server.
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const html = renderToString(
      <Portal>
        <p>Hello</p>
      </Portal>,
    );
    log.mockRestore();
    expect(html).not.toContain('Hello');
    expect(html).toContain('data-axon-portal');
  });

  it('removes its children when unmounted', () => {
    const { unmount } = render(
      <Portal>
        <p>Hello</p>
      </Portal>,
    );
    unmount();
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });
});

describe('getPortalRoot', () => {
  it('is undefined without a reference or an enclosing root', () => {
    expect(getPortalRoot(null)).toBeUndefined();
    expect(getPortalRoot(document.createElement('div'))).toBeUndefined();
  });

  it('finds the nearest overlay, then the nearest .axon-root', () => {
    const root = document.createElement('div');
    root.className = 'axon-root';
    const overlay = document.createElement('div');
    overlay.setAttribute('data-axon-overlay', '');
    const inner = document.createElement('button');
    overlay.appendChild(inner);
    root.appendChild(overlay);
    expect(getPortalRoot(inner)).toBe(overlay);
    expect(getPortalRoot(overlay.parentElement)).toBe(root);
  });
});
