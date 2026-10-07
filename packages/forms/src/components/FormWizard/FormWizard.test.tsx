import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { FormTextField, FormRadioGroup } from '../FormBindings/FormBindings';
import { FormWizard, type FormWizardProps, type FormWizardStep } from './FormWizard';

const schema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().min(1, 'Email is required.').pipe(z.email('Enter a valid email.')),
  plan: z.string().min(1, 'Choose a plan.'),
});
type Values = z.input<typeof schema>;

const steps: FormWizardStep[] = [
  {
    id: 'account',
    label: 'Account',
    fields: ['name', 'email'],
    content: (
      <>
        <FormTextField name="name" label="Name" />
        <FormTextField name="email" label="Email" />
      </>
    ),
  },
  {
    id: 'plan',
    label: 'Plan',
    description: 'Pick what suits you.',
    fields: ['plan'],
    content: (
      <FormRadioGroup
        name="plan"
        label="Plan"
        options={[
          { value: 'free', label: 'Free' },
          { value: 'pro', label: 'Pro' },
        ]}
      />
    ),
  },
];

function Wizard(props: Partial<FormWizardProps<Values>> = {}) {
  return (
    <FormWizard<Values>
      schema={schema}
      defaultValues={{ name: '', email: '', plan: '' }}
      steps={steps}
      onSubmit={() => {}}
      {...props}
    />
  );
}

const next = (user = userEvent.setup()) => user.click(screen.getByRole('button', { name: 'Next' }));
const heading = (name: string) => screen.getByRole('heading', { name });

async function fillAccount(user = userEvent.setup()) {
  await user.type(screen.getByLabelText('Name'), 'Ada');
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
}

describe('FormWizard', () => {
  it('shows a stepper and the first step', () => {
    render(<Wizard />);
    const stepper = screen.getByRole('list', { name: 'Progress' });
    expect(within(stepper).getAllByRole('listitem')).toHaveLength(2);
    expect(heading('Step 1 of 2: Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(within(stepper).getByRole('button', { current: 'step' })).toHaveTextContent('Account');
  });

  it('shows a step description', async () => {
    const user = userEvent.setup();
    render(<Wizard />);
    await fillAccount(user);
    await next(user);
    expect(await screen.findByText('Pick what suits you.')).toBeInTheDocument();
  });

  it('has Next on the first step and no Back', () => {
    render(<Wizard />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  describe('Next', () => {
    it('validates only the current step and stays on it when invalid', async () => {
      render(<Wizard />);
      await next();
      expect(await screen.findByText('Name is required.')).toBeInTheDocument();
      expect(screen.getByText('Email is required.')).toBeInTheDocument();
      // The plan field of the next step is not validated yet.
      expect(screen.queryByText('Choose a plan.')).not.toBeInTheDocument();
      expect(heading('Step 1 of 2: Account')).toBeInTheDocument();
    });

    it('focuses the first invalid field', async () => {
      render(<Wizard />);
      await next();
      await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());
    });

    it('marks the step with an error in the stepper', async () => {
      render(<Wizard />);
      await next();
      await screen.findByText('Name is required.');
      const stepper = screen.getByRole('list', { name: 'Progress' });
      expect(
        within(stepper).getByRole('button', { name: /Account.*has an error/ }),
      ).toBeInTheDocument();
    });

    it('goes to the next step when valid, and moves focus to its heading', async () => {
      const user = userEvent.setup();
      render(<Wizard />);
      await fillAccount(user);
      await next(user);
      const title = await screen.findByRole('heading', { name: 'Step 2 of 2: Plan' });
      await waitFor(() => expect(title).toHaveFocus());
      expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Free' })).toBeInTheDocument();
    });

    it('marks the finished step as completed', async () => {
      const user = userEvent.setup();
      render(<Wizard />);
      await fillAccount(user);
      await next(user);
      await screen.findByRole('heading', { name: 'Step 2 of 2: Plan' });
      const stepper = screen.getByRole('list', { name: 'Progress' });
      expect(
        within(stepper).getByRole('button', { name: /Account.*completed/ }),
      ).toBeInTheDocument();
    });

    it('treats a step without fields as valid', async () => {
      const user = userEvent.setup();
      render(
        <Wizard steps={[{ id: 'intro', label: 'Intro', content: <p>Welcome</p> }, steps[0]!]} />,
      );
      await next(user);
      expect(
        await screen.findByRole('heading', { name: 'Step 2 of 2: Account' }),
      ).toBeInTheDocument();
    });
  });

  describe('Back', () => {
    it('returns to the previous step and keeps the values', async () => {
      const user = userEvent.setup();
      render(<Wizard />);
      await fillAccount(user);
      await next(user);
      await screen.findByRole('heading', { name: 'Step 2 of 2: Plan' });
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(
        await screen.findByRole('heading', { name: 'Step 1 of 2: Account' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toHaveValue('Ada');
      expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
    });

    it('does not validate when going back', async () => {
      const user = userEvent.setup();
      render(<Wizard />);
      await fillAccount(user);
      await next(user);
      await screen.findByRole('heading', { name: 'Step 2 of 2: Plan' });
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.queryByText('Choose a plan.')).not.toBeInTheDocument();
    });

    it('also works from the stepper, for steps already reached', async () => {
      const user = userEvent.setup();
      render(<Wizard />);
      await fillAccount(user);
      await next(user);
      await screen.findByRole('heading', { name: 'Step 2 of 2: Plan' });
      await user.click(
        within(screen.getByRole('list', { name: 'Progress' })).getByRole('button', {
          name: /Account/,
        }),
      );
      expect(
        await screen.findByRole('heading', { name: 'Step 1 of 2: Account' }),
      ).toBeInTheDocument();
    });
  });

  describe('submitting', () => {
    it('shows Submit on the last step and submits every step’s values', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<Wizard onSubmit={onSubmit} />);
      await fillAccount(user);
      await next(user);
      await user.click(await screen.findByRole('radio', { name: 'Pro' }));
      expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Submit' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toEqual({
        name: 'Ada',
        email: 'ada@example.com',
        plan: 'pro',
      });
    });

    it('validates the last step on submit', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<Wizard onSubmit={onSubmit} />);
      await fillAccount(user);
      await next(user);
      await user.click(await screen.findByRole('button', { name: 'Submit' }));
      expect(await screen.findByText('Choose a plan.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('treats Enter as Next until the last step, then as submit', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<Wizard onSubmit={onSubmit} />);
      await user.type(screen.getByLabelText('Name'), 'Ada');
      await user.type(screen.getByLabelText('Email'), 'ada@example.com{Enter}');
      expect(await screen.findByRole('heading', { name: 'Step 2 of 2: Plan' })).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('stays on the step, showing the error, when it cannot tell which step is wrong', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      // No `fields`, so Next never validates and the problems only show on the final submit.
      render(
        <Wizard onSubmit={onSubmit} steps={steps.map(({ fields: _fields, ...step }) => step)} />,
      );
      await next(user);
      await screen.findByRole('heading', { name: 'Step 2 of 2: Plan' });
      await user.click(screen.getByRole('button', { name: 'Submit' }));
      // Without `fields` the wizard cannot tell which step is wrong, so it stays; the error shows.
      expect(await screen.findByText('Choose a plan.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('jumps back to the earlier step that holds an error', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      const lenient = z.object({
        name: z.string().min(1, 'Name is required.'),
        plan: z.string().min(1, 'Choose a plan.'),
      });
      render(
        <FormWizard
          schema={lenient}
          defaultValues={{ name: '', plan: 'pro' }}
          // Starting on the last step means the first one was never validated.
          defaultActiveStep={1}
          onSubmit={onSubmit}
          steps={[
            {
              id: 'a',
              label: 'Account',
              fields: ['name'],
              content: <FormTextField name="name" label="Name" />,
            },
            {
              id: 'b',
              label: 'Plan',
              fields: ['plan'],
              content: <FormTextField name="plan" label="Plan" />,
            },
          ]}
        />,
      );
      await screen.findByRole('heading', { name: 'Step 2 of 2: Plan' });
      await user.click(screen.getByRole('button', { name: 'Submit' }));
      expect(
        await screen.findByRole('heading', { name: 'Step 1 of 2: Account' }),
      ).toBeInTheDocument();
      expect(await screen.findByText('Name is required.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows a submit error banner', async () => {
      const user = userEvent.setup();
      render(
        <Wizard
          defaultValues={{ name: 'Ada', email: 'ada@example.com', plan: 'pro' }}
          onSubmit={() => {
            throw new Error('Payment declined.');
          }}
        />,
      );
      await next(user);
      await user.click(await screen.findByRole('button', { name: 'Submit' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Payment declined.');
    });
  });

  describe('summary step', () => {
    it('adds a review step with the values, and Submit on it', async () => {
      const user = userEvent.setup();
      render(
        <Wizard
          defaultValues={{ name: 'Ada', email: 'ada@example.com', plan: 'pro' }}
          summary={(values) => (
            <dl>
              <dt>Name</dt>
              <dd>{values.name}</dd>
              <dt>Plan</dt>
              <dd>{values.plan}</dd>
            </dl>
          )}
        />,
      );
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
      await next(user);
      await next(user);
      expect(
        await screen.findByRole('heading', { name: 'Step 3 of 3: Review' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Ada')).toBeInTheDocument();
      expect(screen.getByText('pro')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    it('lets the summary send the user back to a step', async () => {
      const user = userEvent.setup();
      render(
        <Wizard
          defaultValues={{ name: 'Ada', email: 'ada@example.com', plan: 'pro' }}
          summary={(_values, goToStep) => (
            <button type="button" onClick={() => goToStep(0)}>
              Edit account
            </button>
          )}
        />,
      );
      await next(user);
      await next(user);
      await user.click(await screen.findByRole('button', { name: 'Edit account' }));
      expect(
        await screen.findByRole('heading', { name: 'Step 1 of 3: Account' }),
      ).toBeInTheDocument();
    });
  });

  describe('options', () => {
    it('can be controlled with activeStep and onStepChange', async () => {
      const onStepChange = vi.fn();
      function Controlled() {
        const [step, setStep] = useState(0);
        return (
          <Wizard
            activeStep={step}
            onStepChange={(s) => {
              onStepChange(s);
              setStep(s);
            }}
            defaultValues={{ name: 'Ada', email: 'ada@example.com', plan: '' }}
          />
        );
      }
      const user = userEvent.setup();
      render(<Controlled />);
      await next(user);
      expect(await screen.findByRole('heading', { name: 'Step 2 of 2: Plan' })).toBeInTheDocument();
      expect(onStepChange).toHaveBeenCalledWith(1);
    });

    it('starts on defaultActiveStep', () => {
      render(<Wizard defaultActiveStep={1} />);
      expect(heading('Step 2 of 2: Plan')).toBeInTheDocument();
    });

    it('translates its labels', async () => {
      const user = userEvent.setup();
      render(
        <Wizard
          labels={{
            next: 'Siguiente',
            back: 'Atrás',
            submit: 'Enviar',
            stepOf: (step, total) => `Paso ${step} de ${total}: `,
          }}
          stepperLabel="Progreso"
          defaultValues={{ name: 'Ada', email: 'ada@example.com', plan: '' }}
        />,
      );
      expect(screen.getByRole('list', { name: 'Progreso' })).toBeInTheDocument();
      expect(heading('Paso 1 de 2: Account')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Siguiente' }));
      expect(await screen.findByRole('button', { name: 'Atrás' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
    });

    it('uses the heading level you choose', () => {
      render(<Wizard headingLevel={3} />);
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('can render a vertical stepper', () => {
      render(<Wizard orientation="vertical" />);
      expect(screen.getByRole('list', { name: 'Progress' })).toHaveClass('axon-stepper--vertical');
    });

    it('can replace the actions', async () => {
      const user = userEvent.setup();
      render(
        <Wizard
          defaultValues={{ name: 'Ada', email: 'ada@example.com', plan: '' }}
          renderActions={({ step, stepCount, next: goNext }) => (
            <button type="button" onClick={() => void goNext()}>
              Continue ({step + 1}/{stepCount})
            </button>
          )}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Continue (1/2)' }));
      expect(await screen.findByRole('button', { name: 'Continue (2/2)' })).toBeInTheDocument();
    });
  });

  it('has no accessibility violations on any step, with errors showing', async () => {
    const user = userEvent.setup();
    const { container } = render(<Wizard />);
    expect(await axe(container)).toHaveNoViolations();
    await next(user);
    await screen.findByText('Name is required.');
    expect(await axe(container)).toHaveNoViolations();
    await fillAccount(user);
    await next(user);
    await screen.findByRole('heading', { name: 'Step 2 of 2: Plan' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
