import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders a standalone pill with its content', () => {
    render(<Badge content="New" />);
    const badge = screen.getByText('New');
    expect(badge).toHaveClass(
      'axon-badge__badge',
      'axon-badge--solid',
      'axon-badge--md',
      'axon-badge--danger',
    );
    expect(badge.parentElement).toHaveClass('axon-badge');
  });

  it('shows numbers and caps them at max', () => {
    const { rerender } = render(<Badge content={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();
    rerender(<Badge content={150} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
    rerender(<Badge content={150} max={999} />);
    expect(screen.getByText('150')).toBeInTheDocument();
    rerender(<Badge content={11} max={10} />);
    expect(screen.getByText('10+')).toBeInTheDocument();
  });

  it('hides a zero count unless showZero is set', () => {
    const { container, rerender } = render(<Badge content={0} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<Badge content={0} showZero />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('hides when there is no content', () => {
    const { container, rerender } = render(<Badge />);
    expect(container).toBeEmptyDOMElement();
    rerender(<Badge content="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a dot without content', () => {
    const { container } = render(<Badge dot />);
    const dot = container.querySelector('.axon-badge__badge')!;
    expect(dot).toHaveClass('axon-badge--dot');
    expect(dot).toBeEmptyDOMElement();
  });

  it('anchors to a corner of its children', () => {
    const { container } = render(
      <Badge content={3} placement="bottom-left">
        <button>Inbox</button>
      </Badge>,
    );
    expect(container.firstElementChild).toHaveClass('axon-badge', 'axon-badge--anchor');
    expect(screen.getByText('3')).toHaveClass('axon-badge--bottom-left');
    expect(screen.getByRole('button', { name: /Inbox/ })).toBeInTheDocument();
  });

  it('still renders the children when the badge is hidden', () => {
    render(
      <Badge content={0}>
        <button>Inbox</button>
      </Badge>,
    );
    expect(screen.getByRole('button', { name: 'Inbox' })).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('applies variant, size and color modifiers', () => {
    render(<Badge content="x" variant="outline" size="sm" color="success" />);
    expect(screen.getByText('x')).toHaveClass(
      'axon-badge--outline',
      'axon-badge--sm',
      'axon-badge--success',
    );
  });

  it('names the badge with `label`', () => {
    render(<Badge content={3} label="3 unread messages" />);
    expect(screen.getByRole('status', { name: '3 unread messages' })).toHaveTextContent('3');
  });

  it('forwards the ref and merges className on the wrapper', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Badge ref={ref} content={1} className="extra" />);
    expect(ref.current).toHaveClass('axon-badge', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Badge content="New" />
        <Badge content={5} variant="subtle" color="primary" />
        <Badge content={5} variant="outline" color="warning" />
        <Badge content={3} color="success">
          <button>Inbox</button>
        </Badge>
        <Badge dot color="danger">
          <button>Alerts</button>
        </Badge>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
