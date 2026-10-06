import { createRef, useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { FileUpload, getFileKey } from './FileUpload';

const makeFile = (name: string, bytes = 100, type = 'text/plain') =>
  new File([new Uint8Array(bytes)], name, { type, lastModified: 1 });

const input = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement;
const zone = (container: HTMLElement) =>
  container.querySelector('.axon-file-upload__zone') as HTMLElement;
const fileList = () => screen.queryByRole('list', { name: 'Selected files' });
const fileNames = () =>
  fileList()
    ? within(fileList()!)
        .getAllByRole('listitem')
        .map((li) => li.querySelector('.axon-file-upload__file-name')!.textContent)
    : [];
const dropFiles = (target: HTMLElement, files: File[]) =>
  fireEvent.drop(target, { dataTransfer: { files, types: ['Files'] } });

describe('FileUpload', () => {
  it('has a file input named by its label', () => {
    render(<FileUpload label="Attachments" />);
    const el = screen.getByLabelText('Attachments');
    expect(el).toHaveAttribute('type', 'file');
    expect(el).toHaveAttribute('multiple');
  });

  it('falls back to an aria-label without a visible label', () => {
    const { container, rerender } = render(<FileUpload />);
    expect(input(container)).toHaveAccessibleName('Upload files');
    rerender(<FileUpload aria-label="CV" />);
    expect(input(container)).toHaveAccessibleName('CV');
  });

  it('forwards the ref to the input and puts className/style on the wrapper', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <FileUpload ref={ref} label="F" className="extra" style={{ margin: 2 }} />,
    );
    expect(ref.current).toBe(input(container));
    expect(container.firstElementChild).toHaveClass('axon-field', 'axon-file-upload', 'extra');
    expect(container.firstElementChild).toHaveStyle({ margin: '2px' });
  });

  it('passes accept and describes the input with the constraints', () => {
    const { container } = render(
      <FileUpload label="F" accept=".png,.jpg" maxSize={2 * 1024 * 1024} maxFiles={3} />,
    );
    expect(input(container)).toHaveAttribute('accept', '.png,.jpg');
    expect(input(container)).toHaveAccessibleDescription('PNG, JPG · up to 2 MB · max 3 files');
  });

  it('supports a custom hint and single-file mode', () => {
    const { container } = render(<FileUpload label="F" hint="Any file" multiple={false} />);
    expect(input(container)).not.toHaveAttribute('multiple');
    expect(input(container)).toHaveAccessibleDescription('Any file');
  });

  describe('choosing files', () => {
    it('adds files from the input, shows name and size and reports the list', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      const { container } = render(<FileUpload label="F" onChange={onChange} />);
      const a = makeFile('a.txt', 1536);
      const b = makeFile('b.txt', 10);
      await user.upload(input(container), [a, b]);
      expect(fileNames()).toEqual(['a.txt', 'b.txt']);
      expect(screen.getByText('1.5 KB')).toBeInTheDocument();
      expect(onChange).toHaveBeenCalledWith([a, b]);
    });

    it('appends to the list on later selections and ignores duplicates', async () => {
      const user = userEvent.setup();
      const { container } = render(<FileUpload label="F" />);
      await user.upload(input(container), makeFile('a.txt'));
      await user.upload(input(container), [makeFile('a.txt'), makeFile('b.txt')]);
      expect(fileNames()).toEqual(['a.txt', 'b.txt']);
    });

    it('removes a file with its button and lets the same file be chosen again', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      const { container } = render(<FileUpload label="F" onChange={onChange} />);
      await user.upload(input(container), makeFile('a.txt'));
      await user.click(screen.getByRole('button', { name: 'Remove a.txt' }));
      expect(fileList()).not.toBeInTheDocument();
      expect(onChange).toHaveBeenLastCalledWith([]);
      await user.upload(input(container), makeFile('a.txt'));
      expect(fileNames()).toEqual(['a.txt']);
    });

    it('replaces the file in single mode', async () => {
      const user = userEvent.setup();
      const { container } = render(<FileUpload label="F" multiple={false} />);
      await user.upload(input(container), makeFile('a.txt'));
      await user.upload(input(container), makeFile('b.txt'));
      expect(fileNames()).toEqual(['b.txt']);
    });

    it('starts from defaultValue', () => {
      render(<FileUpload label="F" defaultValue={[makeFile('existing.pdf')]} />);
      expect(fileNames()).toEqual(['existing.pdf']);
    });
  });

  describe('validation', () => {
    it('rejects files of the wrong type, reporting and announcing why', async () => {
      const onReject = vi.fn();
      const onChange = vi.fn();
      const user = userEvent.setup({ applyAccept: false });
      const { container } = render(
        <FileUpload label="F" accept="image/*" onReject={onReject} onChange={onChange} />,
      );
      const bad = makeFile('notes.txt', 10, 'text/plain');
      const good = makeFile('pic.png', 10, 'image/png');
      await user.upload(input(container), [bad, good]);
      expect(fileNames()).toEqual(['pic.png']);
      expect(onReject).toHaveBeenCalledWith([{ file: bad, reasons: ['type'] }]);
      expect(screen.getByRole('status')).toHaveTextContent('notes.txt: File type not allowed');
      expect(onChange).toHaveBeenCalledWith([good]);
    });

    it('rejects files over maxSize', async () => {
      const onReject = vi.fn();
      const user = userEvent.setup();
      const { container } = render(<FileUpload label="F" maxSize={1024} onReject={onReject} />);
      await user.upload(input(container), [makeFile('big.bin', 2048), makeFile('small.bin', 100)]);
      expect(fileNames()).toEqual(['small.bin']);
      expect(onReject.mock.calls[0]![0][0].reasons).toEqual(['size']);
      expect(screen.getByRole('status')).toHaveTextContent('big.bin: File is larger than 1 KB');
    });

    it('lists every reason when a file breaks several rules', async () => {
      const user = userEvent.setup({ applyAccept: false });
      const { container } = render(<FileUpload label="F" accept="image/*" maxSize={10} />);
      await user.upload(input(container), makeFile('x.txt', 500));
      expect(screen.getByRole('status')).toHaveTextContent(
        'x.txt: File type not allowed; File is larger than 10 B',
      );
    });

    it('enforces maxFiles, taking files in order and rejecting the extras', async () => {
      const onReject = vi.fn();
      const user = userEvent.setup();
      const { container } = render(<FileUpload label="F" maxFiles={2} onReject={onReject} />);
      await user.upload(input(container), [makeFile('1'), makeFile('2'), makeFile('3')]);
      expect(fileNames()).toEqual(['1', '2']);
      expect(onReject.mock.calls[0]![0][0].reasons).toEqual(['count']);
      expect(screen.getByRole('status')).toHaveTextContent('3: Too many files (maximum 2)');
    });

    it('rejects extra files when single-file mode receives several', async () => {
      const user = userEvent.setup();
      const { container } = render(<FileUpload label="F" multiple={false} />);
      dropFiles(zone(container), [makeFile('a'), makeFile('b')]);
      expect(fileNames()).toEqual(['a']);
      expect(screen.getByRole('status')).toHaveTextContent('b: Too many files');
      await user.upload(input(container), makeFile('c'));
      expect(fileNames()).toEqual(['c']);
    });

    it('clears the messages when a file is removed or new files arrive', async () => {
      const user = userEvent.setup();
      const { container } = render(<FileUpload label="F" maxSize={10} />);
      await user.upload(input(container), [makeFile('big', 100), makeFile('ok', 5)]);
      expect(screen.getByRole('status')).toHaveTextContent('big');
      await user.upload(input(container), makeFile('fine', 5));
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('supports custom messages', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <FileUpload
          label="F"
          maxSize={10}
          getRejectionMessage={(r, limits) => `${r.file.name} > ${limits.maxSize}`}
        />,
      );
      await user.upload(input(container), makeFile('big', 100));
      expect(screen.getByRole('status')).toHaveTextContent('big > 10');
    });
  });

  describe('drag and drop', () => {
    it('adds dropped files and shows a dragging state while hovering', () => {
      const onChange = vi.fn();
      const { container } = render(<FileUpload label="F" onChange={onChange} />);
      const target = zone(container);
      fireEvent.dragEnter(target, { dataTransfer: { types: ['Files'] } });
      expect(target).toHaveClass('axon-file-upload__zone--dragging');
      fireEvent.dragLeave(target);
      expect(target).not.toHaveClass('axon-file-upload__zone--dragging');
      fireEvent.dragEnter(target);
      const file = makeFile('dropped.txt');
      dropFiles(target, [file]);
      expect(target).not.toHaveClass('axon-file-upload__zone--dragging');
      expect(fileNames()).toEqual(['dropped.txt']);
      expect(onChange).toHaveBeenCalledWith([file]);
    });

    it('validates dropped files like chosen ones', () => {
      const onReject = vi.fn();
      const { container } = render(<FileUpload label="F" accept=".pdf" onReject={onReject} />);
      dropFiles(zone(container), [makeFile('a.txt')]);
      expect(fileList()).not.toBeInTheDocument();
      expect(onReject).toHaveBeenCalled();
    });

    it('stays inert while dragging over nested elements and prevents the browser default on drop', () => {
      const { container } = render(<FileUpload label="F" />);
      const target = zone(container);
      fireEvent.dragEnter(target);
      fireEvent.dragEnter(target);
      fireEvent.dragLeave(target);
      expect(target).toHaveClass('axon-file-upload__zone--dragging');
      fireEvent.dragLeave(target);
      expect(target).not.toHaveClass('axon-file-upload__zone--dragging');
      const notPrevented = fireEvent.drop(target, { dataTransfer: { files: [] } });
      expect(notPrevented).toBe(false); // preventDefault was called
    });

    it('ignores drops when disabled', () => {
      const { container } = render(<FileUpload label="F" disabled />);
      dropFiles(zone(container), [makeFile('a.txt')]);
      expect(fileList()).not.toBeInTheDocument();
    });
  });

  describe('upload state', () => {
    const file = makeFile('report.pdf', 2048);

    it('shows a progress bar while uploading', () => {
      render(
        <FileUpload
          label="F"
          defaultValue={[file]}
          uploads={{ [getFileKey(file)]: { status: 'uploading', progress: 42.4 } }}
        />,
      );
      const bar = screen.getByRole('progressbar', { name: 'Uploading report.pdf' });
      expect(bar).toHaveAttribute('aria-valuenow', '42');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
      expect(bar.firstElementChild).toHaveStyle({ width: '42.4%' });
    });

    it('marks finished and failed uploads', () => {
      const other = makeFile('broken.pdf', 10);
      render(
        <FileUpload
          label="F"
          defaultValue={[file, other]}
          uploads={{
            [getFileKey(file)]: { status: 'done' },
            [getFileKey(other)]: { status: 'error', error: 'Network error' },
          }}
        />,
      );
      expect(screen.getByText('2 KB · Uploaded')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Network error').closest('li')).toHaveClass(
        'axon-file-upload__item--error',
      );
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('controlled', () => {
    it('follows the value prop and reports requested changes', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      const kept = makeFile('kept.txt');
      const { container } = render(<FileUpload label="F" value={[kept]} onChange={onChange} />);
      const added = makeFile('new.txt');
      await user.upload(input(container), added);
      expect(onChange).toHaveBeenCalledWith([kept, added]);
      expect(fileNames()).toEqual(['kept.txt']);
    });

    it('works with parent state', async () => {
      function Parent() {
        const [files, setFiles] = useState<File[]>([]);
        return (
          <>
            <FileUpload label="F" value={files} onChange={setFiles} />
            <button onClick={() => setFiles([makeFile('reset.txt')])}>reset</button>
          </>
        );
      }
      const user = userEvent.setup();
      const { container } = render(<Parent />);
      await user.upload(input(container), makeFile('a.txt'));
      expect(fileNames()).toEqual(['a.txt']);
      await user.click(screen.getByRole('button', { name: 'reset' }));
      expect(fileNames()).toEqual(['reset.txt']);
    });
  });

  it('supports a custom remove label', () => {
    render(
      <FileUpload
        label="F"
        defaultValue={[makeFile('a.txt')]}
        removeLabel={(f) => `Quitar ${f.name}`}
      />,
    );
    expect(screen.getByRole('button', { name: 'Quitar a.txt' })).toBeInTheDocument();
  });

  it('describes the field with helper or error text and marks required/invalid', () => {
    const { container, rerender } = render(<FileUpload label="F" helperText="PDF only" required />);
    expect(input(container)).toHaveAccessibleDescription('PDF only');
    expect(input(container)).toBeRequired();
    rerender(<FileUpload label="F" helperText="x" error errorMessage="Attach a file" required />);
    expect(input(container)).toHaveAccessibleDescription('Attach a file');
    expect(input(container)).toHaveAttribute('aria-invalid', 'true');
    expect(zone(container)).toHaveClass('axon-file-upload__zone--error');
  });

  it('is no longer required once a file is chosen', async () => {
    const { container } = render(<FileUpload label="F" required />);
    expect(input(container)).toBeRequired();
    await userEvent.setup().upload(input(container), makeFile('a.txt'));
    expect(input(container)).not.toBeRequired();
  });

  it('is inert when disabled', () => {
    const { container } = render(
      <FileUpload label="F" disabled defaultValue={[makeFile('a.txt')]} />,
    );
    expect(input(container)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove a.txt' })).toBeDisabled();
    expect(zone(container)).toHaveClass('axon-file-upload__zone--disabled');
  });

  it('has no accessibility violations', async () => {
    const file = makeFile('report.pdf', 2048);
    const { container } = render(
      <div>
        <FileUpload
          label="Attachments"
          accept=".pdf"
          maxSize={1024 * 1024}
          helperText="PDF files"
        />
        <FileUpload
          label="With files"
          defaultValue={[file]}
          uploads={{ [getFileKey(file)]: { status: 'uploading', progress: 30 } }}
        />
        <FileUpload label="Error" error errorMessage="Required" required />
        <FileUpload label="Disabled" disabled />
        <FileUpload aria-label="Unlabelled" />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
