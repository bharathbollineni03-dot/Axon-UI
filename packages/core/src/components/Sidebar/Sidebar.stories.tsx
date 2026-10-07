import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar, SidebarItem, SidebarSection, SidebarToggle } from './Sidebar';

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

const home = <Glyph d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />;
const inbox = (
  <Glyph d="M4 13h4l1 3h6l1-3h4M4 13V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
);
const folder = (
  <Glyph d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
);
const gear = (
  <Glyph d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
);

const meta = {
  title: 'Navigation/Sidebar',
  component: Sidebar,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    collapsed: { control: 'boolean' },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
  },
  args: { 'aria-label': 'Main' },
  decorators: [
    (Story) => (
      <div style={{ height: '28rem', display: 'flex' }}>
        <Story />
        <main
          style={{
            flex: 1,
            padding: 'var(--axon-space-6)',
            fontFamily: 'var(--axon-font-sans)',
            color: 'var(--axon-color-text-primary)',
          }}
        >
          Page content
        </main>
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Sidebar
      {...args}
      header={<strong style={{ fontFamily: 'var(--axon-font-sans)' }}>Axon</strong>}
      footer={<SidebarToggle />}
    >
      <SidebarSection title="Workspace">
        <SidebarItem href="#" icon={home} label="Home" active />
        <SidebarItem href="#" icon={inbox} label="Inbox" badge="3" />
        <SidebarItem href="#" icon={folder} label="Projects" />
      </SidebarSection>
      <SidebarSection title="Account">
        <SidebarItem href="#" icon={gear} label="Settings" />
        <SidebarItem icon={gear} label="Unavailable" disabled />
      </SidebarSection>
    </Sidebar>
  ),
};

export const Collapsed: Story = {
  render: () => (
    <Sidebar aria-label="Main" defaultCollapsed footer={<SidebarToggle />}>
      <SidebarSection title="Workspace">
        <SidebarItem href="#" icon={home} label="Home" active />
        <SidebarItem href="#" icon={inbox} label="Inbox" badge="3" />
        <SidebarItem href="#" icon={folder} label="Projects" />
      </SidebarSection>
    </Sidebar>
  ),
};

function ControlledExample() {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState('home');
  const items = [
    { id: 'home', icon: home, label: 'Home' },
    { id: 'inbox', icon: inbox, label: 'Inbox' },
    { id: 'projects', icon: folder, label: 'Projects' },
  ];
  return (
    <Sidebar
      aria-label="Main"
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      footer={<SidebarToggle />}
    >
      {items.map((item) => (
        <SidebarItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          active={active === item.id}
          onClick={() => setActive(item.id)}
        />
      ))}
    </Sidebar>
  );
}

export const ControlledWithState: Story = {
  name: 'Controlled, items as buttons',
  render: () => <ControlledExample />,
};
