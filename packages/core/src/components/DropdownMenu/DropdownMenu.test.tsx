import { createRef, forwardRef, useState, type ButtonHTMLAttributes } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import { Button } from '../Button';
import { MenuCheckboxItem, MenuItem, MenuSeparator, SubMenu } from '../Menu';
import { DropdownMenu, type DropdownMenuProps } from './DropdownMenu';

function Example(props: Partial<DropdownMenuProps> & { onCopy?: () => void }) {
  const { onCopy, ...rest } = props;
  return (
    <>
      <DropdownMenu trigger={<Button>Actions</Button>} {...rest}>
        <MenuItem onClick={onCopy}>Copy</MenuItem>
        <MenuItem>Paste</MenuItem>
        <MenuSeparator />
        <MenuCheckboxItem>Wrap</MenuCheckboxItem>
        <SubMenu label="Share">
          <MenuItem>Email</MenuItem>
        </SubMenu>
      </DropdownMenu>
      <button type="button">Elsewhere</button>
    </>
  );
}

const trigger = () => screen.getByRole('button', { name: 'Actions' });
const item = (name: string | RegExp) => screen.getByRole('menuitem', { name });

describe('DropdownMenu', () => {
  it('is closed at first, with a trigger that announces the menu', () => {
    render(<Example />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).not.toHaveAttribute('aria-controls');
  });

  it('opens on click, linking trigger and menu both ways', async () => {
    render(<Example />);
    await userEvent.setup().click(trigger());
    const menu = await screen.findByRole('menu', { name: 'Actions' });
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute('aria-controls', menu.id);
    expect(menu).toHaveAttribute('aria-labelledby', trigger().id);
  });

  it('puts focus on the menu after a mouse click so the arrow keys work', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());
    await waitFor(() => expect(screen.getByRole('menu')).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    expect(item('Copy')).toHaveFocus();
  });

  it('toggles closed when the trigger is clicked again', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());
    await screen.findByRole('menu');
    await user.click(trigger());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  describe('keyboard', () => {
    it('opens on Enter with the first item focused', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      expect(trigger()).toHaveFocus();
      await user.keyboard('{Enter}');
      await waitFor(() => expect(item('Copy')).toHaveFocus());
    });

    it('opens on Space with the first item focused', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      await user.keyboard(' ');
      await waitFor(() => expect(item('Copy')).toHaveFocus());
    });

    it('opens on ↓ with the first item and on ↑ with the last', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<Example />);
      await user.tab();
      await user.keyboard('{ArrowDown}');
      await waitFor(() => expect(item('Copy')).toHaveFocus());
      unmount();

      render(<Example />);
      await user.tab();
      await user.keyboard('{ArrowUp}');
      await waitFor(() => expect(item(/Share/)).toHaveFocus());
    });

    it('closes on Escape and returns focus to the trigger', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      await user.keyboard('{Enter}');
      await waitFor(() => expect(item('Copy')).toHaveFocus());
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(trigger()).toHaveFocus();
    });

    it('closes on Tab and returns focus to the trigger', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      await user.keyboard('{Enter}');
      await waitFor(() => expect(item('Copy')).toHaveFocus());
      await user.keyboard('{Tab}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(trigger()).toHaveFocus();
    });

    it('chooses an item with Enter, closes and returns focus to the trigger', async () => {
      const onCopy = vi.fn();
      const user = userEvent.setup();
      render(<Example onCopy={onCopy} />);
      await user.tab();
      await user.keyboard('{Enter}');
      await waitFor(() => expect(item('Copy')).toHaveFocus());
      await user.keyboard('{Enter}');
      expect(onCopy).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(trigger()).toHaveFocus();
    });

    it('chooses an item with Space and does not reopen', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      await user.keyboard('{Enter}');
      await waitFor(() => expect(item('Copy')).toHaveFocus());
      await user.keyboard(' ');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('closing with the pointer', () => {
    it('closes after choosing an item with the mouse and focuses the trigger', async () => {
      const onCopy = vi.fn();
      const user = userEvent.setup();
      render(<Example onCopy={onCopy} />);
      await user.click(trigger());
      await user.click(await screen.findByRole('menuitem', { name: 'Copy' }));
      expect(onCopy).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(trigger()).toHaveFocus();
    });

    it('stays open after toggling a checkbox item', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.click(trigger());
      await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Wrap' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('closes on an outside press without taking focus from where the user clicked', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.click(trigger());
      await screen.findByRole('menu');
      await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
    });

    it('closes the whole tree after choosing a submenu item', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.click(trigger());
      await user.click(await screen.findByRole('menuitem', { name: /Share/ }));
      await user.click(await screen.findByRole('menuitem', { name: 'Email' }));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(trigger()).toHaveFocus();
    });
  });

  describe('state', () => {
    it('can start open', async () => {
      render(<Example defaultOpen />);
      expect(await screen.findByRole('menu')).toBeInTheDocument();
    });

    it('reports changes through onOpenChange', async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onOpenChange={onOpenChange} />);
      await user.click(trigger());
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
    });

    it('works controlled', async () => {
      function Controlled() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Open from outside
            </button>
            <Example open={open} onOpenChange={setOpen} />
          </>
        );
      }
      const user = userEvent.setup();
      render(<Controlled />);
      await user.click(screen.getByRole('button', { name: 'Open from outside' }));
      expect(await screen.findByRole('menu')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('does not open by itself while controlled closed', async () => {
      const onOpenChange = vi.fn();
      render(<Example open={false} onOpenChange={onOpenChange} />);
      await userEvent.setup().click(trigger());
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('trigger', () => {
    it('keeps the trigger’s own id, onClick, onKeyDown and ref', async () => {
      const onClick = vi.fn();
      const onKeyDown = vi.fn();
      const ref = createRef<HTMLButtonElement>();
      const user = userEvent.setup();
      render(
        <DropdownMenu
          trigger={
            <Button id="mine" ref={ref} onClick={onClick} onKeyDown={onKeyDown}>
              Mine
            </Button>
          }
        >
          <MenuItem>One</MenuItem>
        </DropdownMenu>,
      );
      const button = screen.getByRole('button', { name: 'Mine' });
      expect(button).toHaveAttribute('id', 'mine');
      expect(ref.current).toBe(button);
      await user.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(await screen.findByRole('menu')).toHaveAttribute('aria-labelledby', 'mine');
      // Esc returns focus to the trigger, whose own key handler must still run.
      await user.keyboard('{Escape}');
      await user.keyboard('{ArrowDown}');
      expect(onKeyDown).toHaveBeenCalled();
      expect(await screen.findByRole('menu')).toBeInTheDocument();
    });

    it('does not open when the trigger’s onClick prevents it', async () => {
      render(
        <DropdownMenu trigger={<Button onClick={(event) => event.preventDefault()}>Nope</Button>}>
          <MenuItem>One</MenuItem>
        </DropdownMenu>,
      );
      await userEvent.setup().click(screen.getByRole('button', { name: 'Nope' }));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('works with a plain element or any forwardRef component as the trigger', async () => {
      const Custom = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
        function Custom(props, ref) {
          return <button ref={ref} type="button" {...props} />;
        },
      );
      const user = userEvent.setup();
      const { unmount } = render(
        <DropdownMenu trigger={<button type="button">Plain</button>}>
          <MenuItem>One</MenuItem>
        </DropdownMenu>,
      );
      await user.click(screen.getByRole('button', { name: 'Plain' }));
      expect(await screen.findByRole('menu')).toBeInTheDocument();
      unmount();

      render(
        <DropdownMenu trigger={<Custom>Custom</Custom>}>
          <MenuItem>One</MenuItem>
        </DropdownMenu>,
      );
      await user.click(screen.getByRole('button', { name: 'Custom' }));
      expect(await screen.findByRole('menu')).toBeInTheDocument();
    });

    it('does not open when the trigger is disabled', async () => {
      render(
        <DropdownMenu trigger={<Button disabled>Off</Button>}>
          <MenuItem>One</MenuItem>
        </DropdownMenu>,
      );
      await userEvent.setup().click(screen.getByRole('button', { name: 'Off' }));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('naming and rendering', () => {
    it('lets aria-label name the menu instead of the trigger', async () => {
      render(<Example aria-label="Document actions" />);
      await userEvent.setup().click(trigger());
      const menu = await screen.findByRole('menu', { name: 'Document actions' });
      expect(menu).not.toHaveAttribute('aria-labelledby');
    });

    it('lets aria-labelledby point somewhere else', async () => {
      render(
        <>
          <span id="title">Edit</span>
          <Example aria-labelledby="title" />
        </>,
      );
      await userEvent.setup().click(trigger());
      expect(await screen.findByRole('menu', { name: 'Edit' })).toBeInTheDocument();
    });

    it('forwards the ref and props to the menu panel', async () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <DropdownMenu
          ref={ref}
          trigger={<Button>Open</Button>}
          className="extra"
          color="danger"
          id="the-menu"
        >
          <MenuItem>One</MenuItem>
        </DropdownMenu>,
      );
      await userEvent.setup().click(screen.getByRole('button', { name: 'Open' }));
      const menu = await screen.findByRole('menu');
      expect(ref.current).toBe(menu);
      expect(menu).toHaveClass('axon-menu--danger', 'extra');
      expect(menu).toHaveAttribute('id', 'the-menu');
    });

    it('renders into the nearest .axon-root so theme variables apply', async () => {
      render(
        <div className="axon-root" data-testid="root">
          <Example />
        </div>,
      );
      await userEvent.setup().click(trigger());
      const menu = await screen.findByRole('menu');
      expect(screen.getByTestId('root')).toContainElement(menu);
    });
  });

  it('has no axe violations closed or open', async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
    await user.click(trigger());
    await screen.findByRole('menu');
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
  });
});
