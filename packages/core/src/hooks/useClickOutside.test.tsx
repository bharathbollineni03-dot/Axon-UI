import { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useClickOutside } from './useClickOutside';

function Demo({
  onOutside,
  enabled = true,
  withIgnore = false,
}: {
  onOutside: () => void;
  enabled?: boolean;
  withIgnore?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useClickOutside(box, onOutside, { enabled, ignore: withIgnore ? [trigger] : [] });
  return (
    <div>
      <div ref={box}>
        <button>inside</button>
      </div>
      <button ref={trigger}>trigger</button>
      <button>outside</button>
    </div>
  );
}

describe('useClickOutside', () => {
  it('calls the handler for a press outside, not inside', async () => {
    const onOutside = vi.fn();
    const user = userEvent.setup();
    render(<Demo onOutside={onOutside} />);
    await user.click(screen.getByRole('button', { name: 'inside' }));
    expect(onOutside).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('ignores presses on the ignored elements', async () => {
    const onOutside = vi.fn();
    const user = userEvent.setup();
    render(<Demo onOutside={onOutside} withIgnore />);
    await user.click(screen.getByRole('button', { name: 'trigger' }));
    expect(onOutside).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled and starts listening when enabled', async () => {
    const onOutside = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Demo onOutside={onOutside} enabled={false} />);
    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(onOutside).not.toHaveBeenCalled();
    rerender(<Demo onOutside={onOutside} enabled />);
    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('always calls the latest handler', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Demo onOutside={first} />);
    rerender(<Demo onOutside={second} />);
    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('removes its listener on unmount', async () => {
    const onOutside = vi.fn();
    const user = userEvent.setup();
    const { unmount } = render(<Demo onOutside={onOutside} />);
    unmount();
    await user.click(document.body);
    expect(onOutside).not.toHaveBeenCalled();
  });
});
