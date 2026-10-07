import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { ChatHeader } from './ChatHeader';

describe('ChatHeader', () => {
  it('is a banner-less header with the title as a level 2 heading', () => {
    render(<ChatHeader title="Assistant" subtitle="Online" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Assistant' })).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('uses the heading level you choose', () => {
    render(<ChatHeader title="Assistant" headingLevel={3} />);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('shows no buttons unless handlers are passed', () => {
    render(<ChatHeader title="Assistant" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a button for each handler, and calls it', async () => {
    const onNewChat = vi.fn();
    const onSettings = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ChatHeader title="A" onNewChat={onNewChat} onSettings={onSettings} onClose={onClose} />,
    );
    await user.click(screen.getByRole('button', { name: 'New chat' }));
    await user.click(screen.getByRole('button', { name: 'Chat settings' }));
    await user.click(screen.getByRole('button', { name: 'Close chat' }));
    expect(onNewChat).toHaveBeenCalledTimes(1);
    expect(onSettings).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has the buttons in the keyboard order: extra actions, new, settings, close', async () => {
    const user = userEvent.setup();
    render(
      <ChatHeader
        title="A"
        actions={<button>Extra</button>}
        onNewChat={() => {}}
        onSettings={() => {}}
        onClose={() => {}}
      />,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Extra' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'New chat' })).toHaveFocus();
  });

  it('renders the avatar and the model selector slots', () => {
    render(
      <ChatHeader
        title="A"
        avatar={<span data-testid="avatar" />}
        modelSelector={<button>Model</button>}
      />,
    );
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Model' })).toBeInTheDocument();
  });

  it('translates the button names', () => {
    render(
      <ChatHeader
        title="A"
        onNewChat={() => {}}
        onClose={() => {}}
        labels={{ newChat: 'Nuevo chat', close: 'Cerrar' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Nuevo chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLElement>();
    render(<ChatHeader ref={ref} title="A" className="extra" data-testid="h" />);
    expect(ref.current).toBe(screen.getByTestId('h'));
    expect(ref.current).toHaveClass('axon-chat-header', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ChatHeader
        title="Assistant"
        subtitle="Online"
        modelSelector={<button>Model</button>}
        onNewChat={() => {}}
        onSettings={() => {}}
        onClose={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
