import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';

const items: BreadcrumbItem[] = [
  { label: 'Home', href: '#' },
  { label: 'Library', href: '#' },
  { label: 'Data', href: '#' },
  { label: 'Reports', href: '#' },
  { label: 'Q3 summary' },
];

const meta = {
  title: 'Navigation/Breadcrumbs',
  component: Breadcrumbs,
  parameters: { layout: 'padded' },
  argTypes: { maxItems: { control: { type: 'number', min: 2, max: 6 } } },
  args: { items },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Collapsed: Story = {
  args: { maxItems: 3 },
};

export const CustomSeparator: Story = {
  args: { separator: '/' },
};

export const Short: Story = {
  args: {
    items: [{ label: 'Home', href: '#' }, { label: 'Settings' }],
  },
};
