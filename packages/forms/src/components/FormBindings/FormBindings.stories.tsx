import type { Meta, StoryObj } from '@storybook/react';
import { z } from 'zod';
import { SubmittedValues, useMockSubmit } from '../../stories/mock';
import { Form } from '../Form/Form';
import { FormActions } from '../FormActions/FormActions';
import { FormField } from '../FormField/FormField';
import { FormGrid, FormGridItem } from '../FormGrid/FormGrid';
import { FormSection } from '../FormSection/FormSection';
import {
  FormCheckbox,
  FormCheckboxGroup,
  FormDatePicker,
  FormFileUpload,
  FormMultiSelect,
  FormNumberInput,
  FormOTPInput,
  FormRadioGroup,
  FormSelect,
  FormSlider,
  FormSwitch,
  FormTextArea,
  FormTextField,
  FormTimePicker,
} from './FormBindings';

const meta = {
  title: 'Forms/Bindings',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const plans = [
  { value: 'free', label: 'Free', description: 'For trying things out' },
  { value: 'pro', label: 'Pro', description: 'For teams' },
  { value: 'enterprise', label: 'Enterprise', description: 'Custom contracts' },
];

const schema = z.object({
  name: z.string().min(1, 'Enter your name.'),
  bio: z.string().max(80, 'Keep it under 80 characters.'),
  seats: z.number({ error: 'Enter the number of seats.' }).min(1, 'You need at least 1 seat.'),
  plan: z.string({ error: 'Choose a plan.' }).min(1, 'Choose a plan.'),
  billing: z.string({ error: 'Choose how to pay.' }).min(1, 'Choose how to pay.'),
  tags: z.array(z.string()).min(1, 'Pick at least one tag.'),
  features: z.array(z.string()),
  start: z.date({ error: 'Pick a start date.' }),
  time: z.string({ error: 'Pick a time.' }).min(1, 'Pick a time.'),
  code: z.string().length(4, 'Enter all 4 digits.'),
  terms: z.boolean().refine((value) => value, 'Accept the terms to continue.'),
  alerts: z.boolean(),
  volume: z.number().min(10, 'Keep the volume above 10.'),
  files: z.array(z.custom<File>()).min(1, 'Attach at least one file.'),
});
type Values = z.infer<typeof schema>;

function Everything() {
  const { onSubmit, submitted } = useMockSubmit<Values>();
  return (
    <div style={{ maxWidth: '44rem' }}>
      <Form
        schema={schema as never}
        defaultValues={{
          name: '',
          bio: '',
          seats: null,
          plan: null,
          billing: null,
          tags: [],
          features: [],
          start: null,
          time: null,
          code: '',
          terms: false,
          alerts: true,
          volume: 40,
          files: [],
        }}
        onSubmit={onSubmit as never}
      >
        <FormSection title="About you" description="Text, number and long text.">
          <FormGrid columns={2}>
            <FormTextField name="name" label="Name" fullWidth required />
            <FormNumberInput name="seats" label="Seats" min={0} fullWidth />
            <FormSlider name="volume" label="Volume" showValue max={100} step={5} />
            <FormGridItem span="full">
              <FormTextArea name="bio" label="Bio" showCount maxLength={120} fullWidth />
            </FormGridItem>
          </FormGrid>
        </FormSection>

        <FormSection title="Choices" description="Selects, radios and checkboxes.">
          <FormGrid columns={2}>
            <FormSelect
              name="plan"
              label="Plan"
              placeholder="Choose a plan"
              options={plans.map(({ value, label }) => ({ value, label }))}
              fullWidth
            />
            <FormMultiSelect
              name="tags"
              label="Tags"
              placeholder="Pick tags"
              options={[
                { value: 'design', label: 'Design' },
                { value: 'dev', label: 'Development' },
                { value: 'ops', label: 'Operations' },
              ]}
              fullWidth
            />
            <FormRadioGroup name="billing" label="Billing" options={plans} />
            <FormCheckboxGroup
              name="features"
              label="Features"
              options={[
                { value: 'sso', label: 'Single sign-on' },
                { value: 'audit', label: 'Audit log' },
              ]}
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Dates, codes and files">
          <FormGrid columns={2}>
            <FormDatePicker name="start" label="Start date" fullWidth />
            <FormTimePicker name="time" label="Start time" fullWidth />
            <FormOTPInput name="code" label="Security code" length={4} />
            <FormFileUpload name="files" label="Attachments" multiple fullWidth />
          </FormGrid>
        </FormSection>

        <FormSection title="Consent">
          <FormCheckbox
            name="terms"
            label="I accept the terms"
            description="You can read them first."
          />
          <FormSwitch name="alerts" label="Email me about updates" />
        </FormSection>

        <FormActions submitLabel="Submit everything" />
      </Form>
      <SubmittedValues values={submitted} />
    </div>
  );
}

/** Every binding in one form. Submit it empty to see each field's error. */
export const AllBindings: Story = { render: () => <Everything /> };

/** `FormField` wires any input, here a plain `<input type="range">`. */
export const CustomControlWithFormField: Story = {
  render: () => (
    <Form<{ volume: number }> defaultValues={{ volume: 30 }} onSubmit={() => {}}>
      <FormField
        name="volume"
        label="Volume"
        helperText="Drag the slider."
        render={(props) => (
          <label style={{ display: 'grid', gap: 'var(--axon-space-1)', maxWidth: '20rem' }}>
            {props.label}
            <input
              type="range"
              name={props.name}
              ref={props.ref}
              min={0}
              max={100}
              value={Number(props.value ?? 0)}
              onChange={(event) => props.onChange(Number(event.target.value))}
              onBlur={props.onBlur}
              disabled={props.disabled}
            />
            <small>
              {Number(props.value ?? 0)} — {props.helperText}
            </small>
          </label>
        )}
      />
      <FormActions submitLabel="Save" />
    </Form>
  ),
};
