import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { Portal } from './Portal';

const meta = {
  title: 'Overlays/Portal',
  component: Portal,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Renders children somewhere else in the DOM (the closest modal overlay or `.axon-root`, ' +
          'else `<body>`) so they escape the clipping and stacking of their parents, while staying ' +
          'in the React tree. `Modal`, `Drawer`, `Popover`, `Tooltip` and menus use it for you; reach ' +
          'for it when building your own floating UI.',
      },
    },
  },
} satisfies Meta<typeof Portal>;

export default meta;
type Story = StoryObj<typeof meta>;

function ClippedExample() {
  const [escaped, setEscaped] = useState(true);
  return (
    <div
      style={{ display: 'grid', gap: 'var(--axon-space-3)', fontFamily: 'var(--axon-font-sans)' }}
    >
      <Button variant="outline" onClick={() => setEscaped((e) => !e)}>
        {escaped ? 'Portal on: not clipped' : 'Portal off: clipped by the box'}
      </Button>
      <div
        style={{
          width: '16rem',
          height: '4rem',
          overflow: 'hidden',
          border: '1px dashed var(--axon-color-border-strong)',
          padding: 'var(--axon-space-3)',
          position: 'relative',
        }}
      >
        A box with <code>overflow: hidden</code>.
        <Portal disabled={!escaped}>
          <div
            style={{
              position: escaped ? 'fixed' : 'absolute',
              left: escaped ? '3rem' : '8rem',
              top: escaped ? '12rem' : '3rem',
              padding: 'var(--axon-space-2) var(--axon-space-3)',
              background: 'var(--axon-color-surface-raised)',
              border: '1px solid var(--axon-color-border)',
              borderRadius: 'var(--axon-radius-md)',
              boxShadow: 'var(--axon-shadow-md)',
              color: 'var(--axon-color-text-primary)',
            }}
          >
            I am sticking out of the box.
          </div>
        </Portal>
      </div>
    </div>
  );
}

export const EscapingAClippedParent: Story = {
  name: 'Escaping a clipped parent',
  render: () => <ClippedExample />,
};
