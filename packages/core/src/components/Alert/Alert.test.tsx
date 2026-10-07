import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Alert } from './Alert';

describe('Alert', () => {
  it('renders its title and message', () => {
    render(<Alert title="Heads up">Your trial ends in 3 days.</Alert>);
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Your trial ends in 3 days.')).toBeInTheDocument();
  });

  it('does not render a heading for the title', () => {
    render(<Alert title="Heads up">Message</Alert>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('defaults to a subtle, medium info alert', () => {
    render(<Alert data-testid="a">Message</Alert>);
    expect(screen.getByTestId('a')).toHaveClass(
      'axon-alert',
      'axon-alert--info',
      'axon-alert--subtle',
      'axon-alert--md',
    );
  });

  it('applies status, variant and size modifiers', () => {
    render(
      <Alert status="warning" variant="solid" size="sm" data-testid="a">
        Message
      </Alert>,
    );
    expect(screen.getByTestId('a')).toHaveClass(
      'axon-alert--warning',
      'axon-alert--solid',
      'axon-alert--sm',
    );
  });

  describe('roles', () => {
    it('announces a danger alert assertively with role="alert"', () => {
      render(<Alert status="danger">Payment failed</Alert>);
      expect(screen.getByRole('alert')).toHaveTextContent('Payment failed');
    });

    it.each(['info', 'success', 'warning'] as const)(
      'announces a %s alert politely with role="status"',
      (status) => {
        render(<Alert status={status}>Message</Alert>);
        expect(screen.getByRole('status')).toHaveTextContent('Message');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      },
    );

    it('lets the role be overridden', () => {
      render(
        <Alert status="danger" role="none" data-testid="a">
          Message
        </Alert>,
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByTestId('a')).toHaveAttribute('role', 'none');
    });
  });

  describe('icon', () => {
    it('shows a decorative status icon by default', () => {
      const { container } = render(<Alert>Message</Alert>);
      const icon = container.querySelector('.axon-alert__icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon?.querySelector('svg')).toBeInTheDocument();
    });

    it('uses a different icon for each status', () => {
      const markup = (['info', 'success', 'warning', 'danger'] as const).map((status) => {
        const { container, unmount } = render(<Alert status={status}>Message</Alert>);
        const html = container.querySelector('.axon-alert__icon')?.innerHTML;
        unmount();
        return html;
      });
      expect(new Set(markup).size).toBe(4);
    });

    it('accepts a custom icon', () => {
      render(<Alert icon={<svg data-testid="custom" />}>Message</Alert>);
      expect(screen.getByTestId('custom')).toBeInTheDocument();
    });

    it('hides the icon with icon={false}', () => {
      const { container } = render(<Alert icon={false}>Message</Alert>);
      expect(container.querySelector('.axon-alert__icon')).not.toBeInTheDocument();
    });
  });

  describe('dismissing', () => {
    it('has no close button unless onClose is given', () => {
      render(<Alert>Message</Alert>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows a labelled close button that calls onClose', async () => {
      const onClose = vi.fn();
      render(<Alert onClose={onClose}>Message</Alert>);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('supports a custom close label', () => {
      render(
        <Alert onClose={() => {}} closeLabel="Cerrar">
          Message
        </Alert>,
      );
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    });

    it('closes from the keyboard', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<Alert onClose={onClose}>Message</Alert>);
      await user.tab();
      expect(screen.getByRole('button', { name: 'Dismiss' })).toHaveFocus();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  it('renders actions under the message', async () => {
    const onRetry = vi.fn();
    render(
      <Alert status="danger" actions={<button onClick={onRetry}>Retry</button>}>
        Upload failed
      </Alert>,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('forwards the ref, merges className and spreads props', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Alert ref={ref} className="extra" id="my-alert" data-testid="a">
        Message
      </Alert>,
    );
    expect(ref.current).toBe(screen.getByTestId('a'));
    expect(ref.current).toHaveClass('axon-alert', 'extra');
    expect(ref.current).toHaveAttribute('id', 'my-alert');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Alert title="Info">Message</Alert>
        <Alert status="success" variant="solid" onClose={() => {}}>
          Saved
        </Alert>
        <Alert status="warning" variant="outline" actions={<button>Fix it</button>}>
          Check this
        </Alert>
        <Alert status="danger" title="Error" onClose={() => {}} actions={<a href="#help">Help</a>}>
          Something broke
        </Alert>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
