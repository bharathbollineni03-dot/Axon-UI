import type { Meta, StoryObj } from '@storybook/react';
import { defaultTheme } from '../theme';
import { spacingKeys } from '../tokens';
import './foundations.css';

const meta = {
  title: 'Foundations/Spacing',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const varKey = (key: string) => key.replace('.', '-');

export const Scale: Story = {
  render: () => (
    <div className="axon-foundations">
      <table className="axon-token-table">
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Value</th>
            <th scope="col">Preview</th>
          </tr>
        </thead>
        <tbody>
          {spacingKeys.map((key) => (
            <tr key={key}>
              <td className="axon-foundations__code">--axon-space-{varKey(key)}</td>
              <td className="axon-foundations__code">{defaultTheme.spacing[key]}</td>
              <td>
                <div
                  className="axon-bar"
                  style={{ width: `var(--axon-space-${varKey(key)})`, minWidth: '1px' }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};
