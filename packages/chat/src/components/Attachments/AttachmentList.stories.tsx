import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AttachmentList } from './AttachmentList';
import { toAttachment, type Attachment } from './files';

const meta = {
  title: 'Chat/AttachmentList',
  component: AttachmentList,
  parameters: { layout: 'padded' },
  args: {
    attachments: [],
  },
} satisfies Meta<typeof AttachmentList>;
export default meta;
type Story = StoryObj<typeof meta>;

const files = () => [
  new File([new Uint8Array(482_000)], 'quarterly-report.pdf', { type: 'application/pdf' }),
  new File([new Uint8Array(1200)], 'notes.txt', { type: 'text/plain' }),
  new File(
    [new Uint8Array(24_000)],
    'a-very-long-file-name-that-needs-to-be-truncated-somewhere.csv',
    { type: 'text/csv' },
  ),
];

function Removable() {
  const [attachments, setAttachments] = useState<Attachment[]>(() => files().map(toAttachment));
  return (
    <AttachmentList
      attachments={attachments}
      onRemove={(id) => setAttachments((current) => current.filter((a) => a.id !== id))}
    />
  );
}

export const Removal: Story = { name: 'With remove buttons', render: () => <Removable /> };

export const ReadOnly: Story = {
  args: { attachments: files().map(toAttachment) },
};
