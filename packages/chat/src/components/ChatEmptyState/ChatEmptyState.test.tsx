import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatErrorState } from '../ChatErrorState/ChatErrorState';

describe('ChatEmptyState', () => {
  it('has a level 2 heading, "How can I help you today?" by default', () => {
    render(<ChatEmptyState />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'How can I help you today?' }),
    ).toBeInTheDocument();
  });

  it('takes a title, description, heading element and icon', () => {
    render(
      <ChatEmptyState
        title="Ask me"
        description="I know things."
        titleAs="h1"
        icon={<svg data-testid="icon" />}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Ask me' })).toBeInTheDocument();
    expect(screen.getByText('I know things.')).toBeInTheDocument();
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows starter prompts that report the chosen text', async () => {
    const onPromptSelect = vi.fn();
    const prompts = [{ title: 'Plan a trip', prompt: 'Plan a weekend trip to Lisbon.' }];
    render(
      <ChatEmptyState
        prompts={prompts}
        onPromptSelect={onPromptSelect}
        promptsTitle="Try asking"
      />,
    );
    expect(screen.getByRole('region', { name: 'Try asking' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Plan a trip' }));
    expect(onPromptSelect).toHaveBeenCalledWith(
      'Plan a trip.'.length ? 'Plan a weekend trip to Lisbon.' : '',
      prompts[0],
    );
  });

  it('names the prompts when there is no heading for them', () => {
    render(<ChatEmptyState prompts={[{ title: 'A' }]} onPromptSelect={() => {}} />);
    expect(screen.getByRole('region', { name: 'Suggested prompts' })).toBeInTheDocument();
  });

  it('shows no prompts without a handler to receive them', () => {
    render(<ChatEmptyState prompts={[{ title: 'A' }]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders children and forwards the ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ChatEmptyState ref={ref} className="extra">
        <p>More</p>
      </ChatEmptyState>,
    );
    expect(screen.getByText('More')).toBeInTheDocument();
    expect(ref.current).toHaveClass('axon-chat-empty', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ChatEmptyState
        description="Hi"
        prompts={[{ title: 'A', description: 'a' }]}
        onPromptSelect={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ChatErrorState', () => {
  it('is an alert with the error message', () => {
    render(<ChatErrorState error={new Error('Rate limit reached')} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('alert')).toHaveTextContent('Rate limit reached');
  });

  it('takes a string, and falls back to a general message', () => {
    const { rerender } = render(<ChatErrorState error="Server is down" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Server is down');
    rerender(<ChatErrorState error={new Error('')} />);
    expect(screen.getByRole('alert')).toHaveTextContent('The assistant could not answer.');
    rerender(<ChatErrorState />);
    expect(screen.getByRole('alert')).toHaveTextContent('The assistant could not answer.');
  });

  it('has retry and dismiss only when handlers are given', async () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<ChatErrorState error="x" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<ChatErrorState error="x" onRetry={onRetry} onDismiss={onDismiss} />);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows a busy retry button while retrying', () => {
    render(<ChatErrorState error="x" onRetry={() => {}} retrying />);
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveAttribute('aria-busy', 'true');
  });

  it('renders extra actions and can be translated', () => {
    render(
      <ChatErrorState
        error="x"
        onRetry={() => {}}
        actions={<button>Contact support</button>}
        labels={{ title: 'Algo salió mal', retry: 'Reintentar' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Contact support' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(<ChatErrorState ref={ref} error="x" className="extra" />);
    expect(ref.current).toHaveClass('axon-chat-error', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ChatErrorState error="x" onRetry={() => {}} onDismiss={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
