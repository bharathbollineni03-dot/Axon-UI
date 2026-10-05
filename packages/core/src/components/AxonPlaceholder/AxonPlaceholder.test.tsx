import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { AxonPlaceholder } from './AxonPlaceholder';

describe('AxonPlaceholder', () => {
  it('renders default content and classes', () => {
    render(<AxonPlaceholder />);
    const el = screen.getByText('Axon UI');
    expect(el).toHaveClass(
      'axon-placeholder',
      'axon-placeholder--md',
      'axon-placeholder--primary',
      'axon-placeholder--solid',
    );
  });

  it('applies size, color and variant modifiers', () => {
    render(
      <AxonPlaceholder size="lg" color="danger" variant="outline">
        Hello
      </AxonPlaceholder>,
    );
    expect(screen.getByText('Hello')).toHaveClass(
      'axon-placeholder--lg',
      'axon-placeholder--danger',
      'axon-placeholder--outline',
    );
  });

  it('forwards ref and spreads remaining props onto the root', () => {
    const ref = createRef<HTMLDivElement>();
    render(<AxonPlaceholder ref={ref} className="custom" data-testid="root" />);
    expect(ref.current).toBe(screen.getByTestId('root'));
    expect(ref.current).toHaveClass('axon-placeholder', 'custom');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<AxonPlaceholder />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
