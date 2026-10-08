import type { Meta, StoryObj } from '@storybook/react';
import { Citation, SourceList } from './SourceList';

const meta = {
  title: 'Chat/SourceList',
  component: SourceList,
  parameters: { layout: 'padded' },
  args: {
    sources: [
      {
        id: 'mdn',
        title: 'Array.prototype.map() - JavaScript | MDN',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',
        snippet:
          'The map() method creates a new array populated with the results of calling a function on every element.',
      },
      { id: 'spec', title: 'ECMAScript® Language Specification', url: 'https://tc39.es/ecma262/' },
      { id: 'book', title: 'Eloquent JavaScript (print edition)' },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '36rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SourceList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithCitations: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-4)' }}>
      <p style={{ margin: 0 }}>
        <code>map</code> returns a new array <Citation index={1} sourceId="mdn" /> and is defined in
        the specification <Citation index={2} sourceId="spec" />. Press a number to jump to its
        source.
      </p>
      <SourceList {...args} />
    </div>
  ),
};
