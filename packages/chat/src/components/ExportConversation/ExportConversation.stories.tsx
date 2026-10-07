import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { sampleMessages } from '../../stories/mockBackend';
import type { Message } from '../../types';
import { ExportConversation, type ExportConversationProps } from './ExportConversation';
import type { ExportedFile } from './serializeConversation';

const richMessages: Message[] = [
  ...sampleMessages(),
  {
    id: 'rich',
    role: 'assistant',
    content: '',
    createdAt: Date.now(),
    status: 'done',
    parts: [
      { type: 'reasoning', text: 'The user wants the weather. I should call the weather tool.' },
      { type: 'text', text: "It's **21°C** and partly cloudy in Paris [1]." },
      { type: 'tool-call', id: 'c1', name: 'get_weather', arguments: { city: 'Paris' } },
      { type: 'tool-result', callId: 'c1', result: { temperature: 21 } },
      { type: 'code', code: 'GET /weather?city=Paris', language: 'http', filename: 'request.http' },
      { type: 'source', title: 'Open-Meteo', url: 'https://open-meteo.com' },
    ],
  },
];

const meta: Meta<ExportConversationProps> = {
  title: 'Chat/ExportConversation',
  component: ExportConversation,
  parameters: { layout: 'padded' },
  argTypes: {
    conversation: { control: false },
    onExport: { control: false },
    trigger: { control: false },
    disabled: { control: 'boolean' },
  },
  args: { conversation: { id: 'demo', title: 'Weather in Paris', messages: richMessages } },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '14rem' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<ExportConversationProps>;

/** With no `onExport` the file downloads. */
export const Playground: Story = {};

function Preview(props: ExportConversationProps) {
  const [file, setFile] = useState<ExportedFile | null>(null);
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)', justifyItems: 'start' }}>
      <ExportConversation {...props} onExport={setFile} options={{ includeReasoning: true }} />
      {file ? (
        <>
          <p style={{ margin: 0, color: 'var(--axon-color-text-secondary)' }}>
            {file.filename} ({file.mimeType})
          </p>
          <pre
            style={{
              margin: 0,
              maxWidth: '100%',
              maxHeight: '24rem',
              overflow: 'auto',
              padding: 'var(--axon-space-3)',
              border: '1px solid var(--axon-color-border)',
              borderRadius: 'var(--axon-radius-md)',
              fontSize: 'var(--axon-font-size-xs)',
            }}
          >
            {file.content}
          </pre>
        </>
      ) : null}
    </div>
  );
}

/** `onExport` receives the file instead, so you can preview or upload it. */
export const PreviewTheFile: Story = {
  render: (args) => <Preview {...args} />,
};

export const MarkdownAndJsonOnly: Story = { args: { formats: ['markdown', 'json'] } };

export const NothingToExport: Story = {
  args: { conversation: { title: 'Empty', messages: [] } },
};
