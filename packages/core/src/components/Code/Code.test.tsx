import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Code } from './Code';

describe('Code', () => {
  it('renders inline code by default', () => {
    render(<Code>npm install</Code>);
    const code = screen.getByText('npm install');
    expect(code.tagName).toBe('CODE');
    expect(code).toHaveClass('axon-code');
  });

  it('renders a preformatted block with block', () => {
    const { container } = render(<Code block>{'const a = 1;\nconst b = 2;'}</Code>);
    const pre = container.querySelector('pre')!;
    expect(pre).toHaveClass('axon-code-block');
    expect(pre.querySelector('code')).toHaveTextContent('const a = 1;');
  });

  it('makes a block focusable so it can be scrolled with the keyboard', () => {
    const { container } = render(<Code block>x</Code>);
    expect(container.querySelector('pre')).toHaveAttribute('tabindex', '0');
  });

  it('exposes the language for highlighters', () => {
    const { container, rerender } = render(<Code language="ts">x</Code>);
    expect(container.querySelector('code')).toHaveAttribute('data-language', 'ts');
    rerender(
      <Code block language="json">
        {'{}'}
      </Code>,
    );
    expect(container.querySelector('code')).toHaveAttribute('data-language', 'json');
  });

  it('shows markup-like content as plain text', () => {
    render(<Code>{'<script>alert(1)</script>'}</Code>);
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  });

  it('forwards the ref and merges className', () => {
    const inlineRef = createRef<HTMLElement>();
    const blockRef = createRef<HTMLElement>();
    render(
      <>
        <Code ref={inlineRef} className="a">
          x
        </Code>
        <Code block ref={blockRef} className="b">
          y
        </Code>
      </>,
    );
    expect(inlineRef.current?.tagName).toBe('CODE');
    expect(inlineRef.current).toHaveClass('axon-code', 'a');
    expect(blockRef.current?.tagName).toBe('PRE');
    expect(blockRef.current).toHaveClass('axon-code-block', 'b');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <p>
          Run <Code>pnpm build</Code> first.
        </p>
        <Code block language="bash">
          pnpm install
        </Code>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
