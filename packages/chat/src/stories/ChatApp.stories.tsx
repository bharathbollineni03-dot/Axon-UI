import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { IconButton } from '@axon/core';
import { ChatWindow } from '../components/ChatWindow/ChatWindow';
import { ConversationSidebar } from '../components/ConversationSidebar/ConversationSidebar';
import type { ConversationSummary } from '../components/ConversationSidebar/groupConversations';
import { ExportConversation } from '../components/ExportConversation/ExportConversation';
import { FeedbackDialog } from '../components/FeedbackDialog/FeedbackDialog';
import { ModelSelector, type ChatModel } from '../components/ModelSelector/ModelSelector';
import { ShareConversationDialog } from '../components/ShareConversationDialog/ShareConversationDialog';
import { useChat } from '../hooks/useChat';
import { DownloadIcon, ShareIcon } from '../internal/icons';
import type { Message } from '../types';
import { createMockSender, sampleConversations, sampleMessages } from './mockBackend';

const meta: Meta = {
  title: 'Chat/Chat app (every piece together)',
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

const models: ChatModel[] = [
  { id: 'axon-fast', name: 'Axon Fast', description: 'Quick answers', badge: 'New' },
  { id: 'axon-smart', name: 'Axon Smart', description: 'Best for hard problems' },
];

interface ConversationViewProps {
  title: string;
  initialMessages: Message[];
  /** Called when a reply has finished, with the whole conversation. */
  onSettled: (messages: Message[]) => void;
  onRateDown: (message: Message) => void;
  onShare: () => void;
  onNewChat: () => void;
  model: string;
  onModelChange: (model: string) => void;
}

/** One conversation. It is remounted (by `key`) when another is chosen, so it owns its own state. */
function ConversationView({
  title,
  initialMessages,
  onSettled,
  onRateDown,
  onShare,
  onNewChat,
  model,
  onModelChange,
}: ConversationViewProps) {
  const chat = useChat({ onSend: createMockSender(), initialMessages });
  const settled = useRef(onSettled);
  settled.current = onSettled;

  useEffect(() => {
    if (!chat.isStreaming) settled.current(chat.messages);
  }, [chat.messages, chat.isStreaming]);

  return (
    <ChatWindow
      chat={chat}
      title={title}
      onNewChat={onNewChat}
      modelSelector={<ModelSelector models={models} value={model} onChange={onModelChange} />}
      headerActions={
        <>
          <ExportConversation
            conversation={{ title, messages: chat.messages }}
            trigger={
              <IconButton aria-label="Export conversation" title="Export conversation">
                <DownloadIcon />
              </IconButton>
            }
          />
          <IconButton aria-label="Share conversation" title="Share conversation" onClick={onShare}>
            <ShareIcon />
          </IconButton>
        </>
      }
      onFeedback={(message, feedback) => {
        if (feedback === 'down') onRateDown(message);
      }}
      footer="This assistant is a demo and answers from canned text."
    />
  );
}

function ChatApp() {
  const [summaries, setSummaries] = useState<ConversationSummary[]>(() => sampleConversations());
  const store = useRef<Record<string, Message[]>>({ 'c-2': sampleMessages() });
  const [activeId, setActiveId] = useState('c-2');
  const [model, setModel] = useState('axon-fast');
  const [sharing, setSharing] = useState(false);
  const [rating, setRating] = useState<Message | null>(null);
  const active = summaries.find((item) => item.id === activeId);

  const startNew = () => {
    const id = `new-${Date.now()}`;
    store.current[id] = [];
    setSummaries((list) => [{ id, title: 'New chat', updatedAt: Date.now() }, ...list]);
    setActiveId(id);
  };

  const settle = (messages: Message[]) => {
    store.current[activeId] = messages;
    const firstQuestion = messages.find((m) => m.role === 'user')?.content;
    setSummaries((list) =>
      list.map((item) =>
        item.id === activeId && messages.length
          ? {
              ...item,
              updatedAt: Date.now(),
              title:
                item.title === 'New chat' && firstQuestion
                  ? firstQuestion.slice(0, 40)
                  : item.title,
            }
          : item,
      ),
    );
  };

  const remove = (id: string) => {
    delete store.current[id];
    const rest = summaries.filter((item) => item.id !== id);
    setSummaries(rest);
    if (id === activeId) setActiveId(rest[0]?.id ?? '');
  };

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'minmax(14rem, 18rem) 1fr', height: '100vh' }}
    >
      <div style={{ borderInlineEnd: '1px solid var(--axon-color-border)', minHeight: 0 }}>
        <ConversationSidebar
          conversations={summaries}
          activeId={activeId}
          onSelect={setActiveId}
          onNewChat={startNew}
          onRename={(id, title) =>
            setSummaries((list) => list.map((item) => (item.id === id ? { ...item, title } : item)))
          }
          onPin={(id, pinned) =>
            setSummaries((list) =>
              list.map((item) => (item.id === id ? { ...item, pinned } : item)),
            )
          }
          onDelete={remove}
        />
      </div>
      <div style={{ minHeight: 0, minWidth: 0 }}>
        {active ? (
          <ConversationView
            key={activeId}
            title={active.title}
            initialMessages={store.current[activeId] ?? []}
            onSettled={settle}
            onRateDown={setRating}
            onShare={() => setSharing(true)}
            onNewChat={startNew}
            model={model}
            onModelChange={setModel}
          />
        ) : (
          <p style={{ padding: 'var(--axon-space-6)', color: 'var(--axon-color-text-secondary)' }}>
            No conversation selected. Start a new chat.
          </p>
        )}
      </div>

      <FeedbackDialog
        open={rating !== null}
        defaultRating="down"
        requireCommentOnDown={false}
        onClose={() => setRating(null)}
        onSubmit={async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          setRating(null);
        }}
      />
      <ShareConversationDialog
        open={sharing}
        onClose={() => setSharing(false)}
        onCreateLink={async () => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          return `https://chat.example.com/s/${activeId}`;
        }}
      />
    </div>
  );
}

export const App: Story = {
  name: 'Sidebar, model, export, share and feedback',
  render: () => <ChatApp />,
};
