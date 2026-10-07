import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { ToolCallCard } from './ToolCallCard';

describe('ToolCallCard', () => {
  it('shows the tool name and a status', () => {
    render(<ToolCallCard name="search_web" />);
    expect(screen.getByText('search_web')).toBeInTheDocument();
    expect(screen.getByText('Waiting')).toBeInTheDocument();
  });

  it.each([
    ['pending', 'Waiting'],
    ['running', 'Running'],
    ['success', 'Done'],
    ['error', 'Failed'],
  ] as const)('labels the %s status "%s"', (status, text) => {
    render(<ToolCallCard name="t" status={status} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('works out the status from the result when none is given', () => {
    const { rerender } = render(<ToolCallCard name="t" result={1} />);
    expect(screen.getByText('Done')).toBeInTheDocument();
    rerender(<ToolCallCard name="t" result="boom" isError />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    rerender(<ToolCallCard name="t" arguments={{ q: 1 }} />);
    expect(screen.getByText('Waiting')).toBeInTheDocument();
  });

  it('prefers an explicit status', () => {
    render(<ToolCallCard name="t" result={1} status="running" />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('has no toggle when there is nothing to show', () => {
    render(<ToolCallCard name="t" />);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-expanded');
  });

  describe('details', () => {
    const props = { name: 'get_weather', arguments: { city: 'Paris' }, result: { temp: 21 } };

    it('are collapsed at first and open with the button', async () => {
      const user = userEvent.setup();
      render(<ToolCallCard {...props} />);
      const toggle = screen.getByRole('button', { name: 'Show details of get_weather' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getByText('Arguments', { selector: 'h4' })).not.toBeVisible();
      await user.click(toggle);
      expect(screen.getByRole('button', { name: 'Hide details of get_weather' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(screen.getByText('Arguments', { selector: 'h4' })).toBeVisible();
    });

    it('show the arguments and the result as formatted JSON', async () => {
      render(<ToolCallCard {...props} defaultOpen />);
      expect(screen.getAllByLabelText('json code', { selector: 'pre' })).toHaveLength(2);
      const blocks = document.querySelectorAll('.axon-code-block__code');
      expect(blocks[0]!.textContent).toBe('{\n  "city": "Paris"\n}');
      expect(blocks[1]!.textContent).toBe('{\n  "temp": 21\n}');
    });

    it('show a string result as text', () => {
      render(<ToolCallCard name="t" result="plain output" defaultOpen />);
      expect(screen.getByText('plain output')).toBeInTheDocument();
      expect(screen.queryByText('Arguments', { selector: 'h4' })).not.toBeInTheDocument();
    });

    it('survive a value that cannot be turned into JSON', () => {
      const circular: Record<string, unknown> = {};
      circular['self'] = circular;
      expect(() =>
        render(<ToolCallCard name="t" arguments={circular} defaultOpen />),
      ).not.toThrow();
    });

    it('can be controlled', async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(<ToolCallCard {...props} open={false} onOpenChange={onOpenChange} />);
      await user.click(screen.getByRole('button'));
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    });

    it('link the toggle to the details it controls', () => {
      render(<ToolCallCard {...props} />);
      const id = screen.getByRole('button').getAttribute('aria-controls')!;
      expect(document.getElementById(id)).toHaveTextContent('Paris');
    });
  });

  it('translates its labels', () => {
    render(
      <ToolCallCard
        name="t"
        result={1}
        labels={{
          status: { pending: 'a', running: 'b', success: 'Listo', error: 'd' },
          toggle: (name) => `Ver ${name}`,
        }}
      />,
    );
    expect(screen.getByText('Listo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver t' })).toBeInTheDocument();
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(<ToolCallCard ref={ref} name="t" className="extra" data-testid="tc" />);
    expect(ref.current).toBe(screen.getByTestId('tc'));
    expect(ref.current).toHaveClass('axon-tool-call', 'extra');
  });

  it('has no accessibility violations open or closed', async () => {
    const { container } = render(
      <div>
        <ToolCallCard name="a" arguments={{ x: 1 }} result="ok" />
        <ToolCallCard name="b" status="running" arguments={{ y: 2 }} defaultOpen />
        <ToolCallCard name="c" result="bad" isError />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
