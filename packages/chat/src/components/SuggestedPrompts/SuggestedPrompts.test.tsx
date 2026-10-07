import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { SuggestedPrompts, type SuggestedPrompt } from './SuggestedPrompts';

const prompts: SuggestedPrompt[] = [
  {
    title: 'Summarize this article',
    description: 'Get the key points',
    prompt: 'Summarize the article above.',
  },
  { title: 'Write a poem' },
  { title: 'Explain recursion', icon: <svg data-testid="icon" /> },
];

describe('SuggestedPrompts', () => {
  it('is a section with a heading and a list of buttons', () => {
    render(<SuggestedPrompts prompts={prompts} onSelect={() => {}} title="Try asking" />);
    const section = screen.getByRole('region', { name: 'Try asking' });
    expect(within(section).getAllByRole('button')).toHaveLength(3);
    expect(within(section).getByRole('heading', { name: 'Try asking' })).toBeInTheDocument();
  });

  it('sends the prompt text, or the title when there is none', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<SuggestedPrompts prompts={prompts} onSelect={onSelect} title="Try asking" />);
    await user.click(screen.getByRole('button', { name: /Summarize this article/ }));
    expect(onSelect).toHaveBeenLastCalledWith('Summarize the article above.', prompts[0]);
    await user.click(screen.getByRole('button', { name: 'Write a poem' }));
    expect(onSelect).toHaveBeenLastCalledWith('Write a poem', prompts[1]);
  });

  it('works from the keyboard', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<SuggestedPrompts prompts={prompts} onSelect={onSelect} title="Try asking" />);
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    await user.tab();
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('shows descriptions on cards but not on chips', () => {
    const { rerender } = render(<SuggestedPrompts prompts={prompts} onSelect={() => {}} />);
    expect(screen.getByText('Get the key points')).toBeInTheDocument();
    rerender(<SuggestedPrompts prompts={prompts} onSelect={() => {}} layout="chips" />);
    expect(screen.queryByText('Get the key points')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Summarize this article' })).toBeInTheDocument();
  });

  it('applies the layout and column modifiers', () => {
    render(
      <SuggestedPrompts
        prompts={prompts}
        onSelect={() => {}}
        layout="chips"
        columns={3}
        data-testid="s"
      />,
    );
    expect(screen.getByTestId('s')).toHaveClass('axon-suggested--chips', 'axon-suggested--cols-3');
  });

  it('renders icons decoratively', () => {
    render(<SuggestedPrompts prompts={prompts} onSelect={() => {}} />);
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('can be disabled', async () => {
    const onSelect = vi.fn();
    render(<SuggestedPrompts prompts={prompts} onSelect={onSelect} disabled />);
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
    await userEvent.setup().click(screen.getAllByRole('button')[0]!);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('can be named with aria-label instead of a heading', () => {
    render(<SuggestedPrompts prompts={prompts} onSelect={() => {}} aria-label="Starters" />);
    expect(screen.getByRole('region', { name: 'Starters' })).toBeInTheDocument();
  });

  it('renders nothing for no prompts', () => {
    const { container } = render(<SuggestedPrompts prompts={[]} onSelect={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLElement>();
    render(<SuggestedPrompts ref={ref} prompts={prompts} onSelect={() => {}} className="extra" />);
    expect(ref.current).toHaveClass('axon-suggested', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <SuggestedPrompts prompts={prompts} onSelect={() => {}} title="Try asking" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
