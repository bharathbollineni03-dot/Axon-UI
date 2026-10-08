import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createOTPVerificationSchema,
  otpVerificationSchema,
  OTPVerificationForm,
} from './OTPVerificationForm';

const boxes = () => screen.getAllByRole('textbox');

async function typeCode(code: string, user = userEvent.setup()) {
  await user.click(boxes()[0]!);
  await user.keyboard(code);
}

describe('OTPVerificationForm', () => {
  it('renders a box per character and a verify button', () => {
    render(<OTPVerificationForm onSubmit={() => {}} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Enter your code' })).toBeInTheDocument();
    expect(boxes()).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();
  });

  it('can have another length', () => {
    render(<OTPVerificationForm onSubmit={() => {}} length={4} />);
    expect(boxes()).toHaveLength(4);
  });

  it('does not take focus unless asked to', () => {
    render(<OTPVerificationForm onSubmit={() => {}} />);
    expect(document.body).toHaveFocus();
  });

  it('can start with focus in the first box', () => {
    // eslint-disable-next-line jsx-a11y/no-autofocus -- testing the opt-in prop
    render(<OTPVerificationForm onSubmit={() => {}} autoFocus />);
    expect(boxes()[0]).toHaveFocus();
  });

  describe('validation', () => {
    it('asks for the code when empty', async () => {
      render(<OTPVerificationForm onSubmit={() => {}} />);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Verify' }));
      expect(await screen.findByText('Enter the code we sent you.')).toBeInTheDocument();
    });

    it('asks for every character', async () => {
      const user = userEvent.setup();
      render(<OTPVerificationForm onSubmit={() => {}} />);
      await typeCode('123', user);
      await user.click(screen.getByRole('button', { name: 'Verify' }));
      expect(await screen.findByText('Enter all 6 characters of the code.')).toBeInTheDocument();
    });
  });

  describe('submitting', () => {
    it('submits the code', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<OTPVerificationForm onSubmit={onSubmit} />);
      await typeCode('123456', user);
      await user.click(screen.getByRole('button', { name: 'Verify' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toEqual({ code: '123456' });
    });

    it('submits by itself when autoSubmit is on and the last character is typed', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<OTPVerificationForm onSubmit={onSubmit} autoSubmit />);
      await typeCode('123456', user);
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });

    it('does not submit by itself otherwise', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<OTPVerificationForm onSubmit={onSubmit} />);
      await typeCode('123456', user);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('maps a wrong-code error onto the field', async () => {
      const user = userEvent.setup();
      render(
        <OTPVerificationForm onSubmit={() => ({ fieldErrors: { code: 'That code is wrong.' } })} />,
      );
      await typeCode('123456', user);
      await user.click(screen.getByRole('button', { name: 'Verify' }));
      expect(await screen.findByText('That code is wrong.')).toBeInTheDocument();
    });
  });

  describe('resend', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows no resend button without onResend', () => {
      render(<OTPVerificationForm onSubmit={() => {}} />);
      expect(screen.queryByRole('button', { name: /Resend/ })).not.toBeInTheDocument();
    });

    it('starts counting down at once, with the button disabled', () => {
      vi.useFakeTimers();
      render(<OTPVerificationForm onSubmit={() => {}} onResend={() => {}} />);
      const button = screen.getByRole('button', { name: 'Resend code in 30s' });
      expect(button).toBeDisabled();
    });

    it('counts down each second and enables the button at zero', () => {
      vi.useFakeTimers();
      render(<OTPVerificationForm onSubmit={() => {}} onResend={() => {}} resendCooldown={3} />);
      expect(screen.getByRole('button', { name: 'Resend code in 3s' })).toBeDisabled();
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole('button', { name: 'Resend code in 2s' })).toBeDisabled();
      // One second at a time, as a clock would: React renders between ticks.
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole('button', { name: 'Resend code in 1s' })).toBeDisabled();
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled();
    });

    it('can start enabled, when no code was just sent', () => {
      render(
        <OTPVerificationForm
          onSubmit={() => {}}
          onResend={() => {}}
          startCooldownOnMount={false}
        />,
      );
      expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled();
    });

    it('calls onResend, confirms politely and starts the countdown again', async () => {
      const onResend = vi.fn();
      const user = userEvent.setup();
      render(
        <OTPVerificationForm
          onSubmit={() => {}}
          onResend={onResend}
          startCooldownOnMount={false}
          resendCooldown={30}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Resend code' }));
      expect(onResend).toHaveBeenCalledTimes(1);
      expect(await screen.findByText('We sent you a new code.')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('We sent you a new code.');
      expect(screen.getByRole('button', { name: 'Resend code in 30s' })).toBeDisabled();
    });

    it('waits for an async onResend before counting down', async () => {
      let finish: () => void = () => {};
      const user = userEvent.setup();
      render(
        <OTPVerificationForm
          onSubmit={() => {}}
          onResend={() => new Promise<void>((resolve) => (finish = resolve))}
          startCooldownOnMount={false}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Resend code' }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Resend code' })).toHaveAttribute(
          'aria-busy',
          'true',
        ),
      );
      act(() => finish());
      expect(await screen.findByRole('button', { name: 'Resend code in 30s' })).toBeDisabled();
    });

    it('shows the error when onResend fails, and lets the user try again', async () => {
      const user = userEvent.setup();
      render(
        <OTPVerificationForm
          onSubmit={() => {}}
          onResend={() => Promise.reject(new Error('Too many requests.'))}
          startCooldownOnMount={false}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Resend code' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests.');
      expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled();
    });

    it('uses a fallback message for an error without one', async () => {
      const user = userEvent.setup();
      render(
        <OTPVerificationForm
          onSubmit={() => {}}
          onResend={() => Promise.reject(new Error(''))}
          startCooldownOnMount={false}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Resend code' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('We could not send a new code.');
    });

    it('translates the resend labels', () => {
      vi.useFakeTimers();
      render(
        <OTPVerificationForm
          onSubmit={() => {}}
          onResend={() => {}}
          labels={{ resendIn: (s) => `Reenviar en ${s} s` }}
        />,
      );
      expect(screen.getByRole('button', { name: 'Reenviar en 30 s' })).toBeInTheDocument();
    });

    it('does not count down after unmounting', () => {
      vi.useFakeTimers();
      const { unmount } = render(<OTPVerificationForm onSubmit={() => {}} onResend={() => {}} />);
      unmount();
      expect(() => act(() => void vi.advanceTimersByTime(5000))).not.toThrow();
      fireEvent.keyDown(document.body, { key: 'Escape' });
    });
  });

  it('exports its schema and a factory', () => {
    expect(otpVerificationSchema.safeParse({ code: '123456' }).success).toBe(true);
    expect(otpVerificationSchema.safeParse({ code: '12345a' }).success).toBe(false);
    expect(createOTPVerificationSchema({ length: 4 }).safeParse({ code: '1234' }).success).toBe(
      true,
    );
    expect(
      createOTPVerificationSchema({ type: 'alphanumeric' }).safeParse({ code: 'ab12cd' }).success,
    ).toBe(true);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<OTPVerificationForm onSubmit={() => {}} onResend={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
