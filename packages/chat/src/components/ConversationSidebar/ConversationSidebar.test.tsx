import { createRef, useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import { ConversationSidebar, type ConversationSidebarProps } from './ConversationSidebar';
import type { ConversationSummary } from './groupConversations';

const NOW = new Date(2025, 5, 15, 14, 0).getTime();
const at = (month: number, day: number, hour = 12) =>
  new Date(2025, month - 1, day, hour).getTime();

const conversations: ConversationSummary[] = [
  { id: 'a', title: 'Plan a trip to Lisbon', updatedAt: at(6, 15, 9) },
  { id: 'b', title: 'Debug the build', updatedAt: at(6, 14, 18) },
  { id: 'c', title: 'Recipe ideas', updatedAt: at(6, 10) },
  { id: 'd', title: 'Old notes', updatedAt: at(1, 3) },
  { id: 'e', title: 'Pinned thing', updatedAt: at(3, 1), pinned: true },
];

function renderSidebar(props: Partial<ConversationSidebarProps> = {}) {
  const onSelect = vi.fn();
  const utils = render(
    <ConversationSidebar
      conversations={conversations}
      onSelect={onSelect}
      now={() => NOW}
      {...props}
    />,
  );
  return { ...utils, onSelect };
}

/** Keeps the list in state, as an app would, so deleting and renaming really change it. */
function Harness(props: Partial<ConversationSidebarProps>) {
  const [items, setItems] = useState(conversations);
  return (
    <ConversationSidebar
      conversations={items}
      onSelect={() => {}}
      now={() => NOW}
      onRename={(id, title) =>
        setItems((list) => list.map((item) => (item.id === id ? { ...item, title } : item)))
      }
      onPin={(id, pinned) =>
        setItems((list) => list.map((item) => (item.id === id ? { ...item, pinned } : item)))
      }
      onDelete={(id) => setItems((list) => list.filter((item) => item.id !== id))}
      {...props}
    />
  );
}

const row = (title: string) => screen.getByRole('button', { name: title });
const actions = (title: string) => screen.getByRole('button', { name: `Actions for ${title}` });

async function chooseFromMenu(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
  item: string,
) {
  await user.click(actions(title));
  await user.click(await screen.findByRole('menuitem', { name: item }));
}

describe('ConversationSidebar', () => {
  describe('structure', () => {
    it('is a navigation landmark named "Conversations"', () => {
      renderSidebar();
      expect(screen.getByRole('navigation', { name: 'Conversations' })).toBeInTheDocument();
    });

    it('groups the conversations by day, with the pinned ones first', () => {
      renderSidebar();
      const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
      expect(headings).toEqual(['Pinned', 'Today', 'Yesterday', 'Previous 7 days', 'Older']);
      const today = screen.getByRole('region', { name: 'Today' });
      expect(within(today).getByRole('button', { name: 'Plan a trip to Lisbon' })).toBeVisible();
      const pinned = screen.getByRole('region', { name: 'Pinned' });
      expect(within(pinned).getByRole('button', { name: 'Pinned thing' })).toBeVisible();
    });

    it('can change the heading level of the groups', () => {
      renderSidebar({ headingLevel: 2 });
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5);
    });

    it('marks the open conversation', () => {
      renderSidebar({ activeId: 'b' });
      expect(row('Debug the build')).toHaveAttribute('aria-current', 'true');
      expect(row('Recipe ideas')).not.toHaveAttribute('aria-current');
    });

    it('shows a name for a conversation with no title', () => {
      renderSidebar({ conversations: [{ id: 'x', title: '  ', updatedAt: NOW }] });
      expect(row('New chat')).toBeInTheDocument();
    });

    it('says so when there are no conversations, or shows your own empty state', () => {
      const { rerender } = renderSidebar({ conversations: [] });
      expect(screen.getByText('No conversations yet.')).toBeInTheDocument();
      rerender(
        <ConversationSidebar
          conversations={[]}
          onSelect={() => {}}
          emptyState={<p>Start your first chat</p>}
        />,
      );
      expect(screen.getByText('Start your first chat')).toBeInTheDocument();
      expect(screen.queryByText('No conversations yet.')).not.toBeInTheDocument();
    });

    it('shows placeholders while loading', () => {
      const { container } = renderSidebar({ conversations: [], loading: true });
      expect(screen.getByText('Loading conversations')).toHaveAttribute('role', 'status');
      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(screen.queryByText('No conversations yet.')).not.toBeInTheDocument();
    });

    it('forwards a ref and class name', () => {
      const ref = createRef<HTMLElement>();
      renderSidebar({ ref, className: 'mine' } as Partial<ConversationSidebarProps>);
      expect(ref.current).toBe(screen.getByRole('navigation'));
      expect(ref.current).toHaveClass('axon-conversation-sidebar', 'mine');
    });
  });

  describe('choosing and starting', () => {
    it('reports the conversation that was chosen', async () => {
      const { onSelect } = renderSidebar();
      await userEvent.setup().click(row('Recipe ideas'));
      expect(onSelect).toHaveBeenCalledWith('c');
    });

    it('has a "New chat" button only when there is a handler', async () => {
      const onNewChat = vi.fn();
      const { rerender } = renderSidebar({ onNewChat });
      await userEvent.setup().click(screen.getByRole('button', { name: 'New chat' }));
      expect(onNewChat).toHaveBeenCalledTimes(1);
      rerender(<ConversationSidebar conversations={conversations} onSelect={() => {}} />);
      expect(screen.queryByRole('button', { name: 'New chat' })).not.toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('narrows the list as you type, and announces how many are left', async () => {
      renderSidebar();
      await userEvent
        .setup()
        .type(screen.getByRole('searchbox', { name: 'Search conversations' }), 'lisbon');
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      expect(row('Plan a trip to Lisbon')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Yesterday' })).not.toBeInTheDocument();
      expect(screen.getByText('1 conversation found')).toBeInTheDocument();
    });

    it('says when nothing matches', async () => {
      renderSidebar();
      await userEvent.setup().type(screen.getByRole('searchbox'), 'zzz');
      expect(screen.getByText('No conversations match “zzz”.')).toBeInTheDocument();
      expect(screen.getByText('0 conversations found')).toBeInTheDocument();
    });

    it('works controlled', async () => {
      const onQueryChange = vi.fn();
      renderSidebar({ query: 'build', onQueryChange });
      expect(screen.getByRole('searchbox')).toHaveValue('build');
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      await userEvent.setup().type(screen.getByRole('searchbox'), 's');
      expect(onQueryChange).toHaveBeenCalledWith('builds');
      expect(screen.getByRole('searchbox')).toHaveValue('build');
    });

    it('starts from a default query', () => {
      renderSidebar({ defaultQuery: 'notes' });
      expect(screen.getByRole('searchbox')).toHaveValue('notes');
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });

    it('can be turned off', () => {
      renderSidebar({ searchable: false });
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    });
  });

  describe('keyboard', () => {
    it('makes the list a single tab stop: the open conversation', () => {
      renderSidebar({ activeId: 'b', onPin: () => {} });
      expect(row('Debug the build')).toHaveAttribute('tabindex', '0');
      expect(actions('Debug the build')).toHaveAttribute('tabindex', '0');
      expect(row('Recipe ideas')).toHaveAttribute('tabindex', '-1');
      expect(actions('Recipe ideas')).toHaveAttribute('tabindex', '-1');
    });

    it('starts at the first conversation when none is open', () => {
      renderSidebar();
      expect(row('Pinned thing')).toHaveAttribute('tabindex', '0');
    });

    it('tabs from the search box into the list, and out of it', async () => {
      const user = userEvent.setup();
      renderSidebar({ activeId: 'b', onPin: () => {} });
      await user.click(screen.getByRole('searchbox'));
      await user.tab();
      expect(row('Debug the build')).toHaveFocus();
      await user.tab();
      expect(actions('Debug the build')).toHaveFocus();
      await user.tab();
      expect(document.body).toHaveFocus();
    });

    it('moves between conversations with the arrow keys, Home and End', async () => {
      const user = userEvent.setup();
      renderSidebar({ activeId: 'b' });
      row('Debug the build').focus();
      await user.keyboard('{ArrowDown}');
      expect(row('Recipe ideas')).toHaveFocus();
      await user.keyboard('{ArrowUp}{ArrowUp}');
      expect(row('Plan a trip to Lisbon')).toHaveFocus();
      await user.keyboard('{End}');
      expect(row('Old notes')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(row('Old notes')).toHaveFocus();
      await user.keyboard('{Home}');
      expect(row('Pinned thing')).toHaveFocus();
    });

    it('remembers where you were: the focused conversation becomes the tab stop', async () => {
      const user = userEvent.setup();
      renderSidebar({ activeId: 'b' });
      row('Debug the build').focus();
      await user.keyboard('{ArrowDown}');
      expect(row('Recipe ideas')).toHaveAttribute('tabindex', '0');
      expect(row('Debug the build')).toHaveAttribute('tabindex', '-1');
    });

    it('does not use arrow keys for anything else', async () => {
      const user = userEvent.setup();
      const { onSelect } = renderSidebar();
      row('Pinned thing').focus();
      await user.keyboard('{ArrowRight}x');
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('renaming', () => {
    it('is not offered without a handler', () => {
      renderSidebar();
      expect(screen.queryByRole('button', { name: /^Actions for/ })).not.toBeInTheDocument();
    });

    it('edits the title in place from the menu, and saves with Enter', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await chooseFromMenu(user, 'Recipe ideas', 'Rename');
      const input = await screen.findByRole('textbox', { name: 'Rename Recipe ideas' });
      await waitFor(() => expect(input).toHaveFocus());
      expect(input).toHaveValue('Recipe ideas');
      await user.keyboard('Dinner ideas{Enter}');
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(row('Dinner ideas')).toBeInTheDocument();
      await waitFor(() => expect(row('Dinner ideas')).toHaveFocus());
    });

    it('starts with F2 on a focused conversation', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      renderSidebar({ onRename });
      row('Old notes').focus();
      await user.keyboard('{F2}');
      const input = screen.getByRole('textbox', { name: 'Rename Old notes' });
      expect(input).toHaveFocus();
      await user.keyboard('Archive{Enter}');
      expect(onRename).toHaveBeenCalledWith('d', 'Archive');
    });

    it('cancels with Escape and keeps the old title', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      renderSidebar({ onRename });
      row('Old notes').focus();
      await user.keyboard('{F2}Something else{Escape}');
      expect(onRename).not.toHaveBeenCalled();
      expect(row('Old notes')).toHaveFocus();
    });

    it('saves when focus leaves the box', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      renderSidebar({ onRename, onNewChat: () => {} });
      row('Old notes').focus();
      await user.keyboard('{F2}Archive');
      await user.click(screen.getByRole('button', { name: 'New chat' }));
      expect(onRename).toHaveBeenCalledWith('d', 'Archive');
    });

    it('ignores an empty or unchanged title', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      renderSidebar({ onRename });
      row('Old notes').focus();
      await user.keyboard('{F2}{Enter}');
      expect(onRename).not.toHaveBeenCalled();
      await user.keyboard('{F2}{Backspace}{Enter}');
      expect(onRename).not.toHaveBeenCalled();
      expect(row('Old notes')).toBeInTheDocument();
    });

    it('trims the new title', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      renderSidebar({ onRename });
      row('Old notes').focus();
      await user.keyboard('{F2}  Spaced  {Enter}');
      expect(onRename).toHaveBeenCalledWith('d', 'Spaced');
    });
  });

  describe('pinning', () => {
    it('pins from the menu, and moves the conversation to the top', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await chooseFromMenu(user, 'Recipe ideas', 'Pin');
      const pinned = screen.getByRole('region', { name: 'Pinned' });
      expect(within(pinned).getByRole('button', { name: 'Recipe ideas' })).toBeInTheDocument();
    });

    it('offers "Unpin" for a pinned conversation', async () => {
      const onPin = vi.fn();
      const user = userEvent.setup();
      renderSidebar({ onPin });
      await chooseFromMenu(user, 'Pinned thing', 'Unpin');
      expect(onPin).toHaveBeenCalledWith('e', false);
    });

    it('reports the pin with the id', async () => {
      const onPin = vi.fn();
      const user = userEvent.setup();
      renderSidebar({ onPin });
      await chooseFromMenu(user, 'Old notes', 'Pin');
      expect(onPin).toHaveBeenCalledWith('d', true);
    });
  });

  describe('deleting', () => {
    it('asks first, and does nothing when you cancel', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      renderSidebar({ onDelete });
      await chooseFromMenu(user, 'Old notes', 'Delete');
      const dialog = await screen.findByRole('alertdialog', { name: 'Delete this conversation?' });
      expect(dialog).toHaveTextContent('“Old notes” will be permanently deleted.');
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      expect(onDelete).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    });

    it('deletes when you confirm', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      renderSidebar({ onDelete });
      await chooseFromMenu(user, 'Old notes', 'Delete');
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
      expect(onDelete).toHaveBeenCalledWith('d');
    });

    it('can skip the question', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      renderSidebar({ onDelete, confirmDelete: false });
      await chooseFromMenu(user, 'Old notes', 'Delete');
      expect(onDelete).toHaveBeenCalledWith('d');
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('deletes with the Delete key, after asking', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      renderSidebar({ onDelete });
      row('Recipe ideas').focus();
      await user.keyboard('{Delete}');
      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toHaveTextContent('“Recipe ideas”');
      await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
      expect(onDelete).toHaveBeenCalledWith('c');
    });

    it('moves focus to the next conversation instead of losing it', async () => {
      const user = userEvent.setup();
      render(<Harness confirmDelete={false} />);
      await chooseFromMenu(user, 'Debug the build', 'Delete');
      expect(screen.queryByRole('button', { name: 'Debug the build' })).not.toBeInTheDocument();
      await waitFor(() => expect(row('Recipe ideas')).toHaveFocus());
    });

    it('moves focus to the previous conversation when the last one is deleted', async () => {
      const user = userEvent.setup();
      render(<Harness confirmDelete={false} />);
      await chooseFromMenu(user, 'Old notes', 'Delete');
      await waitFor(() => expect(row('Recipe ideas')).toHaveFocus());
    });
  });

  describe('menu', () => {
    it('lists only what you can do', async () => {
      const user = userEvent.setup();
      renderSidebar({ onPin: () => {} });
      await user.click(actions('Old notes'));
      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Pin']);
      expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    });

    it('separates delete from the other actions', async () => {
      const user = userEvent.setup();
      renderSidebar({ onPin: () => {}, onRename: () => {}, onDelete: () => {} });
      await user.click(actions('Old notes'));
      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
        'Rename',
        'Pin',
        'Delete',
      ]);
      expect(screen.getByRole('separator')).toBeInTheDocument();
    });
  });

  describe('labels', () => {
    it('can be translated, including just some of the group names', () => {
      renderSidebar({
        labels: { title: 'Conversaciones', groups: { today: 'Hoy' }, newChat: 'Nueva' },
        onNewChat: () => {},
      });
      expect(screen.getByRole('navigation', { name: 'Conversaciones' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Hoy' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Yesterday' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Nueva' })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has no violations', async () => {
      const { container } = renderSidebar({
        activeId: 'b',
        onNewChat: () => {},
        onRename: () => {},
        onPin: () => {},
        onDelete: () => {},
      });
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no violations while renaming or asking to delete', async () => {
      const user = userEvent.setup();
      const { container } = renderSidebar({ onRename: () => {}, onDelete: () => {} });
      row('Old notes').focus();
      await user.keyboard('{F2}');
      expect(await axe(container)).toHaveNoViolations();
      await user.keyboard('{Escape}{Delete}');
      await screen.findByRole('alertdialog');
      expect(await axeWithPortal(document.body)).toHaveNoViolations();
    });

    it('has no violations while loading or empty', async () => {
      const { container, rerender } = renderSidebar({ conversations: [], loading: true });
      expect(await axe(container)).toHaveNoViolations();
      rerender(<ConversationSidebar conversations={[]} onSelect={() => {}} />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
