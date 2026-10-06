import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from './Pagination';

const meta = {
  title: 'Navigation/Pagination',
  component: Pagination,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['outlined', 'text'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    count: { control: { type: 'number', min: 1, max: 100 } },
    siblingCount: { control: { type: 'number', min: 0, max: 3 } },
    boundaryCount: { control: { type: 'number', min: 1, max: 3 } },
    showFirstLast: { control: 'boolean' },
    hidePrevNext: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onChange: { action: 'changed' },
  },
  args: {
    count: 20,
    defaultPage: 8,
    size: 'md',
    variant: 'outlined',
    color: 'primary',
    siblingCount: 1,
    boundaryCount: 1,
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-4)' }}>
      <Pagination count={10} defaultPage={4} aria-label="Outlined" />
      <Pagination count={10} defaultPage={4} variant="text" aria-label="Text" />
      <Pagination count={10} defaultPage={4} color="success" aria-label="Success" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-4)' }}>
      <Pagination count={8} size="sm" aria-label="Small" />
      <Pagination count={8} size="md" aria-label="Medium" />
      <Pagination count={8} size="lg" aria-label="Large" />
    </div>
  ),
};

export const FirstAndLast: Story = {
  render: () => <Pagination count={50} defaultPage={25} showFirstLast />,
};

export const MoreSiblings: Story = {
  render: () => <Pagination count={50} defaultPage={25} siblingCount={2} boundaryCount={2} />,
};

export const Disabled: Story = {
  render: () => <Pagination count={10} defaultPage={3} disabled />,
};

function ControlledExample() {
  const [page, setPage] = useState(3);
  return (
    <div style={{ fontFamily: 'var(--axon-font-sans)' }}>
      <Pagination count={12} page={page} onChange={setPage} />
      <p>Showing page {page} of 12</p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledExample />,
};
