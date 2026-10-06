import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { Select } from '../Select';
import { TextField } from '../TextField';
import { Popover, type PopoverProps } from './Popover';

const meta = {
  title: 'Overlays/Popover',
  component: Popover,
  parameters: { layout: 'centered' },
  argTypes: {
    placement: {
      control: 'select',
      options: [
        'top',
        'top-start',
        'top-end',
        'bottom',
        'bottom-start',
        'bottom-end',
        'left',
        'right',
      ],
    },
    showArrow: { control: 'boolean' },
    closeOnEscape: { control: 'boolean' },
    closeOnOutsidePress: { control: 'boolean' },
    offset: { control: { type: 'number', min: 0, max: 32 } },
  },
  args: {
    trigger: <Button>Order details</Button>,
    title: 'Order #4821',
    placement: 'bottom',
    showArrow: true,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '8rem 6rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Popover>;

export default meta;
// Props are a union (a popover needs a name), so stories are typed against the props directly.
type Story = StoryObj<PopoverProps>;

export const Playground: Story = {
  render: (args: PopoverProps) => (
    <Popover {...args}>
      <p style={{ margin: 0 }}>Shipped on Monday with tracking number 1Z 999 AA1 01 2345 6784.</p>
    </Popover>
  ),
};

export const Placements: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: '1rem' }}>
      {(['top', 'right', 'bottom', 'left'] as const).map((placement) => (
        <Popover
          key={placement}
          trigger={<Button variant="outline">{placement}</Button>}
          title={`Placed ${placement}`}
          placement={placement}
        >
          The arrow points back at the trigger.
        </Popover>
      ))}
    </div>
  ),
};

export const WithForm: Story = {
  name: 'With a small form',
  render: () => (
    <Popover trigger={<Button>Add note</Button>} title="Add a note" placement="bottom-start">
      {({ close }) => (
        <div style={{ display: 'grid', gap: 'var(--axon-space-3)', minWidth: '16rem' }}>
          <TextField label="Note" />
          <Select
            label="Visible to"
            options={[
              { value: 'me', label: 'Only me' },
              { value: 'team', label: 'My team' },
            ]}
            defaultValue="me"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--axon-space-2)' }}>
            <Button variant="outline" color="neutral" size="sm" onClick={close}>
              Cancel
            </Button>
            <Button size="sm" onClick={close}>
              Save
            </Button>
          </div>
        </div>
      )}
    </Popover>
  ),
};

export const NoArrowNoTitle: Story = {
  name: 'No arrow, named with aria-label',
  render: () => (
    <Popover trigger={<Button variant="ghost">Help</Button>} aria-label="Help" showArrow={false}>
      Press <kbd>?</kbd> anywhere to see the keyboard shortcuts.
    </Popover>
  ),
};

export const Persistent: Story = {
  name: 'Stays open on outside press',
  render: () => (
    <Popover trigger={<Button>Open</Button>} title="Pinned" closeOnOutsidePress={false}>
      {({ close }) => (
        <div style={{ display: 'grid', gap: 'var(--axon-space-2)' }}>
          Only Esc or the button closes this.
          <Button size="sm" onClick={close}>
            Close
          </Button>
        </div>
      )}
    </Popover>
  ),
};
