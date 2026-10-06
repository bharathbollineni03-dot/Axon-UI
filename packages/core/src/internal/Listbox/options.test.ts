import { describe, expect, it } from 'vitest';
import {
  buildNodes,
  defaultFilter,
  filterItems,
  firstEnabledIndex,
  lastEnabledIndex,
  nextEnabledIndex,
  type ListboxItem,
} from './options';
import { findByTypeahead } from './typeahead';

const items: ListboxItem[] = [
  { value: 'a', label: 'Alpha' },
  {
    label: 'Group',
    options: [
      { value: 'b', label: 'Beta', disabled: true },
      { value: 'c', label: 'Gamma' },
    ],
  },
  { value: 'd', label: 'Delta', disabled: true },
];

describe('buildNodes', () => {
  it('numbers options across groups for navigation', () => {
    const { nodes, options } = buildNodes(items);
    expect(options.map((o) => o.value)).toEqual(['a', 'b', 'c', 'd']);
    expect(nodes).toHaveLength(3);
    const group = nodes[1]!;
    expect(group.kind === 'group' && group.options.map((o) => o.index)).toEqual([1, 2]);
  });
});

describe('filterItems', () => {
  it('filters options and drops emptied groups', () => {
    expect(filterItems(items, (o) => o.value === 'c')).toEqual([
      { label: 'Group', options: [{ value: 'c', label: 'Gamma' }] },
    ]);
    expect(filterItems(items, () => false)).toEqual([]);
  });
});

describe('defaultFilter', () => {
  it('matches case- and accent-insensitively, ignoring surrounding spaces', () => {
    const option = { value: 'x', label: 'Crème Brûlée' };
    expect(defaultFilter(option, ' creme ')).toBe(true);
    expect(defaultFilter(option, 'BRULEE')).toBe(true);
    expect(defaultFilter(option, 'tart')).toBe(false);
    expect(defaultFilter(option, '')).toBe(true);
  });
});

describe('enabled index helpers', () => {
  const { options } = buildNodes(items);
  it('skips disabled options', () => {
    expect(firstEnabledIndex(options)).toBe(0);
    expect(lastEnabledIndex(options)).toBe(2);
    expect(nextEnabledIndex(options, 0, 1)).toBe(2);
    expect(nextEnabledIndex(options, 2, -1)).toBe(0);
  });

  it('returns -1 at the ends unless wrapping', () => {
    expect(nextEnabledIndex(options, 2, 1)).toBe(-1);
    expect(nextEnabledIndex(options, 0, -1)).toBe(-1);
    expect(nextEnabledIndex(options, 2, 1, true)).toBe(0);
    expect(nextEnabledIndex(options, 0, -1, true)).toBe(2);
  });

  it('returns -1 when every option is disabled or the list is empty', () => {
    expect(firstEnabledIndex([{ value: 'a', label: 'A', disabled: true }])).toBe(-1);
    expect(firstEnabledIndex([])).toBe(-1);
  });
});

describe('findByTypeahead', () => {
  const { options } = buildNodes([
    { value: '1', label: 'Apple' },
    { value: '2', label: 'Apricot' },
    { value: '3', label: 'Avocado', disabled: true },
    { value: '4', label: 'Banana' },
  ]);

  it('finds a prefix match from the current position, wrapping around', () => {
    expect(findByTypeahead(options, 'b', 0)).toBe(3);
    expect(findByTypeahead(options, 'ap', 3)).toBe(0);
    expect(findByTypeahead(options, 'apr', 0)).toBe(1);
  });

  it('skips disabled options and returns -1 without a match', () => {
    expect(findByTypeahead(options, 'av', 0)).toBe(-1);
    expect(findByTypeahead(options, 'z', 0)).toBe(-1);
  });

  it('cycles through options sharing a first letter when one character repeats', () => {
    expect(findByTypeahead(options, 'aa', 0)).toBe(1);
    expect(findByTypeahead(options, 'aa', 1)).toBe(0);
  });
});
