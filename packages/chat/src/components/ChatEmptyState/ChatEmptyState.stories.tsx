import type { Meta, StoryObj } from '@storybook/react';
import { ChatErrorState } from '../ChatErrorState/ChatErrorState';
import { ChatEmptyState } from './ChatEmptyState';

const meta = {
  title: 'Chat/ChatEmptyState',
  component: ChatEmptyState,
  parameters: { layout: 'padded' },
  argTypes: {
    promptLayout: { control: 'inline-radio', options: ['cards', 'chips'] },
    onPromptSelect: { control: false },
    icon: { control: false },
  },
  args: {
    description: 'Ask a question, or start from one of these.',
    onPromptSelect: () => {},
    prompts: [
      { title: 'Show me some code', description: 'A highlighted snippet' },
      { title: 'Compare two libraries', description: 'As a table' },
    ],
  },
} satisfies Meta<typeof ChatEmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Chips: Story = { args: { promptLayout: 'chips', promptsTitle: 'Popular questions' } };

export const TitleOnly: Story = { args: { description: undefined, prompts: undefined } };

export const ErrorState: Story = {
  name: 'ChatErrorState',
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-4)', maxWidth: '40rem' }}>
      <ChatErrorState
        error={new Error('Rate limit reached. Try again in a minute.')}
        onRetry={() => {}}
        onDismiss={() => {}}
      />
      <ChatErrorState onRetry={() => {}} retrying />
      <ChatErrorState
        error="The conversation could not be loaded."
        actions={<a href="#help">Get help</a>}
      />
    </div>
  ),
};
