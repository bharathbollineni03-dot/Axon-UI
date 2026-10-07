import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@axon/core';
import { useChat } from '../../hooks/useChat';
import { createMockSender, sampleMessages, type MockOptions } from '../../stories/mockBackend';
import { ChatWindow, type ChatWindowProps } from './ChatWindow';

const meta: Meta<ChatWindowProps> = {
  title: 'Chat/ChatWindow',
  component: ChatWindow as never,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    mode: { control: 'inline-radio', options: ['embedded', 'page', 'floating'] },
    chat: { control: false },
    modelSelector: { control: false },
    emptyState: { control: false },
    footer: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj<ChatWindowProps>;

/** The window on a `useChat` wired to a mock backend that streams a canned reply. */
function Demo({
  backend,
  initial = false,
  height = '40rem',
  ...props
}: Partial<ChatWindowProps> & { backend?: MockOptions; initial?: boolean; height?: string }) {
  const chat = useChat({
    onSend: createMockSender(backend),
    initialMessages: initial ? sampleMessages() : undefined,
  });
  const floating = props.mode === 'floating';
  return (
    <div
      style={{ height: floating ? '30rem' : height, padding: floating ? 0 : 'var(--axon-space-4)' }}
    >
      {floating ? (
        <p style={{ padding: 'var(--axon-space-4)', color: 'var(--axon-color-text-secondary)' }}>
          The page behind the widget. Use the launcher in the corner.
        </p>
      ) : null}
      <ChatWindow
        chat={chat}
        title="Axon assistant"
        subtitle="Mock model · runs in your browser"
        onNewChat={() => chat.reset()}
        footer="This assistant is a demo and answers from canned text."
        {...props}
      />
    </div>
  );
}

const prompts = [
  {
    title: 'Show me some code',
    description: 'A highlighted, copyable snippet',
    prompt: 'Show me a TypeScript function',
  },
  { title: 'Compare libraries', description: 'A table', prompt: 'Make a comparison table' },
  { title: 'Give me ideas', description: 'A list with tasks', prompt: 'Give me a list of ideas' },
  { title: 'Write something long', description: 'See auto-scroll', prompt: 'Write a long story' },
];

export const Playground: Story = {
  render: (args) => <Demo {...args} suggestedPrompts={prompts} />,
};

export const WithHistory: Story = {
  render: () => <Demo initial suggestedPrompts={prompts} />,
};

export const FullPage: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <Demo mode="page" suggestedPrompts={prompts} height="100vh" />,
};

export const FloatingWidget: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <Demo mode="floating" suggestedPrompts={prompts} title="Ask Axon" />,
};

export const SlowStream: Story = {
  render: () => <Demo backend={{ delay: 120, firstTokenDelay: 1500 }} suggestedPrompts={prompts} />,
};

export const Instant: Story = {
  name: 'Reply that arrives all at once',
  render: () => (
    <Demo backend={{ instant: true, firstTokenDelay: 800 }} suggestedPrompts={prompts} />
  ),
};

export const FailsMidStream: Story = {
  render: () => <Demo backend={{ failAfter: 8 }} suggestedPrompts={prompts} />,
};

export const FailsImmediately: Story = {
  render: () => <Demo backend={{ failAfter: 0, instant: true }} suggestedPrompts={prompts} />,
};

export const WithAttachments: Story = {
  render: () => (
    <Demo
      suggestedPrompts={prompts}
      composerProps={{
        allowAttachments: true,
        accept: 'image/*,.pdf,.txt',
        maxFileSize: 5 * 1024 * 1024,
        maxFiles: 4,
      }}
    />
  ),
};

export const WithSlashCommandsAndMentions: Story = {
  render: () => (
    <Demo
      suggestedPrompts={prompts}
      composerProps={{
        slashCommands: [
          {
            name: 'code',
            description: 'Ask for a code example',
            insertText: 'Show me a TypeScript function for ',
          },
          {
            name: 'table',
            description: 'Ask for a comparison table',
            insertText: 'Make a comparison table of ',
          },
          {
            name: 'clear',
            description: 'Start a new conversation',
            onSelect: ({ clear }) => clear(),
          },
        ],
        mentions: [
          { id: 'ada', label: 'Ada Lovelace', description: 'Mathematician' },
          { id: 'grace', label: 'Grace Hopper', description: 'Computer scientist' },
          { id: 'alan', label: 'Alan Turing', description: 'Logician' },
        ],
        showCount: 'tokens',
      }}
    />
  ),
};

export const CustomEmptyState: Story = {
  render: () => (
    <Demo
      emptyStateProps={{
        title: 'Ask the Axon docs',
        description: 'Answers are drawn from the documentation.',
        promptLayout: 'chips',
        promptsTitle: 'Popular questions',
      }}
      suggestedPrompts={prompts.slice(0, 3)}
    />
  ),
};

function ControlledOpen() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button onClick={() => setOpen((value) => !value)}>
        {open ? 'Close the widget' : 'Open the widget'}
      </Button>
      <Demo mode="floating" open={open} onOpenChange={setOpen} suggestedPrompts={prompts} />
    </div>
  );
}

export const FloatingControlled: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <ControlledOpen />,
};
