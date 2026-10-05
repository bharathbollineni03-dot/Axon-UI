import type { Meta, StoryObj } from '@storybook/react';
import { defaultTheme } from '../theme';
import './foundations.css';

const meta = {
  title: 'Foundations/Typography',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } = defaultTheme.typography;
const sample = 'The quick brown fox jumps over the lazy dog';

export const FontFamilies: Story = {
  render: () => (
    <div className="axon-foundations">
      <section>
        <h3 className="axon-foundations__title">Sans</h3>
        <p className="axon-foundations__code">--axon-font-sans</p>
        <p style={{ fontFamily: 'var(--axon-font-sans)', fontSize: 'var(--axon-font-size-xl)' }}>
          {sample}
        </p>
      </section>
      <section>
        <h3 className="axon-foundations__title">Mono</h3>
        <p className="axon-foundations__code">--axon-font-mono</p>
        <p style={{ fontFamily: 'var(--axon-font-mono)', fontSize: 'var(--axon-font-size-xl)' }}>
          {sample}
        </p>
      </section>
    </div>
  ),
};

export const TypeScale: Story = {
  render: () => (
    <div className="axon-foundations">
      <table className="axon-token-table">
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Size</th>
            <th scope="col">Sample</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(fontSize) as (keyof typeof fontSize)[]).map((key) => (
            <tr key={key}>
              <td className="axon-foundations__code">--axon-font-size-{key}</td>
              <td className="axon-foundations__code">{fontSize[key]}</td>
              <td style={{ fontSize: `var(--axon-font-size-${key})` }}>{sample}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};

export const WeightsLineHeightsSpacing: Story = {
  name: 'Weights, line heights and letter spacing',
  render: () => (
    <div className="axon-foundations">
      <section>
        <h3 className="axon-foundations__title">Font weight</h3>
        {(Object.keys(fontWeight) as (keyof typeof fontWeight)[]).map((key) => (
          <p key={key} style={{ fontWeight: `var(--axon-font-weight-${key})`, margin: 0 }}>
            {key} <span className="axon-foundations__code">{fontWeight[key]}</span>
          </p>
        ))}
      </section>
      <section>
        <h3 className="axon-foundations__title">Line height</h3>
        {(Object.keys(lineHeight) as (keyof typeof lineHeight)[]).map((key) => (
          <p key={key} style={{ lineHeight: `var(--axon-line-height-${key})`, maxWidth: '32rem' }}>
            <span className="axon-foundations__code">
              {key} ({lineHeight[key]})
            </span>
            <br />
            {sample}. {sample}.
          </p>
        ))}
      </section>
      <section>
        <h3 className="axon-foundations__title">Letter spacing</h3>
        {(Object.keys(letterSpacing) as (keyof typeof letterSpacing)[]).map((key) => (
          <p key={key} style={{ letterSpacing: `var(--axon-letter-spacing-${key})`, margin: 0 }}>
            {key} <span className="axon-foundations__code">{letterSpacing[key]}</span>: {sample}
          </p>
        ))}
      </section>
      <p className="axon-foundations__code">
        Font stacks: {fontFamily.sans.split(',')[0]} / {fontFamily.mono.split(',')[0]}
      </p>
    </div>
  ),
};
