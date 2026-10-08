/** What the sidebar needs to know about a conversation. A full `Conversation` fits. */
export interface ConversationSummary {
  id: string;
  title: string;
  /** Milliseconds since the epoch. Decides the group and the order. */
  updatedAt: number;
  pinned?: boolean;
  /** A line of the latest message, shown under the title. Also searched. */
  preview?: string;
}

export type ConversationGroupId = 'pinned' | 'today' | 'yesterday' | 'week' | 'month' | 'older';

export interface ConversationGroup<T extends ConversationSummary = ConversationSummary> {
  id: ConversationGroupId;
  items: T[];
}

/** Midnight (local time) `daysAgo` days before the day of `now`. Calendar days, so DST is safe. */
function startOfDay(now: number, daysAgo = 0): number {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysAgo).getTime();
}

/** Which group a conversation belongs in by age, ignoring pinning. */
export function getConversationAge(
  updatedAt: number,
  now: number = Date.now(),
): Exclude<ConversationGroupId, 'pinned'> {
  if (updatedAt >= startOfDay(now)) return 'today';
  if (updatedAt >= startOfDay(now, 1)) return 'yesterday';
  if (updatedAt >= startOfDay(now, 7)) return 'week';
  if (updatedAt >= startOfDay(now, 30)) return 'month';
  return 'older';
}

const ORDER: ConversationGroupId[] = ['pinned', 'today', 'yesterday', 'week', 'month', 'older'];

/**
 * Sorts conversations into Pinned, Today, Yesterday, the previous 7 and 30 days, and Older, by
 * local calendar day. Each group is newest first and empty groups are left out.
 */
export function groupConversations<T extends ConversationSummary>(
  conversations: readonly T[],
  now: number = Date.now(),
): ConversationGroup<T>[] {
  const buckets = new Map<ConversationGroupId, T[]>();
  for (const conversation of conversations) {
    const id = conversation.pinned ? 'pinned' : getConversationAge(conversation.updatedAt, now);
    const bucket = buckets.get(id);
    if (bucket) bucket.push(conversation);
    else buckets.set(id, [conversation]);
  }
  return ORDER.flatMap((id) => {
    const items = buckets.get(id);
    return items ? [{ id, items: [...items].sort((a, b) => b.updatedAt - a.updatedAt) }] : [];
  });
}

/** Whether a conversation matches a search: every word of the query appears in its title or preview. */
export function matchesConversation(conversation: ConversationSummary, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = `${conversation.title} ${conversation.preview ?? ''}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}
