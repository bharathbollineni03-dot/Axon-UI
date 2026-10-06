import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { Menu } from './Menu';
import { MenuItem, MenuSeparator, SubMenu } from './MenuItems';

const meta = {
  title: 'Navigation/Menu',
  component: Menu,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The floating panel behind `DropdownMenu`. Use it directly when you open and position ' +
          'the menu yourself: you own `open`, give it an `anchor` element and handle `onClose`, ' +
          'which says why the menu wants to close (`escape`, `tab`, `outside` or `select`).',
      },
    },
  },
  argTypes: {
    placement: {
      control: 'select',
      options: ['bottom-start', 'bottom-end', 'top-start', 'top-end', 'right-start', 'left-start'],
    },
    initialFocus: { control: 'inline-radio', options: ['first', 'last', 'panel', 'none'] },
  },
  args: { open: false, anchor: null, onClose: () => undefined },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '16rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

function StandaloneExample({ placement }: { placement?: 'bottom-start' | 'right-start' }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('Nothing chosen yet.');
  return (
    <div style={{ fontFamily: 'var(--axon-font-sans)' }}>
      <Button
        ref={setAnchor}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Open menu
      </Button>
      <Menu
        open={open}
        anchor={anchor}
        placement={placement}
        aria-label="Standalone"
        onClose={(reason) => {
          setOpen(false);
          // You decide what each reason means; returning focus is the usual choice.
          if (reason !== 'outside') anchor?.focus();
        }}
      >
        <MenuItem onClick={() => setMessage('Chose One')}>One</MenuItem>
        <MenuItem onClick={() => setMessage('Chose Two')}>Two</MenuItem>
        <MenuSeparator />
        <SubMenu label="More">
          <MenuItem onClick={() => setMessage('Chose Three')}>Three</MenuItem>
        </SubMenu>
      </Menu>
      <p>{message}</p>
    </div>
  );
}

export const Standalone: Story = {
  render: () => <StandaloneExample />,
};

export const PlacedToTheSide: Story = {
  name: 'Placed to the side',
  render: () => <StandaloneExample placement="right-start" />,
};
