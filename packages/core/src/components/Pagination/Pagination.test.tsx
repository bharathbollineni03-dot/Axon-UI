import { createRef, useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './Pagination';

const pageButton = (n: number) => screen.getByRole('button', { name: `Page ${n}` });
const previous = () => screen.getByRole('button', { name: 'Previous page' });
const next = () => screen.getByRole('button', { name: 'Next page' });

describe('Pagination', () => {
  it('is a navigation landmark with a list of buttons', () => {
    render(<Pagination count={5} />);
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(nav).getByRole('list')).toBeInTheDocument();
    expect(within(nav).getAllByRole('button')).toHaveLength(7); // prev, 5 pages, next
  });

  it('marks the current page with aria-current', () => {
    render(<Pagination count={5} defaultPage={3} />);
    expect(pageButton(3)).toHaveAttribute('aria-current', 'page');
    expect(pageButton(2)).not.toHaveAttribute('aria-current');
    expect(pageButton(3)).toHaveClass('axon-pagination__button--selected');
  });

  it('collapses long ranges with ellipses that assistive technology skips', () => {
    const { container } = render(<Pagination count={20} defaultPage={10} />);
    const ellipses = container.querySelectorAll('.axon-pagination__ellipsis');
    expect(ellipses).toHaveLength(2);
    ellipses.forEach((e) => expect(e).toHaveAttribute('aria-hidden', 'true'));
    expect([1, 9, 10, 11, 20].map((n) => pageButton(n))).toHaveLength(5);
    expect(screen.queryByRole('button', { name: 'Page 5' })).not.toBeInTheDocument();
  });

  it('goes to a page on click and reports it (uncontrolled)', async () => {
    const onChange = vi.fn();
    render(<Pagination count={5} onChange={onChange} />);
    await userEvent.setup().click(pageButton(4));
    expect(onChange).toHaveBeenCalledWith(4);
    expect(pageButton(4)).toHaveAttribute('aria-current', 'page');
  });

  it('steps with previous and next, disabling them at the ends', async () => {
    const user = userEvent.setup();
    render(<Pagination count={3} />);
    expect(previous()).toBeDisabled();
    await user.click(next());
    expect(pageButton(2)).toHaveAttribute('aria-current', 'page');
    await user.click(next());
    expect(next()).toBeDisabled();
    await user.click(previous());
    expect(pageButton(2)).toHaveAttribute('aria-current', 'page');
  });

  it('adds first and last buttons with showFirstLast', async () => {
    const user = userEvent.setup();
    render(<Pagination count={9} defaultPage={5} showFirstLast />);
    await user.click(screen.getByRole('button', { name: 'Last page' }));
    expect(pageButton(9)).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Last page' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'First page' }));
    expect(pageButton(1)).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled();
  });

  it('can hide previous and next', () => {
    render(<Pagination count={3} hidePrevNext />);
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('works controlled', async () => {
    function Controlled() {
      const [page, setPage] = useState(2);
      return (
        <>
          <Pagination count={5} page={page} onChange={setPage} />
          <output>{page}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(pageButton(5));
    expect(screen.getByRole('status')).toHaveTextContent('5');
    expect(pageButton(5)).toHaveAttribute('aria-current', 'page');
  });

  it('does not change a controlled page by itself', async () => {
    const onChange = vi.fn();
    render(<Pagination count={5} page={2} onChange={onChange} />);
    await userEvent.setup().click(pageButton(4));
    expect(onChange).toHaveBeenCalledWith(4);
    expect(pageButton(2)).toHaveAttribute('aria-current', 'page');
  });

  it('disables everything when disabled', async () => {
    const onChange = vi.fn();
    render(<Pagination count={5} disabled onChange={onChange} />);
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
    await userEvent.setup().click(pageButton(3));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('lets labels be translated', () => {
    render(
      <Pagination
        count={3}
        defaultPage={2}
        aria-label="Seiten"
        getPageLabel={(n) => `Seite ${n}`}
        previousLabel="Zurück"
        nextLabel="Weiter"
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Seiten' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seite 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zurück' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeInTheDocument();
  });

  it('is operable with the keyboard', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination count={5} onChange={onChange} />);
    await user.tab(); // previous is disabled, so focus lands on page 1
    expect(pageButton(1)).toHaveFocus();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('forwards the ref and applies modifiers', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Pagination
        ref={ref}
        count={3}
        size="lg"
        color="danger"
        variant="text"
        className="extra"
        data-testid="p"
      />,
    );
    expect(ref.current).toBe(screen.getByTestId('p'));
    expect(ref.current).toHaveClass(
      'axon-pagination',
      'axon-pagination--lg',
      'axon-pagination--danger',
      'axon-pagination--text',
      'extra',
    );
  });

  it('has no axe violations (short, long and disabled)', async () => {
    const { container } = render(
      <>
        <Pagination count={3} aria-label="Short" />
        <Pagination count={30} defaultPage={15} showFirstLast aria-label="Long" />
        <Pagination count={5} disabled aria-label="Disabled" />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
