import { createRef } from 'react';
import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentList } from './AttachmentList';
import {
  formatFileSize,
  isImage,
  matchesAccept,
  toAttachment,
  validateFiles,
  type Attachment,
} from './files';
import { useAttachments } from './useAttachments';

const file = (name: string, size = 10, type = 'text/plain') =>
  new File([new Uint8Array(size)], name, { type });

describe('matchesAccept', () => {
  it('accepts anything without a list', () => {
    expect(matchesAccept(file('a.exe'), undefined)).toBe(true);
    expect(matchesAccept(file('a.exe'), '')).toBe(true);
    expect(matchesAccept(file('a.exe'), ' , ')).toBe(true);
  });

  it.each([
    ['image/*', 'a.png', 'image/png', true],
    ['image/*', 'a.txt', 'text/plain', false],
    ['.pdf', 'Report.PDF', '', true],
    ['.pdf', 'a.txt', '', false],
    ['application/json', 'a.json', 'application/json', true],
    ['application/json', 'a.json', 'text/json', false],
    ['image/png, .pdf', 'a.pdf', 'application/pdf', true],
    ['IMAGE/*', 'a.png', 'Image/PNG', true],
  ])('%s vs %s (%s) is %s', (accept, name, type, expected) => {
    expect(matchesAccept({ name, type }, accept)).toBe(expected);
  });
});

describe('validateFiles', () => {
  it('accepts everything with no rules', () => {
    const files = [file('a'), file('b')];
    expect(validateFiles(files, {})).toEqual({ accepted: files, rejected: [] });
  });

  it('rejects by type, size and count, saying why', () => {
    const a = file('a.png', 10, 'image/png');
    const b = file('b.txt', 10, 'text/plain');
    const c = file('c.png', 5000, 'image/png');
    const d = file('d.png', 10, 'image/png');
    const e = file('e.png', 10, 'image/png');
    const { accepted, rejected } = validateFiles([a, b, c, d, e], {
      accept: 'image/*',
      maxFileSize: 1000,
      maxFiles: 2,
    });
    expect(accepted).toEqual([a, d]);
    expect(rejected).toEqual([
      { file: b, reason: 'type' },
      { file: c, reason: 'size' },
      { file: e, reason: 'count' },
    ]);
  });

  it('counts files that are already attached against maxFiles', () => {
    const { accepted, rejected } = validateFiles([file('a'), file('b')], { maxFiles: 3 }, 2);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  it('allows a file exactly at the size limit', () => {
    expect(validateFiles([file('a', 100)], { maxFileSize: 100 }).accepted).toHaveLength(1);
  });
});

describe('helpers', () => {
  it('formats sizes', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
  });

  it('makes attachments with unique ids, and spots images', () => {
    const a = toAttachment(file('a.png', 1, 'image/png'));
    const b = toAttachment(file('b.png', 1, 'image/png'));
    expect(a.id).not.toBe(b.id);
    expect(a).toMatchObject({ name: 'a.png', size: 1, type: 'image/png' });
    expect(isImage(a)).toBe(true);
    expect(isImage(toAttachment(file('c.txt')))).toBe(false);
  });
});

describe('useAttachments', () => {
  it('adds, removes and clears', () => {
    const { result } = renderHook(() => useAttachments());
    act(() => result.current.add([file('a'), file('b')]));
    expect(result.current.attachments.map((a) => a.name)).toEqual(['a', 'b']);
    act(() => result.current.remove(result.current.attachments[0]!.id));
    expect(result.current.attachments.map((a) => a.name)).toEqual(['b']);
    act(() => result.current.clear());
    expect(result.current.attachments).toEqual([]);
  });

  it('ignores an empty add and an unknown remove', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useAttachments({ onChange }));
    act(() => result.current.add([]));
    expect(onChange).not.toHaveBeenCalled();
    act(() => result.current.remove('nope'));
    expect(result.current.attachments).toEqual([]);
  });

  it('applies the rules, reports rejections and keeps the good files', () => {
    const onReject = vi.fn();
    const { result } = renderHook(() =>
      useAttachments({ accept: 'image/*', maxFileSize: 100, onReject }),
    );
    act(() =>
      result.current.add([
        file('ok.png', 10, 'image/png'),
        file('no.txt', 10),
        file('big.png', 500, 'image/png'),
      ]),
    );
    expect(result.current.attachments.map((a) => a.name)).toEqual(['ok.png']);
    expect(result.current.rejections.map((r) => r.reason)).toEqual(['type', 'size']);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('replaces the rejections with each add, and can clear them', () => {
    const { result } = renderHook(() => useAttachments({ accept: '.png' }));
    act(() => result.current.add([file('a.txt')]));
    expect(result.current.rejections).toHaveLength(1);
    act(() => result.current.add([file('b.png')]));
    expect(result.current.rejections).toHaveLength(0);
    act(() => result.current.add([file('c.txt')]));
    act(() => result.current.clearRejections());
    expect(result.current.rejections).toEqual([]);
  });

  it('lets two quick adds see each other, for the count limit', () => {
    const { result } = renderHook(() => useAttachments({ maxFiles: 2 }));
    act(() => {
      result.current.add([file('a')]);
      result.current.add([file('b'), file('c')]);
    });
    expect(result.current.attachments).toHaveLength(2);
    expect(result.current.rejections.map((r) => r.reason)).toEqual(['count']);
  });

  it('works controlled', () => {
    const onChange = vi.fn();
    const held: Attachment[] = [];
    const { result } = renderHook(() => useAttachments({ value: held, onChange }));
    act(() => result.current.add([file('a')]));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0]).toHaveLength(1);
    expect(result.current.attachments).toBe(held);
  });
});

describe('AttachmentList', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:thumb'),
      revokeObjectURL: vi.fn(),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const attachments = [
    toAttachment(file('photo.png', 2048, 'image/png')),
    toAttachment(file('notes.txt', 12)),
  ];

  it('is a labelled list with a chip for each file', () => {
    render(<AttachmentList attachments={attachments} />);
    const list = screen.getByRole('list', { name: 'Attachments' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('photo.png')).toBeInTheDocument();
    expect(within(list).getByText('2 KB')).toBeInTheDocument();
    expect(within(list).getByText('12 B')).toBeInTheDocument();
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(<AttachmentList attachments={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a thumbnail for an image, and an icon for other files', () => {
    const { container } = render(<AttachmentList attachments={attachments} />);
    const thumbs = container.querySelectorAll('.axon-attachment__thumb');
    expect(thumbs[0]!.querySelector('img')).toHaveAttribute('src', 'blob:thumb');
    expect(thumbs[1]!.querySelector('svg')).toBeInTheDocument();
    expect(thumbs[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('can skip previews', () => {
    const { container } = render(<AttachmentList attachments={attachments} showPreviews={false} />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('releases the thumbnail URL when the file goes away', () => {
    const { rerender } = render(<AttachmentList attachments={attachments} />);
    rerender(<AttachmentList attachments={[attachments[1]!]} />);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:thumb');
  });

  it('has a named remove button for each file when onRemove is given', async () => {
    const onRemove = vi.fn();
    render(<AttachmentList attachments={attachments} onRemove={onRemove} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Remove notes.txt' }));
    expect(onRemove).toHaveBeenCalledWith(attachments[1]!.id);
  });

  it('has no remove buttons without onRemove, and disables them when disabled', () => {
    const { rerender } = render(<AttachmentList attachments={attachments} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<AttachmentList attachments={attachments} onRemove={() => {}} disabled />);
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
  });

  it('translates its labels', () => {
    render(
      <AttachmentList
        attachments={attachments}
        onRemove={() => {}}
        labels={{ attachments: 'Archivos', remove: (name) => `Quitar ${name}` }}
      />,
    );
    expect(screen.getByRole('list', { name: 'Archivos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar photo.png' })).toBeInTheDocument();
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLUListElement>();
    render(<AttachmentList ref={ref} attachments={attachments} className="extra" />);
    expect(ref.current).toHaveClass('axon-attachments', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<AttachmentList attachments={attachments} onRemove={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
