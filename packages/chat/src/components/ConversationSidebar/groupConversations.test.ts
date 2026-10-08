import { describe, expect, it } from 'vitest';
import {
  getConversationAge,
  groupConversations,
  matchesConversation,
  type ConversationSummary,
} from './groupConversations';

// Sunday 15 June 2025, 14:00 local time. Dates are built in local time so the tests hold in any zone.
const NOW = new Date(2025, 5, 15, 14, 0).getTime();
const at = (month: number, day: number, hour = 12, minute = 0) =>
  new Date(2025, month - 1, day, hour, minute).getTime();

const conv = (
  id: string,
  updatedAt: number,
  extra: Partial<ConversationSummary> = {},
): ConversationSummary => ({ id, title: `Chat ${id}`, updatedAt, ...extra });

describe('getConversationAge', () => {
  it('splits by local calendar day, not by 24-hour spans', () => {
    expect(getConversationAge(at(6, 15, 0, 0), NOW)).toBe('today');
    expect(getConversationAge(at(6, 14, 23, 59), NOW)).toBe('yesterday');
    expect(getConversationAge(at(6, 14, 0, 0), NOW)).toBe('yesterday');
    expect(getConversationAge(at(6, 13, 23, 59), NOW)).toBe('week');
    expect(getConversationAge(at(6, 8, 0, 0), NOW)).toBe('week');
    expect(getConversationAge(at(6, 7, 23, 59), NOW)).toBe('month');
    expect(getConversationAge(at(5, 16, 0, 0), NOW)).toBe('month');
    expect(getConversationAge(at(5, 15, 23, 59), NOW)).toBe('older');
  });

  it('treats a time in the future as today', () => {
    expect(getConversationAge(NOW + 3 * 86_400_000, NOW)).toBe('today');
  });

  it('is still correct just after midnight', () => {
    const justAfterMidnight = new Date(2025, 5, 16, 0, 5).getTime();
    expect(getConversationAge(at(6, 15, 23, 0), justAfterMidnight)).toBe('yesterday');
  });
});

describe('groupConversations', () => {
  it('returns the groups in order and leaves out the empty ones', () => {
    const groups = groupConversations(
      [conv('old', at(1, 2)), conv('now', at(6, 15, 9)), conv('week', at(6, 10))],
      NOW,
    );
    expect(groups.map((group) => group.id)).toEqual(['today', 'week', 'older']);
  });

  it('puts pinned conversations first, whatever their age', () => {
    const groups = groupConversations(
      [conv('a', at(6, 15, 9)), conv('b', at(1, 2), { pinned: true })],
      NOW,
    );
    expect(groups.map((group) => group.id)).toEqual(['pinned', 'today']);
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['b']);
    expect(groups[1]?.items.map((item) => item.id)).toEqual(['a']);
  });

  it('sorts each group newest first', () => {
    const groups = groupConversations(
      [conv('a', at(6, 15, 8)), conv('b', at(6, 15, 13)), conv('c', at(6, 15, 10))],
      NOW,
    );
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('does not change the list it is given', () => {
    const list = [conv('a', at(6, 15, 8)), conv('b', at(6, 15, 13))];
    groupConversations(list, NOW);
    expect(list.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('keeps the extra fields of what it is given', () => {
    const [group] = groupConversations([{ ...conv('a', at(6, 15, 9)), messages: [] }], NOW);
    expect(group?.items[0]).toHaveProperty('messages');
  });

  it('returns nothing for nothing', () => {
    expect(groupConversations([], NOW)).toEqual([]);
  });
});

describe('matchesConversation', () => {
  const item = conv('1', NOW, { title: 'Plan a trip to Lisbon', preview: 'Day one: Alfama' });

  it('matches everything for an empty search', () => {
    expect(matchesConversation(item, '')).toBe(true);
    expect(matchesConversation(item, '   ')).toBe(true);
  });

  it('ignores case and looks at the title and the preview', () => {
    expect(matchesConversation(item, 'LISBON')).toBe(true);
    expect(matchesConversation(item, 'alfama')).toBe(true);
    expect(matchesConversation(item, 'paris')).toBe(false);
  });

  it('needs every word, in any order', () => {
    expect(matchesConversation(item, 'lisbon trip')).toBe(true);
    expect(matchesConversation(item, 'lisbon paris')).toBe(false);
  });
});
