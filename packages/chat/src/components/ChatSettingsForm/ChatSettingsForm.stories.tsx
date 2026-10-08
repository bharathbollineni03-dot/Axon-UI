import type { Meta, StoryObj } from '@storybook/react';
import { SubmittedValues, useMockSubmit } from '../../stories/mockSubmit';
import type { ChatModel } from '../ModelSelector/ModelSelector';
import {
  ChatSettingsForm,
  type ChatSettingsFormProps,
  type ChatSettingsValues,
} from './ChatSettingsForm';

const models: ChatModel[] = [
  { id: 'axon-fast', name: 'Axon Fast', description: 'Quick answers for everyday questions' },
  {
    id: 'axon-smart',
    name: 'Axon Smart',
    description: 'Best for hard problems and long documents',
  },
  { id: 'axon-classic', name: 'Axon Classic', description: 'Retired', disabled: true },
];

const meta: Meta<ChatSettingsFormProps> = {
  title: 'Chat/ChatSettingsForm',
  component: ChatSettingsForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    showReset: { control: 'boolean' },
    disabled: { control: 'boolean' },
    models: { control: false },
    onSubmit: { control: false },
    onCancel: { control: false },
    schema: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '28rem' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<ChatSettingsFormProps>;

function Demo(
  props: Partial<ChatSettingsFormProps> & { server?: Parameters<typeof useMockSubmit>[0] },
) {
  const { server, ...rest } = props;
  const { onSubmit, submitted } = useMockSubmit<ChatSettingsValues>(server);
  return (
    <>
      <ChatSettingsForm models={models} onSubmit={onSubmit as never} {...rest} />
      <SubmittedValues values={submitted} />
    </>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const WithCancel: Story = { render: () => <Demo onCancel={() => {}} /> };

export const StartingValues: Story = {
  render: () => (
    <Demo
      defaultValues={{ model: 'axon-smart', temperature: 0.2, maxTokens: 4096, stream: false }}
    />
  ),
};

export const GroupedModels: Story = {
  render: () => (
    <Demo
      models={[
        { id: 'haiku', name: 'Haiku', description: 'Fastest', group: 'Cloud' },
        { id: 'sonnet', name: 'Sonnet', description: 'Balanced', group: 'Cloud' },
        { id: 'local-7b', name: 'Local 7B', description: 'Runs on your machine', group: 'Local' },
      ]}
    />
  ),
};

export const ServerRejectsAField: Story = {
  render: () => (
    <Demo server={{ fieldErrors: { maxTokens: 'Your plan allows up to 4,096 tokens.' } }} />
  ),
};

export const Disabled: Story = { render: () => <Demo disabled /> };
