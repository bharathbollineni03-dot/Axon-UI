/** Sample data for the stories: deterministic, so every visit shows the same rows. */

export type Department = 'Engineering' | 'Design' | 'Sales' | 'Support' | 'Finance' | 'People';
export type EmployeeStatus = 'Active' | 'On leave' | 'Remote' | 'Contractor';

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: Department;
  role: string;
  location: string;
  status: EmployeeStatus;
  salary: number;
  /** 1 to 5, in halves. */
  rating: number;
  startDate: Date;
  manager: string | null;
}

export const departments: Department[] = [
  'Engineering',
  'Design',
  'Sales',
  'Support',
  'Finance',
  'People',
];
export const statuses: EmployeeStatus[] = ['Active', 'On leave', 'Remote', 'Contractor'];

const firstNames = [
  'Ada',
  'Grace',
  'Alan',
  'Margaret',
  'Linus',
  'Barbara',
  'Dennis',
  'Radia',
  'Tim',
  'Hedy',
  'Katherine',
  'Donald',
  'Frances',
  'Edsger',
  'Anita',
  'Ken',
  'Sophie',
  'Claude',
  'Vint',
  'Joan',
];
const lastNames = [
  'Lovelace',
  'Hopper',
  'Turing',
  'Hamilton',
  'Torvalds',
  'Liskov',
  'Ritchie',
  'Perlman',
  'Berners-Lee',
  'Lamarr',
  'Johnson',
  'Knuth',
  'Allen',
  'Dijkstra',
  'Borg',
  'Thompson',
  'Wilson',
  'Shannon',
  'Cerf',
  'Clarke',
];
const roles: Record<Department, string[]> = {
  Engineering: ['Software Engineer', 'Staff Engineer', 'Engineering Manager', 'SRE'],
  Design: ['Product Designer', 'Design Lead', 'Researcher'],
  Sales: ['Account Executive', 'Sales Manager', 'Solutions Engineer'],
  Support: ['Support Specialist', 'Support Lead'],
  Finance: ['Accountant', 'Financial Analyst'],
  People: ['Recruiter', 'People Partner'],
};
const locations = [
  'London',
  'New York',
  'Berlin',
  'Singapore',
  'São Paulo',
  'Toronto',
  'Sydney',
  'Remote',
];

/** A small linear-congruential generator, so the data does not change between renders or visits. */
function random(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export function makeEmployees(count: number, seed = 42): Employee[] {
  const next = random(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T;

  return Array.from({ length: count }, (_, index) => {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const department = pick(departments);
    const salaryBase = {
      Engineering: 120,
      Design: 105,
      Sales: 95,
      Support: 70,
      Finance: 100,
      People: 85,
    }[department];
    const start = new Date(2015, 0, 1);
    start.setDate(start.getDate() + Math.floor(next() * 365 * 10));
    return {
      id: `EMP-${String(index + 1).padStart(5, '0')}`,
      name: `${first} ${last}`,
      email: `${first}.${last}${index + 1}@example.com`.toLowerCase().replace(/[^a-z0-9.@-]/g, ''),
      department,
      role: pick(roles[department]),
      location: pick(locations),
      status: next() < 0.7 ? 'Active' : pick(statuses),
      salary: Math.round((salaryBase + next() * 60) * 1000),
      rating: Math.round((1 + next() * 4) * 2) / 2,
      startDate: start,
      manager: next() < 0.1 ? null : `${pick(firstNames)} ${pick(lastNames)}`,
    };
  });
}
