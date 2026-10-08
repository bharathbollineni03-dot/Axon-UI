import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Citation, SourceList, type Source } from './SourceList';

const sources: Source[] = [
  { title: 'MDN Web Docs', url: 'https://www.developer.mozilla.org/docs', snippet: 'Reference.' },
  { id: 'spec', title: 'The spec', url: 'https://spec.example.com/page' },
  { title: 'A book' },
];

describe('SourceList', () => {
  it('is a labelled section with a numbered list', () => {
    render(<SourceList sources={sources} />);
    const section = screen.getByRole('region', { name: 'Sources' });
    expect(within(section).getAllByRole('listitem')).toHaveLength(3);
    expect(within(section).getByRole('list').tagName).toBe('OL');
  });

  it('links to each source in a new tab, safely, and says so', () => {
    render(<SourceList sources={sources} />);
    const link = screen.getByRole('link', { name: /MDN Web Docs/ });
    expect(link).toHaveAttribute('href', 'https://www.developer.mozilla.org/docs');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    expect(link).toHaveAccessibleName('MDN Web Docs (opens in a new tab)');
  });

  it('shows the site without www., and the snippet', () => {
    render(<SourceList sources={sources} />);
    expect(screen.getByText('developer.mozilla.org')).toBeInTheDocument();
    expect(screen.getByText('spec.example.com')).toBeInTheDocument();
    expect(screen.getByText('Reference.')).toBeInTheDocument();
  });

  it('shows a source without a URL as plain text', () => {
    render(<SourceList sources={sources} />);
    expect(screen.getByText('A book')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /A book/ })).not.toBeInTheDocument();
  });

  it('survives a URL that cannot be parsed', () => {
    render(<SourceList sources={[{ title: 'Odd', url: 'not a url' }]} />);
    expect(screen.getByRole('link', { name: /Odd/ })).toBeInTheDocument();
  });

  it('gives each item an id a citation can point at', () => {
    render(<SourceList sources={sources} id="list" />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('id', 'list-1');
    expect(items[1]).toHaveAttribute('id', 'spec');
    expect(items[2]).toHaveAttribute('id', 'list-3');
  });

  it('can compute the ids itself', () => {
    render(<SourceList sources={sources} getSourceId={(_s, i) => `src-${i}`} />);
    expect(screen.getAllByRole('listitem')[2]).toHaveAttribute('id', 'src-2');
  });

  it('takes another title', () => {
    render(<SourceList sources={sources} title="Fuentes" />);
    expect(screen.getByRole('region', { name: 'Fuentes' })).toBeInTheDocument();
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(<SourceList sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLElement>();
    render(<SourceList ref={ref} sources={sources} className="extra" data-testid="sl" />);
    expect(ref.current).toBe(screen.getByTestId('sl'));
    expect(ref.current).toHaveClass('axon-sources', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SourceList sources={sources} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Citation', () => {
  it('is a superscript link to a source, named by its number', () => {
    render(<Citation index={2} sourceId="spec" />);
    const link = screen.getByRole('link', { name: 'Source 2' });
    expect(link).toHaveAttribute('href', '#spec');
    expect(link).toHaveTextContent('[2]');
    expect(link.parentElement?.tagName).toBe('SUP');
  });

  it('can be named another way, and forwards the ref', () => {
    const ref = createRef<HTMLElement>();
    render(<Citation ref={ref} index={1} sourceId="a" label="Fuente 1" className="x" />);
    expect(screen.getByRole('link', { name: 'Fuente 1' })).toBeInTheDocument();
    expect(ref.current).toHaveClass('axon-citation', 'x');
  });

  it('points at a real list item', () => {
    render(
      <>
        <p>
          Claim <Citation index={1} sourceId="source-one" />
        </p>
        <SourceList sources={[{ id: 'source-one', title: 'One' }]} />
      </>,
    );
    const href = screen.getByRole('link', { name: 'Source 1' }).getAttribute('href')!;
    expect(document.querySelector(href)).toBe(screen.getByRole('listitem'));
  });
});
