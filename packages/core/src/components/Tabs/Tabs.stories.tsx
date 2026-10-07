import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tab, TabList, TabPanel, Tabs } from './Tabs';

const HomeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </svg>
);

const meta = {
  title: 'Navigation/Tabs',
  component: Tabs,
  parameters: { layout: 'padded' },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    variant: { control: 'inline-radio', options: ['line', 'solid', 'pills'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    activation: { control: 'inline-radio', options: ['automatic', 'manual'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    lazy: { control: 'boolean' },
    unmountOnHide: { control: 'boolean' },
  },
  args: {
    orientation: 'horizontal',
    variant: 'line',
    size: 'md',
    activation: 'automatic',
    color: 'primary',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '36rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const panels = (
  <>
    <TabPanel value="overview">An overview of the project: what it is and who it is for.</TabPanel>
    <TabPanel value="activity">Recent activity across the team.</TabPanel>
    <TabPanel value="settings">Settings for this project.</TabPanel>
  </>
);

export const Playground: Story = {
  render: (args) => (
    <Tabs {...args} defaultValue="overview">
      <TabList aria-label="Project">
        <Tab value="overview">Overview</Tab>
        <Tab value="activity">Activity</Tab>
        <Tab value="settings">Settings</Tab>
      </TabList>
      {panels}
    </Tabs>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-8)' }}>
      {(['line', 'solid', 'pills'] as const).map((variant) => (
        <Tabs key={variant} variant={variant} defaultValue="overview">
          <TabList aria-label={`${variant} tabs`}>
            <Tab value="overview">Overview</Tab>
            <Tab value="activity">Activity</Tab>
            <Tab value="settings">Settings</Tab>
          </TabList>
          {panels}
        </Tabs>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-6)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Tabs key={size} size={size} defaultValue="overview">
          <TabList aria-label={`${size} tabs`}>
            <Tab value="overview">Overview</Tab>
            <Tab value="activity">Activity</Tab>
          </TabList>
          <TabPanel value="overview">Size {size}</TabPanel>
          <TabPanel value="activity">Activity</TabPanel>
        </Tabs>
      ))}
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Tabs orientation="vertical" defaultValue="overview">
      <TabList aria-label="Project">
        <Tab value="overview">Overview</Tab>
        <Tab value="activity">Activity</Tab>
        <Tab value="settings">Settings</Tab>
      </TabList>
      {panels}
    </Tabs>
  ),
};

export const WithIconsAndDisabled: Story = {
  render: () => (
    <Tabs defaultValue="overview" variant="pills">
      <TabList aria-label="Project">
        <Tab value="overview" icon={<HomeIcon />}>
          Overview
        </Tab>
        <Tab value="activity">Activity</Tab>
        <Tab value="settings" disabled>
          Settings
        </Tab>
      </TabList>
      {panels}
    </Tabs>
  ),
};

export const ManualActivation: Story = {
  name: 'Manual activation',
  render: () => (
    <div>
      <p style={{ fontFamily: 'var(--axon-font-sans)', color: 'var(--axon-color-text-secondary)' }}>
        Arrow keys move focus; Enter or Space selects.
      </p>
      <Tabs activation="manual" defaultValue="overview">
        <TabList aria-label="Project">
          <Tab value="overview">Overview</Tab>
          <Tab value="activity">Activity</Tab>
          <Tab value="settings">Settings</Tab>
        </TabList>
        {panels}
      </Tabs>
    </div>
  ),
};

function ControlledExample() {
  const [value, setValue] = useState('activity');
  return (
    <div style={{ fontFamily: 'var(--axon-font-sans)' }}>
      <Tabs value={value} onChange={setValue}>
        <TabList aria-label="Project">
          <Tab value="overview">Overview</Tab>
          <Tab value="activity">Activity</Tab>
          <Tab value="settings">Settings</Tab>
        </TabList>
        {panels}
      </Tabs>
      <p>Selected: {value}</p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledExample />,
};

export const LazyPanels: Story = {
  name: 'Lazy panels',
  render: () => (
    <Tabs lazy defaultValue="overview">
      <TabList aria-label="Project">
        <Tab value="overview">Overview</Tab>
        <Tab value="activity">Activity</Tab>
      </TabList>
      <TabPanel value="overview">Rendered right away.</TabPanel>
      <TabPanel value="activity">Rendered the first time this tab is selected.</TabPanel>
    </Tabs>
  ),
};
