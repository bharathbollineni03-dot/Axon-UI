import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { IconButton } from '@axonui/core';
import { MicIcon } from '../../internal/icons';
import type { Attachment } from '../Attachments/files';
import { PromptInput, type PromptInputProps } from './PromptInput';

const meta: Meta<PromptInputProps> = {
  title: 'Chat/PromptInput',
  component: PromptInput,
  parameters: { layout: 'padded' },
  argTypes: {
    submitKey: { control: 'inline-radio', options: ['enter', 'mod-enter'] },
    showCount: { control: 'inline-radio', options: [undefined, 'characters', 'tokens'] },
    streaming: { control: 'boolean' },
    disabled: { control: 'boolean' },
    allowAttachments: { control: 'boolean' },
    minRows: { control: { type: 'number', min: 1, max: 6 } },
    maxRows: { control: { type: 'number', min: 1, max: 12 } },
    onSubmit: { control: false },
    onStop: { control: false },
    slashCommands: { control: false },
    mentions: { control: false },
    voiceInput: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '40rem', paddingTop: '14rem' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<PromptInputProps>;

/** Shows what was submitted, since the composer clears itself. */
function WithLog(props: PromptInputProps) {
  const [sent, setSent] = useState<{ text: string; files: string[] }[]>([]);
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
      <PromptInput
        {...props}
        onSubmit={(text, attachments: Attachment[]) =>
          setSent((current) => [...current, { text, files: attachments.map((a) => a.name) }])
        }
      />
      <ul
        aria-label="Sent messages"
        style={{
          margin: 0,
          color: 'var(--axon-color-text-secondary)',
          fontSize: 'var(--axon-font-size-sm)',
        }}
      >
        {sent.map((item, index) => (
          <li key={index}>
            {item.text || '(no text)'}
            {item.files.length ? ` — files: ${item.files.join(', ')}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const Playground: Story = { render: (args) => <WithLog {...args} /> };

export const CtrlEnterToSend: Story = {
  render: () => (
    <WithLog submitKey="mod-enter" placeholder="Enter makes a new line; Ctrl+Enter sends" />
  ),
};

export const WithCounter: Story = {
  render: () => (
    <WithLog showCount="characters" maxLength={200} placeholder="Up to 200 characters" />
  ),
};

export const WithTokenEstimate: Story = {
  render: () => <WithLog showCount="tokens" />,
};

export const Streaming: Story = {
  render: () => (
    <PromptInput streaming onStop={() => {}} defaultValue="Already typing the next question…" />
  ),
};

export const WithAttachments: Story = {
  render: () => (
    <WithLog
      allowAttachments
      accept="image/*,.pdf,.txt"
      maxFileSize={2 * 1024 * 1024}
      maxFiles={3}
      placeholder="Drop, paste or choose files (images, PDF, text; 3 files, 2 MB each)"
    />
  ),
};

export const SlashCommands: Story = {
  render: () => (
    <WithLog
      placeholder="Type / for commands"
      slashCommands={[
        {
          name: 'summarize',
          description: 'Summarize the conversation',
          insertText: 'Summarize our conversation so far.',
        },
        { name: 'translate', description: 'Translate text into another language' },
        { name: 'explain', description: 'Explain something simply' },
        { name: 'clear', description: 'Clear the box', onSelect: ({ clear }) => clear() },
      ]}
    />
  ),
};

export const Mentions: Story = {
  render: () => (
    <WithLog
      placeholder="Type @ to mention someone"
      mentions={[
        { id: 'ada', label: 'Ada Lovelace', description: 'Mathematician' },
        { id: 'grace', label: 'Grace Hopper', description: 'Computer scientist' },
        { id: 'alan', label: 'Alan Turing', description: 'Logician' },
      ]}
    />
  ),
};

export const AsyncMentions: Story = {
  name: 'Mentions found by a search function',
  render: () => {
    const people = [
      'Ada Lovelace',
      'Grace Hopper',
      'Alan Turing',
      'Katherine Johnson',
      'Margaret Hamilton',
    ];
    return (
      <WithLog
        placeholder="Type @ and a name; results arrive after a short delay"
        mentions={async (query) => {
          await new Promise((resolve) => setTimeout(resolve, 300));
          return people
            .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
            .map((name) => ({ id: name, label: name }));
        }}
      />
    );
  },
};

export const WithVoiceButton: Story = {
  render: () => (
    <WithLog
      voiceInput={
        <IconButton aria-label="Dictate" title="Dictate">
          <MicIcon />
        </IconButton>
      }
    />
  ),
};

export const Disabled: Story = {
  render: () => <PromptInput disabled placeholder="Chat is unavailable" />,
};
