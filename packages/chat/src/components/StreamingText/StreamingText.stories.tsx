import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@axonui/core';
import { replies } from '../../stories/mockBackend';
import { StreamingText } from './StreamingText';
import { ThinkingIndicator } from './ThinkingIndicator';
import { TypingIndicator } from './TypingIndicator';

const meta = {
  title: 'Chat/StreamingText',
  component: StreamingText,
  parameters: { layout: 'padded' },
  argTypes: { streaming: { control: 'boolean' }, text: { control: 'text' } },
  args: { text: 'Text with a blinking cursor after it', streaming: true },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '40rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StreamingText>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Finished: Story = { args: { streaming: false } };

function Live() {
  const [text, setText] = useState('');
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const tokens = replies.code.match(/\s*\S+\s*/g) ?? [];
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setText(tokens.slice(0, index).join(''));
      if (index >= tokens.length) {
        clearInterval(timer);
        setRunning(false);
      }
    }, 40);
    return () => clearInterval(timer);
  }, [running]);
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
      <Button onClick={() => setRunning(true)} disabled={running}>
        {text ? 'Stream again' : 'Start streaming'}
      </Button>
      <StreamingText text={text} streaming={running} />
    </div>
  );
}

export const Streaming: Story = { render: () => <Live /> };

export const Typing: Story = {
  name: 'TypingIndicator',
  render: () => <TypingIndicator />,
};

export const Thinking: Story = {
  name: 'ThinkingIndicator',
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-4)', maxWidth: '36rem' }}>
      <ThinkingIndicator thinking />
      <ThinkingIndicator thinking>The user asked about X. First consider Y…</ThinkingIndicator>
      <ThinkingIndicator duration={8}>
        The user asked about X. I considered Y and Z, and decided Y fits best because it is simpler.
      </ThinkingIndicator>
      <ThinkingIndicator defaultOpen duration={1}>
        Shown open from the start.
      </ThinkingIndicator>
    </div>
  ),
};
