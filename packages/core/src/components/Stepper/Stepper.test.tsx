import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Step, Stepper, type StepperProps } from './Stepper';

function Example(props: Partial<StepperProps>) {
  return (
    <Stepper {...props}>
      <Step label="Account" description="Your details">
        Account form
      </Step>
      <Step label="Plan" optional>
        Plan picker
      </Step>
      <Step label="Review">Review summary</Step>
    </Stepper>
  );
}

const steps = () => screen.getAllByRole('listitem');

describe('Stepper', () => {
  it('is an ordered list with one item per step', () => {
    render(<Example />);
    expect(screen.getByRole('list').tagName).toBe('OL');
    expect(steps()).toHaveLength(3);
  });

  it('marks the active step with aria-current="step"', () => {
    render(<Example activeStep={1} />);
    expect(steps()[1]).toHaveAttribute('aria-current', 'step');
    expect(steps()[0]).not.toHaveAttribute('aria-current');
    expect(steps()[1]).toHaveClass('axon-step--active');
  });

  it('counts the steps before the active one as completed and says so', () => {
    render(<Example activeStep={2} />);
    expect(steps()[0]).toHaveClass('axon-step--completed');
    expect(steps()[1]).toHaveClass('axon-step--completed');
    expect(steps()[2]).not.toHaveClass('axon-step--completed');
    expect(steps()[0]).toHaveTextContent('Account (completed)');
  });

  it('shows the step number, or a check once completed', () => {
    const { container } = render(<Example activeStep={1} />);
    const indicators = container.querySelectorAll('.axon-step__indicator');
    expect(indicators[0]!.querySelector('svg')).not.toBeNull();
    expect(indicators[1]).toHaveTextContent('2');
    expect(indicators[2]).toHaveTextContent('3');
    indicators.forEach((i) => expect(i).toHaveAttribute('aria-hidden', 'true'));
  });

  it('marks every step complete when activeStep is the step count', () => {
    render(<Example activeStep={3} />);
    steps().forEach((s) => expect(s).toHaveClass('axon-step--completed'));
    steps().forEach((s) => expect(s).not.toHaveAttribute('aria-current'));
  });

  it('shows descriptions and an "Optional" caption', () => {
    render(<Example />);
    expect(screen.getByText('Your details')).toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('lets a step override completion, with a custom icon', () => {
    render(
      <Stepper activeStep={0}>
        <Step label="A" completed />
        <Step label="B" icon={<svg data-testid="custom" />} />
      </Stepper>,
    );
    expect(steps()[0]).toHaveClass('axon-step--completed');
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });

  it('flags an error step and announces it', () => {
    render(
      <Stepper activeStep={1}>
        <Step label="A" error />
        <Step label="B" />
      </Stepper>,
    );
    expect(steps()[0]).toHaveClass('axon-step--error');
    expect(steps()[0]).toHaveTextContent('A (has an error)');
    expect(steps()[0]).not.toHaveTextContent('(completed)');
  });

  it('lets the announcements be translated', () => {
    render(
      <Stepper activeStep={1} labels={{ completed: 'erledigt', optional: 'Optional' }}>
        <Step label="A" />
        <Step label="B" optional />
      </Stepper>,
    );
    expect(steps()[0]).toHaveTextContent('A (erledigt)');
  });

  describe('as progress only (no onStepChange)', () => {
    it('renders no buttons', () => {
      render(<Example activeStep={1} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('interactive', () => {
    it('renders each step as a button, with aria-current on the active one', () => {
      render(<Example activeStep={1} onStepChange={() => undefined} />);
      expect(screen.getAllByRole('button')).toHaveLength(3);
      expect(screen.getByRole('button', { name: /Plan/ })).toHaveAttribute('aria-current', 'step');
      expect(steps()[1]).not.toHaveAttribute('aria-current');
    });

    it('in a linear stepper lets the user go back but not ahead', async () => {
      const onStepChange = vi.fn();
      const user = userEvent.setup();
      render(<Example activeStep={1} onStepChange={onStepChange} />);
      await user.click(screen.getByRole('button', { name: /Review/ }));
      expect(onStepChange).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Review/ })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await user.click(screen.getByRole('button', { name: /Account/ }));
      expect(onStepChange).toHaveBeenCalledWith(0);
    });

    it('in a non-linear stepper lets the user jump anywhere', async () => {
      const onStepChange = vi.fn();
      const user = userEvent.setup();
      render(<Example activeStep={0} linear={false} onStepChange={onStepChange} />);
      await user.click(screen.getByRole('button', { name: /Review/ }));
      expect(onStepChange).toHaveBeenCalledWith(2);
    });

    it('does not select a disabled step', async () => {
      const onStepChange = vi.fn();
      render(
        <Stepper activeStep={0} linear={false} onStepChange={onStepChange}>
          <Step label="A" />
          <Step label="B" disabled />
        </Stepper>,
      );
      expect(screen.getByRole('button', { name: /B/ })).toBeDisabled();
      await userEvent.setup().click(screen.getByRole('button', { name: /B/ }));
      expect(onStepChange).not.toHaveBeenCalled();
    });

    it('does not report the active step again when it is pressed', async () => {
      const onStepChange = vi.fn();
      render(<Example activeStep={1} onStepChange={onStepChange} />);
      await userEvent.setup().click(screen.getByRole('button', { name: /Plan/ }));
      expect(onStepChange).not.toHaveBeenCalled();
    });

    it('works uncontrolled from defaultActiveStep', async () => {
      const user = userEvent.setup();
      render(<Example defaultActiveStep={2} onStepChange={() => undefined} />);
      expect(steps()[2]).toHaveClass('axon-step--active');
      await user.click(screen.getByRole('button', { name: /Account/ }));
      expect(steps()[0]).toHaveClass('axon-step--active');
    });

    it('works controlled', async () => {
      function Controlled() {
        const [step, setStep] = useState(0);
        return (
          <>
            <button type="button" onClick={() => setStep((s) => s + 1)}>
              Next
            </button>
            <Example activeStep={step} onStepChange={setStep} />
          </>
        );
      }
      const user = userEvent.setup();
      render(<Controlled />);
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(steps()[1]).toHaveClass('axon-step--active');
      await user.click(screen.getByRole('button', { name: /Account/ }));
      expect(steps()[0]).toHaveClass('axon-step--active');
    });

    it('is reachable with the keyboard', async () => {
      const onStepChange = vi.fn();
      const user = userEvent.setup();
      render(<Example activeStep={2} onStepChange={onStepChange} />);
      await user.tab();
      expect(screen.getByRole('button', { name: /Account/ })).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onStepChange).toHaveBeenCalledWith(0);
    });
  });

  describe('vertical', () => {
    it('shows the content of the active step only', () => {
      render(<Example orientation="vertical" activeStep={1} />);
      expect(screen.getByText('Plan picker')).toBeInTheDocument();
      expect(screen.queryByText('Account form')).not.toBeInTheDocument();
      expect(screen.queryByText('Review summary')).not.toBeInTheDocument();
    });

    it('has no connector element (the body draws the line)', () => {
      const { container } = render(<Example orientation="vertical" />);
      expect(container.querySelector('.axon-step__connector')).toBeNull();
      expect(container.firstElementChild).toHaveClass('axon-stepper--vertical');
    });
  });

  describe('horizontal', () => {
    it('draws a connector between steps but not after the last', () => {
      const { container } = render(<Example />);
      expect(container.querySelectorAll('.axon-step__connector')).toHaveLength(2);
    });

    it('does not render step content', () => {
      render(<Example activeStep={0} />);
      expect(screen.queryByText('Account form')).not.toBeInTheDocument();
    });
  });

  it('forwards refs and applies modifiers', () => {
    const direct = createRef<HTMLOListElement>();
    render(
      <Stepper ref={direct} color="success" className="extra" data-testid="s">
        <Step label="A" />
      </Stepper>,
    );
    expect(direct.current).toBe(screen.getByTestId('s'));
    expect(direct.current).toHaveClass(
      'axon-stepper',
      'axon-stepper--horizontal',
      'axon-stepper--success',
      'extra',
    );
  });

  it('throws a helpful error outside <Stepper>', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Step label="x" />)).toThrow(/Stepper/);
    spy.mockRestore();
  });

  it('has no axe violations (horizontal, vertical, interactive)', async () => {
    const { container } = render(
      <>
        <Example activeStep={1} />
        <Example activeStep={1} orientation="vertical" />
        <Example activeStep={1} onStepChange={() => undefined} />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
