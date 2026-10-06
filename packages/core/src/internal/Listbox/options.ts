export interface ListboxOption {
  value: string;
  /** Text shown in the list and in the trigger; also used for typeahead and filtering. */
  label: string;
  /** Secondary line under the label. */
  description?: string;
  disabled?: boolean;
}

export interface ListboxGroup {
  label: string;
  options: ListboxOption[];
}

export type ListboxItem = ListboxOption | ListboxGroup;

export const isGroup = (item: ListboxItem): item is ListboxGroup => 'options' in item;

export interface OptionNode {
  option: ListboxOption;
  /** Position in the flat, navigable list of options. */
  index: number;
}

export type ListboxNode =
  | ({ kind: 'option' } & OptionNode)
  | { kind: 'group'; key: string; label: string; options: OptionNode[] };

/** Flattens options and groups into render nodes plus the flat list used for navigation. */
export function buildNodes(items: ListboxItem[]): {
  nodes: ListboxNode[];
  options: ListboxOption[];
} {
  const options: ListboxOption[] = [];
  const nodes = items.map((item, position): ListboxNode => {
    if (!isGroup(item)) {
      options.push(item);
      return { kind: 'option', option: item, index: options.length - 1 };
    }
    const grouped = item.options.map((option) => {
      options.push(option);
      return { option, index: options.length - 1 };
    });
    return { kind: 'group', key: `${position}-${item.label}`, label: item.label, options: grouped };
  });
  return { nodes, options };
}

/** Keeps the options matching `predicate`, dropping groups that end up empty. */
export function filterItems(
  items: ListboxItem[],
  predicate: (option: ListboxOption) => boolean,
): ListboxItem[] {
  const result: ListboxItem[] = [];
  for (const item of items) {
    if (!isGroup(item)) {
      if (predicate(item)) result.push(item);
      continue;
    }
    const options = item.options.filter(predicate);
    if (options.length > 0) result.push({ ...item, options });
  }
  return result;
}

const COMBINING_MARKS = new RegExp('[\u0300-\u036f]', 'g');
const normalize = (text: string) =>
  text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();

/** Case- and accent-insensitive "label contains query". */
export const defaultFilter = (option: ListboxOption, query: string) =>
  normalize(option.label).includes(normalize(query.trim()));

export const flattenItems = (items: ListboxItem[]): ListboxOption[] => buildNodes(items).options;

/** Index of the next enabled option after `from` in `direction`, or -1. */
export function nextEnabledIndex(
  options: ListboxOption[],
  from: number,
  direction: 1 | -1,
  wrap = false,
): number {
  const count = options.length;
  for (let step = 1; step <= count; step += 1) {
    let index = from + direction * step;
    if (index < 0 || index >= count) {
      if (!wrap) return -1;
      index = (index + count) % count;
    }
    if (!options[index]!.disabled) return index;
  }
  return -1;
}

export const firstEnabledIndex = (options: ListboxOption[]) => nextEnabledIndex(options, -1, 1);

export const lastEnabledIndex = (options: ListboxOption[]) =>
  nextEnabledIndex(options, options.length, -1);
