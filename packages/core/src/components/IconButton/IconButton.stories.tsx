import type { Meta, StoryObj } from '@storybook/react';
import { IconButton } from './IconButton';

const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const;
const variants = ['solid', 'outline', 'ghost'] as const;

const HeartIcon = () => (
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
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z" />
  </svg>
);

const meta = {
  title: 'Core/IconButton',
  component: IconButton,
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: 'inline-radio', options: [...variants, 'link'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: colors },
    shape: { control: 'inline-radio', options: ['round', 'square'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    children: { control: false },
    onClick: { action: 'clicked' },
  },
  args: { 'aria-label': 'Like', children: <HeartIcon /> },
} satisfies Meta<typeof IconButton>;

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
            <IconButton
              key={color}
              aria-label={`${variant} ${color}`}
              variant={variant}
              color={color}
            >
              <HeartIcon />
            </IconButton>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const ShapesAndSizes: Story = {
  render: () => (
    <div style={column}>
      {(['round', 'square'] as const).map((shape) => (
        <div key={shape} style={row}>
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <IconButton
              key={size}
              aria-label={`${shape} ${size}`}
              shape={shape}
              size={size}
              variant="outline"
            >
              <HeartIcon />
            </IconButton>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={row}>
      <IconButton aria-label="Default" variant="solid">
        <HeartIcon />
      </IconButton>
      <IconButton aria-label="Disabled" variant="solid" disabled>
        <HeartIcon />
      </IconButton>
      <IconButton aria-label="Loading" variant="solid" loading>
        <HeartIcon />
      </IconButton>
    </div>
  ),
};
