import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@axonui/core';
import { z } from 'zod';
import { Form } from '../Form/Form';
import { FormTextField } from '../FormBindings/FormBindings';
import { FormGrid, FormGridItem } from '../FormGrid/FormGrid';
import { FormSection } from '../FormSection/FormSection';
import { FormActions, type FormActionsProps } from './FormActions';

const meta: Meta<FormActionsProps> = {
  title: 'Forms/Layout',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<FormActionsProps>;

const schema = z.object({ name: z.string().min(2, 'Use at least 2 characters.') });

function Frame({ children }: { children: (slow: () => Promise<void>) => React.ReactNode }) {
  const slow = () => new Promise<void>((resolve) => setTimeout(resolve, 1200));
  return (
    <div style={{ maxWidth: '28rem' }}>
      <Form<{ name: string }> schema={schema as never} defaultValues={{ name: '' }} onSubmit={slow}>
        <FormTextField name="name" label="Name" fullWidth />
        {children(slow)}
      </Form>
    </div>
  );
}

export const ActionsAlignment: Story = {
  name: 'FormActions: alignment',
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-8)' }}>
      {(['end', 'start', 'between', 'stretch'] as const).map((align) => (
        <Frame key={align}>
          {() => <FormActions align={align} onCancel={() => {}} submitLabel={`align="${align}"`} />}
        </Frame>
      ))}
    </div>
  ),
};

export const ActionsDisabledStates: Story = {
  name: 'FormActions: disable until changed or valid',
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-8)' }}>
      <Frame>{() => <FormActions disableWhenPristine submitLabel="Save (type to enable)" />}</Frame>
      <Frame>{() => <FormActions disableWhenInvalid submitLabel="Save (valid enables)" />}</Frame>
    </div>
  ),
};

export const ActionsWithExtraButton: Story = {
  name: 'FormActions: extra button',
  render: () => (
    <Frame>
      {() => (
        <FormActions onCancel={() => {}} submitLabel="Publish">
          <Button type="button" variant="outline">
            Save draft
          </Button>
        </FormActions>
      )}
    </Frame>
  ),
};

export const SectionAndGrid: Story = {
  name: 'FormSection and FormGrid',
  render: () => (
    <div style={{ maxWidth: '44rem' }}>
      <Form defaultValues={{}} onSubmit={() => {}}>
        <FormSection title="Billing address" description="Where we send invoices.">
          <FormGrid columns={{ sm: 2, lg: 3 }}>
            <FormGridItem span="full">
              <FormTextField name="street" label="Street" fullWidth />
            </FormGridItem>
            <FormTextField name="city" label="City" fullWidth />
            <FormTextField name="region" label="Region" fullWidth />
            <FormTextField name="zip" label="Postal code" fullWidth />
          </FormGrid>
        </FormSection>
        <FormSection title="Contact">
          <FormGrid columns={2}>
            <FormTextField name="phone" label="Phone" type="tel" fullWidth />
            <FormTextField name="email" label="Email" type="email" fullWidth />
          </FormGrid>
        </FormSection>
        <FormActions submitLabel="Save" />
      </Form>
    </div>
  ),
};
