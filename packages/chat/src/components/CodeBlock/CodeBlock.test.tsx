import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CodeBlock } from './CodeBlock';

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  // @ts-expect-error - remove the stub so other tests start clean
  delete navigator.clipboard;
});

describe('CodeBlock', () => {
  it('shows the code with its language as a label', () => {
    const { container } = render(<CodeBlock code="const a = 1;" language="typescript" />);
    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(container.querySelector('code')).toHaveTextContent('const a = 1;');
    expect(container.querySelector('.hljs-keyword')).toHaveTextContent('const');
  });

  it('labels it with the resolved language, even from an alias', () => {
    render(<CodeBlock code="x = 1" language="py" />);
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('shows plain text for an unknown or missing language', () => {
    const { container, rerender } = render(<CodeBlock code="hello" language="klingon" />);
    expect(screen.getByText('klingon')).toBeInTheDocument();
    expect(container.querySelector('.hljs-keyword')).toBeNull();
    rerender(<CodeBlock code="hello" />);
    expect(screen.getByText('text')).toBeInTheDocument();
  });

  it('prefers a filename in the header', () => {
    render(<CodeBlock code="x" language="ts" filename="src/app.ts" />);
    expect(screen.getByText('src/app.ts')).toBeInTheDocument();
  });

  it('never renders code as markup', () => {
    const { container } = render(
      <CodeBlock code={'<img src=x onerror="alert(1)"><b>bold</b>'} language="html" />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('code')).toHaveTextContent('<img src=x');
  });

  it('is a labelled, keyboard-focusable scroll area', () => {
    render(<CodeBlock code="x" language="ts" />);
    const area = screen.getByLabelText('typescript code');
    expect(area).toHaveAttribute('tabindex', '0');
    area.focus();
    expect(area).toHaveFocus();
  });

  it('can number the lines', () => {
    const { container } = render(<CodeBlock code={'a\nb\nc'} showLineNumbers />);
    const lines = container.querySelector('.axon-code-block__lines');
    expect(lines).toHaveAttribute('aria-hidden', 'true');
    expect(lines?.textContent).toBe('123');
  });

  it('has no numbers by default, and can wrap', () => {
    const { container } = render(<CodeBlock code="x" wrap />);
    expect(container.querySelector('.axon-code-block__lines')).toBeNull();
    expect(container.firstChild).toHaveClass('axon-code-block--wrap');
  });

  describe('copying', () => {
    it('copies the code and confirms', async () => {
      const onCopy = vi.fn();
      render(<CodeBlock code="let x = 1" language="js" onCopy={onCopy} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
      });
      expect(writeText).toHaveBeenCalledWith('let x = 1');
      expect(onCopy).toHaveBeenCalledWith('let x = 1');
      expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Copied');
    });

    it('goes back to "Copy code" after a moment', async () => {
      vi.useFakeTimers();
      render(<CodeBlock code="x" />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
      });
      expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('does not claim to have copied when it could not', async () => {
      writeText.mockRejectedValue(new Error('denied'));
      document.execCommand = vi.fn().mockReturnValue(false);
      const onCopy = vi.fn();
      render(<CodeBlock code="x" onCopy={onCopy} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
      });
      expect(onCopy).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
    });
  });

  it('translates its labels', () => {
    render(
      <CodeBlock
        code="x"
        language="ts"
        labels={{ copy: 'Copiar', copied: 'Copiado', code: (language) => `Código ${language}` }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
    expect(screen.getByLabelText('Código typescript')).toBeInTheDocument();
  });

  it('forwards the ref and spreads props', () => {
    const ref = createRef<HTMLDivElement>();
    render(<CodeBlock ref={ref} code="x" className="extra" data-testid="cb" />);
    expect(ref.current).toBe(screen.getByTestId('cb'));
    expect(ref.current).toHaveClass('axon-code-block', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <CodeBlock code={'function f() {\n  return 1;\n}'} language="javascript" showLineNumbers />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
