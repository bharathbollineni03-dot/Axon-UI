import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Legend, type LegendItem } from './Legend';

const items: LegendItem[] = [
  { key: 'a', name: 'Alpha', color: 'red' },
  { key: 'b', name: 'Beta', color: 'blue', hidden: true },
];

describe('Legend', () => {
  it('is a list named "Legend" with an item for each series', () => {
    render(<Legend items={items} />);
    const list = screen.getByRole('list', { name: 'Legend' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Alpha', 'Beta']);
  });

  it('is plain text without onToggle', () => {
    render(<Legend items={items} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('makes each item a toggle that is pressed while its series shows', () => {
    render(<Legend items={items} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Beta' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the key that was pressed, by mouse and keyboard', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<Legend items={items} onToggle={onToggle} />);
    await user.click(screen.getByRole('button', { name: 'Alpha' }));
    expect(onToggle).toHaveBeenLastCalledWith('a');
    screen.getByRole('button', { name: 'Beta' }).focus();
    await user.keyboard('{Enter}');
    expect(onToggle).toHaveBeenLastCalledWith('b');
    await user.keyboard(' ');
    expect(onToggle).toHaveBeenCalledTimes(3);
  });

  it('marks a hidden series', () => {
    render(<Legend items={items} />);
    expect(screen.getByText('Beta').closest('li')).toHaveAttribute('data-hidden', 'true');
    expect(screen.getByText('Alpha').closest('li')).not.toHaveAttribute('data-hidden');
  });

  it('shows each colour, hidden from assistive technology', () => {
    const { container } = render(<Legend items={items} />);
    const swatch = container.querySelector('.axon-chart-legend__swatch')!;
    expect(swatch).toHaveStyle({ background: 'red' });
    expect(swatch).toHaveAttribute('aria-hidden', 'true');
  });

  it('reports the item the pointer or focus is on, and when it leaves', async () => {
    const user = userEvent.setup();
    const onHighlight = vi.fn();
    render(<Legend items={items} onToggle={() => {}} onHighlight={onHighlight} />);
    await user.hover(screen.getByRole('button', { name: 'Alpha' }));
    expect(onHighlight).toHaveBeenLastCalledWith('a');
    await user.unhover(screen.getByRole('button', { name: 'Alpha' }));
    expect(onHighlight).toHaveBeenLastCalledWith(null);
    await user.tab();
    expect(onHighlight).toHaveBeenLastCalledWith('a');
    await user.tab();
    expect(onHighlight).toHaveBeenLastCalledWith('b');
  });

  it('can be named, aligned, and given a class', () => {
    render(<Legend items={items} label="Series" align="end" className="mine" />);
    const list = screen.getByRole('list', { name: 'Series' });
    expect(list).toHaveClass('axon-chart-legend', 'mine');
    expect(list).toHaveStyle({ justifyContent: 'flex-end' });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Legend items={items} onToggle={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
    const { container: plain } = render(<Legend items={items} />);
    expect(await axe(plain)).toHaveNoViolations();
  });
});
