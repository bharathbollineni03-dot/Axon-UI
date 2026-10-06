import { describe, expect, it } from 'vitest';
import { formatBytes, getFileKey, matchesAccept } from './files';

const file = (name: string, type: string) => ({ name, type });

describe('matchesAccept', () => {
  it('matches everything without an accept string', () => {
    expect(matchesAccept(file('a.bin', ''))).toBe(true);
    expect(matchesAccept(file('a.bin', ''), '  ')).toBe(true);
  });

  it('matches extensions case-insensitively', () => {
    expect(matchesAccept(file('Report.PDF', 'application/pdf'), '.pdf')).toBe(true);
    expect(matchesAccept(file('report.docx', ''), '.pdf')).toBe(false);
  });

  it('matches exact types and wildcards', () => {
    expect(matchesAccept(file('a.png', 'image/png'), 'image/png')).toBe(true);
    expect(matchesAccept(file('a.png', 'image/png'), 'image/jpeg')).toBe(false);
    expect(matchesAccept(file('a.png', 'image/png'), 'image/*')).toBe(true);
    expect(matchesAccept(file('a.mp4', 'video/mp4'), 'image/*')).toBe(false);
  });

  it('matches any of several tokens', () => {
    const accept = 'image/*, .pdf ,application/json';
    expect(matchesAccept(file('a.png', 'image/png'), accept)).toBe(true);
    expect(matchesAccept(file('a.pdf', ''), accept)).toBe(true);
    expect(matchesAccept(file('a.json', 'application/json'), accept)).toBe(true);
    expect(matchesAccept(file('a.zip', 'application/zip'), accept)).toBe(false);
  });
});

describe('formatBytes', () => {
  it('formats with 1024-based units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2 MB');
    expect(formatBytes(5.25 * 1024 * 1024 * 1024)).toBe('5.3 GB');
  });

  it('is empty for invalid sizes and follows the locale', () => {
    expect(formatBytes(-1)).toBe('');
    expect(formatBytes(Number.NaN)).toBe('');
    expect(formatBytes(1536, 'de-DE')).toBe('1,5 KB');
  });
});

describe('getFileKey', () => {
  it('identifies a file by name, size and modification time', () => {
    const a = new File(['abc'], 'a.txt', { lastModified: 1 });
    const same = new File(['abc'], 'a.txt', { lastModified: 1 });
    const other = new File(['abcd'], 'a.txt', { lastModified: 1 });
    expect(getFileKey(a)).toBe(getFileKey(same));
    expect(getFileKey(a)).not.toBe(getFileKey(other));
  });
});
