import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { Kbd } from '../Kbd';
import { Tooltip, type TooltipPlacement } from './Tooltip';

const TrashIcon = () => (
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
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

const meta = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  parameters: { layout: 'centered' },
  argTypes: {
    placement: {
      control: 'select',
      options: ['top', 'top-start', 'top-end', 'bottom', 'left', 'right'],
    },
    delay: { control: { type: 'number', min: 0, max: 2000, step: 100 } },
    closeDelay: { control: { type: 'number', min: 0, max: 2000, step: 100 } },
    showArrow: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    content: 'Save your work',
    placement: 'top',
    delay: 300,
    closeDelay: 0,
    showArrow: true,
    children: <Button>Save</Button>,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '6rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Placements: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--axon-space-3)' }}>
      {(['top', 'right', 'bottom', 'left'] as TooltipPlacement[]).map((placement) => (
        <Tooltip key={placement} content={`Tooltip on the ${placement}`} placement={placement}>
          <Button variant="outline">{placement}</Button>
        </Tooltip>
      ))}
    </div>
  ),
};

export const IconOnlyButton: Story = {
  name: 'Icon-only button (name stays on the button)',
  render: () => (
    <Tooltip content="Delete the selected files">
      <IconButton aria-label="Delete">
        <TrashIcon />
      </IconButton>
    </Tooltip>
  ),
};

export const RichContent: Story = {
  render: () => (
    <Tooltip
      content={
        <>
          Save <Kbd>Ctrl</Kbd> <Kbd>S</Kbd>
        </>
      }
    >
      <Button>Save</Button>
    </Tooltip>
  ),
};

export const DisabledControl: Story = {
  name: 'On a disabled control (wrapped so it can be focused)',
  render: () => (
    <Tooltip content="Add a title before you publish">
      <Button disabled>Publish</Button>
    </Tooltip>
  ),
};

export const Instant: Story = {
  name: 'No delay',
  render: () => (
    <Tooltip content="Shows immediately" delay={0}>
      <Button variant="outline">Hover me</Button>
    </Tooltip>
  ),
};

export const OnPlainText: Story = {
  render: () => (
    <Tooltip content="Application programming interface">
      {/* A tooltip on plain text needs a focusable trigger so keyboard users can reach it. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <abbr tabIndex={0} style={{ textDecoration: 'underline dotted', cursor: 'help' }}>
        API
      </abbr>
    </Tooltip>
  ),
};
