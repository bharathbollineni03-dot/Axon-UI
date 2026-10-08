import { createRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { FormActions } from '../FormActions/FormActions';
import { FormTextField } from '../FormBindings/FormBindings';
import { FormSubmitError } from '../../internal/serverErrors';
import { Form, type FormProps } from './Form';
import { useFormStatus } from './FormStatus';

const schema = z.object({
  email: z.string().min(1, 'Email is required.').pipe(z.email('Enter a valid email.')),
  age: z.coerce.number().min(18, 'You must be 18 or older.'),
});

type Values = z.input<typeof schema>;
type Parsed = z.output<typeof schema>;

function Example(props: Partial<FormProps<Values, Parsed>> = {}) {
  return (
    <Form<Values, Parsed>
      schema={schema}
      defaultValues={{ email: '', age: '' as unknown as number }}
      onSubmit={() => {}}
      {...props}
    >
      <FormTextField name="email" label="Email" />
      <FormTextField name="age" label="Age" type="number" />
      <FormActions submitLabel="Save" />
    </Form>
  );
}

const submit = () => userEvent.setup().click(screen.getByRole('button', { name: 'Save' }));

describe('Form', () => {
  it('renders a form with native validation turned off', () => {
    const { container } = render(<Example />);
    const form = container.querySelector('form');
    expect(form).toHaveAttribute('novalidate');
    expect(form).toHaveClass('axon-form');
  });

  it('forwards the ref and spreads props and className onto the form', () => {
    const ref = createRef<HTMLFormElement>();
    render(
      <Form ref={ref} className="extra" data-testid="f" aria-label="Profile" onSubmit={() => {}} />,
    );
    expect(ref.current).toBe(screen.getByTestId('f'));
    expect(ref.current).toHaveClass('axon-form', 'extra');
    expect(screen.getByRole('form', { name: 'Profile' })).toBe(ref.current);
  });

  describe('validation', () => {
    it('shows the schema messages and does not submit when values are invalid', async () => {
      const onSubmit = vi.fn();
      render(<Example onSubmit={onSubmit} />);
      await submit();
      expect(await screen.findByText('Email is required.')).toBeInTheDocument();
      expect(screen.getByText('You must be 18 or older.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('marks invalid fields with aria-invalid and describes them with the message', async () => {
      render(<Example />);
      await submit();
      const email = await screen.findByLabelText('Email');
      expect(email).toHaveAttribute('aria-invalid', 'true');
      expect(email).toHaveAccessibleDescription('Email is required.');
    });

    it('focuses the first invalid field', async () => {
      render(<Example />);
      await submit();
      await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus());
    });

    it('calls onInvalid with the errors', async () => {
      const onInvalid = vi.fn();
      render(<Example onInvalid={onInvalid} />);
      await submit();
      await waitFor(() => expect(onInvalid).toHaveBeenCalledTimes(1));
      expect(Object.keys(onInvalid.mock.calls[0]![0])).toEqual(['email', 'age']);
    });

    it('validates a field on blur by default (onTouched), then as it changes', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.click(screen.getByLabelText('Email'));
      expect(screen.queryByText('Email is required.')).not.toBeInTheDocument();
      await user.tab();
      expect(await screen.findByText('Email is required.')).toBeInTheDocument();
      await user.type(screen.getByLabelText('Email'), 'not-an-email');
      expect(await screen.findByText('Enter a valid email.')).toBeInTheDocument();
      await user.clear(screen.getByLabelText('Email'));
      await user.type(screen.getByLabelText('Email'), 'ada@example.com');
      await waitFor(() =>
        expect(screen.queryByText('Enter a valid email.')).not.toBeInTheDocument(),
      );
    });

    it('waits until submit with mode="onSubmit"', async () => {
      const user = userEvent.setup();
      render(<Example mode="onSubmit" />);
      await user.click(screen.getByLabelText('Email'));
      await user.tab();
      expect(screen.queryByText('Email is required.')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('Email is required.')).toBeInTheDocument();
    });

    it('works with a custom validator alone', async () => {
      const validate = vi.fn((values: { name: string }) =>
        values.name === 'taken' ? { name: 'That name is taken.' } : undefined,
      );
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(
        <Form<{ name: string }>
          validate={validate}
          defaultValues={{ name: 'taken' }}
          onSubmit={onSubmit}
        >
          <FormTextField name="name" label="Name" />
          <FormActions submitLabel="Save" />
        </Form>,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('That name is taken.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
      await user.clear(screen.getByLabelText('Name'));
      await user.type(screen.getByLabelText('Name'), 'free');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });

    it('supports an async custom validator and nested error keys', async () => {
      const user = userEvent.setup();
      render(
        <Form<{ address: { city: string } }>
          validate={async (values) => {
            await Promise.resolve();
            return values.address.city ? undefined : { 'address.city': 'City is required.' };
          }}
          defaultValues={{ address: { city: '' } }}
          onSubmit={() => {}}
        >
          <FormTextField name="address.city" label="City" />
          <FormActions submitLabel="Save" />
        </Form>,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('City is required.')).toBeInTheDocument();
    });

    it('runs the custom validator after the schema, on the parsed values', async () => {
      const validate = vi.fn(() => ({ age: 'Custom rule failed.' }));
      const user = userEvent.setup();
      render(
        <Example
          validate={validate}
          defaultValues={{ email: 'ada@example.com', age: '20' as unknown as number }}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('Custom rule failed.')).toBeInTheDocument();
      expect(validate).toHaveBeenCalledWith({ email: 'ada@example.com', age: 20 });
    });
  });

  describe('submitting', () => {
    it('calls onSubmit with the parsed values (the schema output)', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<Example onSubmit={onSubmit} />);
      await user.type(screen.getByLabelText('Email'), 'ada@example.com');
      await user.type(screen.getByLabelText('Age'), '36');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toEqual({ email: 'ada@example.com', age: 36 });
    });

    it('is busy while an async onSubmit runs, and ignores a second submit', async () => {
      let finish: () => void = () => {};
      const onSubmit = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      );
      const user = userEvent.setup();
      const { container } = render(
        <Example
          onSubmit={onSubmit}
          defaultValues={{ email: 'ada@example.com', age: '36' as unknown as number }}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() =>
        expect(container.querySelector('form')).toHaveAttribute('aria-busy', 'true'),
      );
      expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-busy', 'true');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
      finish();
      await waitFor(() => expect(container.querySelector('form')).not.toHaveAttribute('aria-busy'));
      expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('aria-busy');
    });

    it('submits with Enter from a field', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(
        <Example
          onSubmit={onSubmit}
          defaultValues={{ email: 'ada@example.com', age: '36' as unknown as number }}
        />,
      );
      await user.type(screen.getByLabelText('Age'), '{Enter}');
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });

    it('resets to the default values after success with resetOnSuccess', async () => {
      const user = userEvent.setup();
      render(
        <Example resetOnSuccess defaultValues={{ email: '', age: '' as unknown as number }} />,
      );
      await user.type(screen.getByLabelText('Email'), 'ada@example.com');
      await user.type(screen.getByLabelText('Age'), '36');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(screen.getByLabelText('Email')).toHaveValue(''));
    });

    it('keeps the values after success by default', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<Example onSubmit={onSubmit} />);
      await user.type(screen.getByLabelText('Email'), 'ada@example.com');
      await user.type(screen.getByLabelText('Age'), '36');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
    });
  });

  describe('server errors', () => {
    const filled = { email: 'ada@example.com', age: '36' as unknown as number };

    it('shows a thrown error message in an alert banner', async () => {
      const onSubmitError = vi.fn();
      const user = userEvent.setup();
      render(
        <Example
          defaultValues={filled}
          onSubmitError={onSubmitError}
          onSubmit={() => {
            throw new Error('The server is down.');
          }}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('The server is down.');
      expect(onSubmitError).toHaveBeenCalledTimes(1);
    });

    it('uses a fallback message for an error without one', async () => {
      const user = userEvent.setup();
      render(
        <Example
          defaultValues={filled}
          onSubmit={() => Promise.reject(new Error(''))}
          fallbackErrorMessage="Please try again later."
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Please try again later.');
    });

    it('maps returned fieldErrors onto the fields and focuses the first', async () => {
      const user = userEvent.setup();
      render(
        <Example
          defaultValues={filled}
          onSubmit={() => ({ fieldErrors: { email: 'That email is already registered.' } })}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('That email is already registered.')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
      await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus());
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows a returned formError and fieldErrors together', async () => {
      const user = userEvent.setup();
      render(
        <Example
          defaultValues={filled}
          onSubmit={() => ({
            formError: 'We could not save your changes.',
            fieldErrors: { age: ['Too young.', 'Ignored second message.'] },
          })}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('We could not save your changes.');
      expect(screen.getByText('Too young.')).toBeInTheDocument();
      expect(screen.queryByText('Ignored second message.')).not.toBeInTheDocument();
    });

    it('maps a thrown FormSubmitError', async () => {
      const onSubmitError = vi.fn();
      const user = userEvent.setup();
      render(
        <Example
          defaultValues={filled}
          onSubmitError={onSubmitError}
          onSubmit={() => {
            throw new FormSubmitError({
              formError: 'Could not sign up.',
              fieldErrors: { email: 'Already taken.' },
            });
          }}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('Already taken.')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Could not sign up.');
      // A FormSubmitError is an expected outcome, not a failure to report.
      expect(onSubmitError).not.toHaveBeenCalled();
    });

    it('accepts a string for a FormSubmitError', () => {
      const error = new FormSubmitError('Nope.');
      expect(error.message).toBe('Nope.');
      expect(error.formError).toBe('Nope.');
      expect(error).toBeInstanceOf(Error);
    });

    it('lets onSubmit use the helpers: setError, setFormError and reset', async () => {
      const user = userEvent.setup();
      render(
        <Example
          defaultValues={filled}
          onSubmit={(_values, helpers) => {
            helpers.setError('email', 'Set through the helper.');
            helpers.setFormError('Form-level, through the helper.');
          }}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('Set through the helper.')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Form-level, through the helper.');
    });

    it('clears a field error when the user edits the field', async () => {
      const user = userEvent.setup();
      render(
        <Example
          defaultValues={filled}
          onSubmit={() => ({ fieldErrors: { email: 'Already registered.' } })}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('Already registered.')).toBeInTheDocument();
      await user.type(screen.getByLabelText('Email'), 'x');
      await waitFor(() =>
        expect(screen.queryByText('Already registered.')).not.toBeInTheDocument(),
      );
    });

    it('clears the banner on the next submit', async () => {
      let fail = true;
      const user = userEvent.setup();
      render(
        <Example
          defaultValues={filled}
          onSubmit={() => {
            if (fail) throw new Error('First attempt failed.');
          }}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      fail = false;
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    });

    it('shows a formError you control', () => {
      render(<Example formError="Your session expired." />);
      expect(screen.getByRole('alert')).toHaveTextContent('Your session expired.');
    });
  });

  describe('status', () => {
    it('shares the submitting state through useFormStatus', async () => {
      function Probe() {
        const { isSubmitting } = useFormStatus();
        return <output>{isSubmitting ? 'busy' : 'idle'}</output>;
      }
      let finish: () => void = () => {};
      const user = userEvent.setup();
      render(
        <Form<Values, Parsed>
          schema={schema}
          defaultValues={{ email: 'ada@example.com', age: '36' as unknown as number }}
          onSubmit={() => new Promise<void>((resolve) => (finish = resolve))}
        >
          <Probe />
          <FormActions submitLabel="Save" />
        </Form>,
      );
      expect(screen.getByRole('status')).toHaveTextContent('idle');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('busy'));
      finish();
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('idle'));
    });

    it('reports idle outside a Form', () => {
      function Probe() {
        const { isSubmitting, disabled } = useFormStatus();
        return <output>{`${isSubmitting}/${disabled}`}</output>;
      }
      render(<Probe />);
      expect(screen.getByRole('status')).toHaveTextContent('false/false');
    });
  });

  describe('options', () => {
    it('disables every field when disabled', () => {
      render(<Example disabled />);
      expect(screen.getByLabelText('Email')).toBeDisabled();
      expect(screen.getByLabelText('Age')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('takes defaultValues', () => {
      render(
        <Example defaultValues={{ email: 'ada@example.com', age: '36' as unknown as number }} />,
      );
      expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
    });

    it('accepts a render function for children', () => {
      render(
        <Form<{ name: string }> defaultValues={{ name: 'Ada' }} onSubmit={() => {}}>
          {(form) => <p>Hello {form.getValues('name')}</p>}
        </Form>,
      );
      expect(screen.getByText('Hello Ada')).toBeInTheDocument();
    });

    it('works with your own useForm instance', async () => {
      const onSubmit = vi.fn();
      function Own() {
        const form = useForm<{ name: string }>({ defaultValues: { name: 'Ada' } });
        return (
          <Form<{ name: string }> form={form} onSubmit={onSubmit}>
            <FormTextField name="name" label="Name" />
            <FormActions submitLabel="Save" />
          </Form>
        );
      }
      render(<Own />);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toEqual({ name: 'Ada' });
    });

    it('lets beforeSubmit take over a submission', async () => {
      const onSubmit = vi.fn();
      const beforeSubmit = vi.fn(() => true);
      const user = userEvent.setup();
      render(<Example onSubmit={onSubmit} beforeSubmit={beforeSubmit} />);
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(beforeSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.queryByText('Email is required.')).not.toBeInTheDocument();
    });

    it('supports being rendered by a parent that changes defaults (state in the parent)', async () => {
      function Parent() {
        const [count, setCount] = useState(0);
        return (
          <>
            <button onClick={() => setCount((c) => c + 1)}>Rerender {count}</button>
            <Example />
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);
      await user.type(screen.getByLabelText('Email'), 'ada');
      await user.click(screen.getByRole('button', { name: /Rerender/ }));
      expect(screen.getByLabelText('Email')).toHaveValue('ada');
    });
  });

  it('has no accessibility violations, including with errors showing', async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Email is required.');
    expect(await axe(container)).toHaveNoViolations();
  });
});
