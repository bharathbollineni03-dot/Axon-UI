import { createRef, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { Tooltip, type TooltipProps } from './Tooltip';

function Example(props: Partial<TooltipProps> = {}) {
  return (
    <Tooltip content="Save your work" {...props}>
      <Button>Save</Button>
    </Tooltip>
  );
}

const trigger = () => screen.getByRole('button', { name: 'Save' });
const tooltip = () => screen.getByRole('tooltip');

afterEach(() => {
  vi.useRealTimers();
});

describe('Tooltip', () => {
  it('is hidden until the trigger is hovered or focused', () => {
    render(<Example />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger()).not.toHaveAttribute('aria-describedby');
  });

  describe('hover', () => {
    it('shows after the delay and describes the trigger while it shows', async () => {
      const user = userEvent.setup();
      render(<Example delay={0} />);
      await user.hover(trigger());
      expect(await screen.findByRole('tooltip')).toHaveTextContent('Save your work');
      expect(trigger()).toHaveAttribute('aria-describedby', tooltip().id);
      expect(trigger()).toHaveAccessibleDescription('Save your work');
    });

    it('waits for the delay before showing (300 ms by default)', () => {
      vi.useFakeTimers();
      render(<Example />);
      fireEvent.mouseEnter(trigger());
      fireEvent.mouseMove(trigger());
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('hides when the pointer leaves', async () => {
      const user = userEvent.setup();
      render(<Example delay={0} />);
      await user.hover(trigger());
      await screen.findByRole('tooltip');
      await user.unhover(trigger());
      await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    });

    it('stays while the pointer moves from the trigger onto the tooltip', async () => {
      const user = userEvent.setup();
      render(<Example delay={0} />);
      await user.hover(trigger());
      const bubble = await screen.findByRole('tooltip');
      // The pointer leaves the trigger heading for the tooltip, then moves over it.
      fireEvent.mouseLeave(trigger(), { relatedTarget: bubble });
      fireEvent.mouseMove(bubble);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  describe('focus', () => {
    it('shows at once when the trigger is focused with the keyboard', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      expect(trigger()).toHaveFocus();
      expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    });

    it('hides when focus leaves', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Example />
          <button>Other</button>
        </>,
      );
      await user.tab();
      await screen.findByRole('tooltip');
      await user.tab();
      await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    });
  });

  describe('dismissing', () => {
    it('hides on Escape and does not show again until the trigger is re-entered', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      await screen.findByRole('tooltip');
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('hides when the trigger is pressed', async () => {
      const user = userEvent.setup();
      render(<Example delay={0} />);
      await user.hover(trigger());
      await screen.findByRole('tooltip');
      await user.click(trigger());
      await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    });

    it('lets Escape close the tooltip first and a dialog around it only on the next press', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <Modal open onClose={onClose} title="T">
          <Example />
        </Modal>,
      );
      await user.tab(); // the close button
      await user.tab(); // the trigger
      expect(trigger()).toHaveFocus();
      await screen.findByRole('tooltip');
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledWith('escape');
    });
  });

  describe('options', () => {
    it('never shows when disabled', async () => {
      const user = userEvent.setup();
      render(<Example disabled delay={0} />);
      await user.hover(trigger());
      await user.tab();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('can be controlled', async () => {
      function Controlled() {
        const [open, setOpen] = useState(true);
        return (
          <>
            <button onClick={() => setOpen(false)}>Hide</button>
            <Example open={open} onOpenChange={setOpen} />
          </>
        );
      }
      const user = userEvent.setup();
      render(<Controlled />);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Hide' }));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('can start open, and reports changes', async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(<Example defaultOpen delay={0} onOpenChange={onOpenChange} />);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('shows an arrow by default and can omit it', () => {
      const { rerender } = render(<Example defaultOpen />);
      expect(tooltip().querySelector('.axon-tooltip__arrow')).not.toBeNull();
      rerender(<Example defaultOpen showArrow={false} />);
      expect(tooltip().querySelector('.axon-tooltip__arrow')).toBeNull();
    });

    it('accepts rich content and a className', () => {
      render(
        <Example
          defaultOpen
          className="extra"
          content={
            <>
              Save <kbd>Ctrl+S</kbd>
            </>
          }
        />,
      );
      expect(tooltip()).toHaveClass('axon-tooltip', 'extra');
      expect(tooltip().querySelector('kbd')).toHaveTextContent('Ctrl+S');
    });
  });

  describe('the trigger', () => {
    it('keeps the trigger’s own ref and handlers', async () => {
      const ref = createRef<HTMLButtonElement>();
      const onClick = vi.fn();
      const onMouseEnter = vi.fn();
      render(
        <Tooltip content="Tip" delay={0}>
          <Button ref={ref} onClick={onClick} onMouseEnter={onMouseEnter}>
            Mine
          </Button>
        </Tooltip>,
      );
      const button = screen.getByRole('button', { name: 'Mine' });
      const user = userEvent.setup();
      await user.hover(button);
      await user.click(button);
      expect(ref.current).toBe(button);
      expect(onMouseEnter).toHaveBeenCalled();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('works on a plain element', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tip" delay={0}>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <span tabIndex={0}>Plain</span>
        </Tooltip>,
      );
      await user.hover(screen.getByText('Plain'));
      expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    });
  });

  describe('disabled triggers', () => {
    it('wraps a disabled control in a focusable span that shows the tooltip', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Needs a title first" delay={0}>
          <Button disabled>Publish</Button>
        </Tooltip>,
      );
      const button = screen.getByRole('button', { name: 'Publish' });
      const wrapper = button.parentElement!;
      expect(wrapper.tagName).toBe('SPAN');
      expect(wrapper).toHaveClass('axon-tooltip__wrapper');
      expect(wrapper).toHaveAttribute('tabindex', '0');
      await user.tab();
      expect(wrapper).toHaveFocus();
      expect(await screen.findByRole('tooltip')).toHaveTextContent('Needs a title first');
      expect(wrapper).toHaveAttribute('aria-describedby', tooltip().id);
    });

    it('shows it on hover of the wrapper too', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Needs a title first" delay={0}>
          <Button disabled>Publish</Button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole('button', { name: 'Publish' }).parentElement!);
      expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    });

    it('does not wrap an enabled control', () => {
      render(<Example />);
      expect(trigger().parentElement).not.toHaveClass('axon-tooltip__wrapper');
    });
  });

  describe('placement', () => {
    it('renders in the closest .axon-root', () => {
      render(
        <div className="axon-root" data-testid="root">
          <Example defaultOpen />
        </div>,
      );
      expect(screen.getByTestId('root')).toContainElement(tooltip());
    });

    it('renders inside a modal overlay when its trigger is in one', () => {
      render(
        <Modal open onClose={() => undefined} title="T">
          <Example defaultOpen />
        </Modal>,
      );
      expect(tooltip().closest('[data-axon-overlay]')).not.toBeNull();
    });
  });

  it('has no axe violations shown, including on a disabled control', async () => {
    render(
      <>
        <Example defaultOpen />
        <Tooltip content="Why" defaultOpen>
          <Button disabled>Disabled</Button>
        </Tooltip>
      </>,
    );
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
  });
});
