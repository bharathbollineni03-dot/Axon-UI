import { forwardRef, type HTMLAttributes } from 'react';
import { useWatch } from 'react-hook-form';
import { getPasswordStrength, type PasswordScore } from './strength';

export interface PasswordStrengthLabels {
  /** The meter's accessible name. */
  meter: string;
  /** What each score is called, from empty (0) to strong (4). */
  scores: [string, string, string, string, string];
}

export const defaultPasswordStrengthLabels: PasswordStrengthLabels = {
  meter: 'Password strength',
  scores: ['', 'Weak', 'Fair', 'Good', 'Strong'],
};

export interface PasswordStrengthMeterProps extends HTMLAttributes<HTMLDivElement> {
  /** The password to rate. */
  value: string;
  labels?: Partial<PasswordStrengthLabels>;
}

/**
 * A four-segment meter and a word that rate a password as it is typed. It is a `role="meter"`
 * named "Password strength", with the word as its value text. See `getPasswordStrength` for what
 * the rating is based on, and for its limits.
 */
export const PasswordStrengthMeter = forwardRef<HTMLDivElement, PasswordStrengthMeterProps>(
  function PasswordStrengthMeter({ value, labels: labelsProp, className, ...rest }, ref) {
    const labels = { ...defaultPasswordStrengthLabels, ...labelsProp };
    const { score } = getPasswordStrength(value);
    const word = labels.scores[score];
    return (
      <div
        {...rest}
        ref={ref}
        role="meter"
        aria-label={labels.meter}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        aria-valuetext={word || undefined}
        className={['axon-password-strength', `axon-password-strength--${score}`, className]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="axon-password-strength__bar" aria-hidden="true">
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={[
                'axon-password-strength__segment',
                segment <= score && 'axon-password-strength__segment--on',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          ))}
        </span>
        <span className="axon-password-strength__label" aria-hidden="true">
          {word}
        </span>
      </div>
    );
  },
);

/** The meter for the form field called `name`, kept up to date as the user types. */
export function PasswordStrengthField({
  name = 'password',
  labels,
}: {
  name?: string;
  labels?: Partial<PasswordStrengthLabels>;
}) {
  const value = useWatch({ name }) as string | undefined;
  return <PasswordStrengthMeter value={value ?? ''} labels={labels} />;
}

export type { PasswordScore };
