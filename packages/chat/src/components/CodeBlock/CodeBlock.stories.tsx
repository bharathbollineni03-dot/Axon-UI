import type { Meta, StoryObj } from '@storybook/react';
import { CodeBlock } from './CodeBlock';

const meta = {
  title: 'Chat/CodeBlock',
  component: CodeBlock,
  parameters: { layout: 'padded' },
  argTypes: {
    language: { control: 'text' },
    showLineNumbers: { control: 'boolean' },
    wrap: { control: 'boolean' },
    code: { control: 'text' },
  },
  args: {
    language: 'typescript',
    code: `interface User {
  id: string;
  name: string;
}

export async function loadUser(id: string): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  if (!response.ok) throw new Error('Not found');
  return response.json();
}`,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '44rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CodeBlock>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithLineNumbers: Story = { args: { showLineNumbers: true } };

export const WithFilename: Story = { args: { filename: 'src/api/users.ts' } };

export const Languages: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-4)' }}>
      <CodeBlock
        language="python"
        code={'def fib(n):\n    return n if n < 2 else fib(n - 1) + fib(n - 2)'}
      />
      <CodeBlock
        language="json"
        code={'{\n  "name": "axon",\n  "private": false,\n  "keywords": ["ui", "react"]\n}'}
      />
      <CodeBlock language="bash" code={'pnpm add @axonui/chat\npnpm dev --filter docs'} />
      <CodeBlock
        language="css"
        code={'.axon-button {\n  color: var(--axon-color-primary-text);\n}'}
      />
      <CodeBlock language="html" code={'<button class="axon-button" disabled>Save</button>'} />
      <CodeBlock
        language="sql"
        code={'SELECT name FROM users WHERE active = true ORDER BY name;'}
      />
      <CodeBlock language="diff" code={'- const a = 1;\n+ const a = 2;'} />
    </div>
  ),
};

export const WrapLongLines: Story = {
  args: {
    wrap: true,
    language: 'text',
    code: 'This single line is long enough to need wrapping rather than a sideways scroll: '.repeat(
      4,
    ),
  },
};

export const Unknown: Story = {
  name: 'Unknown language shows as plain text',
  args: { language: 'klingon', code: 'nuqneH' },
};

export const EscapesMarkup: Story = {
  name: 'Markup in code is shown, never run',
  args: { language: 'html', code: '<img src=x onerror="alert(1)"><script>alert(2)</script>' },
};
