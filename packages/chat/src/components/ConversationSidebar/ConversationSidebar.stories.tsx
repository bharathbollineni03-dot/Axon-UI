import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { sampleConversations } from '../../stories/mockBackend';
import { ConversationSidebar, type ConversationSidebarProps } from './ConversationSidebar';
import type { ConversationSummary } from './groupConversations';

const meta: Meta<ConversationSidebarProps> = {
  title: 'Chat/ConversationSidebar',
  component: ConversationSidebar,
  parameters: { layout: 'padded' },
  argTypes: {
    searchable: { control: 'boolean' },
    confirmDelete: { control: 'boolean' },
    loading: { control: 'boolean' },
    conversations: { control: false },
    onSelect: { control: false },
    onNewChat: { control: false },
    onRename: { control: false },
    onPin: { control: false },
    onDelete: { control: false },
  },
};
export default meta;
type Story = StoryObj<ConversationSidebarProps>;

const frame = (children: React.ReactNode, height = '34rem') => (
  <div
    style={{
      width: '18rem',
      height,
      border: '1px solid var(--axon-color-border)',
      borderRadius: 'var(--axon-radius-lg)',
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

/** A sidebar that really renames, pins and deletes, as an app would wire it. */
function Interactive(props: Partial<ConversationSidebarProps>) {
  const [items, setItems] = useState<ConversationSummary[]>(() => sampleConversations());
  const [activeId, setActiveId] = useState<string | null>('c-2');
  return frame(
    <ConversationSidebar
      conversations={items}
      activeId={activeId}
      onSelect={setActiveId}
      onNewChat={() =>
        setItems((list) => [
          { id: `new-${list.length}`, title: 'New chat', updatedAt: Date.now() },
          ...list,
        ])
      }
      onRename={(id, title) =>
        setItems((list) => list.map((item) => (item.id === id ? { ...item, title } : item)))
      }
      onPin={(id, pinned) =>
        setItems((list) => list.map((item) => (item.id === id ? { ...item, pinned } : item)))
      }
      onDelete={(id) => setItems((list) => list.filter((item) => item.id !== id))}
      {...props}
    />,
  );
}

export const Playground: Story = {
  render: (args) => <Interactive {...args} />,
};

export const WithoutSearch: Story = {
  render: () => <Interactive searchable={false} />,
};

export const DeleteWithoutAsking: Story = {
  render: () => <Interactive confirmDelete={false} />,
};

function ChooseOnly() {
  const [activeId, setActiveId] = useState<string | null>('c-1');
  return frame(
    <ConversationSidebar
      conversations={sampleConversations()}
      activeId={activeId}
      onSelect={setActiveId}
    />,
  );
}

export const ReadOnly: Story = {
  name: 'Choose only (no rename, pin or delete)',
  render: () => <ChooseOnly />,
};

export const Loading: Story = {
  render: () => frame(<ConversationSidebar conversations={[]} loading onSelect={() => {}} />),
};

export const Empty: Story = {
  render: () =>
    frame(<ConversationSidebar conversations={[]} onSelect={() => {}} onNewChat={() => {}} />),
};

export const CustomEmptyState: Story = {
  render: () =>
    frame(
      <ConversationSidebar
        conversations={[]}
        onSelect={() => {}}
        emptyState={
          <p
            style={{
              margin: 0,
              padding: 'var(--axon-space-4)',
              color: 'var(--axon-color-text-secondary)',
            }}
          >
            Your chats will appear here. Start one with the button above.
          </p>
        }
      />,
    ),
};

export const Translated: Story = {
  name: 'Translated labels',
  render: () => (
    <Interactive
      labels={{
        title: 'Conversaciones',
        newChat: 'Nueva conversación',
        search: 'Buscar conversaciones',
        searchPlaceholder: 'Buscar',
        groups: {
          pinned: 'Fijadas',
          today: 'Hoy',
          yesterday: 'Ayer',
          week: 'Últimos 7 días',
          month: 'Últimos 30 días',
          older: 'Anteriores',
        },
        rename: 'Renombrar',
        pin: 'Fijar',
        unpin: 'Dejar de fijar',
        delete: 'Eliminar',
        actions: (title) => `Acciones para ${title}`,
        noResults: (query) => `Ninguna conversación coincide con “${query}”.`,
      }}
      onNewChat={() => {}}
    />
  ),
};

export const ManyConversations: Story = {
  name: '500 conversations (scrolls)',
  render: () => {
    const now = Date.now();
    const many = Array.from({ length: 500 }, (_, index) => ({
      id: `many-${index}`,
      title: `Conversation ${index + 1}`,
      updatedAt: now - index * 6 * 60 * 60 * 1000,
    }));
    return frame(<ConversationSidebar conversations={many} onSelect={() => {}} />, '28rem');
  },
};
