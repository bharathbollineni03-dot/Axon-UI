import type { Meta, StoryObj } from '@storybook/react';
import { SubmittedValues, useMockSubmit } from '../../stories/mockSubmit';
import {
  APIKeyForm,
  type APIKeyFormProps,
  type ApiKeyProvider,
  type ApiKeyTestResult,
  type ApiKeyValues,
} from './APIKeyForm';

const providers: ApiKeyProvider[] = [
  { id: 'openai', name: 'OpenAI-compatible', keyPrefix: 'sk-', keyExample: 'sk-…' },
  { id: 'anthropic', name: 'Anthropic', keyPrefix: 'sk-ant-', keyExample: 'sk-ant-…' },
  {
    id: 'custom',
    name: 'Self-hosted',
    requiresBaseUrl: true,
    baseUrl: 'https://llm.example.com/v1',
  },
];

const meta: Meta<APIKeyFormProps> = {
  title: 'Chat/APIKeyForm',
  component: APIKeyForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    hasStoredKey: { control: 'boolean' },
    disabled: { control: 'boolean' },
    providers: { control: false },
    onSubmit: { control: false },
    onTestConnection: { control: false },
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
type Story = StoryObj<APIKeyFormProps>;

/** Pretends to call your server: keys ending in "ok" connect, anything else is refused. */
async function fakeTest(values: ApiKeyValues): Promise<ApiKeyTestResult> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return values.apiKey.endsWith('ok')
    ? { ok: true, message: 'Connected. 12 models are available.' }
    : { ok: false, message: 'The provider rejected this key (401 Unauthorized).' };
}

function Demo(props: Partial<APIKeyFormProps>) {
  const { onSubmit, submitted } = useMockSubmit<ApiKeyValues>();
  return (
    <>
      <APIKeyForm providers={providers} onSubmit={onSubmit as never} {...props} />
      <SubmittedValues values={submitted} />
    </>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const WithConnectionTest: Story = {
  name: 'With "Test connection" (a key ending in "ok" works)',
  render: () => <Demo onTestConnection={fakeTest} />,
};

export const SelfHostedProvider: Story = {
  render: () => <Demo defaultValues={{ provider: 'custom' }} onTestConnection={fakeTest} />,
};

export const KeyAlreadySaved: Story = {
  render: () => <Demo hasStoredKey defaultValues={{ provider: 'anthropic' }} onCancel={() => {}} />,
};

export const ServerRefusesTheKey: Story = {
  render: () => (
    <Demo
      onSubmit={(async () => ({ fieldErrors: { apiKey: 'This key has been revoked.' } })) as never}
    />
  ),
};

export const Disabled: Story = { render: () => <Demo disabled /> };
