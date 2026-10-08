import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import type { FieldErrors, FieldValues } from 'react-hook-form';
import { Button, Step, Stepper, useControllableState, type StepperLabels } from '@axonui/core';
import { Form, useAxonForm, type FormProps } from '../Form/Form';
import { useFormStatus } from '../Form/FormStatus';

export interface FormWizardStep {
  /** A stable id for the step. */
  id: string;
  /** The step's name: its heading and its label in the stepper. */
  label: ReactNode;
  description?: ReactNode;
  /** Marks the step as optional in the stepper. */
  optional?: boolean;
  /**
   * The names of the fields on this step. Next validates exactly these, and a failed final submit
   * returns to the first step that has an error. Leave it out for a step with nothing to validate.
   */
  fields?: string[];
  /** The step's fields. Only the current step is rendered; values are kept when it is not. */
  content: ReactNode;
}

export interface FormWizardLabels {
  back: ReactNode;
  next: ReactNode;
  submit: ReactNode;
  /** The name of the review step that `summary` adds. */
  summary: ReactNode;
  /** The hidden text before each step's heading, e.g. "Step 2 of 4: ". */
  stepOf: (step: number, total: number) => string;
}

const defaultLabels: FormWizardLabels = {
  back: 'Back',
  next: 'Next',
  submit: 'Submit',
  summary: 'Review',
  stepOf: (step, total) => `Step ${step} of ${total}: `,
};

export interface FormWizardProps<
  TInput extends FieldValues = FieldValues,
  TOutput extends FieldValues = TInput,
> extends Omit<FormProps<TInput, TOutput>, 'children' | 'form' | 'beforeSubmit'> {
  steps: FormWizardStep[];
  /**
   * Adds a final review step. It receives the values entered so far and a function that goes to
   * a step by index, for "Edit" links. The submit button is on this step.
   */
  summary?: (values: TInput, goToStep: (index: number) => void) => ReactNode;
  /** The current step's index. Controlled; pair with `onStepChange`. */
  activeStep?: number;
  defaultActiveStep?: number;
  onStepChange?: (step: number) => void;
  orientation?: 'horizontal' | 'vertical';
  /** Heading level of each step's title. Defaults to 2. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Whether the stepper only goes back (default), or lets users jump to any step. */
  linear?: boolean;
  labels?: Partial<FormWizardLabels>;
  /** Text the stepper reads out for step states, to translate them. */
  stepperLabels?: Partial<StepperLabels>;
  /** Accessible name of the stepper. Defaults to "Progress". */
  stepperLabel?: string;
  /** Shown instead of the default Back and Next row. */
  renderActions?: (api: FormWizardApi) => ReactNode;
}

/** What `renderActions` receives. */
export interface FormWizardApi {
  step: number;
  stepCount: number;
  isFirst: boolean;
  isLast: boolean;
  isSubmitting: boolean;
  back: () => void;
  next: () => Promise<boolean>;
}

type StepStatus = 'completed' | 'error';

/** Whether one of the step's `fields` has an error. Nested names (`a.b`) match on their root. */
function stepHasError(step: FormWizardStep, errors: FieldErrors): boolean {
  const names = Object.keys(errors);
  return Boolean(step.fields?.some((field) => names.includes(field.split('.')[0] ?? field)));
}

function FormWizardInner<TInput extends FieldValues, TOutput extends FieldValues = TInput>(
  props: FormWizardProps<TInput, TOutput>,
  ref: Ref<HTMLFormElement>,
) {
  const {
    steps,
    summary,
    activeStep: activeStepProp,
    defaultActiveStep = 0,
    onStepChange,
    orientation = 'horizontal',
    headingLevel = 2,
    linear = true,
    labels: labelsProp,
    stepperLabels,
    stepperLabel = 'Progress',
    renderActions,
    schema,
    validate,
    defaultValues,
    mode,
    reValidateMode,
    onInvalid,
    ...formProps
  } = props;

  const labels = { ...defaultLabels, ...labelsProp };
  const form = useAxonForm<TInput, TOutput>({
    schema,
    validate,
    defaultValues,
    mode,
    reValidateMode,
  });

  // The review step is one more step at the end, with nothing to validate.
  const allSteps: FormWizardStep[] = summary
    ? [...steps, { id: 'axon-wizard-summary', label: labels.summary, content: null }]
    : steps;
  const lastIndex = allSteps.length - 1;

  const [current, setCurrent] = useControllableState<number>({
    value: activeStepProp,
    defaultValue: defaultActiveStep,
    onChange: onStepChange,
  });
  const index = Math.min(Math.max(current, 0), lastIndex);
  const step = allSteps[index]!;
  const [statuses, setStatuses] = useState<Record<string, StepStatus | undefined>>({});

  // Move focus to the new step's heading, which also reads out "Step 2 of 4: Address".
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);
  useEffect(() => {
    if (focusHeading.current) headingRef.current?.focus();
    focusHeading.current = false;
  }, [index]);

  const goTo = useCallback(
    (target: number) => {
      focusHeading.current = true;
      setCurrent(Math.min(Math.max(target, 0), lastIndex));
    },
    [lastIndex, setCurrent],
  );

  const back = useCallback(() => goTo(index - 1), [goTo, index]);

  const next = useCallback(async (): Promise<boolean> => {
    const fields = step.fields ?? [];
    const valid =
      fields.length === 0 ? true : await form.trigger(fields as never, { shouldFocus: true });
    setStatuses((current) => ({ ...current, [step.id]: valid ? 'completed' : 'error' }));
    if (valid) goTo(index + 1);
    return valid;
  }, [form, goTo, index, step.fields, step.id]);

  const isLast = index === lastIndex;

  // A failed final submit marks every step with an error and returns to the first of them.
  const handleInvalid = (errors: FieldErrors<TInput>) => {
    const failing = allSteps.findIndex((candidate) => stepHasError(candidate, errors));
    if (failing >= 0) {
      setStatuses((current) => {
        const updated = { ...current };
        for (const candidate of allSteps) {
          if (stepHasError(candidate, errors)) updated[candidate.id] = 'error';
          else if (updated[candidate.id] === 'error') updated[candidate.id] = 'completed';
        }
        return updated;
      });
      if (failing !== index) goTo(failing);
    }
    onInvalid?.(errors);
  };

  const headingId = useId();
  const Heading = `h${headingLevel}` as const;

  return (
    <Form<TInput, TOutput>
      {...formProps}
      ref={ref}
      form={form}
      className={['axon-form-wizard', formProps.className].filter(Boolean).join(' ')}
      // Enter in a field means "next" until the last step, where it submits.
      beforeSubmit={() => {
        if (isLast) return false;
        void next();
        return true;
      }}
      onInvalid={handleInvalid}
    >
      <Stepper
        aria-label={stepperLabel}
        orientation={orientation}
        linear={linear}
        activeStep={index}
        onStepChange={(target) => {
          if (target < index || !linear) goTo(target);
        }}
        labels={stepperLabels}
      >
        {allSteps.map((item) => (
          <Step
            key={item.id}
            label={item.label}
            optional={item.optional}
            error={statuses[item.id] === 'error'}
          />
        ))}
      </Stepper>

      <section className="axon-form-wizard__panel" aria-labelledby={headingId}>
        <Heading id={headingId} ref={headingRef} tabIndex={-1} className="axon-form-wizard__title">
          <span className="axon-visually-hidden">{labels.stepOf(index + 1, allSteps.length)}</span>
          {step.label}
        </Heading>
        {step.description ? (
          <p className="axon-form-wizard__description">{step.description}</p>
        ) : null}
        <div className="axon-form-wizard__content">
          {summary && isLast ? summary(form.getValues() as TInput, goTo) : step.content}
        </div>
      </section>

      <WizardActions
        labels={labels}
        index={index}
        count={allSteps.length}
        back={back}
        next={next}
        renderActions={renderActions}
      />
    </Form>
  );
}

function WizardActions({
  labels,
  index,
  count,
  back,
  next,
  renderActions,
}: {
  labels: FormWizardLabels;
  index: number;
  count: number;
  back: () => void;
  next: () => Promise<boolean>;
  renderActions?: (api: FormWizardApi) => ReactNode;
}) {
  const { isSubmitting } = useFormStatus();
  const isFirst = index === 0;
  const isLast = index === count - 1;

  if (renderActions) {
    return (
      <div className="axon-form-wizard__actions">
        {renderActions({
          step: index,
          stepCount: count,
          isFirst,
          isLast,
          isSubmitting,
          back,
          next,
        })}
      </div>
    );
  }

  return (
    <div className="axon-form-wizard__actions">
      {isFirst ? null : (
        <Button
          type="button"
          variant="outline"
          color="neutral"
          disabled={isSubmitting}
          onClick={back}
        >
          {labels.back}
        </Button>
      )}
      <Button type="submit" loading={isLast && isSubmitting}>
        {isLast ? labels.submit : labels.next}
      </Button>
    </div>
  );
}

/**
 * A multi-step form: a stepper, one step's fields at a time, per-step validation, Back and Next,
 * and an optional review step before submitting. All steps share one form, so values are kept as
 * users move back and forth, and `schema` validates the whole thing on the final submit.
 *
 * Give each step the `fields` it contains. Next validates just those; if the final submit fails,
 * the wizard returns to the first step with an error. Each step's heading gets focus when the
 * step changes, which reads out "Step 2 of 4: Address".
 */
export const FormWizard = forwardRef(FormWizardInner) as <
  TInput extends FieldValues = FieldValues,
  TOutput extends FieldValues = TInput,
>(
  props: FormWizardProps<TInput, TOutput> & { ref?: Ref<HTMLFormElement> },
) => ReactElement;
