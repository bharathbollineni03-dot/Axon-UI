import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@axon/core';
import { longThread, sampleMessages } from '../../stories/mockBackend';
import type { Message } from '../../types';
import { MessageList, type MessageListProps } from './MessageList';

const meta: Meta<MessageListProps> = {
  title: 'Chat/MessageList',
  component: MessageList as never,
  parameters: { layout: 'padded' },
  argTypes: {
    virtualize: { control: 'inline-radio', options: [true, false, 'auto'] },
    showDateSeparators: { control: 'boolean' },
    autoScroll: { control: 'boolean' },
    messages: { control: false },
  },
};
export default meta;
type Story = StoryObj<MessageListProps>;

const frame = (children: React.ReactNode) => (
  <div
    style={{
      height: '28rem',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid var(--axon-color-border)',
      borderRadius: 'var(--axon-radius-lg)',
    }}
  >
    {children}
  </div>
);

export const Playground: Story = {
  render: (args) =>
    frame(<MessageList {...args} messages={sampleMessages()} bubbleProps={{ onCopy: () => {} }} />),
};

export const DateSeparators: Story = {
  render: () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Three weeks ago',
        createdAt: now - 21 * day,
        status: 'done',
      },
      {
        id: '2',
        role: 'assistant',
        content: 'A reply from back then',
        createdAt: now - 21 * day + 60_000,
        status: 'done',
      },
      { id: '3', role: 'user', content: 'Yesterday', createdAt: now - day, status: 'done' },
      { id: '4', role: 'user', content: 'Today', createdAt: now, status: 'done' },
    ];
    return frame(<MessageList messages={messages} />);
  },
};

export const WithEmptyState: Story = {
  render: () =>
    frame(
      <MessageList messages={[]} emptyState={<p style={{ margin: 'auto' }}>No messages yet.</p>} />,
    ),
};

const poem =
  'Streaming text arrives a few words at a time, so the view follows it down until you scroll up to read what came before. ';

function Streaming() {
  const [messages, setMessages] = useState<Message[]>(() => sampleMessages());
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = 'live';
    setMessages((current) => [
      ...current,
      { id, role: 'assistant', content: '', createdAt: Date.now(), status: 'streaming' },
    ]);
    const words = poem.repeat(4).split(' ');
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setMessages((current) =>
        current.map((m) =>
          m.id === id
            ? {
                ...m,
                content: words.slice(0, index).join(' '),
                status: index >= words.length ? 'done' : 'streaming',
              }
            : m,
        ),
      );
      if (index >= words.length) {
        clearInterval(timer);
        setRunning(false);
      }
    }, 60);
    return () => {
      clearInterval(timer);
      setMessages((current) => current.filter((m) => m.id !== id || m.status === 'done'));
    };
  }, [running]);

  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
      <div>
        <Button onClick={() => setRunning(true)} disabled={running}>
          Stream a long reply
        </Button>{' '}
        <Button variant="outline" onClick={() => setMessages(sampleMessages())} disabled={running}>
          Reset
        </Button>
      </div>
      {frame(<MessageList messages={messages} />)}
      <p style={{ margin: 0, color: 'var(--axon-color-text-secondary)' }}>
        Scroll up while it streams: it lets go, and a &quot;Jump to latest&quot; button appears.
      </p>
    </div>
  );
}

export const FollowsStreamingText: Story = {
  render: () => <Streaming />,
};

export const LongThreadVirtualized: Story = {
  name: 'Long thread (2,000 messages, virtualized)',
  render: () => frame(<MessageList messages={longThread(2000)} virtualize />),
};
