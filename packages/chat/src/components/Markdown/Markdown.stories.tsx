import type { Meta, StoryObj } from '@storybook/react';
import { Markdown } from './Markdown';

const meta = {
  title: 'Chat/Markdown',
  component: Markdown,
  parameters: { layout: 'padded' },
  argTypes: {
    headingOffset: { control: { type: 'number', min: 0, max: 5 } },
    openLinksInNewTab: { control: 'boolean' },
    allowImages: { control: 'boolean' },
    children: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '44rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Markdown>;
export default meta;
type Story = StoryObj<typeof meta>;

const document = `# A heading
Some **bold**, *italic*, ~~struck~~ text and \`inline code\`, plus a [link to Axon](https://example.com).

## A list
- First
- Second
  - Nested
1. One
2. Two

- [x] A finished task
- [ ] An open task

## A table
| Name | Role | Active |
| --- | --- | :-: |
| Ada | Mathematician | ✓ |
| Grace | Admiral | ✓ |

## Code
\`\`\`python
def greet(name: str) -> str:
    return f"Hello, {name}!"
\`\`\`

> A quotation, set apart.

---

Visit https://example.com for more.`;

export const Playground: Story = { args: { children: document } };

export const Headings: Story = {
  args: {
    children:
      '# One\n\n## Two\n\n### Three\n\nHeadings are pushed down two levels so a message never adds an `h1` to the page.',
  },
};

export const Unsafe: Story = {
  name: 'Unsafe input is neutralised',
  args: {
    children:
      'Raw HTML is shown as text: <script>alert(1)</script> <img src=x onerror="alert(1)">\n\nA bad link: [click me](javascript:alert(1))',
  },
};

export const WithoutImages: Story = {
  args: {
    allowImages: false,
    children: '![A diagram of the architecture](https://example.com/diagram.png)',
  },
};
