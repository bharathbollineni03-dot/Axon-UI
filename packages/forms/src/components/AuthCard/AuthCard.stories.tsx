import type { Meta, StoryObj } from '@storybook/react';
import { Button, TextField } from '@axonui/core';
import { AuthCard } from './AuthCard';

const meta = {
  title: 'Prebuilt forms/AuthCard',
  component: AuthCard,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    headingLevel: { control: 'inline-radio', options: [1, 2, 3, 4] },
    centered: { control: 'boolean' },
    bare: { control: 'boolean' },
    logo: { control: false },
    footer: { control: false },
  },
  args: {
    title: 'Welcome',
    description: 'Put any form or content in the card.',
    size: 'sm',
  },
} satisfies Meta<typeof AuthCard>;
export default meta;
type Story = StoryObj<typeof meta>;

const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" role="img" aria-label="Acme">
    <rect width="40" height="40" rx="10" fill="var(--axon-color-primary-solid)" />
    <path d="M12 28 20 10l8 18h-4l-4-9-4 9z" fill="var(--axon-color-primary-on-solid)" />
  </svg>
);

const body = (
  <>
    <TextField label="Your field" fullWidth />
    <Button fullWidth>Continue</Button>
  </>
);

export const Playground: Story = {
  args: {
    logo: <Logo />,
    footer: (
      <>
        Need help? <a href="#help">Contact support</a>
      </>
    ),
    children: body,
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-6)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <AuthCard key={size} {...args} size={size} title={`Size ${size}`}>
          {body}
        </AuthCard>
      ))}
    </div>
  ),
};

export const Bare: Story = { args: { bare: true, children: body } };

export const Centered: Story = {
  parameters: { layout: 'fullscreen' },
  args: { centered: true, logo: <Logo />, children: body },
};
