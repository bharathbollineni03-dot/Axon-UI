import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Accordion, AccordionItem } from './Accordion';

const meta = {
  title: 'Navigation/Accordion',
  component: Accordion,
  parameters: { layout: 'padded' },
  argTypes: {
    type: { control: 'inline-radio', options: ['single', 'multiple'] },
    collapsible: { control: 'boolean' },
    variant: { control: 'inline-radio', options: ['outlined', 'flush'] },
    headingLevel: { control: 'inline-radio', options: [1, 2, 3, 4, 5, 6] },
  },
  args: { type: 'single', collapsible: true, variant: 'outlined', headingLevel: 3 },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '36rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

const items = (
  <>
    <AccordionItem value="shipping" title="Shipping" subtitle="Rates and delivery times">
      Orders ship within two business days. Delivery takes three to five days depending on where you
      live.
    </AccordionItem>
    <AccordionItem value="returns" title="Returns">
      Return anything within 30 days for a full refund, as long as it is unused.
    </AccordionItem>
    <AccordionItem value="warranty" title="Warranty">
      Every product comes with a two-year warranty against defects.
    </AccordionItem>
  </>
);

export const Playground: Story = {
  render: (args) => <Accordion {...args}>{items}</Accordion>,
};

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" defaultValue={['shipping', 'warranty']}>
      {items}
    </Accordion>
  ),
};

export const AlwaysOneOpen: Story = {
  name: 'Always one open',
  render: () => (
    <Accordion collapsible={false} defaultValue={['shipping']}>
      {items}
    </Accordion>
  ),
};

export const Flush: Story = {
  render: () => <Accordion variant="flush">{items}</Accordion>,
};

export const WithIconsAndDisabled: Story = {
  render: () => (
    <Accordion>
      <AccordionItem
        value="a"
        title="Account"
        icon={
          <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0z" />
          </svg>
        }
      >
        Manage your account details.
      </AccordionItem>
      <AccordionItem value="b" title="Billing (unavailable)" disabled>
        Hidden.
      </AccordionItem>
    </Accordion>
  ),
};

function ControlledExample() {
  const [value, setValue] = useState<string[]>(['returns']);
  return (
    <div style={{ fontFamily: 'var(--axon-font-sans)' }}>
      <Accordion type="multiple" value={value} onChange={setValue}>
        {items}
      </Accordion>
      <p>Open: {value.join(', ') || 'none'}</p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledExample />,
};
