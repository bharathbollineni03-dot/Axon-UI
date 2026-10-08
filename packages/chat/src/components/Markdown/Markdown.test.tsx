import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renders paragraphs, emphasis and inline code', () => {
    const { container } = render(<Markdown>{'Hello **bold** and *italic* and `code`.'}</Markdown>);
    expect(container.querySelector('strong')).toHaveTextContent('bold');
    expect(container.querySelector('em')).toHaveTextContent('italic');
    expect(container.querySelector('code')).toHaveClass('axon-markdown__code');
    expect(container.querySelector('code')).toHaveTextContent('code');
  });

  it('renders lists', () => {
    render(<Markdown>{'- one\n- two\n\n1. first\n2. second'}</Markdown>);
    expect(screen.getAllByRole('list')).toHaveLength(2);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('renders GFM strikethrough and task lists', () => {
    const { container } = render(<Markdown>{'~~gone~~\n\n- [x] done\n- [ ] todo'}</Markdown>);
    expect(container.querySelector('del')).toHaveTextContent('gone');
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toBeChecked();
    expect(boxes[1]).not.toBeChecked();
  });

  it('gives task list checkboxes a name, which can be changed', async () => {
    const source = '- [x] ship it\n- [ ] test it';
    const { container, unmount } = render(<Markdown>{source}</Markdown>);
    expect(screen.getByRole('checkbox', { name: 'Done' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Not done' })).not.toBeChecked();
    // They show a state; they are not controls.
    expect(screen.getAllByRole('checkbox').every((box) => (box as HTMLInputElement).disabled)).toBe(
      true,
    );
    expect(await axe(container)).toHaveNoViolations();
    unmount();

    render(<Markdown taskLabels={{ done: 'Fait', todo: 'À faire' }}>{source}</Markdown>);
    expect(screen.getByRole('checkbox', { name: 'Fait' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'À faire' })).toBeInTheDocument();
  });

  describe('tables', () => {
    const table = '| Name | Qty |\n| --- | --- |\n| Apples | 3 |\n| Pears | 5 |';

    it('renders a GFM table', () => {
      render(<Markdown>{table}</Markdown>);
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(2);
      expect(screen.getByRole('cell', { name: 'Pears' })).toBeInTheDocument();
    });

    it('puts it in a focusable, named region so a wide table can scroll by keyboard', () => {
      render(<Markdown>{table}</Markdown>);
      const region = screen.getByRole('region', { name: 'Table' });
      expect(region).toHaveAttribute('tabindex', '0');
      expect(region).toContainElement(screen.getByRole('table'));
    });

    it('can name the region another way', () => {
      render(<Markdown tableLabel="Tabla">{table}</Markdown>);
      expect(screen.getByRole('region', { name: 'Tabla' })).toBeInTheDocument();
    });
  });

  describe('links', () => {
    it('opens other sites in a new tab, safely, and says so', () => {
      render(<Markdown>{'[Docs](https://example.com/docs)'}</Markdown>);
      const link = screen.getByRole('link', { name: /Docs/ });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
      expect(link).toHaveAccessibleName('Docs (opens in a new tab)');
    });

    it('keeps same-page and relative links in the page', () => {
      render(<Markdown>{'[Top](#top) and [About](/about)'}</Markdown>);
      expect(screen.getByRole('link', { name: 'Top' })).not.toHaveAttribute('target');
      expect(screen.getByRole('link', { name: 'About' })).not.toHaveAttribute('rel');
    });

    it('can keep every link in the page', () => {
      render(<Markdown openLinksInNewTab={false}>{'[Docs](https://example.com)'}</Markdown>);
      expect(screen.getByRole('link', { name: 'Docs' })).not.toHaveAttribute('target');
    });

    it('drops a javascript: link', () => {
      render(<Markdown>{'[click](javascript:alert(1))'}</Markdown>);
      const link = screen.queryByRole('link', { name: 'click' });
      expect(link?.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
    });

    it('turns a bare URL into a link', () => {
      render(<Markdown>{'See https://example.com now'}</Markdown>);
      expect(screen.getByRole('link', { name: /example\.com/ })).toBeInTheDocument();
    });
  });

  describe('safety', () => {
    it('does not render raw HTML', () => {
      const { container } = render(
        <Markdown>
          {'<script>alert(1)</script> <img src=x onerror="alert(1)"> <b>raw</b>'}
        </Markdown>,
      );
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('b')).toBeNull();
    });

    it('opens an image safely', () => {
      const { container } = render(<Markdown>{'![A cat](https://example.com/cat.png)'}</Markdown>);
      const image = container.querySelector('img');
      expect(image).toHaveAttribute('alt', 'A cat');
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
    });

    it('shows only the alt text when images are not allowed', () => {
      const { container } = render(
        <Markdown allowImages={false}>{'![A cat](https://example.com/cat.png)'}</Markdown>,
      );
      expect(container.querySelector('img')).toBeNull();
      expect(screen.getByText('A cat')).toBeInTheDocument();
    });
  });

  describe('code', () => {
    it('renders a fenced block as a CodeBlock with its language', () => {
      const { container } = render(<Markdown>{'```python\nprint("hi")\n```'}</Markdown>);
      expect(container.querySelector('.axon-code-block')).toBeInTheDocument();
      expect(screen.getByText('python')).toBeInTheDocument();
      expect(container.querySelector('.hljs-built_in, .hljs-title, .hljs-string')).not.toBeNull();
      expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
    });

    it('does not keep the trailing newline in the code', () => {
      const { container } = render(<Markdown>{'```\nline\n```'}</Markdown>);
      expect(container.querySelector('code')?.textContent).toBe('line');
    });

    it('treats a block with no language as plain text', () => {
      render(<Markdown>{'```\nplain\n```'}</Markdown>);
      expect(screen.getByText('text')).toBeInTheDocument();
    });

    it('passes labels to the copy button', () => {
      render(<Markdown codeBlockLabels={{ copy: 'Copiar' }}>{'```js\nx\n```'}</Markdown>);
      expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
    });

    it('does not render inline code as a block', () => {
      const { container } = render(<Markdown>{'Use `npm i` here'}</Markdown>);
      expect(container.querySelector('.axon-code-block')).toBeNull();
    });
  });

  describe('headings', () => {
    it('pushes headings down two levels by default, so # is not an h1', () => {
      render(<Markdown>{'# One\n\n## Two\n\n#### Four'}</Markdown>);
      expect(screen.getByRole('heading', { name: 'One' }).tagName).toBe('H3');
      expect(screen.getByRole('heading', { name: 'Two' }).tagName).toBe('H4');
      expect(screen.getByRole('heading', { name: 'Four' }).tagName).toBe('H6');
    });

    it('stops at h6', () => {
      render(<Markdown>{'###### Six'}</Markdown>);
      expect(screen.getByRole('heading', { name: 'Six' }).tagName).toBe('H6');
    });

    it('takes another offset', () => {
      render(<Markdown headingOffset={0}>{'# One'}</Markdown>);
      expect(screen.getByRole('heading', { name: 'One' }).tagName).toBe('H1');
    });

    it('keeps the same element between renders, so a streaming heading is not remounted', () => {
      const { rerender } = render(<Markdown>{'# Title'}</Markdown>);
      const before = screen.getByRole('heading', { name: 'Title' });
      rerender(<Markdown>{'# Title\n\nMore text arrived.'}</Markdown>);
      expect(screen.getByRole('heading', { name: 'Title' })).toBe(before);
    });
  });

  it('lets you replace how an element renders', () => {
    render(
      <Markdown
        components={{ blockquote: ({ children }) => <aside data-testid="q">{children}</aside> }}
      >
        {'> quoted'}
      </Markdown>,
    );
    expect(screen.getByTestId('q')).toHaveTextContent('quoted');
  });

  it('merges className onto the wrapper', () => {
    const { container } = render(<Markdown className="extra">{'hi'}</Markdown>);
    expect(container.firstChild).toHaveClass('axon-markdown', 'extra');
  });

  it('renders nothing visible for an empty string', () => {
    const { container } = render(<Markdown>{''}</Markdown>);
    expect(container.textContent).toBe('');
  });

  it('has no accessibility violations on a rich document', async () => {
    const { container } = render(
      <Markdown>
        {[
          '# Title',
          'A paragraph with a [link](https://example.com) and `code`.',
          '- one\n- two',
          '| A | B |\n| - | - |\n| 1 | 2 |',
          '```js\nconst x = 1;\n```',
          '> quote',
        ].join('\n\n')}
      </Markdown>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
