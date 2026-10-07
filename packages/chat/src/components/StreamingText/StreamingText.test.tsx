import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { StreamingText } from './StreamingText';
import { ThinkingIndicator } from './ThinkingIndicator';
import { TypingIndicator } from './TypingIndicator';

describe('StreamingText', () => {
  it('renders its text as Markdown', () => {
    const { container } = render(<StreamingText text={'Hello **world**'} />);
    expect(container.querySelector('strong')).toHaveTextContent('world');
  });

  it('marks the live state only while streaming, which draws the cursor', () => {
    const { container, rerender } = render(<StreamingText text="Hi" streaming />);
    expect(container.firstChild).toHaveClass('axon-streaming-text--active');
    rerender(<StreamingText text="Hi" />);
    expect(container.firstChild).not.toHaveClass('axon-streaming-text--active');
  });

  it('adds nothing to the text a screen reader reads', () => {
    const { container } = render(<StreamingText text="Hello" streaming />);
    expect(container.textContent).toBe('Hello');
  });

  it('keeps the same heading element as text streams in', () => {
    const { rerender } = render(<StreamingText text="# Title" streaming />);
    const heading = screen.getByRole('heading', { name: 'Title' });
    rerender(<StreamingText text={'# Title\n\nand more'} streaming />);
    expect(screen.getByRole('heading', { name: 'Title' })).toBe(heading);
  });

  it('passes Markdown options through', () => {
    render(<StreamingText text="# One" headingOffset={0} />);
    expect(screen.getByRole('heading', { name: 'One' }).tagName).toBe('H1');
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(<StreamingText ref={ref} text="x" className="extra" data-testid="s" />);
    expect(ref.current).toBe(screen.getByTestId('s'));
    expect(ref.current).toHaveClass('axon-streaming-text', 'extra');
  });
});

describe('TypingIndicator', () => {
  it('is a status with a text label', () => {
    render(<TypingIndicator />);
    expect(screen.getByRole('status')).toHaveTextContent('Assistant is typing');
  });

  it('keeps the dots out of the accessibility tree', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('.axon-typing__dot');
    expect(dots).toHaveLength(3);
    dots.forEach((dot) => expect(dot).toHaveAttribute('aria-hidden', 'true'));
  });

  it('can be translated, and forwards ref and props', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<TypingIndicator ref={ref} label="Escribiendo" className="extra" data-testid="t" />);
    expect(screen.getByRole('status')).toHaveTextContent('Escribiendo');
    expect(ref.current).toBe(screen.getByTestId('t'));
    expect(ref.current).toHaveClass('axon-typing', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<TypingIndicator />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ThinkingIndicator', () => {
  it('is a button that reveals the reasoning', async () => {
    const user = userEvent.setup();
    render(<ThinkingIndicator duration={8}>Because of X.</ThinkingIndicator>);
    const button = screen.getByRole('button', { name: 'Thought for 8 seconds' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Because of X.')).not.toBeVisible();
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Because of X.')).toBeVisible();
  });

  it('links the button to the content it controls', () => {
    render(<ThinkingIndicator>Reasoning</ThinkingIndicator>);
    const button = screen.getByRole('button');
    const region = document.getElementById(button.getAttribute('aria-controls')!);
    expect(region).toHaveTextContent('Reasoning');
  });

  it('can start open, and be controlled', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ThinkingIndicator open={false} onOpenChange={onOpenChange}>
        Reasoning
      </ThinkingIndicator>,
    );
    await user.click(screen.getByRole('button'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    rerender(
      <ThinkingIndicator open onOpenChange={onOpenChange}>
        Reasoning
      </ThinkingIndicator>,
    );
    expect(screen.getByText('Reasoning')).toBeVisible();
    render(<ThinkingIndicator defaultOpen>Starts open</ThinkingIndicator>);
    expect(screen.getByText('Starts open')).toBeVisible();
  });

  it('says "Thinking…" while the model is still thinking', () => {
    render(<ThinkingIndicator thinking>So far…</ThinkingIndicator>);
    expect(screen.getByRole('button', { name: 'Thinking…' })).toBeInTheDocument();
  });

  it('chooses the label from the state', () => {
    const { rerender } = render(<ThinkingIndicator duration={1}>x</ThinkingIndicator>);
    expect(screen.getByRole('button', { name: 'Thought for 1 second' })).toBeInTheDocument();
    rerender(<ThinkingIndicator>x</ThinkingIndicator>);
    expect(screen.getByRole('button', { name: 'Thought process' })).toBeInTheDocument();
  });

  it('is a plain status label with no reasoning text to show', () => {
    render(<ThinkingIndicator thinking />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Thinking…');
  });

  it('translates its labels', () => {
    render(
      <ThinkingIndicator duration={3} labels={{ thoughtFor: (seconds) => `Pensó ${seconds} s` }}>
        x
      </ThinkingIndicator>,
    );
    expect(screen.getByRole('button', { name: 'Pensó 3 s' })).toBeInTheDocument();
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ThinkingIndicator ref={ref} className="extra" data-testid="th">
        x
      </ThinkingIndicator>,
    );
    expect(ref.current).toBe(screen.getByTestId('th'));
    expect(ref.current).toHaveClass('axon-thinking', 'extra');
  });

  it('has no accessibility violations open or closed', async () => {
    const { container } = render(
      <div>
        <ThinkingIndicator duration={4}>Closed</ThinkingIndicator>
        <ThinkingIndicator defaultOpen thinking>
          Open
        </ThinkingIndicator>
        <ThinkingIndicator thinking />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
