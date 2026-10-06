import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { Sidebar, SidebarItem, SidebarSection } from '../Sidebar';
import { Drawer, type DrawerPlacement, type DrawerProps } from './Drawer';

const meta = {
  title: 'Overlays/Drawer',
  component: Drawer,
  parameters: { layout: 'padded' },
  argTypes: {
    placement: { control: 'inline-radio', options: ['left', 'right', 'top', 'bottom'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'full', 320, '40vw'] },
    showCloseButton: { control: 'boolean' },
    closeOnEscape: { control: 'boolean' },
    closeOnBackdrop: { control: 'boolean' },
  },
  args: { open: false, title: 'Drawer', placement: 'right', size: 'md', onClose: () => undefined },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

function Trigger({
  label = 'Open drawer',
  children,
}: {
  label?: string;
  children: (api: { open: boolean; close: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{label}</Button>
      {children({ open, close: () => setOpen(false) })}
    </>
  );
}

export const Playground: Story = {
  render: (args) => (
    <Trigger>
      {({ open, close }) => (
        <Drawer
          {...(args as DrawerProps)}
          open={open}
          onClose={close}
          title="Filters"
          description="Narrow down the results."
          footer={
            <>
              <Button variant="outline" color="neutral" onClick={close}>
                Reset
              </Button>
              <Button onClick={close}>Apply</Button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
            <Checkbox label="In stock" defaultChecked />
            <Checkbox label="On sale" />
            <Checkbox label="Free shipping" />
          </div>
        </Drawer>
      )}
    </Trigger>
  ),
};

export const Placements: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--axon-space-2)', flexWrap: 'wrap' }}>
      {(['left', 'right', 'top', 'bottom'] as DrawerPlacement[]).map((placement) => (
        <Trigger key={placement} label={`From ${placement}`}>
          {({ open, close }) => (
            <Drawer
              open={open}
              onClose={close}
              title={`From the ${placement}`}
              placement={placement}
              size={placement === 'top' || placement === 'bottom' ? 'sm' : 'md'}
            >
              Content slides in from the {placement} edge.
            </Drawer>
          )}
        </Trigger>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--axon-space-2)', flexWrap: 'wrap' }}>
      {(['sm', 'md', 'lg', 'full', 360] as const).map((size) => (
        <Trigger key={size} label={`Size ${size}`}>
          {({ open, close }) => (
            <Drawer open={open} onClose={close} title={`Size ${size}`} size={size}>
              A preset or any CSS length.
            </Drawer>
          )}
        </Trigger>
      ))}
    </div>
  ),
};

export const NavigationDrawer: Story = {
  name: 'Navigation drawer (Sidebar inside)',
  render: () => (
    <Trigger label="Open navigation">
      {({ open, close }) => (
        <Drawer open={open} onClose={close} placement="left" size="sm" title="Axon">
          <Sidebar
            aria-label="Main"
            style={{
              width: 'auto',
              border: 0,
              height: 'auto',
              margin: 'calc(var(--axon-space-3) * -1)',
            }}
          >
            <SidebarSection title="Workspace">
              <SidebarItem href="#" label="Home" active onClick={close} />
              <SidebarItem href="#" label="Projects" onClick={close} />
              <SidebarItem href="#" label="Settings" onClick={close} />
            </SidebarSection>
          </Sidebar>
        </Drawer>
      )}
    </Trigger>
  ),
};
