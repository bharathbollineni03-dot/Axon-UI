import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import { Button } from '../Button';
import { Drawer } from './Drawer';

const dialog = () => screen.getByRole('dialog');

describe('Drawer', () => {
  it('renders nothing while closed', () => {
    render(
      <Drawer open={false} onClose={() => undefined} title="Filters">
        Body
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a modal dialog named by its title and described by its description', () => {
    render(
      <Drawer open onClose={() => undefined} title="Filters" description="Narrow the results.">
        Body
      </Drawer>,
    );
    expect(dialog()).toHaveAttribute('aria-modal', 'true');
    expect(dialog()).toHaveAccessibleName('Filters');
    expect(dialog()).toHaveAccessibleDescription('Narrow the results.');
  });

  it('can be named with aria-label when there is no title', () => {
    render(
      <Drawer open onClose={() => undefined} aria-label="Navigation">
        <nav aria-label="Main">Links</nav>
      </Drawer>,
    );
    expect(dialog()).toHaveAccessibleName('Navigation');
  });

  describe('placement and size', () => {
    it('slides in from the right by default', () => {
      render(
        <Drawer open onClose={() => undefined} title="T">
          Body
        </Drawer>,
      );
      expect(dialog()).toHaveClass('axon-drawer', 'axon-drawer--right', 'axon-drawer--md');
      expect(dialog().parentElement).toHaveClass('axon-drawer__scroll--right');
    });

    it.each(['left', 'right', 'top', 'bottom'] as const)('supports %s', (placement) => {
      render(
        <Drawer open onClose={() => undefined} title="T" placement={placement}>
          Body
        </Drawer>,
      );
      expect(dialog()).toHaveClass(`axon-drawer--${placement}`);
      expect(dialog().parentElement).toHaveClass(`axon-drawer__scroll--${placement}`);
    });

    it.each(['sm', 'lg', 'full'] as const)('supports the %s size preset', (size) => {
      render(
        <Drawer open onClose={() => undefined} title="T" size={size}>
          Body
        </Drawer>,
      );
      expect(dialog()).toHaveClass(`axon-drawer--${size}`);
      expect(dialog().style.getPropertyValue('--axon-drawer-size')).toBe('');
    });

    it('takes a number (pixels) or any CSS length as a custom size', () => {
      const { rerender } = render(
        <Drawer open onClose={() => undefined} title="T" size={360}>
          Body
        </Drawer>,
      );
      expect(dialog().style.getPropertyValue('--axon-drawer-size')).toBe('360px');
      rerender(
        <Drawer open onClose={() => undefined} title="T" size="40vw">
          Body
        </Drawer>,
      );
      expect(dialog().style.getPropertyValue('--axon-drawer-size')).toBe('40vw');
    });
  });

  it('renders the footer, forwards the ref and merges className and style', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Drawer
        ref={ref}
        open
        onClose={() => undefined}
        title="T"
        footer={<button>Apply</button>}
        className="extra"
        style={{ margin: 3 }}
        data-testid="drawer"
      >
        Body
      </Drawer>,
    );
    expect(ref.current).toBe(dialog());
    expect(dialog()).toHaveClass('extra');
    expect(dialog()).toHaveStyle({ margin: '3px' });
    expect(dialog()).toHaveAttribute('data-testid', 'drawer');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  describe('closing', () => {
    it('has a close button that reports "close-button"', async () => {
      const onClose = vi.fn();
      render(
        <Drawer open onClose={onClose} title="T">
          Body
        </Drawer>,
      );
      await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toHaveBeenCalledWith('close-button');
    });

    it('closes on Escape and on a backdrop press', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <Drawer open onClose={onClose} title="T">
          Body
        </Drawer>,
      );
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenLastCalledWith('escape');
      await user.click(dialog().parentElement!);
      expect(onClose).toHaveBeenLastCalledWith('backdrop');
    });

    it('can ignore Escape and the backdrop', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <Drawer open onClose={onClose} title="T" closeOnEscape={false} closeOnBackdrop={false}>
          Body
        </Drawer>,
      );
      await user.keyboard('{Escape}');
      await user.click(dialog().parentElement!);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('modal behavior', () => {
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open</Button>
          <Drawer open={open} onClose={() => setOpen(false)} title="Filters">
            <input aria-label="Search" />
          </Drawer>
        </>
      );
    }

    it('takes focus, traps Tab, locks scroll and gives focus back on close', async () => {
      const user = userEvent.setup();
      render(<Example />);
      const opener = screen.getByRole('button', { name: 'Open' });
      await user.click(opener);
      expect(dialog()).toHaveFocus();
      expect(document.documentElement.style.overflow).toBe('hidden');
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab();
      expect(dialog().contains(document.activeElement)).toBe(true);
      await user.keyboard('{Escape}');
      expect(opener).toHaveFocus();
      expect(document.documentElement.style.overflow).toBe('');
    });
  });

  it('has no axe violations for each placement', async () => {
    const { rerender } = render(
      <Drawer open onClose={() => undefined} title="Filters" description="Narrow the results.">
        <label>
          Search
          <input />
        </label>
      </Drawer>,
    );
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
    rerender(
      <Drawer open onClose={() => undefined} title="Filters" placement="bottom" size="sm">
        Body
      </Drawer>,
    );
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
  });
});
