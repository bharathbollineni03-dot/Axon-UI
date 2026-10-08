import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { replies } from '../../stories/mockBackend';
import type { Message, MessagePart } from '../../types';
import { MessageBubble, type MessageBubbleProps, type MessageFeedback } from './MessageBubble';

const meta = {
  title: 'Chat/MessageBubble',
  component: MessageBubble,
  parameters: { layout: 'padded' },
  argTypes: {
    timestamp: { control: 'inline-radio', options: ['hover', 'always', 'never'] },
    showAvatar: { control: 'boolean' },
    message: { control: 'object' },
    onEdit: { control: false },
    onRegenerate: { control: false },
    onFeedback: { control: false },
    onDelete: { control: false },
    onRetry: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '48rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MessageBubble>;
export default meta;
type Story = StoryObj<typeof meta>;

const base = { createdAt: Date.now() - 5 * 60_000, status: 'done' } as const;
const assistant = (content: string, extra: Partial<Message> = {}): Message => ({
  id: 'a',
  role: 'assistant',
  content,
  ...base,
  ...extra,
});
const user = (content: string, extra: Partial<Message> = {}): Message => ({
  id: 'u',
  role: 'user',
  content,
  ...base,
  ...extra,
});

export const Assistant: Story = {
  args: {
    message: assistant('Sure! Here is **a short answer** with `inline code`.'),
    timestamp: 'always',
  },
};

export const User: Story = {
  args: { message: user('What is the difference between `let` and `const`?'), timestamp: 'always' },
};

export const WithMarkdownAndCode: Story = {
  args: { message: assistant(replies.code) },
};

export const WithTable: Story = {
  args: { message: assistant(replies.table) },
};

export const Pending: Story = {
  args: { message: assistant('', { status: 'pending' }) },
};

export const Streaming: Story = {
  args: {
    message: assistant('Streaming text arrives a few words at a time, and a cursor blinks at its', {
      status: 'streaming',
    }),
  },
};

export const Failed: Story = {
  args: {
    message: assistant('The reply stopped part of the way through', { status: 'error' }),
    onRetry: () => {},
  },
};

export const System: Story = {
  args: { message: { id: 's', role: 'system', content: 'Conversation started', ...base } },
};

const richParts: MessagePart[] = [
  {
    type: 'reasoning',
    text: 'The user wants the weather. I should call the weather tool for Paris first.',
    duration: 4,
  },
  { type: 'text', text: 'Let me check the weather in Paris.' },
  {
    type: 'tool-call',
    id: 'c1',
    name: 'get_weather',
    arguments: { city: 'Paris', units: 'metric' },
  },
  { type: 'tool-result', callId: 'c1', result: { temperature: 21, condition: 'Partly cloudy' } },
  { type: 'text', text: "It's **21°C** and partly cloudy in Paris right now [1]." },
  { type: 'code', code: 'GET /weather?city=Paris', language: 'http', filename: 'request.http' },
  {
    type: 'source',
    title: 'Météo-France',
    url: 'https://meteofrance.com',
    snippet: 'Current conditions in Paris.',
  },
  { type: 'source', title: 'Open-Meteo', url: 'https://open-meteo.com' },
];

export const RichParts: Story = {
  name: 'Reasoning, tool call, code and sources',
  args: { message: assistant('', { parts: richParts }) },
};

export const WithAttachments: Story = {
  args: {
    message: user('Can you summarize these?', {
      parts: [
        { type: 'text', text: 'Can you summarize these?' },
        {
          type: 'file',
          name: 'quarterly-report.pdf',
          size: 482_000,
          url: 'https://example.com/report.pdf',
        },
        { type: 'file', name: 'notes.txt', size: 1200 },
      ],
    }),
  },
};

function Interactive() {
  const [feedback, setFeedback] = useState<MessageFeedback | null>(null);
  const [text, setText] = useState('Edit me with the pencil, then press Ctrl+Enter to save.');
  const [log, setLog] = useState('Try the toolbar: arrow keys move between buttons.');
  const props: MessageBubbleProps = {
    message: user(text),
    onEdit: (_m, content) => {
      setText(content);
      setLog(`Saved: "${content}"`);
    },
    onCopy: () => setLog('Copied'),
    onDelete: () => setLog('Delete pressed'),
  };
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-6)' }}>
      <p aria-live="polite" style={{ margin: 0, color: 'var(--axon-color-text-secondary)' }}>
        {log}
      </p>
      <MessageBubble {...props} />
      <MessageBubble
        message={assistant('Rate this answer with the thumbs, or regenerate it.')}
        feedback={feedback}
        onFeedback={(_m, value) => {
          setFeedback(value);
          setLog(`Feedback: ${value ?? 'none'}`);
        }}
        onRegenerate={() => setLog('Regenerate pressed')}
        onCopy={() => setLog('Copied')}
        onDelete={() => setLog('Delete pressed')}
      />
    </div>
  );
}

export const Actions: Story = {
  name: 'Actions: copy, edit, regenerate, rate, delete',
  args: { message: assistant('x') },
  render: () => <Interactive />,
};
