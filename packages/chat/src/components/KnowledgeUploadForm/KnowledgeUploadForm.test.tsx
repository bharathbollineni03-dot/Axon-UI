import { createRef } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import {
  KnowledgeUploadForm,
  createKnowledgeUploadSchema,
  type KnowledgeDocument,
  type KnowledgeUploadFormProps,
} from './KnowledgeUploadForm';

const documents: KnowledgeDocument[] = [
  { id: 'a', name: 'handbook.pdf', size: 2048, status: 'ready' },
  { id: 'b', name: 'faq.md', size: 512, status: 'uploading', progress: 40 },
  { id: 'c', name: 'policy.docx', status: 'processing' },
  { id: 'd', name: 'broken.txt', size: 10, status: 'error', error: 'Could not read this file.' },
];

function renderForm(props: Partial<KnowledgeUploadFormProps> = {}) {
  const onSubmit = vi.fn();
  const user = userEvent.setup({ applyAccept: false });
  const utils = render(<KnowledgeUploadForm onSubmit={onSubmit} {...props} />);
  return { ...utils, user, onSubmit };
}

const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;
const upload = () => screen.getByRole('button', { name: 'Upload' });
const pdf = (name = 'a.pdf', size = 10) =>
  new File([new Uint8Array(size)], name, { type: 'application/pdf' });
const list = () => screen.getByRole('region', { name: 'Documents' });
const item = (name: string) => within(list()).getByText(name).closest('li')!;

describe('KnowledgeUploadForm', () => {
  describe('picking files', () => {
    it('has a labelled picker, a hint and an upload button', () => {
      renderForm();
      expect(screen.getByText('Add documents')).toBeInTheDocument();
      expect(
        screen.getByText('The assistant can use these to answer questions.'),
      ).toBeInTheDocument();
      expect(fileInput()).toHaveAttribute('multiple');
      expect(upload()).toBeInTheDocument();
    });

    it('submits the chosen files', async () => {
      const { user, onSubmit } = renderForm();
      const files = [pdf('a.pdf'), pdf('b.pdf')];
      await user.upload(fileInput(), files);
      await user.click(upload());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0]).toEqual({ files });
    });

    it('needs at least one file', async () => {
      const { user, onSubmit } = renderForm();
      await user.click(upload());
      expect(await screen.findByText('Choose at least one file to upload.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('passes the accepted types on to the picker', () => {
      renderForm({ accept: '.pdf,.txt' });
      expect(fileInput()).toHaveAttribute('accept', '.pdf,.txt');
    });

    it('reports files that are too big, and does not take them', async () => {
      const onReject = vi.fn();
      const { user, onSubmit } = renderForm({ maxFileSize: 100, onReject });
      await user.upload(fileInput(), pdf('big.pdf', 500));
      expect(onReject).toHaveBeenCalledTimes(1);
      expect(onReject.mock.calls[0]![0][0].file.name).toBe('big.pdf');
      await user.click(upload());
      expect(await screen.findByText('Choose at least one file to upload.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('limits how many files can be chosen', async () => {
      const onReject = vi.fn();
      const { user, onSubmit } = renderForm({ maxFiles: 2, onReject });
      await user.upload(fileInput(), [pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')]);
      expect(onReject).toHaveBeenCalled();
      await user.click(upload());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0].files).toHaveLength(2);
    });

    it('empties the picker after a successful upload', async () => {
      const { user, onSubmit } = renderForm();
      await user.upload(fileInput(), pdf('report.pdf'));
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      await user.click(upload());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      await waitFor(() => expect(screen.queryByText('report.pdf')).not.toBeInTheDocument());
    });

    it('can keep the files after uploading', async () => {
      const { user, onSubmit } = renderForm({ resetOnSuccess: false });
      await user.upload(fileInput(), pdf('report.pdf'));
      await user.click(upload());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });

    it('keeps the files, and shows the error, when the upload is refused', async () => {
      const { user } = renderForm({
        onSubmit: () => ({ fieldErrors: { files: 'Your storage is full.' } }),
      });
      await user.upload(fileInput(), pdf('report.pdf'));
      await user.click(upload());
      expect(await screen.findByText('Your storage is full.')).toBeInTheDocument();
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });
  });

  describe('the list of documents', () => {
    it('is left out when there are no documents to show', () => {
      renderForm();
      expect(screen.queryByRole('region', { name: 'Documents' })).not.toBeInTheDocument();
    });

    it('says so when the list is empty', () => {
      renderForm({ documents: [] });
      expect(within(list()).getByText('No documents yet.')).toBeInTheDocument();
      expect(within(list()).queryByRole('status')).not.toBeInTheDocument();
    });

    it('lists each document with its size and status', () => {
      renderForm({ documents });
      expect(within(list()).getAllByRole('listitem')).toHaveLength(4);
      expect(item('handbook.pdf')).toHaveTextContent('2 KB');
      expect(item('handbook.pdf')).toHaveTextContent('Ready');
      expect(item('faq.md')).toHaveTextContent('Uploading');
      expect(item('policy.docx')).toHaveTextContent('Processing');
      expect(item('broken.txt')).toHaveTextContent('Failed');
    });

    it('summarises them in a polite live region', () => {
      renderForm({ documents });
      expect(within(list()).getByRole('status')).toHaveTextContent(
        '1 of 4 documents ready, 1 failed',
      );
    });

    it('says "document" for one', () => {
      renderForm({ documents: [documents[0]!] });
      expect(within(list()).getByRole('status')).toHaveTextContent('1 of 1 document ready');
    });

    it('shows progress while uploading, and a bar with no end while processing', () => {
      renderForm({ documents });
      const uploading = screen.getByRole('progressbar', { name: 'Uploading faq.md' });
      expect(uploading).toHaveAttribute('aria-valuenow', '40');
      const processing = screen.getByRole('progressbar', { name: 'Processing policy.docx' });
      expect(processing).not.toHaveAttribute('aria-valuenow');
      expect(screen.getAllByRole('progressbar')).toHaveLength(2);
    });

    it('shows why a document failed, with a default when there is no reason', () => {
      renderForm({
        documents: [documents[3]!, { id: 'e', name: 'other.txt', status: 'error' }],
      });
      expect(item('broken.txt')).toHaveTextContent('Could not read this file.');
      expect(item('other.txt')).toHaveTextContent('Something went wrong.');
    });

    it('has remove, cancel and retry buttons only when there are handlers', () => {
      renderForm({ documents });
      expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /again$/ })).not.toBeInTheDocument();
    });

    it('removes a document, or cancels an upload that is in progress', async () => {
      const onRemoveDocument = vi.fn();
      const { user } = renderForm({ documents, onRemoveDocument });
      await user.click(screen.getByRole('button', { name: 'Remove handbook.pdf' }));
      expect(onRemoveDocument).toHaveBeenLastCalledWith(documents[0]);
      await user.click(screen.getByRole('button', { name: 'Cancel upload of faq.md' }));
      expect(onRemoveDocument).toHaveBeenLastCalledWith(documents[1]);
      expect(screen.queryByRole('button', { name: 'Remove faq.md' })).not.toBeInTheDocument();
    });

    it('retries only a failed document', async () => {
      const onRetryDocument = vi.fn();
      const { user } = renderForm({ documents, onRetryDocument });
      expect(screen.getAllByRole('button', { name: /again$/ })).toHaveLength(1);
      await user.click(screen.getByRole('button', { name: 'Try broken.txt again' }));
      expect(onRetryDocument).toHaveBeenCalledWith(documents[3]);
    });

    it('follows the documents you give it', () => {
      const { rerender } = renderForm({ documents: [documents[1]!] });
      expect(item('faq.md')).toHaveTextContent('Uploading');
      rerender(
        <KnowledgeUploadForm
          onSubmit={() => {}}
          documents={[{ ...documents[1]!, status: 'ready', progress: undefined }]}
        />,
      );
      expect(item('faq.md')).toHaveTextContent('Ready');
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('is disabled as a whole, and shows an error banner', () => {
    renderForm({ disabled: true, error: 'Uploads are paused.' });
    expect(fileInput()).toBeDisabled();
    expect(upload()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Uploads are paused.');
  });

  it('forwards a ref to the form and takes a class name', () => {
    const ref = createRef<HTMLFormElement>();
    const { container } = renderForm({ ref, className: 'mine' } as never);
    expect(ref.current).toBe(container.querySelector('form'));
    expect(container.firstElementChild).toHaveClass('axon-knowledge', 'mine');
  });

  it('can be translated, including just some of the statuses', () => {
    renderForm({
      documents,
      labels: {
        documents: 'Documentos',
        submit: 'Subir',
        status: { ready: 'Listo' },
        summary: ({ ready, total }) => `${ready} de ${total} listos`,
      },
    });
    expect(screen.getByRole('region', { name: 'Documentos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir' })).toBeInTheDocument();
    expect(screen.getByText('Listo')).toBeInTheDocument();
    expect(screen.getByText('Uploading')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Documentos' })).getByRole('status'),
    ).toHaveTextContent('1 de 4 listos');
  });

  it('has no accessibility violations, with every kind of document and with an error', async () => {
    const { container, user } = renderForm({
      documents,
      onRemoveDocument: () => {},
      onRetryDocument: () => {},
    });
    expect(await axe(container)).toHaveNoViolations();
    await user.click(upload());
    await screen.findByText('Choose at least one file to upload.');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('createKnowledgeUploadSchema', () => {
  const issues = (value: unknown, options = {}) => {
    const result = createKnowledgeUploadSchema(options).safeParse(value);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };
  const files = (count: number) => Array.from({ length: count }, (_, i) => pdf(`f${i}.pdf`));

  it('wants between one file and the limit', () => {
    expect(issues({ files: files(1) })).toEqual([]);
    expect(issues({ files: [] })).toEqual(['Choose at least one file to upload.']);
    expect(issues({ files: files(11) })).toEqual(['Upload at most 10 files at a time.']);
    expect(issues({ files: files(3) }, { maxFiles: 2 })).toEqual([
      'Upload at most 2 files at a time.',
    ]);
  });

  it('takes translated messages', () => {
    expect(issues({ files: [] }, { messages: { filesRequired: 'Elige un archivo.' } })).toEqual([
      'Elige un archivo.',
    ]);
  });
});
