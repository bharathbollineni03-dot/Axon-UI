import { describe, expect, it } from 'vitest';
import {
  applySuggestion,
  filterCommands,
  filterMentions,
  findTrigger,
  type Mention,
  type SlashCommand,
} from './suggestions';

const both = { slash: true, mention: true };

describe('findTrigger', () => {
  describe('slash', () => {
    it('finds a slash at the very start, with what follows it', () => {
      expect(findTrigger('/', 1, both)).toEqual({ kind: 'slash', query: '', start: 0, end: 1 });
      expect(findTrigger('/sum', 4, both)).toEqual({
        kind: 'slash',
        query: 'sum',
        start: 0,
        end: 4,
      });
    });

    it('only counts the first word, up to the caret', () => {
      expect(findTrigger('/summarize this', 4, both)).toMatchObject({ query: 'sum', end: 4 });
      expect(findTrigger('/summarize this', 15, both)).toBeNull();
    });

    it('ignores a slash that is not at the start', () => {
      expect(findTrigger('hello /sum', 10, both)).toBeNull();
      expect(findTrigger('see src/app', 11, both)).toBeNull();
      expect(findTrigger('line\n/sum', 9, both)).toBeNull();
    });

    it('is off when slash commands are not enabled', () => {
      expect(findTrigger('/sum', 4, { slash: false, mention: true })).toBeNull();
    });
  });

  describe('mention', () => {
    it('finds an @ at the start, or after whitespace', () => {
      expect(findTrigger('@', 1, both)).toEqual({ kind: 'mention', query: '', start: 0, end: 1 });
      expect(findTrigger('ask @ad', 7, both)).toEqual({
        kind: 'mention',
        query: 'ad',
        start: 4,
        end: 7,
      });
      expect(findTrigger('hi\n@bo', 6, both)).toMatchObject({ query: 'bo', start: 3 });
    });

    it('ignores an @ inside a word, such as an email address', () => {
      expect(findTrigger('ada@example', 11, both)).toBeNull();
    });

    it('stops at whitespace', () => {
      expect(findTrigger('@ada lovelace', 13, both)).toBeNull();
    });

    it('only looks at the text before the caret', () => {
      expect(findTrigger('@ada lovelace', 3, both)).toMatchObject({ query: 'ad', end: 3 });
    });

    it('is off when mentions are not enabled', () => {
      expect(findTrigger('@ad', 3, { slash: true, mention: false })).toBeNull();
    });
  });

  it('finds nothing in plain text', () => {
    expect(findTrigger('hello world', 5, both)).toBeNull();
    expect(findTrigger('', 0, both)).toBeNull();
  });

  it('prefers a slash command when the text starts with one', () => {
    expect(findTrigger('/at', 3, both)?.kind).toBe('slash');
  });
});

describe('applySuggestion', () => {
  it('replaces the trigger range and puts the caret after the replacement', () => {
    expect(applySuggestion('ask @ad now', { start: 4, end: 7 }, '@Ada Lovelace ')).toEqual({
      text: 'ask @Ada Lovelace  now',
      caret: 18,
    });
  });

  it('can remove the trigger', () => {
    expect(applySuggestion('/clear', { start: 0, end: 6 }, '')).toEqual({ text: '', caret: 0 });
  });

  it('keeps the text after the caret', () => {
    expect(applySuggestion('/su and more', { start: 0, end: 3 }, '/summarize ')).toEqual({
      text: '/summarize  and more',
      caret: 11,
    });
  });
});

describe('filterCommands', () => {
  const commands: SlashCommand[] = [
    { name: 'summarize', description: 'Shorten the text' },
    { name: 'translate', description: 'Into another language', keywords: ['language'] },
    { name: 'clear' },
    { name: 'resume', description: 'Pick up where you left off' },
  ];

  it('returns everything for an empty query', () => {
    expect(filterCommands(commands, '')).toBe(commands);
  });

  it('puts names that start with the query first', () => {
    expect(filterCommands(commands, 'su').map((c) => c.name)).toEqual(['summarize', 'resume']);
  });

  it('is case-insensitive', () => {
    expect(filterCommands(commands, 'CLE').map((c) => c.name)).toEqual(['clear']);
  });

  it('also matches descriptions and keywords', () => {
    expect(filterCommands(commands, 'shorten').map((c) => c.name)).toEqual(['summarize']);
    expect(filterCommands(commands, 'language').map((c) => c.name)).toEqual(['translate']);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterCommands(commands, 'zzz')).toEqual([]);
  });
});

describe('filterMentions', () => {
  const people: Mention[] = [
    { id: '1', label: 'Ada Lovelace', description: 'Mathematician' },
    { id: '2', label: 'Grace Hopper' },
    { id: '3', label: 'Charles Babbage' },
  ];

  it('returns everything for an empty query', () => {
    expect(filterMentions(people, '')).toBe(people);
  });

  it('puts labels that start with the query first, then the others', () => {
    expect(filterMentions(people, 'a').map((m) => m.id)).toEqual(['1', '2', '3']);
    expect(filterMentions(people, 'gr').map((m) => m.id)).toEqual(['2']);
  });

  it('matches descriptions', () => {
    expect(filterMentions(people, 'mathem').map((m) => m.id)).toEqual(['1']);
  });
});
