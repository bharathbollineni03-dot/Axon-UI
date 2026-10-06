import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import {
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  SubMenu,
} from '../Menu';
import { DropdownMenu } from './DropdownMenu';

const Glyph = ({ d }: { d: string }) => (
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
    <path d={d} />
  </svg>
);

const copy = <Glyph d="M9 9h10v10H9zM5 15V5h10" />;
const pencil = <Glyph d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />;
const trash = <Glyph d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />;

const meta = {
  title: 'Navigation/DropdownMenu',
  component: DropdownMenu,
  parameters: { layout: 'padded' },
  argTypes: {
    placement: {
      control: 'select',
      options: ['bottom-start', 'bottom-end', 'top-start', 'top-end', 'right-start', 'left-start'],
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
  },
  args: { placement: 'bottom-start', color: 'primary', trigger: <Button>Actions</Button> },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '22rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <MenuItem icon={copy} shortcut="⌘C">
        Copy
      </MenuItem>
      <MenuItem icon={pencil} shortcut="⌘E">
        Rename
      </MenuItem>
      <MenuItem disabled>Move (unavailable)</MenuItem>
      <MenuSeparator />
      <MenuItem icon={trash} destructive>
        Delete
      </MenuItem>
    </DropdownMenu>
  ),
};

export const GroupsAndLinks: Story = {
  render: () => (
    <DropdownMenu trigger={<Button variant="outline">Account</Button>}>
      <MenuGroup label="Signed in as ada@example.com">
        <MenuItem href="#profile">Profile</MenuItem>
        <MenuItem href="#settings">Settings</MenuItem>
      </MenuGroup>
      <MenuSeparator />
      <MenuItem>Sign out</MenuItem>
    </DropdownMenu>
  ),
};

function CheckableExample() {
  const [grid, setGrid] = useState(true);
  const [rulers, setRulers] = useState(false);
  const [sort, setSort] = useState('name');
  return (
    <div style={{ fontFamily: 'var(--axon-font-sans)' }}>
      <DropdownMenu trigger={<Button variant="outline">View</Button>}>
        <MenuGroup label="Show">
          <MenuCheckboxItem checked={grid} onCheckedChange={setGrid}>
            Grid
          </MenuCheckboxItem>
          <MenuCheckboxItem checked={rulers} onCheckedChange={setRulers}>
            Rulers
          </MenuCheckboxItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuRadioGroup label="Sort by" value={sort} onValueChange={setSort}>
          <MenuRadioItem value="name">Name</MenuRadioItem>
          <MenuRadioItem value="date">Date modified</MenuRadioItem>
          <MenuRadioItem value="size">Size</MenuRadioItem>
        </MenuRadioGroup>
      </DropdownMenu>
      <p>
        Grid {grid ? 'on' : 'off'}, rulers {rulers ? 'on' : 'off'}, sorted by {sort}.
      </p>
    </div>
  );
}

export const CheckableItems: Story = {
  name: 'Checkbox and radio items',
  render: () => <CheckableExample />,
};

export const Submenus: Story = {
  render: () => (
    <DropdownMenu trigger={<Button>File</Button>}>
      <MenuItem shortcut="⌘N">New</MenuItem>
      <SubMenu label="Open recent">
        <MenuItem>report.pdf</MenuItem>
        <MenuItem>notes.md</MenuItem>
        <SubMenu label="Older">
          <MenuItem>2024-plan.xlsx</MenuItem>
          <MenuItem>draft.docx</MenuItem>
        </SubMenu>
      </SubMenu>
      <SubMenu label="Share">
        <MenuItem>Email</MenuItem>
        <MenuItem>Copy link</MenuItem>
      </SubMenu>
      <MenuSeparator />
      <MenuItem>Quit</MenuItem>
    </DropdownMenu>
  ),
};

export const IconTrigger: Story = {
  render: () => (
    <DropdownMenu
      trigger={
        <IconButton aria-label="More actions">
          <Glyph d="M5 12h.01M12 12h.01M19 12h.01" />
        </IconButton>
      }
      placement="bottom-end"
    >
      <MenuItem>Archive</MenuItem>
      <MenuItem>Duplicate</MenuItem>
    </DropdownMenu>
  ),
};
