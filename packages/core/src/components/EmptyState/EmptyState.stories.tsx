import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { EmptyState } from './EmptyState';

const InboxIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1Z" />
  </svg>
);

const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const meta = {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    titleAs: { control: 'select', options: ['h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div'] },
    icon: { control: false },
    action: { control: false },
  },
  args: {
    icon: <InboxIcon />,
    title: 'No messages yet',
    description: 'When someone writes to you, their message will show up here.',
    action: <Button>Compose a message</Button>,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-6)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div
          key={size}
          style={{
            border: '1px dashed var(--axon-color-border-strong)',
            borderRadius: 'var(--axon-radius-lg)',
          }}
        >
          <EmptyState {...args} size={size} />
        </div>
      ))}
    </div>
  ),
};

export const NoSearchResults: Story = {
  args: {
    icon: <SearchIcon />,
    title: 'No results for "axon"',
    description: 'Check the spelling or try a broader search.',
    action: (
      <>
        <Button variant="outline">Clear filters</Button>
        <Button>New search</Button>
      </>
    ),
  },
};

export const TitleOnly: Story = {
  args: { icon: undefined, description: undefined, action: undefined, title: 'Nothing to show' },
};

export const WithExtraContent: Story = {
  args: {
    children: <em>Tip: press N to start a new message.</em>,
  },
};

export const InsideACard: Story = {
  render: (args) => (
    <div
      style={{
        maxWidth: '32rem',
        border: '1px solid var(--axon-color-border)',
        borderRadius: 'var(--axon-radius-lg)',
        background: 'var(--axon-color-surface)',
      }}
    >
      <EmptyState {...args} />
    </div>
  ),
};
