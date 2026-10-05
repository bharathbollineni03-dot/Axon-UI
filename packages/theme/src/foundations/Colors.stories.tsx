import type { Meta, StoryObj } from '@storybook/react';
import { defaultTheme } from '../theme';
import { paletteNames, semanticKeys, shades } from '../tokens';
import './foundations.css';

const meta = {
  title: 'Foundations/Colors',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const kebab = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export const Palettes: Story = {
  render: () => (
    <div className="axon-foundations">
      {paletteNames.map((name) => (
        <section key={name}>
          <h3 className="axon-foundations__title">{name}</h3>
          <div className="axon-swatches">
            {shades.map((shade) => (
              <div
                key={shade}
                className={`axon-swatch axon-swatch--${shade >= 500 ? 'dark' : 'light'}`}
                style={{ background: `var(--axon-color-${name}-${shade})` }}
                title={`--axon-color-${name}-${shade}`}
              >
                <strong>{shade}</strong>
                <span className="axon-swatch__hex">{defaultTheme.palette[name][shade]}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};

export const SemanticTokens: Story = {
  render: () => (
    <div className="axon-foundations">
      <p className="axon-foundations__hint">
        Swatches follow the light/dark toggle in the Storybook toolbar.
      </p>
      <table className="axon-token-table">
        <thead>
          <tr>
            <th scope="col">Preview</th>
            <th scope="col">Variable</th>
            <th scope="col">Light</th>
            <th scope="col">Dark</th>
          </tr>
        </thead>
        <tbody>
          {semanticKeys.map((key) => (
            <tr key={key}>
              <td>
                <span
                  className="axon-semantic-chip"
                  style={{ background: `var(--axon-color-${kebab(key)})` }}
                />
              </td>
              <td className="axon-foundations__code">--axon-color-{kebab(key)}</td>
              <td className="axon-foundations__code">{defaultTheme.semantic.light[key]}</td>
              <td className="axon-foundations__code">{defaultTheme.semantic.dark[key]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};

const accentKeys = Object.keys(
  defaultTheme.accent.light.primary,
) as (keyof typeof defaultTheme.accent.light.primary)[];

export const AccentTokens: Story = {
  render: () => (
    <div className="axon-foundations">
      <p className="axon-foundations__hint">
        Mode-aware tokens components use for the <code>color</code> prop, e.g.{' '}
        <code>--axon-color-primary-solid</code>. Each solid / on-solid and text / subtle pair meets
        4.5:1 contrast in both modes (enforced by a unit test).
      </p>
      <table className="axon-token-table">
        <thead>
          <tr>
            <th scope="col">Color</th>
            {accentKeys.map((key) => (
              <th key={key} scope="col" className="axon-foundations__code">
                {kebab(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paletteNames.map((name) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              {accentKeys.map((key) => (
                <td key={key}>
                  <span
                    className="axon-semantic-chip"
                    title={`--axon-color-${name}-${kebab(key)}`}
                    style={{ background: `var(--axon-color-${name}-${kebab(key)})` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};
