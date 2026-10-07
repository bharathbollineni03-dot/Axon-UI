import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { List, ListItem } from './List';

describe('List', () => {
  it('renders an unordered list of items', () => {
    render(
      <List aria-label="Files">
        <ListItem primary="one" />
        <ListItem primary="two" />
      </List>,
    );
    const list = screen.getByRole('list', { name: 'Files' });
    expect(list.tagName).toBe('UL');
    expect(list).toHaveClass('axon-list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders a numbered list when ordered', () => {
    render(
      <List ordered>
        <ListItem primary="first" />
      </List>,
    );
    expect(screen.getByRole('list').tagName).toBe('OL');
    expect(screen.getByRole('list')).toHaveClass('axon-list--ordered');
  });

  it('applies dense, divided and bordered modifiers', () => {
    render(
      <List dense divided bordered>
        <ListItem primary="x" />
      </List>,
    );
    expect(screen.getByRole('list')).toHaveClass(
      'axon-list--dense',
      'axon-list--divided',
      'axon-list--bordered',
    );
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLUListElement>();
    render(
      <List ref={ref} className="extra">
        <ListItem primary="x" />
      </List>,
    );
    expect(ref.current).toHaveClass('axon-list', 'extra');
  });
});

describe('ListItem', () => {
  it('shows primary text (or children), secondary text and an icon', () => {
    const { rerender } = render(
      <List>
        <ListItem primary="Inbox" secondary="3 unread" icon={<svg data-testid="icon" />} />
      </List>,
    );
    expect(screen.getByText('Inbox')).toHaveClass('axon-list-item__primary');
    expect(screen.getByText('3 unread')).toHaveClass('axon-list-item__secondary');
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
    rerender(
      <List>
        <ListItem>As children</ListItem>
      </List>,
    );
    expect(screen.getByText('As children')).toBeInTheDocument();
  });

  it('is plain content without onClick or href', () => {
    render(
      <List>
        <ListItem primary="Static" />
      </List>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('becomes a button row with onClick', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <List>
        <ListItem primary="Open" secondary="details" onClick={onClick} />
      </List>,
    );
    const row = screen.getByRole('button', { name: /Open/ });
    await user.click(row);
    row.focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(row.closest('li')).toHaveClass('axon-list-item--interactive');
  });

  it('becomes a link row with href', () => {
    render(
      <List>
        <ListItem primary="Docs" href="/docs" />
      </List>,
    );
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs');
  });

  it('marks the selected row and sets aria-current on interactive rows', () => {
    render(
      <List>
        <ListItem primary="Here" onClick={() => {}} selected />
        <ListItem primary="Other" onClick={() => {}} />
      </List>,
    );
    expect(screen.getByRole('button', { name: 'Here' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Other' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Here' }).closest('li')).toHaveClass(
      'axon-list-item--selected',
    );
  });

  it('disables an interactive row', async () => {
    const onClick = vi.fn();
    render(
      <List>
        <ListItem primary="Nope" onClick={onClick} disabled />
      </List>,
    );
    const row = screen.getByRole('button', { name: 'Nope' });
    expect(row).toBeDisabled();
    await userEvent.setup().click(row);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders a disabled link row as a disabled button without href', () => {
    render(
      <List>
        <ListItem primary="Docs" href="/docs" disabled />
      </List>,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Docs' })).toBeDisabled();
  });

  it('keeps a trailing action separately operable', async () => {
    const onClick = vi.fn();
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(
      <List>
        <ListItem
          primary="Item"
          onClick={onClick}
          action={<button onClick={onAction}>Delete</button>}
        />
      </List>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLLIElement>();
    render(
      <List>
        <ListItem ref={ref} primary="x" className="extra" />
      </List>,
    );
    expect(ref.current).toHaveClass('axon-list-item', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <List aria-label="Settings" divided>
        <ListItem primary="Profile" secondary="Name and photo" icon={<svg />} onClick={() => {}} />
        <ListItem primary="Docs" href="/docs" selected />
        <ListItem primary="Plain" action={<button>Remove</button>} />
        <ListItem primary="Disabled" onClick={() => {}} disabled />
      </List>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
