import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '../Avatar';
import { AvatarGroup } from './AvatarGroup';

const people = [
  'Ada Lovelace',
  'Grace Hopper',
  'Alan Turing',
  'Katherine Johnson',
  'Linus Torvalds',
  'Margaret Hamilton',
];

const meta = {
  title: 'Layout/AvatarGroup',
  component: AvatarGroup,
  parameters: { layout: 'padded' },
  argTypes: {
    max: { control: 'number' },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    shape: { control: 'inline-radio', options: ['circle', 'rounded'] },
    color: {
      control: 'select',
      options: [undefined, 'primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
  },
  args: { max: 4, 'aria-label': 'Reviewers' },
  render: (args) => (
    <AvatarGroup {...args}>
      {people.map((name, i) => (
        <Avatar
          key={name}
          name={name}
          color={(['primary', 'secondary', 'success', 'warning', 'danger'] as const)[i % 5]}
        />
      ))}
    </AvatarGroup>
  ),
} satisfies Meta<typeof AvatarGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-4)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <AvatarGroup key={size} {...args} size={size}>
          {people.map((name) => (
            <Avatar key={name} name={name} />
          ))}
        </AvatarGroup>
      ))}
    </div>
  ),
};

export const NoLimit: Story = { args: { max: undefined } };

export const Rounded: Story = { args: { shape: 'rounded', max: 3 } };
