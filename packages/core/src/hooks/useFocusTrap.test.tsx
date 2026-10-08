/* eslint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-autofocus -- these fixtures exist to exercise focus handling */
import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { getTabbable, useFocusTrap, type UseFocusTrapOptions } from './useFocusTrap';

function Trap({ children, ...options }: UseFocusTrapOptions & { children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, options);
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-label="Trap">
      {children ?? (
        <>
          <button>first</button>
          <input aria-label="middle" />
          <button>last</button>
        </>
      )}
    </div>
  );
}

function Toggle({ initialFocusId }: { initialFocusId?: boolean }) {
  const [open, setOpen] = useState(false);
  const target = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button onClick={() => setOpen(true)}>open</button>
      {open ? (
        <TrapWithInitial
          target={target}
          useInitial={initialFocusId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function TrapWithInitial({
  target,
  useInitial,
  onClose,
}: {
  target: { current: HTMLButtonElement | null };
  useInitial?: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, { initialFocusRef: useInitial ? target : undefined });
  return (
    <div ref={ref} tabIndex={-1}>
      <button>one</button>
      <button ref={target}>two</button>
      <button onClick={onClose}>close</button>
    </div>
  );
}

describe('getTabbable', () => {
  it('lists reachable elements in order and skips disabled, hidden and negative tabindex ones', () => {
    const { container } = render(
      <div>
        <a href="#x">link</a>
        <button disabled>off</button>
        <button tabIndex={-1}>skip</button>
        <input aria-label="in" />
        <input type="hidden" />
        <div tabIndex={0}>focusable div</div>
        <button aria-hidden="true">hidden</button>
        <div hidden>
          <button>inside hidden</button>
        </div>
      </div>,
    );
    const names = getTabbable(container).map(
      (el) => el.textContent || el.getAttribute('aria-label'),
    );
    expect(names).toEqual(['link', 'in', 'focusable div']);
  });
});

describe('useFocusTrap', () => {
  it('moves focus to the first tabbable element on mount', () => {
    render(<Trap />);
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
  });

  it('can skip moving focus in', () => {
    render(
      <>
        <button>before</button>
        <Trap autoFocus={false} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'first' })).not.toHaveFocus();
  });

  it('focuses the container when nothing inside is tabbable', () => {
    render(
      <Trap>
        <p>just text</p>
      </Trap>,
    );
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('wraps Tab from the last element to the first and Shift+Tab the other way', async () => {
    const user = userEvent.setup();
    render(<Trap />);
    await user.tab();
    expect(screen.getByLabelText('middle')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'last' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'last' })).toHaveFocus();
  });

  it('keeps focus on the only tabbable element', async () => {
    const user = userEvent.setup();
    render(
      <Trap>
        <button>only</button>
      </Trap>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'only' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'only' })).toHaveFocus();
  });

  it('pulls focus back when it escapes the container', () => {
    render(
      <>
        <button>outside</button>
        <Trap />
      </>,
    );
    screen.getByRole('button', { name: 'outside' }).focus();
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
  });

  it('does nothing while disabled', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>outside</button>
        <Trap enabled={false} />
      </>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'outside' })).toHaveFocus();
  });

  it('lets Tab and focus move freely while paused, without releasing the trap', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <>
        <button>outside</button>
        <Trap paused />
      </>,
    );
    screen.getByRole('button', { name: 'outside' }).focus();
    expect(screen.getByRole('button', { name: 'outside' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
    rerender(
      <>
        <button>outside</button>
        <Trap />
      </>,
    );
    screen.getByRole('button', { name: 'outside' }).focus();
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
  });

  it('restores focus to the previous element when the trap is removed', async () => {
    const user = userEvent.setup();
    render(<Toggle />);
    const opener = screen.getByRole('button', { name: 'open' });
    await user.click(opener);
    expect(screen.getByRole('button', { name: 'one' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'close' }));
    expect(opener).toHaveFocus();
  });

  it('focuses a given initial element', async () => {
    const user = userEvent.setup();
    render(<Toggle initialFocusId />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByRole('button', { name: 'two' })).toHaveFocus();
  });
});
