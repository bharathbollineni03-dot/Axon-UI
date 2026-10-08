import type { Meta, StoryObj } from '@storybook/react';
import { SubmittedValues, useMockSubmit } from '../../stories/mockSubmit';
import {
  PromptTemplateForm,
  type PromptTemplateFormProps,
  type PromptTemplateValues,
} from './PromptTemplateForm';

const meta: Meta<PromptTemplateFormProps> = {
  title: 'Chat/PromptTemplateForm',
  component: PromptTemplateForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    template: { control: 'text' },
    showPreview: { control: 'boolean' },
    disabled: { control: 'boolean' },
    variables: { control: 'object' },
    onSubmit: { control: false },
    onCancel: { control: false },
  },
  args: {
    template:
      'Write a {{tone}} email to {{customer_name}} about {{topic}}. Keep it under {{word_limit}} words.',
    variables: {
      tone: { placeholder: 'friendly, formal, apologetic…' },
      topic: { multiline: true, description: 'What the email is about' },
      word_limit: { defaultValue: '120', label: 'Word limit' },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '32rem' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<PromptTemplateFormProps>;

function Demo(props: PromptTemplateFormProps) {
  const { onSubmit, submitted } = useMockSubmit<PromptTemplateValues>();
  return (
    <>
      <PromptTemplateForm {...props} onSubmit={onSubmit as never} />
      <SubmittedValues values={submitted} />
    </>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const WithoutPreview: Story = {
  args: { showPreview: false },
  render: (args) => <Demo {...args} />,
};

export const OptionalVariable: Story = {
  args: {
    template: 'Summarize the text below for {{audience}}.\n\n{{text}}',
    variables: {
      audience: { required: false, description: 'Leave empty for a general reader' },
      text: { multiline: true },
    },
  },
  render: (args) => <Demo {...args} />,
};

export const NoVariables: Story = {
  args: { template: 'You are a helpful assistant. Answer briefly.', variables: undefined },
  render: (args) => <Demo {...args} />,
};
