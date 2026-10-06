import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const;
const variants = ['solid', 'outline', 'ghost', 'link'] as const;

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const ArrowIcon = () => (
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
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const meta = {
  title: 'Core/Button',
  component: Button,
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: 'inline-radio', options: variants },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: colors },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    startIcon: { control: false },
    endIcon: { control: false },
    onClick: { action: 'clicked' },
  },
  args: { children: 'Button' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--axon-space-3)',
  alignItems: 'center',
} as const;
const column = { display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' } as const;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div style={column}>
      {variants.map((variant) => (
        <div key={variant} style={row}>
          {colors.map((color) => (
            <Button key={color} variant={variant} color={color}>
              {color}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={column}>
      {variants.map((variant) => (
        <div key={variant} style={row}>
          <Button variant={variant}>Default</Button>
          <Button variant={variant} disabled>
            Disabled
          </Button>
          <Button variant={variant} loading>
            Loading
          </Button>
        </div>
      ))}
    </div>
  ),
};

export const LoadingKeepsWidth: Story = {
  name: 'Loading keeps its width',
  render: () => (
    <div style={row}>
      <Button>Save changes</Button>
      <Button loading>Save changes</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div style={row}>
      <Button startIcon={<PlusIcon />}>Add item</Button>
      <Button endIcon={<ArrowIcon />} variant="outline">
        Continue
      </Button>
      <Button startIcon={<PlusIcon />} endIcon={<ArrowIcon />} variant="ghost">
        Both
      </Button>
    </div>
  ),
};

export const AsLink: Story = {
  render: () => (
    <div style={row}>
      <Button href="https://example.com" target="_blank" rel="noreferrer">
        Link button
      </Button>
      <Button href="https://example.com" variant="outline">
        Outline link
      </Button>
      <Button href="https://example.com" disabled>
        Disabled link
      </Button>
    </div>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <div style={{ maxWidth: '24rem' }}>
      <Button fullWidth>Full width</Button>
    </div>
  ),
};
