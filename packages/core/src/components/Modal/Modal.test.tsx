/* eslint-disable jsx-a11y/no-autofocus -- one test checks that an autoFocus field keeps focus when the modal opens */
import { createRef, useRef, useState, type ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import { Button } from '../Button';
import { DropdownMenu } from '../DropdownMenu';
import { MenuItem } from '../Menu';
import { Select } from '../Select';
import { Dialog, Modal, type ModalProps } from './Modal';

/** A trigger plus a modal it controls, so focus return can be tested. */
function Example({
  children,
  ...props
}: Partial<ModalProps> & { children?: ReactNode; title?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Modal
        title="Settings"
        {...(props as ModalProps)}
        open={open}
        onClose={(reason) => {
          props.onClose?.(reason);
          setOpen(false);
        }}
      >
        {children ?? <p>Body text</p>}
      </Modal>
    </>
  );
}

const dialog = () => screen.getByRole('dialog');

describe('Modal', () => {
  it('renders nothing while closed', () => {
    render(
      <Modal open={false} onClose={() => undefined} title="Hi">
        Body
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('semantics', () => {
    it('is a modal dialog named by its title and described by its description', () => {
      render(
        <Modal open onClose={() => undefined} title="Rename file" description="Pick a new name.">
          Body
        </Modal>,
      );
      const d = dialog();
      expect(d).toHaveAttribute('aria-modal', 'true');
      expect(d).toHaveAccessibleName('Rename file');
      expect(d).toHaveAccessibleDescription('Pick a new name.');
      expect(screen.getByRole('heading', { level: 2, name: 'Rename file' })).toBeInTheDocument();
    });

    it('can be named with aria-label or aria-labelledby when there is no title', () => {
      const { unmount } = render(
        <Modal open onClose={() => undefined} aria-label="Image viewer">
          Body
        </Modal>,
      );
      expect(dialog()).toHaveAccessibleName('Image viewer');
      unmount();

      render(
        <>
          <h1 id="heading">Custom heading</h1>
          <Modal open onClose={() => undefined} aria-labelledby="heading">
            Body
          </Modal>
        </>,
      );
      expect(dialog()).toHaveAccessibleName('Custom heading');
    });

    it('lets the title heading level be chosen', () => {
      render(
        <Modal open onClose={() => undefined} title="Level three" titleAs="h3">
          Body
        </Modal>,
      );
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('supports the alertdialog role', () => {
      render(
        <Modal open onClose={() => undefined} title="Sure?" role="alertdialog">
          Body
        </Modal>,
      );
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('exposes `Dialog` as another name for the same component', () => {
      expect(Dialog).toBe(Modal);
    });
  });

  describe('rendering', () => {
    it('renders the body and the footer', () => {
      render(
        <Modal open onClose={() => undefined} title="T" footer={<button>Save</button>}>
          <p>Body text</p>
        </Modal>,
      );
      expect(within(dialog()).getByText('Body text')).toBeInTheDocument();
      expect(within(dialog()).getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('renders in a portal inside the closest .axon-root, else in the body', () => {
      const { unmount } = render(
        <div className="axon-root" data-testid="root">
          <Modal open onClose={() => undefined} title="T">
            Body
          </Modal>
        </div>,
      );
      expect(screen.getByTestId('root')).toContainElement(dialog());
      expect(
        screen.getByTestId('root').querySelector(':scope > [data-axon-overlay]'),
      ).not.toBeNull();
      unmount();

      render(
        <Modal open onClose={() => undefined} title="T">
          Body
        </Modal>,
      );
      expect(document.body.querySelector(':scope > [data-axon-overlay]')).not.toBeNull();
    });

    it('renders into a given container', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      render(
        <Modal open onClose={() => undefined} title="T" container={container}>
          Body
        </Modal>,
      );
      expect(container).toContainElement(dialog());
      container.remove();
    });

    it('applies the size, className, id, style and extra props, and forwards the ref to the dialog', () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Modal
          ref={ref}
          open
          onClose={() => undefined}
          title="T"
          size="xl"
          className="extra"
          id="my-modal"
          style={{ margin: 3 }}
          data-testid="dlg"
        >
          Body
        </Modal>,
      );
      expect(ref.current).toBe(dialog());
      expect(dialog()).toHaveClass('axon-modal', 'axon-modal--xl', 'extra');
      expect(dialog()).toHaveAttribute('id', 'my-modal');
      expect(dialog()).toHaveAttribute('data-testid', 'dlg');
      expect(dialog()).toHaveStyle({ margin: '3px' });
    });

    it('supports the other sizes and scroll behaviors', () => {
      const { rerender } = render(
        <Modal open onClose={() => undefined} title="T" size="sm">
          Body
        </Modal>,
      );
      expect(dialog()).toHaveClass('axon-modal--sm');
      rerender(
        <Modal open onClose={() => undefined} title="T" size="full" scrollBehavior="outside">
          Body
        </Modal>,
      );
      expect(dialog()).toHaveClass('axon-modal--full');
      expect(dialog().parentElement).toHaveClass(
        'axon-modal__scroll--outside',
        'axon-modal__scroll--full',
      );
    });
  });

  describe('closing', () => {
    it('has a close button that reports "close-button"', async () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="T">
          Body
        </Modal>,
      );
      await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toHaveBeenCalledWith('close-button');
    });

    it('can hide the close button, or translate its label', () => {
      const { rerender } = render(
        <Modal open onClose={() => undefined} title="T" showCloseButton={false}>
          Body
        </Modal>,
      );
      expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
      rerender(
        <Modal open onClose={() => undefined} title="T" closeLabel="Schließen">
          Body
        </Modal>,
      );
      expect(screen.getByRole('button', { name: 'Schließen' })).toBeInTheDocument();
    });

    it('shows the close button even without a title', () => {
      render(
        <Modal open onClose={() => undefined} aria-label="No title">
          Body
        </Modal>,
      );
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('closes on Escape, reporting "escape"', async () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="T">
          Body
        </Modal>,
      );
      await userEvent.setup().keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledWith('escape');
    });

    it('ignores Escape when closeOnEscape is false', async () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="T" closeOnEscape={false}>
          Body
        </Modal>,
      );
      await userEvent.setup().keyboard('{Escape}');
      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes on a backdrop press, reporting "backdrop"', async () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="T">
          Body
        </Modal>,
      );
      await userEvent.setup().click(dialog().parentElement!);
      expect(onClose).toHaveBeenCalledWith('backdrop');
    });

    it('does not close when the press is inside the dialog', async () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="T">
          <p>Body text</p>
        </Modal>,
      );
      await userEvent.setup().click(screen.getByText('Body text'));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not close when a press starts inside and ends on the backdrop (text selection)', async () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="T">
          <p>Body text</p>
        </Modal>,
      );
      const backdrop = dialog().parentElement!;
      const user = userEvent.setup();
      await user.pointer([
        { keys: '[MouseLeft>]', target: screen.getByText('Body text') },
        { target: backdrop },
        { keys: '[/MouseLeft]' },
      ]);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('ignores the backdrop when closeOnBackdrop is false', async () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="T" closeOnBackdrop={false}>
          Body
        </Modal>,
      );
      await userEvent.setup().click(dialog().parentElement!);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('focus', () => {
    it('moves focus to the dialog itself when it opens', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(dialog()).toHaveFocus();
    });

    it('returns focus to the element that opened it when it closes', async () => {
      const user = userEvent.setup();
      render(<Example />);
      const opener = screen.getByRole('button', { name: 'Open' });
      await user.click(opener);
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
    });

    it('focuses initialFocusRef when given', async () => {
      function WithInitial() {
        const input = useRef<HTMLInputElement>(null);
        return (
          <Modal open onClose={() => undefined} title="T" initialFocusRef={input}>
            <button>First</button>
            <input ref={input} aria-label="Name" />
          </Modal>
        );
      }
      render(<WithInitial />);
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    });

    it('leaves an autoFocus field focused', () => {
      render(
        <Modal open onClose={() => undefined} title="T">
          <input aria-label="Name" autoFocus />
        </Modal>,
      );
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    });

    it('traps Tab and Shift+Tab inside the dialog', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button>Outside</button>
          <Modal open onClose={() => undefined} title="T" footer={<button>Save</button>}>
            <input aria-label="Name" />
          </Modal>
        </>,
      );
      const close = screen.getByRole('button', { name: 'Close' });
      const name = screen.getByRole('textbox', { name: 'Name' });
      const save = screen.getByRole('button', { name: 'Save' });
      await user.tab();
      expect(close).toHaveFocus();
      await user.tab();
      expect(name).toHaveFocus();
      await user.tab();
      expect(save).toHaveFocus();
      await user.tab();
      expect(close).toHaveFocus();
      await user.tab({ shift: true });
      expect(save).toHaveFocus();
      expect(screen.getByRole('button', { name: 'Outside' })).not.toHaveFocus();
    });

    it('pulls focus back if it is moved outside', () => {
      render(
        <>
          <button>Outside</button>
          <Modal open onClose={() => undefined} title="T">
            Body
          </Modal>
        </>,
      );
      screen.getByRole('button', { name: 'Outside' }).focus();
      expect(dialog().contains(document.activeElement)).toBe(true);
    });
  });

  describe('a body that scrolls', () => {
    it('is focusable so keyboard users can scroll it, and not otherwise', async () => {
      const { rerender } = render(
        <Modal open onClose={() => undefined} title="T">
          <p>Short</p>
        </Modal>,
      );
      expect(screen.getByText('Short').parentElement).not.toHaveAttribute('tabindex');

      const height = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(600);
      const client = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200);
      rerender(
        <Modal open onClose={() => undefined} title="T">
          <p>Short</p>
          <p>Now long</p>
        </Modal>,
      );
      // The change is picked up by a MutationObserver, which runs after the render.
      await waitFor(() =>
        expect(screen.getByText('Short').parentElement).toHaveAttribute('tabindex', '0'),
      );
      height.mockRestore();
      client.mockRestore();
    });
  });

  describe('scroll lock', () => {
    it('stops the page scrolling while open and restores it after', async () => {
      const user = userEvent.setup();
      document.documentElement.style.overflow = 'auto';
      render(<Example />);
      expect(document.documentElement.style.overflow).toBe('auto');
      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(document.documentElement.style.overflow).toBe('hidden');
      await user.keyboard('{Escape}');
      expect(document.documentElement.style.overflow).toBe('auto');
      document.documentElement.style.overflow = '';
    });

    it('keeps the lock until the last of several modals closes', () => {
      const { rerender } = render(
        <>
          <Modal open onClose={() => undefined} title="One">
            a
          </Modal>
          <Modal open onClose={() => undefined} title="Two">
            b
          </Modal>
        </>,
      );
      expect(document.documentElement.style.overflow).toBe('hidden');
      rerender(
        <>
          <Modal open={false} onClose={() => undefined} title="One">
            a
          </Modal>
          <Modal open onClose={() => undefined} title="Two">
            b
          </Modal>
        </>,
      );
      expect(document.documentElement.style.overflow).toBe('hidden');
      rerender(
        <>
          <Modal open={false} onClose={() => undefined} title="One">
            a
          </Modal>
          <Modal open={false} onClose={() => undefined} title="Two">
            b
          </Modal>
        </>,
      );
      expect(document.documentElement.style.overflow).toBe('');
    });

    it('releases the lock when a modal unmounts while open', () => {
      const { unmount } = render(
        <Modal open onClose={() => undefined} title="T">
          Body
        </Modal>,
      );
      expect(document.documentElement.style.overflow).toBe('hidden');
      unmount();
      expect(document.documentElement.style.overflow).toBe('');
    });
  });

  describe('stacked modals', () => {
    function Stack({ onOuterClose }: { onOuterClose: () => void }) {
      const [inner, setInner] = useState(false);
      return (
        <Modal open onClose={onOuterClose} title="Outer">
          <Button onClick={() => setInner(true)}>Open inner</Button>
          <Modal open={inner} onClose={() => setInner(false)} title="Inner">
            <Button>Inside inner</Button>
          </Modal>
        </Modal>
      );
    }

    it('closes only the topmost modal on Escape', async () => {
      const onOuterClose = vi.fn();
      const user = userEvent.setup();
      render(<Stack onOuterClose={onOuterClose} />);
      await user.click(screen.getByRole('button', { name: 'Open inner' }));
      expect(screen.getAllByRole('dialog')).toHaveLength(2);
      await user.keyboard('{Escape}');
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      expect(onOuterClose).not.toHaveBeenCalled();
      await user.keyboard('{Escape}');
      expect(onOuterClose).toHaveBeenCalledWith('escape');
    });

    it('traps focus in the inner modal, then returns it to the outer one', async () => {
      const user = userEvent.setup();
      render(<Stack onOuterClose={() => undefined} />);
      const openInner = screen.getByRole('button', { name: 'Open inner' });
      await user.click(openInner);
      const inner = screen.getByRole('dialog', { name: 'Inner' });
      expect(inner).toHaveFocus();
      await user.tab();
      await user.tab();
      await user.tab();
      expect(inner.contains(document.activeElement)).toBe(true);
      await user.keyboard('{Escape}');
      expect(openInner).toHaveFocus();
      // The outer trap is active again.
      await user.tab();
      expect(screen.getByRole('dialog', { name: 'Outer' }).contains(document.activeElement)).toBe(
        true,
      );
    });

    it('renders the inner modal inside the outer overlay, above it', async () => {
      const user = userEvent.setup();
      render(<Stack onOuterClose={() => undefined} />);
      await user.click(screen.getByRole('button', { name: 'Open inner' }));
      const outerRoot = screen
        .getByRole('dialog', { name: 'Outer' })
        .closest('[data-axon-overlay]');
      expect(outerRoot).toContainElement(screen.getByRole('dialog', { name: 'Inner' }));
    });
  });

  describe('popups opened from inside', () => {
    it('keeps a menu inside the overlay, and closes only the menu on Escape', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <Modal open onClose={onClose} title="T">
          <DropdownMenu trigger={<Button>Actions</Button>}>
            <MenuItem>Copy</MenuItem>
          </DropdownMenu>
        </Modal>,
      );
      await user.click(screen.getByRole('button', { name: 'Actions' }));
      const menu = await screen.findByRole('menu');
      expect(menu.closest('[data-axon-overlay]')).not.toBeNull();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
      expect(dialog()).toBeInTheDocument();
    });

    it('does not close the modal when a menu item is chosen', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <Modal open onClose={onClose} title="T">
          <DropdownMenu trigger={<Button>Actions</Button>}>
            <MenuItem>Copy</MenuItem>
          </DropdownMenu>
        </Modal>,
      );
      await user.click(screen.getByRole('button', { name: 'Actions' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Copy' }));
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus();
    });

    it('keeps a select listbox inside the overlay, and Escape closes only the list', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <Modal open onClose={onClose} title="T">
          <Select
            label="Fruit"
            options={[
              { value: 'a', label: 'Apple' },
              { value: 'b', label: 'Banana' },
            ]}
          />
        </Modal>,
      );
      await user.click(screen.getByRole('combobox', { name: 'Fruit' }));
      const listbox = await screen.findByRole('listbox');
      expect(listbox.closest('[data-axon-overlay]')).not.toBeNull();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it('has no axe violations (plain, with description and footer)', async () => {
    render(
      <Modal
        open
        onClose={() => undefined}
        title="Rename file"
        description="Pick a new name."
        footer={
          <>
            <Button variant="outline">Cancel</Button>
            <Button>Save</Button>
          </>
        }
      >
        <label>
          Name
          <input />
        </label>
      </Modal>,
    );
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
  });
});
