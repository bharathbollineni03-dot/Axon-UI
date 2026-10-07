import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  KnowledgeUploadForm,
  type KnowledgeDocument,
  type KnowledgeUploadFormProps,
} from './KnowledgeUploadForm';

const meta: Meta<KnowledgeUploadFormProps> = {
  title: 'Chat/KnowledgeUploadForm',
  component: KnowledgeUploadForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    disabled: { control: 'boolean' },
    resetOnSuccess: { control: 'boolean' },
    maxFiles: { control: { type: 'number', min: 1, max: 20 } },
    documents: { control: false },
    onSubmit: { control: false },
    onRemoveDocument: { control: false },
    onRetryDocument: { control: false },
    schema: { control: false },
  },
  args: { accept: '.pdf,.txt,.md,.docx', maxFileSize: 5 * 1024 * 1024 },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '36rem' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<KnowledgeUploadFormProps>;

const seed: KnowledgeDocument[] = [
  { id: 's1', name: 'employee-handbook.pdf', size: 482_000, status: 'ready' },
  { id: 's2', name: 'pricing.md', size: 3_400, status: 'ready' },
];

/** Plays the whole life of an upload: progress, processing, then ready (or failed if the name says "fail"). */
function Demo(props: Partial<KnowledgeUploadFormProps>) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(seed);
  const timers = useRef(new Map<string, ReturnType<typeof setInterval>>());
  const patch = (id: string, change: Partial<KnowledgeDocument>) =>
    setDocuments((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item)));

  const start = (id: string, name: string) => {
    let progress = 0;
    const timer = setInterval(() => {
      progress += 20;
      if (progress < 100) return patch(id, { status: 'uploading', progress });
      clearInterval(timer);
      timers.current.delete(id);
      patch(id, { status: 'processing', progress: undefined });
      setTimeout(
        () =>
          patch(
            id,
            name.includes('fail')
              ? { status: 'error', error: 'We could not extract text from this file.' }
              : { status: 'ready' },
          ),
        1500,
      );
    }, 400);
    timers.current.set(id, timer);
  };

  return (
    <KnowledgeUploadForm
      documents={documents}
      onSubmit={({ files }) => {
        const added = files.map((file, index) => ({
          id: `${Date.now()}-${index}`,
          name: file.name,
          size: file.size,
          status: 'uploading' as const,
          progress: 0,
        }));
        setDocuments((list) => [...added, ...list]);
        added.forEach((item) => start(item.id, item.name));
      }}
      onRemoveDocument={(document) => {
        clearInterval(timers.current.get(document.id));
        setDocuments((list) => list.filter((item) => item.id !== document.id));
      }}
      onRetryDocument={(document) => {
        patch(document.id, { status: 'uploading', progress: 0, error: undefined });
        start(document.id, 'retry');
      }}
      {...props}
    />
  );
}

export const Playground: Story = {
  name: 'Playground (a file with "fail" in its name fails)',
  render: (args) => <Demo {...args} />,
};

export const EveryStatus: Story = {
  render: (args) => (
    <KnowledgeUploadForm
      {...args}
      onSubmit={() => {}}
      onRemoveDocument={() => {}}
      onRetryDocument={() => {}}
      documents={[
        { id: '1', name: 'handbook.pdf', size: 482_000, status: 'ready' },
        { id: '2', name: 'faq.md', size: 5_100, status: 'uploading', progress: 45 },
        { id: '3', name: 'contracts.docx', size: 2_400_000, status: 'processing' },
        {
          id: '4',
          name: 'scan-of-a-fax.pdf',
          size: 900_000,
          status: 'error',
          error: 'No text could be found in this file.',
        },
      ]}
    />
  ),
};

export const NoDocumentsYet: Story = {
  render: (args) => <KnowledgeUploadForm {...args} onSubmit={() => {}} documents={[]} />,
};

export const PickerOnly: Story = {
  name: 'Picker only (no list)',
  render: (args) => <KnowledgeUploadForm {...args} onSubmit={() => {}} />,
};

export const FewerFiles: Story = {
  name: 'At most 2 files of 200 KB',
  args: { maxFiles: 2, maxFileSize: 200 * 1024 },
  render: (args) => <Demo {...args} />,
};

export const UploadRefused: Story = {
  render: (args) => (
    <KnowledgeUploadForm
      {...args}
      onSubmit={() => ({
        fieldErrors: { files: 'Your storage is full. Remove a document first.' },
      })}
      documents={seed}
    />
  ),
};
