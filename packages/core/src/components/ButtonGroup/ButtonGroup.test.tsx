import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { ButtonGroup } from './ButtonGroup';

describe('ButtonGroup', () => {
  it('renders a labelled group of attached buttons', () => {
    render(
      <ButtonGroup aria-label="Text alignment">
        <Button>Left</Button>
        <Button>Right</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole('group', { name: 'Text alignment' });
    expect(group).toHaveClass(
      'axon-button-group',
      'axon-button-group--horizontal',
      'axon-button-group--attached',
    );
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('shares size, variant and color with its buttons', () => {
    render(
      <ButtonGroup size="sm" variant="outline" color="success">
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>,
    );
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveClass('axon-button--sm', 'axon-button--outline', 'axon-button--success');
    }
  });

  it("lets a button's own props override the group", () => {
    render(
      <ButtonGroup size="sm" variant="outline">
        <Button>One</Button>
        <Button size="lg" variant="solid">
          Two
        </Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole('button', { name: 'Two' })).toHaveClass(
      'axon-button--lg',
      'axon-button--solid',
    );
    expect(screen.getByRole('button', { name: 'One' })).toHaveClass('axon-button--sm');
  });

  it('disables every button, including icon buttons, with `disabled`', () => {
    render(
      <ButtonGroup disabled>
        <Button>One</Button>
        <IconButton aria-label="Two">+</IconButton>
      </ButtonGroup>,
    );
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });

  it('supports vertical and detached layouts', () => {
    render(
      <ButtonGroup orientation="vertical" attached={false} fullWidth data-testid="g">
        <Button>One</Button>
      </ButtonGroup>,
    );
    expect(screen.getByTestId('g')).toHaveClass(
      'axon-button-group--vertical',
      'axon-button-group--full-width',
    );
    expect(screen.getByTestId('g')).not.toHaveClass('axon-button-group--attached');
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ButtonGroup ref={ref} className="extra">
        <Button>One</Button>
      </ButtonGroup>,
    );
    expect(ref.current).toHaveClass('axon-button-group', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ButtonGroup aria-label="Actions">
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
