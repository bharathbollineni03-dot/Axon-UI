import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './Switch';

describe('Switch', () => {
  it('has role="switch" and is named by its label', () => {
    render(<Switch label="Notifications" />);
    const toggle = screen.getByRole('switch', { name: 'Notifications' });
    expect(toggle).not.toBeChecked();
  });

  it('forwards the ref to the input, puts className/style on the label and spreads the rest', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <Switch
        ref={ref}
        label="X"
        className="extra"
        style={{ margin: 2 }}
        name="n"
        data-testid="s"
      />,
    );
    expect(ref.current).toBe(screen.getByTestId('s'));
    expect(ref.current).toHaveAttribute('name', 'n');
    expect(container.firstElementChild).toHaveClass('axon-choice', 'axon-switch', 'extra');
    expect(container.firstElementChild).toHaveStyle({ margin: '2px' });
  });

  it('applies size, color and label position modifiers', () => {
    const { container } = render(
      <Switch label="X" size="lg" color="danger" labelPosition="start" />,
    );
    expect(container.firstElementChild).toHaveClass(
      'axon-switch--lg',
      'axon-switch--danger',
      'axon-switch--label-start',
    );
  });

  it('does not use the start-position class by default', () => {
    const { container } = render(<Switch label="X" />);
    expect(container.firstElementChild).not.toHaveClass('axon-switch--label-start');
  });

  describe('uncontrolled', () => {
    it('toggles on click, on the label and on Space', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Switch label="Wi-Fi" onChange={onChange} />);
      const toggle = screen.getByRole('switch');
      await user.click(toggle);
      expect(toggle).toBeChecked();
      await user.click(screen.getByText('Wi-Fi'));
      expect(toggle).not.toBeChecked();
      toggle.focus();
      await user.keyboard(' ');
      expect(toggle).toBeChecked();
      expect(onChange).toHaveBeenCalledTimes(3);
    });

    it('supports defaultChecked', () => {
      render(<Switch label="X" defaultChecked />);
      expect(screen.getByRole('switch')).toBeChecked();
    });
  });

  describe('controlled', () => {
    it('follows the checked prop', async () => {
      const onChange = vi.fn();
      render(<Switch label="X" checked={false} onChange={onChange} />);
      await userEvent.setup().click(screen.getByRole('switch'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('switch')).not.toBeChecked();
    });

    it('works with parent state', async () => {
      function Parent() {
        const [on, setOn] = useState(false);
        return <Switch label="X" checked={on} onChange={(e) => setOn(e.target.checked)} />;
      }
      render(<Parent />);
      await userEvent.setup().click(screen.getByRole('switch'));
      expect(screen.getByRole('switch')).toBeChecked();
    });
  });

  it('describes the switch with its description', () => {
    render(<Switch label="Marketing" description="Product news" />);
    expect(screen.getByRole('switch', { name: 'Marketing' })).toHaveAccessibleDescription(
      'Product news',
    );
  });

  it('does not toggle when disabled', async () => {
    const onChange = vi.fn();
    const { container } = render(<Switch label="X" disabled onChange={onChange} />);
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(container.firstElementChild).toHaveClass('axon-choice--disabled');
    await userEvent.setup().click(screen.getByText('X'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Switch label="Plain" />
        <Switch label="On" defaultChecked description="Hint" />
        <Switch label="Start" labelPosition="start" />
        <Switch label="Disabled" disabled />
        <Switch aria-label="No visible label" />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
