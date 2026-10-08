import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { FormSection } from './FormSection';

describe('FormSection', () => {
  it('is a group named by its title', () => {
    render(
      <FormSection title="Address">
        <input aria-label="Street" />
      </FormSection>,
    );
    expect(screen.getByRole('group', { name: 'Address' })).toBeInTheDocument();
  });

  it('describes the group with its description', () => {
    render(
      <FormSection title="Address" description="Where we send your orders.">
        <input aria-label="Street" />
      </FormSection>,
    );
    expect(screen.getByRole('group', { name: 'Address' })).toHaveAccessibleDescription(
      'Where we send your orders.',
    );
  });

  it('keeps a describedby the caller passes, and adds its own', () => {
    render(
      <>
        <p id="extra">Extra help</p>
        <FormSection title="Address" description="Shipping" aria-describedby="extra" />
      </>,
    );
    expect(screen.getByRole('group', { name: 'Address' })).toHaveAccessibleDescription(
      'Extra help Shipping',
    );
  });

  it('renders its children in a body', () => {
    const { container } = render(
      <FormSection title="Address">
        <input aria-label="Street" />
      </FormSection>,
    );
    expect(container.querySelector('.axon-form-section__body')).toContainElement(
      screen.getByLabelText('Street'),
    );
  });

  it('works without a title or description', () => {
    const { container } = render(
      <FormSection>
        <input aria-label="Street" />
      </FormSection>,
    );
    expect(container.querySelector('legend')).not.toBeInTheDocument();
    expect(container.querySelector('.axon-form-section__description')).not.toBeInTheDocument();
  });

  it('forwards the ref and spreads props', () => {
    const ref = createRef<HTMLFieldSetElement>();
    render(<FormSection ref={ref} title="A" className="extra" data-testid="s" disabled />);
    expect(ref.current).toBe(screen.getByTestId('s'));
    expect(ref.current).toHaveClass('axon-form-section', 'extra');
    expect(ref.current).toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <FormSection title="Address" description="Shipping">
        <label>
          Street <input />
        </label>
      </FormSection>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
