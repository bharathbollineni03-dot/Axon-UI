import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataGridColumn } from '../types';
import { csvField, downloadCsv, toCsv } from './csv';

describe('csvField', () => {
  it('writes plain values as they are', () => {
    expect(csvField('Ada')).toBe('Ada');
    expect(csvField(42)).toBe('42');
    expect(csvField(-3.5)).toBe('-3.5');
    expect(csvField(true)).toBe('true');
  });

  it('leaves nothing for a missing value', () => {
    expect(csvField(null)).toBe('');
    expect(csvField(undefined)).toBe('');
  });

  it('quotes a field that holds a comma, a quote or a line break, doubling quotes', () => {
    expect(csvField('Hopper, Grace')).toBe('"Hopper, Grace"');
    expect(csvField('She said "hi"')).toBe('"She said ""hi"""');
    expect(csvField('two\nlines')).toBe('"two\nlines"');
    expect(csvField('carriage\rreturn')).toBe('"carriage\rreturn"');
  });

  it('writes a date as a day, with the time only when it has one', () => {
    expect(csvField(new Date(2024, 2, 9))).toBe('2024-03-09');
    expect(csvField(new Date(2024, 2, 9, 14, 5, 30))).toBe('2024-03-09T14:05:30');
    expect(csvField(new Date('nope'))).toBe('');
  });

  it('joins lists and writes objects as JSON', () => {
    expect(csvField(['a', 'b'])).toBe('a; b');
    expect(csvField({ a: 1 })).toBe('"{""a"":1}"');
  });

  describe('formula protection', () => {
    it.each(['=SUM(A1:A9)', '+1 555 0100', '-2+3', '@cmd', '\tcell'])(
      'starts %j with an apostrophe',
      (text) => {
        expect(csvField(text)).toBe(`'${text}`);
      },
    );

    it('leaves numbers written as text, and numbers, alone', () => {
      expect(csvField('-5')).toBe('-5');
      expect(csvField('+12.5')).toBe('+12.5');
      expect(csvField(-5)).toBe('-5');
    });

    it('can be switched off', () => {
      expect(csvField('=1+1', { protectFormulas: false })).toBe('=1+1');
    });

    it('does not touch text that merely contains the characters', () => {
      expect(csvField('a=b')).toBe('a=b');
    });

    it('protects before quoting', () => {
      expect(csvField('=HYPERLINK("x","y")')).toBe(`"'=HYPERLINK(""x"",""y"")"`);
    });
  });
});

interface Person {
  name: string;
  age: number;
  born: Date;
}

const columns: DataGridColumn<Person>[] = [
  { accessor: 'name', header: 'Name' },
  { accessor: 'age', header: 'Age' },
  { accessor: 'born', header: 'Born' },
];
const rows: Person[] = [
  { name: 'Ada, Countess', age: 36, born: new Date(1815, 11, 10) },
  { name: '=evil()', age: 41, born: new Date(1912, 5, 23) },
];

describe('toCsv', () => {
  it('writes a header and a line per row', () => {
    expect(toCsv(columns, rows)).toBe(
      'Name,Age,Born\r\n"Ada, Countess",36,1815-12-10\r\n\'=evil(),41,1912-06-23\r\n',
    );
  });

  it('uses another line break', () => {
    expect(toCsv(columns, rows, { lineBreak: '\n' }).split('\n')).toHaveLength(4);
  });

  it('uses a column’s exportValue in place of its accessor', () => {
    const csv = toCsv(
      [{ accessor: 'age', header: 'Age', exportValue: (row: Person) => `${row.age} years` }],
      rows,
    );
    expect(csv).toBe('Age\r\n36 years\r\n41 years\r\n');
  });

  it('reads accessors that are functions', () => {
    const csv = toCsv(
      [{ id: 'initial', header: 'Initial', accessor: (row: Person) => row.name[0] }],
      rows,
    );
    expect(csv).toBe("Initial\r\nA\r\n'=\r\n");
  });

  it('quotes a header that needs it, and never alters one', () => {
    expect(toCsv([{ id: 'x', header: '=Total, USD' }], [])).toBe('"=Total, USD"\r\n');
  });
});

describe('downloadCsv', () => {
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  afterEach(() => {
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
    vi.useRealTimers();
  });

  it('saves the text as a file with the given name, then lets go of it', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const blobs: Blob[] = [];
    URL.createObjectURL = (blob: Blob | MediaSource) => {
      blobs.push(blob as Blob);
      return 'blob:test';
    };
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('people.csv');
      expect(this.href).toBe('blob:test');
    });

    downloadCsv('people.csv', 'a,b\r\n');

    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(blobs[0]?.type).toBe('text/csv;charset=utf-8');
    // jsdom's Blob has no text(), so read the bytes: a UTF-8 byte order mark, then the CSV.
    const bytes = await new Promise<Uint8Array>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.readAsArrayBuffer(blobs[0] as Blob);
    });
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe('a,b\r\n');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
