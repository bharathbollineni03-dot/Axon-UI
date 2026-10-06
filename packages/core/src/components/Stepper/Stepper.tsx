import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useMemo,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import type { AxonColor } from '../../types';
import { cx } from '../../utils/cx';
import { useControllableState } from '../../hooks/useControllableState';
import { AlertCircleIcon, CheckIcon } from '../../internal/icons';

export interface StepperLabels {
  /** Read out after the label of a completed step. */
  completed: string;
  /** Read out after the label of a step with an error. */
  error: string;
  /** Shown under the label of an optional step. */
  optional: string;
}

const DEFAULT_LABELS: StepperLabels = {
  completed: 'completed',
  error: 'has an error',
  optional: 'Optional',
};

interface StepperContextValue {
  activeStep: number;
  stepCount: number;
  orientation: 'horizontal' | 'vertical';
  linear: boolean;
  interactive: boolean;
  select: (step: number) => void;
  labels: StepperLabels;
}

const StepperContext = createContext<StepperContextValue | null>(null);
const StepIndexContext = createContext(0);

export interface StepperProps extends Omit<
  HTMLAttributes<HTMLOListElement>,
  'onChange' | 'defaultValue' | 'color'
> {
  /** The index of the current step, starting at 0. Pass the number of steps to mark all complete. */
  activeStep?: number;
  defaultActiveStep?: number;
  /**
   * Called with the index of a step the user selects. When given, steps become buttons; without
   * it the stepper only shows progress.
   */
  onStepChange?: (step: number) => void;
  orientation?: 'horizontal' | 'vertical';
  /**
   * In a linear stepper the user can only go back to steps they have reached; otherwise any
   * enabled step can be selected. Defaults to `true`.
   */
  linear?: boolean;
  color?: AxonColor;
  /** Accessible text for step states, e.g. to translate them. */
  labels?: Partial<StepperLabels>;
  children?: ReactNode;
}

/** A sequence of steps showing progress through a multi-step flow. */
export const Stepper = forwardRef<HTMLOListElement, StepperProps>(function Stepper(
  {
    activeStep: activeStepProp,
    defaultActiveStep = 0,
    onStepChange,
    orientation = 'horizontal',
    linear = true,
    color = 'primary',
    labels,
    className,
    children,
    ...rest
  },
  ref,
) {
  const [activeStep, setActiveStep] = useControllableState<number>({
    value: activeStepProp,
    defaultValue: defaultActiveStep,
    onChange: onStepChange,
  });
  const steps = Children.toArray(children).filter(isValidElement);
  const mergedLabels = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);

  const context = useMemo<StepperContextValue>(
    () => ({
      activeStep,
      stepCount: steps.length,
      orientation,
      linear,
      interactive: onStepChange !== undefined,
      select: setActiveStep,
      labels: mergedLabels,
    }),
    [activeStep, steps.length, orientation, linear, onStepChange, setActiveStep, mergedLabels],
  );

  return (
    <StepperContext.Provider value={context}>
      <ol
        {...rest}
        ref={ref}
        className={cx(
          'axon-stepper',
          `axon-stepper--${orientation}`,
          `axon-stepper--${color}`,
          className,
        )}
      >
        {steps.map((step, index) => (
          <StepIndexContext.Provider key={step.key ?? index} value={index}>
            {step}
          </StepIndexContext.Provider>
        ))}
      </ol>
    </StepperContext.Provider>
  );
});

export interface StepProps extends Omit<HTMLAttributes<HTMLLIElement>, 'title'> {
  label: ReactNode;
  /** Secondary text under the label. */
  description?: ReactNode;
  /** Marks the step as optional and says so under the label. */
  optional?: boolean;
  /** Marks the step as having a problem. */
  error?: boolean;
  /** Overrides whether the step counts as completed. By default every step before the active one does. */
  completed?: boolean;
  disabled?: boolean;
  /** Replaces the step number in the indicator. */
  icon?: ReactNode;
  /**
   * The step's content. Shown under the active step in a vertical stepper; in a horizontal one
   * render the content yourself, below the stepper.
   */
  children?: ReactNode;
}

export const Step = forwardRef<HTMLLIElement, StepProps>(function Step(
  {
    label,
    description,
    optional = false,
    error = false,
    completed: completedProp,
    disabled = false,
    icon,
    className,
    children,
    ...rest
  },
  ref,
) {
  const context = useContext(StepperContext);
  const index = useContext(StepIndexContext);
  if (!context) throw new Error('Step must be used inside <Stepper>.');
  const { activeStep, stepCount, orientation, linear, interactive, select, labels } = context;

  const active = index === activeStep;
  const completed = completedProp ?? index < activeStep;
  const last = index === stepCount - 1;
  const canSelect = interactive && !disabled && !active && (!linear || index <= activeStep);

  const indicator = error ? (
    <AlertCircleIcon />
  ) : icon ? (
    icon
  ) : completed ? (
    <CheckIcon />
  ) : (
    index + 1
  );

  const header = (
    <>
      <span className="axon-step__indicator" aria-hidden="true">
        {indicator}
      </span>
      <span className="axon-step__text">
        <span className="axon-step__label">
          {label}
          {error ? <span className="axon-visually-hidden"> ({labels.error})</span> : null}
          {completed && !error ? (
            <span className="axon-visually-hidden"> ({labels.completed})</span>
          ) : null}
        </span>
        {optional ? <span className="axon-step__caption">{labels.optional}</span> : null}
        {description ? <span className="axon-step__caption">{description}</span> : null}
      </span>
    </>
  );

  return (
    <li
      {...rest}
      ref={ref}
      aria-current={!interactive && active ? 'step' : undefined}
      className={cx(
        'axon-step',
        active && 'axon-step--active',
        completed && 'axon-step--completed',
        error && 'axon-step--error',
        disabled && 'axon-step--disabled',
        last && 'axon-step--last',
        className,
      )}
    >
      <div className="axon-step__row">
        {interactive ? (
          <button
            type="button"
            className="axon-step__header"
            aria-current={active ? 'step' : undefined}
            disabled={disabled}
            // A step the user cannot reach yet stays focusable so it can still be discovered and read.
            aria-disabled={!canSelect && !active && !disabled ? true : undefined}
            onClick={() => {
              if (canSelect) select(index);
            }}
          >
            {header}
          </button>
        ) : (
          <div className="axon-step__header">{header}</div>
        )}
        {orientation === 'horizontal' && !last ? (
          <span className="axon-step__connector" aria-hidden="true" />
        ) : null}
      </div>
      {orientation === 'vertical' ? (
        <div className="axon-step__body">
          {active && children ? <div className="axon-step__content">{children}</div> : null}
        </div>
      ) : null}
    </li>
  );
});
