import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SubmittedValues, useMockSubmit } from '../../stories/mockSubmit';
import {
  SystemPromptEditor,
  type SystemPromptEditorProps,
  type SystemPromptPreset,
  type SystemPromptValues,
} from './SystemPromptEditor';

const initialPresets: SystemPromptPreset[] = [
  {
    id: 'brief',
    name: 'Brief',
    description: 'One-sentence answers',
    prompt: 'Answer in one sentence unless asked for more.',
  },
  {
    id: 'tutor',
    name: 'Tutor',
    description: 'Teaches step by step',
    prompt:
      'You are a patient tutor. Explain step by step, use an example, then ask one question to check understanding.',
  },
  {
    id: 'reviewer',
    name: 'Code reviewer',
    prompt: 'Review the code for bugs, unclear names and missing tests. Be specific and kind.',
  },
];

const meta: Meta<SystemPromptEditorProps> = {
  title: 'Chat/SystemPromptEditor',
  component: SystemPromptEditor as never,
  parameters: { layout: 'padded' },
  argTypes: {
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    maxLength: { control: { type: 'number', min: 20, max: 20000 } },
    presets: { control: false },
    onSubmit: { control: false },
    onSavePreset: { control: false },
    onDeletePreset: { control: false },
    schema: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '36rem' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<SystemPromptEditorProps>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Keeps the presets in state, so saving and deleting really change the list. */
function Demo(props: Partial<SystemPromptEditorProps>) {
  const [presets, setPresets] = useState(initialPresets);
  const { onSubmit, submitted } = useMockSubmit<SystemPromptValues>();
  return (
    <>
      <SystemPromptEditor
        presets={presets}
        onSubmit={onSubmit as never}
        onSavePreset={async ({ name, prompt }) => {
          await wait(400);
          setPresets((list) => [...list, { id: `p-${list.length + 1}`, name, prompt }]);
        }}
        onDeletePreset={async (preset) => {
          await wait(400);
          setPresets((list) => list.filter((item) => item.id !== preset.id));
        }}
        {...props}
      />
      <SubmittedValues values={submitted} />
    </>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const WithCancel: Story = { render: () => <Demo onCancel={() => {}} /> };

export const StartingFromAPreset: Story = {
  render: () => <Demo defaultPrompt={initialPresets[1]!.prompt} />,
};

export const RequiredAndShort: Story = {
  name: 'Required, 120 characters at most',
  render: () => <Demo required maxLength={120} />,
};

export const NoPresets: Story = {
  render: () => <Demo presets={[]} onSavePreset={undefined} onDeletePreset={undefined} />,
};

export const SavingFails: Story = {
  name: 'Saving a preset fails',
  render: () => (
    <Demo
      defaultPrompt="Some instructions"
      onSavePreset={async () => {
        await wait(400);
        throw new Error('offline');
      }}
    />
  ),
};
