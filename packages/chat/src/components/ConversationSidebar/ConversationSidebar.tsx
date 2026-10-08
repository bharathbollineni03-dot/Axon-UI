import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  IconButton,
  MenuItem,
  MenuSeparator,
  Skeleton,
  TextField,
  useControllableState,
} from '@axonui/core';
import { EditIcon, MoreIcon, PinIcon, PlusIcon, SearchIcon, TrashIcon } from '../../internal/icons';
import {
  groupConversations,
  matchesConversation,
  type ConversationGroupId,
  type ConversationSummary,
} from './groupConversations';

export interface ConversationSidebarLabels {
  /** The name of the navigation landmark. */
  title: string;
  newChat: string;
  search: string;
  searchPlaceholder: string;
  empty: string;
  noResults: (query: string) => string;
  /** Announced as the search narrows the list. */
  results: (count: number) => string;
  loading: string;
  untitled: string;
  groups: Record<ConversationGroupId, string>;
  /** The name of a conversation's actions button. */
  actions: (title: string) => string;
  rename: string;
  renameInput: (title: string) => string;
  pin: string;
  unpin: string;
  delete: string;
  deleteTitle: string;
  deleteDescription: (title: string) => string;
  deleteConfirm: string;
  deleteCancel: string;
}

export const defaultConversationSidebarLabels: ConversationSidebarLabels = {
  title: 'Conversations',
  newChat: 'New chat',
  search: 'Search conversations',
  searchPlaceholder: 'Search',
  empty: 'No conversations yet.',
  noResults: (query) => `No conversations match “${query}”.`,
  results: (count) => (count === 1 ? '1 conversation found' : `${count} conversations found`),
  loading: 'Loading conversations',
  untitled: 'New chat',
  groups: {
    pinned: 'Pinned',
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'Previous 7 days',
    month: 'Previous 30 days',
    older: 'Older',
  },
  actions: (title) => `Actions for ${title}`,
  rename: 'Rename',
  renameInput: (title) => `Rename ${title}`,
  pin: 'Pin',
  unpin: 'Unpin',
  delete: 'Delete',
  deleteTitle: 'Delete this conversation?',
  deleteDescription: (title) => `“${title}” will be permanently deleted.`,
  deleteConfirm: 'Delete',
  deleteCancel: 'Cancel',
};

/** Any of the labels; `groups` may name just the groups you want to change. */
export type ConversationSidebarLabelOverrides = Partial<
  Omit<ConversationSidebarLabels, 'groups'>
> & { groups?: Partial<ConversationSidebarLabels['groups']> };

export interface ConversationSidebarProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** Newest first is not required: each group is sorted for you. A `Conversation` fits. */
  conversations: readonly ConversationSummary[];
  /** The conversation that is open. */
  activeId?: string | null;
  onSelect: (id: string) => void;
  /** Shows a "New chat" button. */
  onNewChat?: () => void;
  /** Lets people rename a conversation: from its menu, or with F2. */
  onRename?: (id: string, title: string) => void;
  /** Lets people pin and unpin a conversation. Pinned ones are grouped first. */
  onPin?: (id: string, pinned: boolean) => void;
  /** Lets people delete a conversation: from its menu, or with Delete. */
  onDelete?: (id: string) => void;
  /** Shows a search box. Defaults to true. */
  searchable?: boolean;
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  /** Asks before deleting. Defaults to true. */
  confirmDelete?: boolean;
  /** Shows placeholders while conversations load. */
  loading?: boolean;
  /** Shown instead of the default text when there are no conversations at all. */
  emptyState?: ReactNode;
  /** The current time, to group by day. Defaults to `Date.now`. */
  now?: () => number;
  /** The heading level of the group names. Defaults to 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  labels?: ConversationSidebarLabelOverrides;
}

const SELECT_ATTRIBUTE = 'data-axon-conversation';

interface ItemProps {
  conversation: ConversationSummary;
  active: boolean;
  tabbable: boolean;
  renaming: boolean;
  labels: ConversationSidebarLabels;
  canRename: boolean;
  canPin: boolean;
  canDelete: boolean;
  onFocusItem: (id: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, id: string) => void;
  onSelect: (id: string) => void;
  onStartRename: (id: string) => void;
  onCommitRename: (id: string, title: string) => void;
  onCancelRename: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onRequestDelete: (conversation: ConversationSummary) => void;
}

function RenameInput({
  conversation,
  label,
  onCommit,
  onCancel,
}: {
  conversation: ConversationSummary;
  label: string;
  onCommit: (title: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const finish = (commit: boolean) => {
    if (finished.current) return;
    finished.current = true;
    if (commit) onCommit(ref.current?.value ?? '');
    else onCancel();
  };

  return (
    <input
      ref={ref}
      type="text"
      className="axon-conversation-sidebar__rename"
      aria-label={label}
      defaultValue={conversation.title}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          finish(true);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          finish(false);
        }
      }}
      onBlur={() => finish(true)}
    />
  );
}

function ConversationItem({
  conversation,
  active,
  tabbable,
  renaming,
  labels,
  canRename,
  canPin,
  canDelete,
  onFocusItem,
  onKeyDown,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onPin,
  onRequestDelete,
}: ItemProps) {
  const title = conversation.title.trim() || labels.untitled;
  const hasMenu = canRename || canPin || canDelete;

  return (
    <li
      className="axon-conversation-sidebar__item"
      data-active={active ? 'true' : undefined}
      data-pinned={conversation.pinned ? 'true' : undefined}
    >
      {renaming ? (
        <RenameInput
          conversation={conversation}
          label={labels.renameInput(title)}
          onCommit={(next) => onCommitRename(conversation.id, next)}
          onCancel={() => onCancelRename(conversation.id)}
        />
      ) : (
        <>
          <button
            type="button"
            {...{ [SELECT_ATTRIBUTE]: conversation.id }}
            className="axon-conversation-sidebar__select"
            aria-current={active ? 'true' : undefined}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => onSelect(conversation.id)}
            onFocus={() => onFocusItem(conversation.id)}
            onKeyDown={(event) => onKeyDown(event, conversation.id)}
          >
            {conversation.pinned ? (
              <PinIcon className="axon-conversation-sidebar__pin" aria-hidden="true" />
            ) : null}
            <span className="axon-conversation-sidebar__title">{title}</span>
          </button>
          {hasMenu ? (
            <DropdownMenu
              aria-label={labels.actions(title)}
              placement="bottom-end"
              trigger={
                <IconButton
                  size="sm"
                  variant="ghost"
                  className="axon-conversation-sidebar__more"
                  aria-label={labels.actions(title)}
                  tabIndex={tabbable ? 0 : -1}
                >
                  <MoreIcon />
                </IconButton>
              }
            >
              {canRename ? (
                <MenuItem icon={<EditIcon />} onClick={() => onStartRename(conversation.id)}>
                  {labels.rename}
                </MenuItem>
              ) : null}
              {canPin ? (
                <MenuItem
                  icon={<PinIcon />}
                  onClick={() => onPin(conversation.id, !conversation.pinned)}
                >
                  {conversation.pinned ? labels.unpin : labels.pin}
                </MenuItem>
              ) : null}
              {canDelete && (canRename || canPin) ? <MenuSeparator /> : null}
              {canDelete ? (
                <MenuItem
                  destructive
                  icon={<TrashIcon />}
                  onClick={() => onRequestDelete(conversation)}
                >
                  {labels.delete}
                </MenuItem>
              ) : null}
            </DropdownMenu>
          ) : null}
        </>
      )}
    </li>
  );
}

/**
 * The list of past conversations beside a chat: grouped by day (Pinned, Today, Yesterday, the
 * previous 7 and 30 days, Older), searchable, with rename, pin and delete. The list is one tab
 * stop; arrow keys, Home and End move between conversations, F2 renames and Delete deletes.
 */
export const ConversationSidebar = forwardRef<HTMLElement, ConversationSidebarProps>(
  function ConversationSidebar(
    {
      conversations,
      activeId,
      onSelect,
      onNewChat,
      onRename,
      onPin,
      onDelete,
      searchable = true,
      query: queryProp,
      defaultQuery = '',
      onQueryChange,
      confirmDelete = true,
      loading = false,
      emptyState,
      now,
      headingLevel = 3,
      labels: labelsProp,
      className,
      ...rest
    },
    ref,
  ) {
    const labels: ConversationSidebarLabels = {
      ...defaultConversationSidebarLabels,
      ...labelsProp,
      groups: { ...defaultConversationSidebarLabels.groups, ...labelsProp?.groups },
    };
    const Heading = `h${headingLevel}` as ElementType;
    const baseId = useId();
    const listRef = useRef<HTMLDivElement>(null);

    const [query, setQuery] = useControllableState<string>({
      value: queryProp,
      defaultValue: defaultQuery,
      onChange: onQueryChange,
    });
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<ConversationSummary | null>(null);
    const focusAfter = useRef<string | null>(null);

    const groups = useMemo(() => {
      const visible = conversations.filter((conversation) =>
        matchesConversation(conversation, query),
      );
      return groupConversations(visible, now?.() ?? Date.now());
    }, [conversations, query, now]);

    const orderedIds = useMemo(
      () => groups.flatMap((group) => group.items.map((item) => item.id)),
      [groups],
    );
    const resultCount = orderedIds.length;

    // One tab stop: the conversation last focused, else the open one, else the first.
    const tabbableId =
      focusedId && orderedIds.includes(focusedId)
        ? focusedId
        : activeId && orderedIds.includes(activeId)
          ? activeId
          : (orderedIds[0] ?? null);

    const focusItem = useCallback((id: string | undefined) => {
      if (!id) return;
      const buttons = listRef.current?.querySelectorAll<HTMLElement>(`[${SELECT_ATTRIBUTE}]`);
      const target = Array.from(buttons ?? []).find(
        (button) => button.getAttribute(SELECT_ATTRIBUTE) === id,
      );
      target?.focus();
    }, []);

    // After a rename or a delete, put focus on a conversation instead of losing it. The timer is
    // not cancelled by a re-render, so it still fires once the rest of the update has settled.
    useEffect(() => {
      const id = focusAfter.current;
      if (!id || renamingId) return;
      focusAfter.current = null;
      setTimeout(() => {
        const active = document.activeElement;
        if (!active || active === document.body || !listRef.current?.contains(active)) {
          focusItem(id);
        }
      }, 0);
    }, [conversations, renamingId, focusItem]);

    const deleteNow = (id: string) => {
      const index = orderedIds.indexOf(id);
      focusAfter.current = orderedIds[index + 1] ?? orderedIds[index - 1] ?? null;
      onDelete?.(id);
    };

    const requestDelete = (conversation: ConversationSummary) => {
      if (confirmDelete) setPendingDelete(conversation);
      else deleteNow(conversation.id);
    };

    const startRename = (id: string) => {
      // Let the menu finish closing first, or it takes focus back from the box.
      requestAnimationFrame(() => setRenamingId(id));
    };

    /** `title` is the typed text, or null when editing was cancelled. */
    const finishRename = (id: string, title: string | null) => {
      const next = title?.trim();
      const current = conversations.find((item) => item.id === id);
      if (next && current && next !== current.title) onRename?.(id, next);
      focusAfter.current = id;
      setRenamingId(null);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
      const index = orderedIds.indexOf(id);
      let next: string | undefined;
      switch (event.key) {
        case 'ArrowDown':
          next = orderedIds[Math.min(index + 1, orderedIds.length - 1)];
          break;
        case 'ArrowUp':
          next = orderedIds[Math.max(index - 1, 0)];
          break;
        case 'Home':
          next = orderedIds[0];
          break;
        case 'End':
          next = orderedIds[orderedIds.length - 1];
          break;
        case 'F2':
          if (onRename) {
            event.preventDefault();
            setRenamingId(id);
          }
          return;
        case 'Delete': {
          const conversation = conversations.find((item) => item.id === id);
          if (onDelete && conversation) {
            event.preventDefault();
            requestDelete(conversation);
          }
          return;
        }
        default:
          return;
      }
      event.preventDefault();
      focusItem(next);
    };

    const searching = query.trim().length > 0;
    const showEmpty = !loading && conversations.length === 0;
    const showNoResults = !loading && conversations.length > 0 && resultCount === 0;

    return (
      <nav
        {...rest}
        ref={ref}
        aria-label={labels.title}
        className={['axon-conversation-sidebar', className].filter(Boolean).join(' ')}
      >
        {onNewChat || searchable ? (
          <div className="axon-conversation-sidebar__top">
            {onNewChat ? (
              <Button variant="outline" fullWidth startIcon={<PlusIcon />} onClick={onNewChat}>
                {labels.newChat}
              </Button>
            ) : null}
            {searchable ? (
              <TextField
                type="search"
                size="sm"
                fullWidth
                aria-label={labels.search}
                placeholder={labels.searchPlaceholder}
                startAdornment={<SearchIcon />}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            ) : null}
          </div>
        ) : null}

        <div
          ref={listRef}
          className="axon-conversation-sidebar__list"
          aria-busy={loading || undefined}
        >
          {loading ? (
            <div className="axon-conversation-sidebar__loading">
              <span className="axon-visually-hidden" role="status">
                {labels.loading}
              </span>
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={row} variant="text" width={`${90 - row * 12}%`} />
              ))}
            </div>
          ) : null}

          {groups.map((group) => {
            const headingId = `${baseId}-${group.id}`;
            return (
              <section
                key={group.id}
                aria-labelledby={headingId}
                className="axon-conversation-sidebar__group"
              >
                <Heading id={headingId} className="axon-conversation-sidebar__group-title">
                  {labels.groups[group.id]}
                </Heading>
                <ul className="axon-conversation-sidebar__items">
                  {group.items.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      active={conversation.id === activeId}
                      tabbable={conversation.id === tabbableId}
                      renaming={conversation.id === renamingId}
                      labels={labels}
                      canRename={Boolean(onRename)}
                      canPin={Boolean(onPin)}
                      canDelete={Boolean(onDelete)}
                      onFocusItem={setFocusedId}
                      onKeyDown={handleKeyDown}
                      onSelect={onSelect}
                      onStartRename={startRename}
                      onCommitRename={finishRename}
                      onCancelRename={(id) => finishRename(id, null)}
                      onPin={(id, pinned) => onPin?.(id, pinned)}
                      onRequestDelete={requestDelete}
                    />
                  ))}
                </ul>
              </section>
            );
          })}

          {showEmpty
            ? (emptyState ?? <p className="axon-conversation-sidebar__empty">{labels.empty}</p>)
            : null}
          {showNoResults ? (
            <p className="axon-conversation-sidebar__empty">{labels.noResults(query.trim())}</p>
          ) : null}
        </div>

        <span className="axon-visually-hidden" role="status">
          {searching && !loading ? labels.results(resultCount) : ''}
        </span>

        {onDelete ? (
          <ConfirmDialog
            open={pendingDelete !== null}
            color="danger"
            title={labels.deleteTitle}
            description={labels.deleteDescription(pendingDelete?.title.trim() || labels.untitled)}
            confirmLabel={labels.deleteConfirm}
            cancelLabel={labels.deleteCancel}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => {
              if (pendingDelete) deleteNow(pendingDelete.id);
              setPendingDelete(null);
            }}
          />
        ) : null}
      </nav>
    );
  },
);
