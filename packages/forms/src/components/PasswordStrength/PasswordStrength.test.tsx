import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Form } from '../Form/Form';
import { FormTextField } from '../FormBindings/FormBindings';
import { PasswordStrengthField, PasswordStrengthMeter } from './PasswordStrength';
import { getPasswordStrength } from './strength';

describe('getPasswordStrength', () => {
  it.each([
    ['', 0],
    ['a', 1],
    ['abc1234', 1],
    ['password', 1],
    ['Password1', 1],
    ['abcdefgh', 1],
    ['abcdefgH', 1],
    ['abcdefg1', 1],
    ['abcdefgH1', 2],
    ['abcdefgH1!', 3],
    ['abcdefghijkl', 1],
    ['abcdefghijkL1!', 4],
    ['correct horse battery staple', 2],
    ['Correct horse battery staple 1!', 4],
  ])('rates %j as %i', (password, score) => {
    expect(getPasswordStrength(password).score).toBe(score);
  });

  it('never goes above 4', () => {
    expect(getPasswordStrength('Aa1!Aa1!Aa1!Aa1!Aa1!').score).toBe(4);
  });

  it('treats a very common password as weak whatever its shape', () => {
    expect(getPasswordStrength('Password123').score).toBe(1);
    expect(getPasswordStrength('password123').score).toBe(1);
  });
});

describe('PasswordStrengthMeter', () => {
  it('is a named meter with the score as its value', () => {
    render(<PasswordStrengthMeter value="abcdefgH1!" />);
    const meter = screen.getByRole('meter', { name: 'Password strength' });
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '4');
    expect(meter).toHaveAttribute('aria-valuenow', '3');
    expect(meter).toHaveAttribute('aria-valuetext', 'Good');
  });

  it('is empty for an empty password, with no value text', () => {
    render(<PasswordStrengthMeter value="" />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '0');
    expect(meter).not.toHaveAttribute('aria-valuetext');
  });

  it('lights as many segments as the score', () => {
    const { container } = render(<PasswordStrengthMeter value="abcdefgH1" />);
    expect(container.querySelectorAll('.axon-password-strength__segment--on')).toHaveLength(2);
    expect(container.querySelector('.axon-password-strength')).toHaveClass(
      'axon-password-strength--2',
    );
  });

  it('shows the word for the score, hidden from assistive technology', () => {
    render(<PasswordStrengthMeter value="abcdefghijkL1!" />);
    const word = screen.getByText('Strong');
    expect(word).toBeVisible();
    expect(word).toHaveAttribute('aria-hidden', 'true');
  });

  it('can be translated', () => {
    render(
      <PasswordStrengthMeter
        value="abcdefgH1"
        labels={{ meter: 'Seguridad', scores: ['', 'Débil', 'Media', 'Buena', 'Fuerte'] }}
      />,
    );
    const meter = screen.getByRole('meter', { name: 'Seguridad' });
    expect(meter).toHaveAttribute('aria-valuetext', 'Media');
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(<PasswordStrengthMeter ref={ref} value="x" className="extra" />);
    expect(ref.current).toHaveClass('axon-password-strength', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PasswordStrengthMeter value="abcdefgH1!" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('PasswordStrengthField', () => {
  it('follows the form field as the user types', async () => {
    const user = userEvent.setup();
    render(
      <Form defaultValues={{ password: '' }} onSubmit={() => {}}>
        <FormTextField name="password" label="Password" type="password" />
        <PasswordStrengthField />
      </Form>,
    );
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '0');
    await user.type(screen.getByLabelText('Password'), 'abcdefgH1!');
    await waitFor(() => expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '3'));
  });

  it('can watch another field', async () => {
    const user = userEvent.setup();
    render(
      <Form defaultValues={{ secret: '' }} onSubmit={() => {}}>
        <FormTextField name="secret" label="Secret" />
        <PasswordStrengthField name="secret" />
      </Form>,
    );
    await user.type(screen.getByLabelText('Secret'), 'abc');
    await waitFor(() => expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '1'));
  });
});
