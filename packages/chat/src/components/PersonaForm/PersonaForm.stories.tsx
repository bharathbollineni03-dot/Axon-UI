import type { Meta, StoryObj } from '@storybook/react';
import { SubmittedValues, useMockSubmit } from '../../stories/mockSubmit';
import { PersonaForm, type PersonaFormProps, type PersonaValues } from './PersonaForm';

/** A picture drawn inline, so the story needs no network. */
const sampleAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#4361ee"/><circle cx="40" cy="32" r="14" fill="#fff"/><path d="M12 80c3-18 15-26 28-26s25 8 28 26z" fill="#fff"/></svg>',
)}`;

const meta: Meta<PersonaFormProps> = {
  title: 'Chat/PersonaForm',
  component: PersonaForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    disabled: { control: 'boolean' },
    maxStarterPrompts: { control: { type: 'number', min: 1, max: 12 } },
    maxInstructions: { control: { type: 'number', min: 50, max: 10000 } },
    onSubmit: { control: false },
    onCancel: { control: false },
    onRemoveAvatar: { control: false },
    schema: { control: false },
    tones: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '34rem' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<PersonaFormProps>;

function Demo(props: Partial<PersonaFormProps>) {
  const { onSubmit, submitted } = useMockSubmit<PersonaValues>();
  return (
    <>
      <PersonaForm onSubmit={onSubmit as never} {...props} />
      <SubmittedValues values={submitted} />
    </>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const EditingAnAssistant: Story = {
  render: () => (
    <Demo
      onCancel={() => {}}
      avatarUrl={sampleAvatar}
      onRemoveAvatar={() => {}}
      defaultValues={{
        name: 'Ada',
        description: 'A patient maths tutor for secondary school.',
        tone: 'friendly',
        greeting: 'Hi! Which topic shall we start with?',
        instructions:
          'Explain step by step. Use one worked example. End with a single question to check understanding.',
        starterPrompts: ['Explain derivatives', 'Quiz me on fractions', 'Help with my homework'],
      }}
    />
  ),
};

export const CustomTones: Story = {
  render: () => (
    <Demo
      tones={[
        { value: 'pirate', label: 'Pirate' },
        { value: 'poet', label: 'Poet' },
        { value: 'robot', label: 'Robot' },
      ]}
    />
  ),
};

export const ServerRejectsTheName: Story = {
  render: () => (
    <Demo
      onSubmit={
        (async () => ({
          fieldErrors: { name: 'An assistant with this name already exists.' },
        })) as never
      }
    />
  ),
};

export const Disabled: Story = { render: () => <Demo disabled defaultValues={{ name: 'Ada' }} /> };
