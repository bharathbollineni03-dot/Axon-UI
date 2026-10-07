import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Chip, Tag } from './Chip';

const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const;

const StarIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
    <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9Z" />
  </svg>
);

const meta = {
  title: 'Layout/Chip',
  component: Chip,
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['solid', 'subtle', 'outline'] },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    color: { control: 'select', options: colors },
    disabled: { control: 'boolean' },
    selected: { control: 'boolean' },
    icon: { control: false },
    onClick: { action: 'clicked' },
    onDelete: { action: 'deleted' },
  },
  args: { label: 'TypeScript', color: 'primary' },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--axon-space-2)',
  flexWrap: 'wrap',
} as const;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
      {(['subtle', 'solid', 'outline'] as const).map((variant) => (
        <div key={variant} style={row}>
          {colors.map((color) => (
            <Chip key={color} label={color} variant={variant} color={color} />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <Chip label="Small" size="sm" color="primary" />
      <Chip label="Medium" size="md" color="primary" />
    </div>
  ),
};

export const WithIcon: Story = { args: { icon: <StarIcon />, label: 'Favourite' } };

export const Removable: Story = {
  render: (args) => (
    <div style={row}>
      {['React', 'Vue', 'Svelte'].map((name) => (
        <Chip key={name} {...args} label={name} onDelete={() => {}} />
      ))}
    </div>
  ),
};

function FilterDemo() {
  const options = ['All', 'Open', 'Closed', 'Mine'];
  const [selected, setSelected] = useState('All');
  return (
    <div style={row} role="group" aria-label="Filter issues">
      {options.map((name) => (
        <Chip
          key={name}
          label={name}
          color="primary"
          selected={selected === name}
          onClick={() => setSelected(name)}
        />
      ))}
    </div>
  );
}

export const ClickableFilters: Story = { render: () => <FilterDemo /> };

function DeletableDemo() {
  const [tags, setTags] = useState(['design', 'research', 'urgent']);
  return (
    <div style={row} role="group" aria-label="Tags">
      {tags.map((tag) => (
        <Chip
          key={tag}
          label={tag}
          color="secondary"
          onClick={() => {}}
          onDelete={() => setTags((current) => current.filter((t) => t !== tag))}
        />
      ))}
      {tags.length === 0 ? <em>No tags left. Reload the story.</em> : null}
    </div>
  );
}

export const DeleteWithKeyboard: Story = {
  name: 'Delete with Backspace or the button',
  render: () => <DeletableDemo />,
};

export const Disabled: Story = { args: { disabled: true, onDelete: () => {}, onClick: () => {} } };

export const AsTag: Story = {
  render: () => (
    <div style={row}>
      <Tag label="Beta" color="warning" size="sm" />
      <Tag label="v2.1" color="neutral" variant="outline" size="sm" />
    </div>
  ),
};
