import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '@axonui/core';
import { SparklesIcon } from '../../internal/icons';
import { ChatHeader } from './ChatHeader';

const meta = {
  title: 'Chat/ChatHeader',
  component: ChatHeader,
  parameters: { layout: 'padded' },
  argTypes: {
    headingLevel: { control: 'inline-radio', options: [1, 2, 3, 4] },
    onNewChat: { control: false },
    onSettings: { control: false },
    onClose: { control: false },
    modelSelector: { control: false },
    avatar: { control: false },
  },
  args: { title: 'Axon assistant', subtitle: 'Online' },
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: '40rem',
          border: '1px solid var(--axon-color-border)',
          borderRadius: 'var(--axon-radius-lg)',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChatHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithAllButtons: Story = {
  args: { onNewChat: () => {}, onSettings: () => {}, onClose: () => {} },
};

export const WithAvatarAndModel: Story = {
  args: {
    avatar: <Avatar size="sm" color="primary" fallback={<SparklesIcon />} name="Axon" />,
    modelSelector: (
      <select aria-label="Model" defaultValue="fast">
        <option value="fast">Fast</option>
        <option value="smart">Smart</option>
      </select>
    ),
    onNewChat: () => {},
  },
};

export const TitleOnly: Story = { args: { subtitle: undefined } };
