import type { Meta, StoryObj } from '@storybook/react';
import { Heading, Text, Typography } from './Typography';

const colors = [
  'default',
  'muted',
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'neutral',
] as const;

const meta = {
  title: 'Layout/Typography',
  component: Typography,
  parameters: { layout: 'padded' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'bodySm', 'caption', 'overline'],
    },
    color: { control: 'select', options: colors },
    weight: {
      control: 'inline-radio',
      options: [undefined, 'regular', 'medium', 'semibold', 'bold'],
    },
    align: { control: 'inline-radio', options: [undefined, 'start', 'center', 'end', 'justify'] },
    size: {
      control: 'select',
      options: [undefined, 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'],
    },
    truncate: { control: 'boolean' },
    lineClamp: { control: 'number' },
  },
  args: { children: 'The quick brown fox jumps over the lazy dog.' },
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const TypeScale: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
      {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((variant, i) => (
        <Heading key={variant} level={(i + 1) as 1}>
          Heading {i + 1}
        </Heading>
      ))}
      <Typography>Body: the default paragraph style used for most text.</Typography>
      <Typography variant="bodySm">Body small: for dense interfaces.</Typography>
      <Typography variant="caption">Caption: helper and meta text</Typography>
      <Typography variant="overline">Overline label</Typography>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-1)' }}>
      {colors.map((color) => (
        <Text key={color} color={color}>
          {color}
        </Text>
      ))}
    </div>
  ),
};

export const HeadingLevelVersusSize: Story = {
  name: 'Heading level versus size',
  render: () => (
    <div>
      <Heading level={1} size="xl">
        An h1 styled smaller
      </Heading>
      <Heading level={2} size="4xl">
        An h2 styled larger
      </Heading>
    </div>
  ),
};

export const Truncation: Story = {
  render: () => (
    <div style={{ width: '18rem', display: 'grid', gap: 'var(--axon-space-4)' }}>
      <Typography truncate>
        A very long single line that does not fit and ends with an ellipsis.
      </Typography>
      <Typography lineClamp={2}>
        Clamped to two lines. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
        eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
      </Typography>
    </div>
  ),
};
