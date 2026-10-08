import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Drawer, IconButton } from '@axonui/core';
import {
  ChatSettingsForm,
  ChatWindow,
  ConversationSidebar,
  ModelSelector,
  SystemPromptEditor,
  useChat,
  type ChatModel,
  type ChatSender,
  type ConversationSummary,
  type Message,
} from '@axonui/chat';

const meta: Meta = {
  title: 'Examples/AI chat app',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A chat app assembled from `@axonui/chat`: a conversation sidebar, a chat window with streaming replies, a model picker, and a settings drawer built from the settings forms. The library calls no AI provider: `useChat` takes an `onSend` function, and this one is a stand-in that streams canned text. Swap in a call to your own back end.',
      },
    },
  },
};
export default meta;
type Story = StoryObj;

const models: ChatModel[] = [
  { id: 'axon-fast', name: 'Axon Fast', description: 'Quick answers' },
  { id: 'axon-smart', name: 'Axon Smart', description: 'Better at hard problems', badge: 'New' },
];

/** A stand-in for your back end: streams an answer a few words at a time. */
const sendToMockModel: ChatSender = async function* (history, { signal }) {
  const question = history.at(-1)?.content ?? '';
  const answer = `You asked: **${question.slice(0, 80)}**\n\nThis is a demo assistant, so it only echoes. In a real app \`onSend\` would call your own endpoint and yield the text as it arrives:\n\n\`\`\`ts\nconst sendToServer: ChatSender = async function* (history, { signal }) {\n  const response = await fetch('/api/chat', { method: 'POST', body: JSON.stringify(history), signal });\n  // read the stream and yield each piece of text\n};\n\`\`\``;
  for (const piece of answer.match(/\s*\S+\s*/g) ?? [answer]) {
    if (signal.aborted) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
    yield piece;
  }
};

const GearIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

interface ConversationProps {
  title: string;
  initialMessages: Message[];
  model: string;
  onModelChange: (model: string) => void;
  onSettled: (messages: Message[]) => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
}

/** One conversation. It is remounted (by `key`) when another is chosen, so it owns its own state. */
function Conversation({
  title,
  initialMessages,
  model,
  onModelChange,
  onSettled,
  onOpenSettings,
  onNewChat,
}: ConversationProps) {
  const chat = useChat({
    onSend: sendToMockModel,
    initialMessages,
    onFinish: () => undefined,
  });
  const settled = useRef(onSettled);
  settled.current = onSettled;
  const lastCount = useRef(chat.messages.length);
  if (!chat.isStreaming && chat.messages.length !== lastCount.current) {
    lastCount.current = chat.messages.length;
    queueMicrotask(() => settled.current(chat.messages));
  }

  return (
    <ChatWindow
      chat={chat}
      title={title}
      onNewChat={onNewChat}
      modelSelector={<ModelSelector models={models} value={model} onChange={onModelChange} />}
      headerActions={
        <IconButton aria-label="Chat settings" onClick={onOpenSettings}>
          <GearIcon />
        </IconButton>
      }
      footer="Axon Assistant is a demo and only echoes what you ask."
    />
  );
}

function ChatApp() {
  const [conversations, setConversations] = useState<ConversationSummary[]>(() => [
    { id: 'c-1', title: 'Planning the launch', updatedAt: Date.now() - 1000 * 60 * 60 },
    {
      id: 'c-2',
      title: 'Debugging a hydration error',
      updatedAt: Date.now() - 1000 * 60 * 60 * 26,
    },
    { id: 'c-3', title: 'Naming ideas', updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 9 },
  ]);
  const history = useRef<Record<string, Message[]>>({});
  const [activeId, setActiveId] = useState('c-1');
  const [model, setModel] = useState('axon-fast');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('You are a concise, friendly assistant.');
  const active = conversations.find((item) => item.id === activeId);

  const startNew = () => {
    const id = `new-${Date.now()}`;
    history.current[id] = [];
    setConversations((list) => [{ id, title: 'New chat', updatedAt: Date.now() }, ...list]);
    setActiveId(id);
  };

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'minmax(14rem, 18rem) 1fr', height: '100vh' }}
    >
      <div style={{ borderInlineEnd: '1px solid var(--axon-color-border)', minHeight: 0 }}>
        <ConversationSidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNewChat={startNew}
          onRename={(id, title) =>
            setConversations((list) =>
              list.map((item) => (item.id === id ? { ...item, title } : item)),
            )
          }
          onPin={(id, pinned) =>
            setConversations((list) =>
              list.map((item) => (item.id === id ? { ...item, pinned } : item)),
            )
          }
          onDelete={(id) => {
            delete history.current[id];
            const rest = conversations.filter((item) => item.id !== id);
            setConversations(rest);
            if (id === activeId) setActiveId(rest[0]?.id ?? '');
          }}
        />
      </div>
      <div style={{ minWidth: 0, minHeight: 0 }}>
        {active ? (
          <Conversation
            key={activeId}
            title={active.title}
            initialMessages={history.current[activeId] ?? []}
            model={model}
            onModelChange={setModel}
            onSettled={(messages) => {
              history.current[activeId] = messages;
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            onNewChat={startNew}
          />
        ) : (
          <p style={{ padding: 'var(--axon-space-6)' }}>Start a new chat to begin.</p>
        )}
      </div>

      <Drawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Chat settings"
        placement="right"
      >
        <div style={{ display: 'grid', gap: 'var(--axon-space-6)' }}>
          <ChatSettingsForm
            models={models}
            defaultValues={{ model }}
            onSubmit={async (values) => {
              setModel(values.model);
              setSettingsOpen(false);
            }}
            onCancel={() => setSettingsOpen(false)}
          />
          <SystemPromptEditor
            defaultPrompt={systemPrompt}
            onSubmit={async (values) => {
              setSystemPrompt(values.prompt);
            }}
          />
        </div>
      </Drawer>
    </div>
  );
}

export const App: Story = {
  name: 'Sidebar, chat window and settings',
  render: () => <ChatApp />,
};
