import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gridElement, renderGrid } from '../../testing/gridTestUtils';
import { manyPeople } from '../../testing/sampleData';

const viewport = () => document.querySelector('.axon-datagrid__viewport') as HTMLElement;

/** jsdom lays nothing out; give every element a scroll height and a client height. */
function mockScrollArea(scrollHeight: number, clientHeight: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(clientHeight);
}

function scrollTo(top: number) {
  const element = viewport();
  Object.defineProperty(element, 'scrollTop', { value: top, configurable: true });
  act(() => {
    element.dispatchEvent(new Event('scroll'));
  });
}

describe('DataGrid infinite scroll', () => {
  afterEach(() => vi.restoreAllMocks());

  it('asks for more when the rows do not fill the grid', () => {
    const onLoadMore = vi.fn();
    renderGrid({ onLoadMore, hasMore: true });
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not ask when there is no more, or while it is already loading', () => {
    const onLoadMore = vi.fn();
    const { unmount } = renderGrid({ onLoadMore, hasMore: false });
    expect(onLoadMore).not.toHaveBeenCalled();
    unmount();
    renderGrid({ onLoadMore, hasMore: true, loadingMore: true });
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('is off without onLoadMore', () => {
    renderGrid({ hasMore: true });
    expect(screen.queryByText('Loading more rows…')).not.toBeInTheDocument();
  });

  it('waits until the reader scrolls near the end', () => {
    mockScrollArea(5000, 400);
    const onLoadMore = vi.fn();
    renderGrid({ onLoadMore, hasMore: true });
    expect(onLoadMore).not.toHaveBeenCalled();

    // 4000 from the top leaves 600 to go: farther than eight rows (352px).
    scrollTo(4000);
    expect(onLoadMore).not.toHaveBeenCalled();
    scrollTo(4300);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('asks only once for each number of rows', () => {
    mockScrollArea(5000, 400);
    const onLoadMore = vi.fn();
    const { update } = renderGrid({ onLoadMore, hasMore: true });
    scrollTo(4600);
    scrollTo(4620);
    scrollTo(4640);
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    // The rows arrive; the reader is no longer near the end, then is again.
    update({ data: manyPeople(60) });
    scrollTo(4600);
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('uses the distance it is told to', () => {
    mockScrollArea(5000, 400);
    const onLoadMore = vi.fn();
    renderGrid({ onLoadMore, hasMore: true, loadMoreThreshold: 20 });
    scrollTo(4000);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows and announces that more is coming', () => {
    mockScrollArea(5000, 400);
    const { update } = renderGrid({ onLoadMore: () => {}, hasMore: true, loadingMore: false });
    expect(screen.queryByText('Loading more rows…')).not.toBeInTheDocument();
    update({ loadingMore: true });
    expect(document.querySelector('.axon-datagrid__more')).toHaveTextContent('Loading more rows…');
    // Said once, by the grid's live region (the spinner beside the text is decorative).
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Loading more rows…');
    update({ loadingMore: false, data: manyPeople(40) });
    expect(screen.getByRole('status')).toHaveTextContent('40 rows');
  });

  it('says the row count is unknown while there may be more', () => {
    mockScrollArea(5000, 400);
    const { update } = renderGrid({ onLoadMore: () => {}, hasMore: true });
    expect(gridElement()).toHaveAttribute('aria-rowcount', '-1');
    update({ hasMore: false });
    expect(gridElement()).toHaveAttribute('aria-rowcount', '9');
  });

  it('works against a server too: the grid keeps the rows it is given', () => {
    mockScrollArea(5000, 400);
    const onLoadMore = vi.fn();
    renderGrid({
      mode: 'server',
      data: manyPeople(30),
      totalRowCount: 500,
      onLoadMore,
      hasMore: true,
    });
    scrollTo(4700);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
