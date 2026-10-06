import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Label } from './Label';

describe('Label', () => {
  it('is associated with its input through htmlFor', () => {
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <input id="name" />
      </>,
    );
    expect(screen.getByLabelText('Name')).toBe(screen.getByRole('textbox'));
  });

  it('shows a required indicator that is hidden from assistive technology', () => {
    render(
      <>
        <Label htmlFor="email" required>
          Email
        </Label>
        <input id="email" required />
      </>,
    );
    const indicator = screen.getByText('*');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeRequired();
  });

  it('shows hint text as part of the accessible name', () => {
    render(
      <>
        <Label htmlFor="nick" hint="(optional)">
          Nickname
        </Label>
        <input id="nick" />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Nickname (optional)' })).toBeInTheDocument();
  });

  it('has no indicator or hint by default', () => {
    const { container } = render(<Label>Plain</Label>);
    expect(container.querySelector('.axon-label__required')).toBeNull();
    expect(container.querySelector('.axon-label__hint')).toBeNull();
  });

  it('supports disabled styling, ref forwarding and className', () => {
    const ref = createRef<HTMLLabelElement>();
    render(
      <Label ref={ref} disabled className="extra" data-testid="l">
        Disabled
      </Label>,
    );
    expect(ref.current).toBe(screen.getByTestId('l'));
    expect(ref.current).toHaveClass('axon-label', 'axon-label--disabled', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Label htmlFor="a" required hint="(required)">
          Field
        </Label>
        <input id="a" />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
