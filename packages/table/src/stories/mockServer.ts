import type { DataGridQueryState } from '../types';
import type { Employee } from './data';

export interface PageResult {
  rows: Employee[];
  /** How many rows match the query across all pages. */
  total: number;
}

type Range = [string | number | undefined, string | number | undefined];

const day = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * A stand-in for a back end: it filters, sorts and pages `all` the way a real API would from the
 * query a `DataGrid` in server mode reports, and answers after a short delay.
 */
export function createMockServer(all: Employee[], latency = 450) {
  return function fetchPage(query: DataGridQueryState, signal?: { cancelled: boolean }) {
    return new Promise<PageResult>((resolve, reject) => {
      setTimeout(() => {
        if (signal?.cancelled) return;
        if (all.length === 0) {
          reject(new Error('The employee service is not available.'));
          return;
        }

        const search = query.globalFilter.trim().toLowerCase();
        let rows = all.filter((employee) => {
          if (search) {
            const haystack = [
              employee.name,
              employee.department,
              employee.role,
              employee.location,
              employee.status,
              employee.email,
            ]
              .join(' ')
              .toLowerCase();
            if (!haystack.includes(search)) return false;
          }
          return query.filters.every(({ id, value }) => {
            const field = employee[id as keyof Employee];
            if (id === 'salary') {
              const [min, max] = (value as Range) ?? [];
              return (
                (min === undefined || employee.salary >= Number(min)) &&
                (max === undefined || employee.salary <= Number(max))
              );
            }
            if (id === 'startDate') {
              const [from, to] = (value as Range) ?? [];
              const started = day(employee.startDate);
              return (
                (from === undefined || started >= String(from)) &&
                (to === undefined || started <= String(to))
              );
            }
            if (id === 'department' || id === 'status' || id === 'location') return field === value;
            return String(field ?? '')
              .toLowerCase()
              .includes(String(value).toLowerCase());
          });
        });

        for (const { id, desc } of [...query.sorting].reverse()) {
          const direction = desc ? -1 : 1;
          rows = [...rows].sort((a, b) => {
            const left = a[id as keyof Employee];
            const right = b[id as keyof Employee];
            if (left instanceof Date && right instanceof Date) {
              return direction * (left.getTime() - right.getTime());
            }
            if (typeof left === 'number' && typeof right === 'number')
              return direction * (left - right);
            return direction * String(left ?? '').localeCompare(String(right ?? ''));
          });
        }

        const { pageIndex, pageSize } = query.pagination;
        resolve({
          rows: rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
          total: rows.length,
        });
      }, latency);
    });
  };
}
