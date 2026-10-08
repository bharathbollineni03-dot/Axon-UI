import type { DataGridColumn } from '../types';

export interface Person {
  id: number;
  name: string;
  age: number;
  team: string;
  joined: Date;
  active: boolean;
  salary: number | null;
}

/** Eight people with a gap in the salaries, a tie in the ages and two teams to group by. */
export const people: Person[] = [
  {
    id: 1,
    name: 'Ada Lovelace',
    age: 36,
    team: 'Research',
    joined: new Date(2019, 2, 4),
    active: true,
    salary: 120000,
  },
  {
    id: 2,
    name: 'Grace Hopper',
    age: 45,
    team: 'Platform',
    joined: new Date(2016, 8, 19),
    active: true,
    salary: 135000,
  },
  {
    id: 3,
    name: 'Alan Turing',
    age: 41,
    team: 'Research',
    joined: new Date(2020, 0, 13),
    active: false,
    salary: null,
  },
  {
    id: 4,
    name: 'Margaret Hamilton',
    age: 36,
    team: 'Platform',
    joined: new Date(2018, 5, 2),
    active: true,
    salary: 128000,
  },
  {
    id: 5,
    name: 'Linus Torvalds',
    age: 29,
    team: 'Kernel',
    joined: new Date(2021, 10, 30),
    active: true,
    salary: 99000,
  },
  {
    id: 6,
    name: 'Barbara Liskov',
    age: 52,
    team: 'Research',
    joined: new Date(2015, 1, 8),
    active: false,
    salary: 142000,
  },
  {
    id: 7,
    name: 'Dennis Ritchie',
    age: 38,
    team: 'Kernel',
    joined: new Date(2017, 6, 21),
    active: true,
    salary: 110000,
  },
  {
    id: 8,
    name: 'Radia Perlman',
    age: 33,
    team: 'Platform',
    joined: new Date(2022, 3, 11),
    active: true,
    salary: 105000,
  },
];

export const personColumns: DataGridColumn<Person>[] = [
  { accessor: 'name', header: 'Name', width: 180 },
  { accessor: 'age', header: 'Age', width: 90, align: 'end' },
  { accessor: 'team', header: 'Team' },
  { accessor: 'joined', header: 'Joined' },
  { accessor: 'active', header: 'Active', width: 100 },
  { accessor: 'salary', header: 'Salary', align: 'end' },
];

/** Many rows with predictable values: row `i` is named `Person 0000i` and is `20 + (i % 40)` years old. */
export function manyPeople(count: number): Person[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Person ${String(i + 1).padStart(5, '0')}`,
    age: 20 + (i % 40),
    team: ['Research', 'Platform', 'Kernel'][i % 3] as string,
    joined: new Date(2015 + (i % 8), i % 12, 1 + (i % 28)),
    active: i % 4 !== 0,
    salary: 60000 + (i % 100) * 1000,
  }));
}
