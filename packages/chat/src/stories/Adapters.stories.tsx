import type { Meta, StoryObj } from '@storybook/react';
import { ChatWindow } from '../components/ChatWindow/ChatWindow';
import { useChat } from '../hooks/useChat';
import {
  createAnthropicCompatibleSender,
  createFakeProviderFetch,
  createOpenAICompatibleSender,
} from './streamingAdapters';

const usage = `
\`useChat\` takes any function \`(history, { signal }) => string | AsyncIterable<string>\`, so a
provider needs only a small adapter. These stories run two of them against a **pretend** server in
the browser: the request is built, the reply streams back as server-sent events, and the adapter
parses them. The code is in \`src/stories/streamingAdapters.ts\`; copy what you need.

**Keep API keys on your server.** Point the adapter at your own endpoint, which adds the key and
forwards the request. A key in browser code can be read by anyone who opens the page.

\`\`\`tsx
const onSend = createOpenAICompatibleSender({
  url: '/api/chat',            // your server, which holds the key
  model: 'your-model',
  system: 'You are a helpful assistant.',
});

function Chat() {
  const chat = useChat({ onSend });
  return <ChatWindow chat={chat} title="Assistant" />;
}
\`\`\`

\`stop()\` aborts the request, because the adapters pass \`signal\` to \`fetch\`.
`;

const meta: Meta = {
  title: 'Chat/Provider adapters',
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: usage } },
  },
};
export default meta;
type Story = StoryObj;

function Demo({
  format,
  failWith,
}: {
  format: 'openai' | 'anthropic';
  failWith?: { status: number; message: string };
}) {
  const options = {
    url: '/api/chat',
    model: 'demo-model',
    system: 'You are a helpful assistant.',
    fetch: createFakeProviderFetch(format, { delay: 30, failWith }),
  };
  const onSend =
    format === 'openai'
      ? createOpenAICompatibleSender(options)
      : createAnthropicCompatibleSender(options);
  const chat = useChat({ onSend });
  return (
    <div style={{ height: '34rem', padding: 'var(--axon-space-4)' }}>
      <ChatWindow
        chat={chat}
        title={format === 'openai' ? 'OpenAI-compatible adapter' : 'Anthropic-compatible adapter'}
        subtitle="A pretend server in your browser"
        onNewChat={chat.reset}
        footer="Ask anything: the reply quotes your question to show the request got through."
      />
    </div>
  );
}

export const OpenAICompatible: Story = { render: () => <Demo format="openai" /> };

export const AnthropicCompatible: Story = { render: () => <Demo format="anthropic" /> };

export const ProviderError: Story = {
  name: 'Provider answers 429 (rate limited)',
  render: () => (
    <Demo
      format="openai"
      failWith={{ status: 429, message: 'Rate limit reached. Try again in a minute.' }}
    />
  ),
};
