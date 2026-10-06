import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { ButtonGroup } from './ButtonGroup';

const meta = {
  title: 'Core/ButtonGroup',
  component: ButtonGroup,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['solid', 'outline', 'ghost', 'link'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    attached: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
  args: { 'aria-label': 'View', variant: 'outline' },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button>Day</Button>
      <Button>Week</Button>
      <Button>Month</Button>
    </ButtonGroup>
  ),
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Solid: Story = { args: { variant: 'solid' } };

export const Vertical: Story = { args: { orientation: 'vertical' } };

export const Detached: Story = { args: { attached: false } };

export const Disabled: Story = { args: { disabled: true } };

export const Sizes: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--axon-space-4)',
        alignItems: 'flex-start',
      }}
    >
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <ButtonGroup key={size} {...args} size={size}>
          <Button>One</Button>
          <Button>Two</Button>
          <Button>Three</Button>
        </ButtonGroup>
      ))}
    </div>
  ),
};
