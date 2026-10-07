import { createRef, forwardRef, type AnchorHTMLAttributes } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';

const items: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Library', href: '/library' },
  { label: 'Data', href: '/library/data' },
  { label: 'Reports', href: '/library/data/reports' },
  { label: 'Q3' },
];

describe('Breadcrumbs', () => {
  it('is a navigation landmark with an ordered list', () => {
    render(<Breadcrumbs items={items} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByRole('list').tagName).toBe('OL');
    expect(within(nav).getAllByRole('listitem')).toHaveLength(5);
  });

  it('links every crumb but the last, which is the current page', () => {
    render(<Breadcrumbs items={items} />);
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/',
      '/library',
      '/library/data',
      '/library/data/reports',
    ]);
    const current = screen.getByText('Q3');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.closest('a')).toBeNull();
  });

  it('does not link a last crumb even if it has an href', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'A', href: '/a' },
          { label: 'B', href: '/b' },
        ]}
      />,
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText('B')).toHaveAttribute('aria-current', 'page');
  });

  it('renders a middle crumb without href or onClick as plain text', () => {
    render(<Breadcrumbs items={[{ label: 'A', href: '/a' }, { label: 'Mid' }, { label: 'C' }]} />);
    expect(screen.queryByRole('link', { name: 'Mid' })).not.toBeInTheDocument();
    expect(screen.getByText('Mid')).not.toHaveAttribute('aria-current');
  });

  it('hides separators from assistive technology', () => {
    const { container } = render(<Breadcrumbs items={items} separator="/" />);
    const separators = container.querySelectorAll('.axon-breadcrumbs__separator');
    expect(separators).toHaveLength(4);
    separators.forEach((s) => {
      expect(s).toHaveAttribute('aria-hidden', 'true');
      expect(s).toHaveTextContent('/');
    });
  });

  it('calls onClick for button-like crumbs', async () => {
    const onClick = vi.fn();
    render(<Breadcrumbs items={[{ label: 'Back', onClick }, { label: 'Here' }]} />);
    await userEvent.setup().click(screen.getByText('Back'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders links with `linkAs`', () => {
    const Router = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
      function Router(props, ref) {
        return (
          <a ref={ref} data-router="" {...props}>
            {props.children}
          </a>
        );
      },
    );
    render(<Breadcrumbs items={items} linkAs={Router} />);
    expect(document.querySelectorAll('[data-router]')).toHaveLength(4);
  });

  it('forwards the ref, label, className and extra props', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Breadcrumbs
        ref={ref}
        items={items}
        aria-label="You are here"
        className="extra"
        data-testid="bc"
      />,
    );
    expect(ref.current).toBe(screen.getByTestId('bc'));
    expect(ref.current).toHaveAttribute('aria-label', 'You are here');
    expect(ref.current).toHaveClass('axon-breadcrumbs', 'extra');
  });

  describe('collapsing', () => {
    it('shows everything when the path fits in maxItems', () => {
      render(<Breadcrumbs items={items} maxItems={5} />);
      expect(screen.getAllByRole('listitem')).toHaveLength(5);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('keeps maxItems crumbs (the first and the last ones) with a "…" button between', () => {
      render(<Breadcrumbs items={items} maxItems={3} />);
      expect(screen.getAllByRole('listitem')).toHaveLength(4);
      expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Reports' })).toBeInTheDocument();
      expect(screen.getByText('Q3')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Library' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Data' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Show full path' })).toBeInTheDocument();
    });

    it('expands on click and moves focus to the first revealed crumb', async () => {
      const user = userEvent.setup();
      render(<Breadcrumbs items={items} maxItems={3} />);
      await user.click(screen.getByRole('button', { name: 'Show full path' }));
      expect(screen.getAllByRole('listitem')).toHaveLength(5);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole('link', { name: 'Library' })).toHaveFocus());
    });

    it('labels the button for translation', () => {
      render(<Breadcrumbs items={items} maxItems={3} expandLabel="Voller Pfad" />);
      expect(screen.getByRole('button', { name: 'Voller Pfad' })).toBeInTheDocument();
    });

    it('ignores a maxItems below 2', () => {
      render(<Breadcrumbs items={items} maxItems={1} />);
      expect(screen.getAllByRole('listitem')).toHaveLength(5);
    });
  });

  it('has no axe violations (plain and collapsed)', async () => {
    const { container } = render(
      <>
        <Breadcrumbs items={items} />
        <Breadcrumbs items={items} maxItems={3} aria-label="Collapsed" />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
