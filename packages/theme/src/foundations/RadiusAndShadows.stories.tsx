import type { Meta, StoryObj } from '@storybook/react';
import { defaultTheme } from '../theme';
import './foundations.css';

const meta = {
  title: 'Foundations/Radius and shadows',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Radius: Story = {
  render: () => (
    <div className="axon-foundations">
      <div className="axon-box-grid">
        {(Object.keys(defaultTheme.radius) as (keyof typeof defaultTheme.radius)[]).map((key) => (
          <div key={key}>
            <div className="axon-box-demo" style={{ borderRadius: `var(--axon-radius-${key})` }}>
              {key}
            </div>
            <p className="axon-foundations__code">
              --axon-radius-{key}
              <br />
              {defaultTheme.radius[key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Shadows: Story = {
  render: () => (
    <div className="axon-foundations">
      <div className="axon-box-grid">
        {(Object.keys(defaultTheme.shadows) as (keyof typeof defaultTheme.shadows)[]).map((key) => (
          <div key={key}>
            <div
              className="axon-box-demo"
              style={{
                borderRadius: 'var(--axon-radius-lg)',
                boxShadow: `var(--axon-shadow-${key})`,
              }}
            >
              {key}
            </div>
            <p className="axon-foundations__code">--axon-shadow-{key}</p>
          </div>
        ))}
      </div>
    </div>
  ),
};
