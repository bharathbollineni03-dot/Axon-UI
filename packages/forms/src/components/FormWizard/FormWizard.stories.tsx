import type { Meta, StoryObj } from '@storybook/react';
import { z } from 'zod';
import { Alert } from '@axonui/core';
import { SubmittedValues, useMockSubmit } from '../../stories/mock';
import {
  FormCheckbox,
  FormRadioGroup,
  FormSelect,
  FormTextField,
} from '../FormBindings/FormBindings';
import { FormGrid, FormGridItem } from '../FormGrid/FormGrid';
import { FormWizard, type FormWizardProps, type FormWizardStep } from './FormWizard';

const meta: Meta<FormWizardProps> = {
  title: 'Forms/FormWizard',
  component: FormWizard as never,
  parameters: { layout: 'padded' },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    linear: { control: 'boolean' },
    headingLevel: { control: 'inline-radio', options: [2, 3, 4] },
    steps: { control: false },
    schema: { control: false },
    summary: { control: false },
    onSubmit: { control: false },
    renderActions: { control: false },
  },
};
export default meta;
type Story = StoryObj<FormWizardProps>;

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name.'),
  email: z.string().min(1, 'Enter your email.').pipe(z.email('Enter a valid email.')),
  company: z.string(),
  plan: z.string({ error: 'Choose a plan.' }).min(1, 'Choose a plan.'),
  seats: z.string().regex(/^\d+$/, 'Enter a number of seats.'),
  country: z.string({ error: 'Choose a country.' }).min(1, 'Choose a country.'),
  city: z.string().min(1, 'Enter your city.'),
  terms: z.boolean().refine((accepted) => accepted, 'Accept the terms to finish.'),
});
type Values = z.infer<typeof schema>;

const steps: FormWizardStep[] = [
  {
    id: 'you',
    label: 'About you',
    description: 'Who is signing up?',
    fields: ['name', 'email', 'company'],
    content: (
      <FormGrid columns={2}>
        <FormTextField name="name" label="Name" autoComplete="name" fullWidth required />
        <FormTextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          fullWidth
          required
        />
        <FormGridItem span="full">
          <FormTextField
            name="company"
            label="Company (optional)"
            autoComplete="organization"
            fullWidth
          />
        </FormGridItem>
      </FormGrid>
    ),
  },
  {
    id: 'plan',
    label: 'Plan',
    description: 'You can change this later.',
    fields: ['plan', 'seats'],
    content: (
      <>
        <FormRadioGroup
          name="plan"
          label="Plan"
          options={[
            { value: 'free', label: 'Free', description: 'Up to 3 seats' },
            { value: 'team', label: 'Team', description: '$12 per seat per month' },
          ]}
        />
        <FormTextField name="seats" label="Seats" inputMode="numeric" fullWidth />
      </>
    ),
  },
  {
    id: 'address',
    label: 'Address',
    optional: false,
    fields: ['country', 'city'],
    content: (
      <FormGrid columns={2}>
        <FormSelect
          name="country"
          label="Country"
          placeholder="Choose"
          options={[
            { value: 'uk', label: 'United Kingdom' },
            { value: 'us', label: 'United States' },
            { value: 'in', label: 'India' },
          ]}
          fullWidth
        />
        <FormTextField name="city" label="City" fullWidth />
      </FormGrid>
    ),
  },
  {
    id: 'terms',
    label: 'Terms',
    fields: ['terms'],
    content: <FormCheckbox name="terms" label="I accept the terms of service" />,
  },
];

const defaultValues = {
  name: '',
  email: '',
  company: '',
  plan: null,
  seats: '1',
  country: null,
  city: '',
  terms: false,
};

const rows: [string, keyof Values][] = [
  ['Name', 'name'],
  ['Email', 'email'],
  ['Plan', 'plan'],
  ['Seats', 'seats'],
  ['Country', 'country'],
  ['City', 'city'],
];

function Demo(props: Partial<FormWizardProps>) {
  const { onSubmit, submitted } = useMockSubmit<Values>();
  return (
    <div style={{ maxWidth: '44rem' }}>
      <FormWizard
        schema={schema as never}
        defaultValues={defaultValues as never}
        steps={steps}
        {...props}
        onSubmit={onSubmit as unknown as FormWizardProps['onSubmit']}
      />
      <SubmittedValues values={submitted} />
    </div>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const WithReviewStep: Story = {
  name: 'With a review step',
  render: () => (
    <Demo
      summary={(values, goToStep) => (
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'max-content 1fr max-content',
            gap: 'var(--axon-space-2) var(--axon-space-4)',
            margin: 0,
          }}
        >
          {rows.map(([label, key], index) => (
            <div key={key} style={{ display: 'contents' }}>
              <dt style={{ color: 'var(--axon-color-text-secondary)' }}>{label}</dt>
              <dd style={{ margin: 0 }}>
                {String((values as Record<string, unknown>)[key] ?? '—')}
              </dd>
              <button
                type="button"
                onClick={() => goToStep(index < 2 ? 0 : index < 4 ? 1 : 2)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  color: 'var(--axon-color-primary-text)',
                  textDecoration: 'underline',
                }}
              >
                Edit
              </button>
            </div>
          ))}
        </dl>
      )}
    />
  ),
};

export const Vertical: Story = {
  render: () => <Demo orientation="vertical" />,
};

export const FreeNavigation: Story = {
  name: 'Not linear (jump to any step)',
  render: () => <Demo linear={false} />,
};

export const ServerErrorOnSubmit: Story = {
  name: 'Server error on the last step',
  render: () => {
    const Inner = () => {
      const { onSubmit } = useMockSubmit<Values>({ formError: 'That email is already in use.' });
      return (
        <div style={{ maxWidth: '44rem' }}>
          <Alert status="info" style={{ marginBottom: 'var(--axon-space-4)' }}>
            Complete the steps and submit: the server will reject the sign-up.
          </Alert>
          <FormWizard
            schema={schema as never}
            defaultValues={defaultValues as never}
            steps={steps}
            onSubmit={onSubmit as unknown as FormWizardProps['onSubmit']}
          />
        </div>
      );
    };
    return <Inner />;
  },
};

export const Translated: Story = {
  render: () => (
    <Demo
      stepperLabel="Progreso"
      labels={{
        back: 'Atrás',
        next: 'Siguiente',
        submit: 'Enviar',
        stepOf: (step, total) => `Paso ${step} de ${total}: `,
      }}
      stepperLabels={{ completed: 'completado', error: 'con un error', optional: 'Opcional' }}
    />
  ),
};
