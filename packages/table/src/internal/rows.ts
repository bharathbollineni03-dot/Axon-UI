/** Moves `id` next to `targetId` (before or after it) in a list of ids, returning a new list. */
export function moveWithin(
  ids: readonly string[],
  id: string,
  targetId: string,
  side: 'before' | 'after',
): string[] {
  const without = ids.filter((other) => other !== id);
  const at = without.indexOf(targetId);
  if (at === -1) return [...ids];
  without.splice(side === 'after' ? at + 1 : at, 0, id);
  return without;
}

interface TreeRow<Data> {
  original: Data;
  subRows: TreeRow<Data>[];
  getIsGrouped: () => boolean;
}

/** The data rows under a tree of rows that may hold group rows: what an export is made of. */
export function leafRows<Data>(rows: readonly TreeRow<Data>[]): Data[] {
  const result: Data[] = [];
  const visit = (row: TreeRow<Data>) => {
    if (row.getIsGrouped()) row.subRows.forEach(visit);
    else result.push(row.original);
  };
  rows.forEach(visit);
  return result;
}
