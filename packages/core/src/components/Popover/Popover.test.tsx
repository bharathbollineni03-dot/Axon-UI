import { createRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { Popover, type PopoverProps } from './Popover';

function Example(props: Partial<PopoverProps> = {}) {
  return (
    <>
      <Popover
        {...({
          trigger: <Button>Details</Button>,
          title: 'Order details',
          ...props,
        } as PopoverProps)}
      >
        <p>Shipped on Monday.</p>
        <button>Track</button>
      </Popover>
      <button>Elsewhere</button>
    </>
  );
}

const trigger = () => screen.getByRole('button', { name: 'Details' });
const popover = () => screen.getByRole('dialog');

describe('Popover', () => {
  it('is closed at first, with a trigger that announces the dialog', () => {
    render(<Example />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).not.toHaveAttribute('aria-controls');
  });

  it('opens on click, as a dialog named by its title and linked to the trigger', async () => {
    render(<Example />);
    await userEvent.setup().click(trigger());
    expect(popover()).toHaveAccessibleName('Order details');
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute('aria-controls', popover().id);
    expect(screen.getByText('Shipped on Monday.')).toBeInTheDocument();
  });

  it('is not modal: the page stays reachable', async () => {
    render(<Example />);
    await userEvent.setup().click(trigger());
    expect(popover()).not.toHaveAttribute('aria-modal');
  });

  it('can be named with aria-label or aria-labelledby instead of a title', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <Popover trigger={<Button>Open</Button>} aria-label="Quick note">
        Body
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(popover()).toHaveAccessibleName('Quick note');
    unmount();

    render(
      <>
        <span id="label">Labelled elsewhere</span>
        <Popover trigger={<Button>Open</Button>} aria-labelledby="label">
          Body
        </Popover>
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(popover()).toHaveAccessibleName('Labelled elsewhere');
  });

  it('toggles closed when the trigger is clicked again', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());
    await user.click(trigger());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('focus', () => {
    it('moves focus into the popover when it opens', async () => {
      render(<Example />);
      await userEvent.setup().click(trigger());
      await waitFor(() => expect(popover().contains(document.activeElement)).toBe(true));
    });

    it('moves focus to the popover itself when it has nothing focusable', async () => {
      render(
        <Popover trigger={<Button>Open</Button>} title="Just text">
          Plain text only
        </Popover>,
      );
      await userEvent.setup().click(screen.getByRole('button', { name: 'Open' }));
      await waitFor(() => expect(popover()).toHaveFocus());
    });

    it('returns focus to the trigger when it closes with Escape', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.click(trigger());
      await waitFor(() => expect(popover().contains(document.activeElement)).toBe(true));
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => expect(trigger()).toHaveFocus());
    });
  });

  describe('closing', () => {
    it('closes on an outside press, without stealing focus back', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.click(trigger());
      await screen.findByRole('dialog');
      await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
    });

    it('stays open for an outside press when closeOnOutsidePress is false', async () => {
      const user = userEvent.setup();
      render(<Example closeOnOutsidePress={false} />);
      await user.click(trigger());
      await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not close on a press inside', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.click(trigger());
      await user.click(screen.getByText('Shipped on Monday.'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('ignores Escape when closeOnEscape is false', async () => {
      const user = userEvent.setup();
      render(<Example closeOnEscape={false} />);
      await user.click(trigger());
      await user.keyboard('{Escape}');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes from inside through the `close` function passed to children', async () => {
      const user = userEvent.setup();
      render(
        <Popover trigger={<Button>Open</Button>} title="Confirm">
          {({ close }) => <button onClick={close}>Done</button>}
        </Popover>,
      );
      await user.click(screen.getByRole('button', { name: 'Open' }));
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('state', () => {
    it('can start open', () => {
      render(<Example defaultOpen />);
      expect(popover()).toBeInTheDocument();
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
            <button onClick={() => setOpen(true)}>Open from outside</button>
            <Example open={open} onOpenChange={setOpen} />
          </>
        );
      }
      const user = userEvent.setup();
      render(<Controlled />);
      await user.click(screen.getByRole('button', { name: 'Open from outside' }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      // Focus moves into the popover on the next animation frame, and Escape is handled by the
      // popover and its trigger only. This button is neither, so wait for focus to arrive instead
      // of pressing Escape at the button that opened it (on a fast runner that is still focused).
      await waitFor(() => expect(popover().contains(document.activeElement)).toBe(true));
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('trigger', () => {
    it('keeps the trigger’s own id, onClick, onKeyDown and ref', async () => {
      const onClick = vi.fn();
      const ref = createRef<HTMLButtonElement>();
      render(
        <Popover
          trigger={
            <Button id="mine" ref={ref} onClick={onClick}>
              Mine
            </Button>
          }
          title="T"
        >
          Body
        </Popover>,
      );
      const button = screen.getByRole('button', { name: 'Mine' });
      await userEvent.setup().click(button);
      expect(button).toHaveAttribute('id', 'mine');
      expect(ref.current).toBe(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not open when the trigger’s onClick prevents it', async () => {
      render(
        <Popover trigger={<Button onClick={(e) => e.preventDefault()}>Nope</Button>} title="T">
          Body
        </Popover>,
      );
      await userEvent.setup().click(screen.getByRole('button', { name: 'Nope' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    it('forwards the ref and props to the popover, with an arrow by default', async () => {
      const ref = createRef<HTMLDivElement>();
      const { container } = render(
        <Popover
          ref={ref}
          trigger={<Button>Open</Button>}
          title="T"
          className="extra"
          data-testid="pop"
        >
          Body
        </Popover>,
      );
      await userEvent.setup().click(screen.getByRole('button', { name: 'Open' }));
      expect(ref.current).toBe(popover());
      expect(popover()).toHaveClass('axon-popover', 'extra');
      expect(popover()).toHaveAttribute('data-testid', 'pop');
      expect(popover().querySelector('.axon-popover__arrow')).not.toBeNull();
      expect(container).not.toContainElement(popover());
    });

    it('can omit the arrow', async () => {
      render(
        <Popover trigger={<Button>Open</Button>} title="T" showArrow={false}>
          Body
        </Popover>,
      );
      await userEvent.setup().click(screen.getByRole('button', { name: 'Open' }));
      expect(popover().querySelector('.axon-popover__arrow')).toBeNull();
    });

    it('renders inside the closest .axon-root', async () => {
      render(
        <div className="axon-root" data-testid="root">
          <Example />
        </div>,
      );
      await userEvent.setup().click(trigger());
      expect(screen.getByTestId('root')).toContainElement(popover());
    });
  });

  describe('inside a modal', () => {
    it('renders in the modal overlay and closes on Escape without closing the modal', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <Modal open onClose={onClose} title="Order">
          <Example />
        </Modal>,
      );
      await user.click(trigger());
      const pop = screen.getByRole('dialog', { name: 'Order details' });
      expect(pop.closest('[data-axon-overlay]')).not.toBeNull();
      await waitFor(() => expect(pop.contains(document.activeElement)).toBe(true));
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog', { name: 'Order details' })).not.toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog', { name: 'Order' })).toBeInTheDocument();
    });
  });

  it('has no axe violations closed or open', async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
    await user.click(trigger());
    await screen.findByRole('dialog');
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
  });
});
