import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { Step, Stepper } from './Stepper';

const meta = {
  title: 'Navigation/Stepper',
  component: Stepper,
  parameters: { layout: 'padded' },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    linear: { control: 'boolean' },
    activeStep: { control: { type: 'number', min: 0, max: 4 } },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
  },
  args: { orientation: 'horizontal', linear: true, activeStep: 1, color: 'primary' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '44rem', fontFamily: 'var(--axon-font-sans)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Stepper {...args}>
      <Step label="Account" description="Your details" />
      <Step label="Plan" optional />
      <Step label="Review" />
    </Stepper>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Stepper orientation="vertical" activeStep={1}>
      <Step label="Account" description="Your details">
        Create your account.
      </Step>
      <Step label="Plan" optional>
        Choose a plan. You can change it later.
      </Step>
      <Step label="Review">Check everything and confirm.</Step>
    </Stepper>
  ),
};

export const WithError: Story = {
  render: () => (
    <Stepper activeStep={2}>
      <Step label="Account" />
      <Step label="Payment" error description="Card declined" />
      <Step label="Review" />
    </Stepper>
  ),
};

function WizardExample({ linear }: { linear: boolean }) {
  const [step, setStep] = useState(0);
  const titles = ['Account', 'Plan', 'Review'];
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-4)' }}>
      <Stepper activeStep={step} onStepChange={setStep} linear={linear}>
        {titles.map((title) => (
          <Step key={title} label={title} />
        ))}
      </Stepper>
      <p>{step < titles.length ? `Step ${step + 1}: ${titles[step]}` : 'All steps complete.'}</p>
      <div style={{ display: 'flex', gap: 'var(--axon-space-2)' }}>
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        <Button disabled={step === titles.length} onClick={() => setStep(step + 1)}>
          {step === titles.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  );
}

export const LinearWizard: Story = {
  name: 'Linear (go back, not ahead)',
  render: () => <WizardExample linear />,
};

export const NonLinear: Story = {
  name: 'Non-linear (jump anywhere)',
  render: () => <WizardExample linear={false} />,
};
