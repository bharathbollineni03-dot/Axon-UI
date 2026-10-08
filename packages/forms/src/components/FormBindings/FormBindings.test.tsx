import { createRef, type ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { FormProvider, useForm, type FieldValues } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { Form } from '../Form/Form';
import { FormActions } from '../FormActions/FormActions';
import { FormField } from '../FormField/FormField';
import {
  FormCheckbox,
  FormCheckboxGroup,
  FormDatePicker,
  FormFileUpload,
  FormMultiSelect,
  FormNumberInput,
  FormOTPInput,
  FormRadioGroup,
  FormSelect,
  FormSlider,
  FormSwitch,
  FormTextArea,
  FormTextField,
  FormTimePicker,
} from './FormBindings';

/** A form around one binding, whose submitted values the test reads. */
function setup(
  children: ReactNode,
  options: {
    defaultValues?: FieldValues;
    validate?: (values: FieldValues) => Record<string, string> | undefined;
  } = {},
) {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const utils = render(
    <Form
      defaultValues={options.defaultValues ?? {}}
      validate={options.validate}
      onSubmit={onSubmit}
    >
      {children}
      <FormActions submitLabel="Save" />
    </Form>,
  );
  const save = async () => {
    await user.click(screen.getByRole('button', { name: 'Save' }));
  };
  const submitted = async () => {
    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    return onSubmit.mock.calls.at(-1)![0] as FieldValues;
  };
  return { user, onSubmit, save, submitted, ...utils };
}

const options = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];

describe('FormTextField', () => {
  it('shows the form value, and typing updates it', async () => {
    const { user, submitted } = setup(<FormTextField name="name" label="Name" />, {
      defaultValues: { name: 'Ada' },
    });
    expect(screen.getByLabelText('Name')).toHaveValue('Ada');
    await user.type(screen.getByLabelText('Name'), ' Lovelace');
    expect(await submitted()).toEqual({ name: 'Ada Lovelace' });
  });

  it('starts empty when the form has no value for it', () => {
    setup(<FormTextField name="name" label="Name" />);
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('uses the defaultValue prop when the form has none', async () => {
    const { submitted } = setup(<FormTextField name="name" label="Name" defaultValue="Grace" />);
    expect(screen.getByLabelText('Name')).toHaveValue('Grace');
    expect(await submitted()).toEqual({ name: 'Grace' });
  });

  it('shows the error from the form in place of the helper text', async () => {
    const { save } = setup(<FormTextField name="name" label="Name" helperText="Your full name" />, {
      validate: () => ({ name: 'Name is required.' }),
    });
    expect(screen.getByText('Your full name')).toBeInTheDocument();
    await save();
    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(screen.queryByText('Your full name')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('still calls onChange and onBlur after the form has handled them', async () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const { user } = setup(
      <FormTextField name="name" label="Name" onChange={onChange} onBlur={onBlur} />,
    );
    await user.type(screen.getByLabelText('Name'), 'ab');
    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('forwards the ref to the input', () => {
    const ref = createRef<HTMLInputElement>();
    setup(<FormTextField name="name" label="Name" ref={ref} />);
    expect(ref.current).toBe(screen.getByLabelText('Name'));
  });

  it('can be disabled on its own', () => {
    setup(<FormTextField name="name" label="Name" disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });

  it('clears through the clear button', async () => {
    const { user, submitted } = setup(<FormTextField name="name" label="Name" clearable />, {
      defaultValues: { name: 'Ada' },
    });
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(await submitted()).toEqual({ name: '' });
  });

  it('takes a control prop, so it works without a Form', async () => {
    const onSubmit = vi.fn();
    function Standalone() {
      const form = useForm({ defaultValues: { nick: 'Ada' } });
      return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormTextField name="nick" label="Nickname" control={form.control as never} />
          <button>Go</button>
        </form>
      );
    }
    render(<Standalone />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Go' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toEqual({ nick: 'Ada' });
  });

  it('works inside a plain react-hook-form FormProvider', async () => {
    const onSubmit = vi.fn();
    function Provided() {
      const form = useForm({ defaultValues: { nick: 'Ada' } });
      return (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormTextField name="nick" label="Nickname" />
            <button>Go</button>
          </form>
        </FormProvider>
      );
    }
    render(<Provided />);
    expect(screen.getByLabelText('Nickname')).toHaveValue('Ada');
  });

  it('supports nested names', async () => {
    const { user, submitted } = setup(<FormTextField name="address.city" label="City" />, {
      defaultValues: { address: { city: '' } },
    });
    await user.type(screen.getByLabelText('City'), 'London');
    expect(await submitted()).toEqual({ address: { city: 'London' } });
  });
});

describe('FormTextArea', () => {
  it('binds a textarea', async () => {
    const { user, submitted } = setup(<FormTextArea name="bio" label="Bio" />);
    await user.type(screen.getByLabelText('Bio'), 'Hello');
    expect(await submitted()).toEqual({ bio: 'Hello' });
  });
});

describe('FormNumberInput', () => {
  it('holds a number, or null when empty', async () => {
    const { user, submitted } = setup(<FormNumberInput name="qty" label="Quantity" />);
    await user.type(screen.getByLabelText('Quantity'), '5');
    expect(await submitted()).toEqual({ qty: 5 });
  });

  it('starts from the form value and steps with the buttons', async () => {
    const { user, submitted } = setup(<FormNumberInput name="qty" label="Quantity" />, {
      defaultValues: { qty: 2 },
    });
    expect(screen.getByLabelText('Quantity')).toHaveValue('2');
    await user.click(screen.getByRole('button', { name: /increase/i }));
    expect(await submitted()).toEqual({ qty: 3 });
  });
});

describe('FormOTPInput', () => {
  it('holds the typed code', async () => {
    const { user, submitted } = setup(<FormOTPInput name="code" label="Code" length={4} />);
    await user.click(screen.getAllByRole('textbox')[0]!);
    await user.keyboard('1234');
    expect(await submitted()).toEqual({ code: '1234' });
  });
});

describe('FormSelect', () => {
  it('shows the selected option and updates when another is chosen', async () => {
    const { user, submitted } = setup(<FormSelect name="color" label="Color" options={options} />, {
      defaultValues: { color: 'green' },
    });
    const trigger = screen.getByRole('combobox', { name: /Color/ });
    expect(trigger).toHaveTextContent('Green');
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: 'Blue' }));
    expect(await submitted()).toEqual({ color: 'blue' });
  });

  it('holds null while nothing is selected', async () => {
    const { submitted } = setup(
      <FormSelect name="color" label="Color" options={options} placeholder="Pick one" />,
    );
    expect(screen.getByRole('combobox', { name: /Color/ })).toHaveTextContent('Pick one');
    expect(await submitted()).toEqual({ color: null });
  });

  it('shows the form error', async () => {
    const { save } = setup(<FormSelect name="color" label="Color" options={options} />, {
      validate: () => ({ color: 'Choose a color.' }),
    });
    await save();
    expect(await screen.findByText('Choose a color.')).toBeInTheDocument();
  });
});

describe('FormMultiSelect', () => {
  it('holds an array of the chosen values', async () => {
    const { user, submitted } = setup(
      <FormMultiSelect name="colors" label="Colors" options={options} />,
    );
    await user.click(screen.getByRole('combobox', { name: /Colors/ }));
    await user.click(await screen.findByRole('option', { name: 'Red' }));
    await user.click(await screen.findByRole('option', { name: 'Blue' }));
    expect(await submitted()).toEqual({ colors: ['red', 'blue'] });
  });
});

describe('FormRadioGroup', () => {
  it('selects one option', async () => {
    const { user, submitted } = setup(
      <FormRadioGroup name="color" label="Color" options={options} />,
    );
    await user.click(screen.getByRole('radio', { name: 'Green' }));
    expect(await submitted()).toEqual({ color: 'green' });
  });

  it('checks the radio that matches the form value', () => {
    setup(<FormRadioGroup name="color" label="Color" options={options} />, {
      defaultValues: { color: 'blue' },
    });
    expect(screen.getByRole('radio', { name: 'Blue' })).toBeChecked();
  });

  it('shows the form error', async () => {
    const { save } = setup(<FormRadioGroup name="color" label="Color" options={options} />, {
      validate: () => ({ color: 'Pick a color.' }),
    });
    await save();
    expect(await screen.findByText('Pick a color.')).toBeInTheDocument();
  });
});

describe('FormCheckboxGroup', () => {
  it('holds an array of the checked values', async () => {
    const { user, submitted } = setup(
      <FormCheckboxGroup name="colors" label="Colors" options={options} />,
    );
    await user.click(screen.getByRole('checkbox', { name: 'Red' }));
    await user.click(screen.getByRole('checkbox', { name: 'Green' }));
    await user.click(screen.getByRole('checkbox', { name: 'Red' }));
    expect(await submitted()).toEqual({ colors: ['green'] });
  });
});

describe('FormCheckbox and FormSwitch', () => {
  it('hold a boolean', async () => {
    const { user, submitted } = setup(
      <>
        <FormCheckbox name="terms" label="I accept the terms" />
        <FormSwitch name="alerts" label="Alerts" />
      </>,
    );
    expect(screen.getByRole('checkbox', { name: 'I accept the terms' })).not.toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'I accept the terms' }));
    await user.click(screen.getByRole('switch', { name: 'Alerts' }));
    expect(await submitted()).toEqual({ terms: true, alerts: true });
  });

  it('start from the form value', () => {
    setup(
      <>
        <FormCheckbox name="terms" label="Terms" />
        <FormSwitch name="alerts" label="Alerts" />
      </>,
      { defaultValues: { terms: true, alerts: false } },
    );
    expect(screen.getByRole('checkbox', { name: 'Terms' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Alerts' })).not.toBeChecked();
  });

  it('show the error as the description while invalid, and restore the description after', async () => {
    const { user, save } = setup(
      <FormCheckbox name="terms" label="Terms" description="Read them first." />,
      {
        validate: (values) =>
          values['terms'] ? undefined : { terms: 'You must accept the terms.' },
      },
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Terms' });
    expect(checkbox).toHaveAccessibleDescription('Read them first.');
    await save();
    await waitFor(() => expect(checkbox).toHaveAccessibleDescription('You must accept the terms.'));
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toHaveAccessibleDescription('Read them first.'));
  });

  it('show a switch error too', async () => {
    const { save } = setup(<FormSwitch name="alerts" label="Alerts" />, {
      validate: () => ({ alerts: 'Turn alerts on.' }),
    });
    await save();
    expect(await screen.findByText('Turn alerts on.')).toBeInTheDocument();
  });
});

describe('FormDatePicker', () => {
  it('holds a Date, or null when empty', async () => {
    const { user, submitted } = setup(<FormDatePicker name="when" label="Date" />);
    await user.type(screen.getByLabelText('Date'), '01/15/2025');
    await user.tab();
    const values = await submitted();
    const when = values['when'] as Date;
    expect(when).toBeInstanceOf(Date);
    expect([when.getFullYear(), when.getMonth(), when.getDate()]).toEqual([2025, 0, 15]);
  });

  it('is null while empty', async () => {
    const { submitted } = setup(<FormDatePicker name="when" label="Date" />);
    expect(await submitted()).toEqual({ when: null });
  });
});

describe('FormTimePicker', () => {
  it('holds a 24-hour HH:mm string', async () => {
    const { user, submitted } = setup(<FormTimePicker name="at" label="Time" />);
    await user.type(screen.getByLabelText('Time'), '3:30 pm');
    await user.tab();
    expect(await submitted()).toEqual({ at: '15:30' });
  });
});

describe('FormFileUpload', () => {
  it('holds an array of files', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const { user, submitted } = setup(<FormFileUpload name="docs" label="Documents" multiple />);
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, file);
    const values = await submitted();
    expect(values['docs']).toEqual([file]);
    expect(screen.getByText('hello.txt')).toBeInTheDocument();
  });

  it('is an empty array before anything is added', async () => {
    const { submitted } = setup(<FormFileUpload name="docs" label="Documents" />);
    expect(await submitted()).toEqual({ docs: [] });
  });

  it('shows the form error', async () => {
    const { save } = setup(<FormFileUpload name="docs" label="Documents" />, {
      validate: () => ({ docs: 'Attach a document.' }),
    });
    await save();
    expect(await screen.findByText('Attach a document.')).toBeInTheDocument();
  });
});

describe('FormSlider', () => {
  it('starts at the form value, or at min', () => {
    setup(<FormSlider name="temperature" label="Temperature" min={0} max={2} step={0.1} />, {
      defaultValues: { temperature: 0.7 },
    });
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0.7');
  });

  it('starts at min when the form has no value', () => {
    setup(<FormSlider name="p" label="Top P" min={0.2} max={1} step={0.1} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0.2');
  });

  it('holds a number that follows the keyboard', async () => {
    const { user, submitted } = setup(
      <FormSlider name="temperature" label="Temperature" min={0} max={2} step={0.1} />,
      { defaultValues: { temperature: 0.7 } },
    );
    screen.getByRole('slider').focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(await submitted()).toEqual({ temperature: 0.9 });
  });

  it('shows helper text, and the error in its place', async () => {
    const { save } = setup(
      <FormSlider name="temperature" label="Temperature" helperText="Higher is more random" />,
      { validate: () => ({ temperature: 'Too hot.' }) },
    );
    expect(screen.getByText('Higher is more random')).toBeInTheDocument();
    await save();
    expect(await screen.findByText('Too hot.')).toBeInTheDocument();
    expect(screen.queryByText('Higher is more random')).not.toBeInTheDocument();
  });

  it('is disabled with the form', () => {
    render(
      <Form defaultValues={{}} onSubmit={() => {}} disabled>
        <FormSlider name="t" label="T" />
      </Form>,
    );
    expect(screen.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
  });

  it('calls onChange after the form has the value', async () => {
    const onChange = vi.fn();
    const { user } = setup(<FormSlider name="t" label="T" max={10} onChange={onChange} />);
    screen.getByRole('slider').focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(1);
  });
});

describe('FormField', () => {
  it('wires any input: value, change, blur, error and the label props', async () => {
    const { user, submitted, save } = setup(
      <FormField
        name="nickname"
        label="Nickname"
        helperText="Shown to others"
        required
        render={(props, state) => (
          <label>
            {props.label}
            <input
              name={props.name}
              ref={props.ref}
              value={(props.value as string | undefined) ?? ''}
              onChange={props.onChange}
              onBlur={props.onBlur}
              aria-invalid={props.error}
              disabled={props.disabled}
              required={props.required}
            />
            <small>{props.error ? props.errorMessage : props.helperText}</small>
            <output data-testid="state">{state.isTouched ? 'touched' : 'untouched'}</output>
          </label>
        )}
      />,
      { validate: (values) => (values['nickname'] ? undefined : { nickname: 'Pick a nickname.' }) },
    );
    expect(screen.getByText('Shown to others')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nickname/)).toBeRequired();
    await save();
    expect(await screen.findByText('Pick a nickname.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nickname/)).toHaveAttribute('aria-invalid', 'true');
    await user.type(screen.getByLabelText(/Nickname/), 'ada');
    await user.tab();
    expect(screen.getByTestId('state')).toHaveTextContent('touched');
    expect(await submitted()).toEqual({ nickname: 'ada' });
  });

  it('passes disabled when the form is disabled', () => {
    render(
      <Form disabled onSubmit={() => {}} defaultValues={{ a: '' }}>
        <FormField
          name="a"
          render={(props) => <input aria-label="A" disabled={props.disabled} />}
        />
      </Form>,
    );
    expect(screen.getByLabelText('A')).toBeDisabled();
  });
});

it('has no accessibility violations across the bindings, with errors showing', async () => {
  const { save, container } = setup(
    <>
      <FormTextField name="name" label="Name" />
      <FormTextArea name="bio" label="Bio" />
      <FormNumberInput name="qty" label="Quantity" />
      <FormSelect name="color" label="Color" options={options} />
      <FormRadioGroup name="size" label="Size" options={options} />
      <FormCheckboxGroup name="tags" label="Tags" options={options} />
      <FormCheckbox name="terms" label="Terms" />
      <FormSwitch name="alerts" label="Alerts" />
      <FormDatePicker name="when" label="Date" />
      <FormTimePicker name="at" label="Time" />
      <FormSlider name="level" label="Level" helperText="Pick one" />
      <FormFileUpload name="docs" label="Documents" />
    </>,
    {
      validate: () => ({
        name: 'Required.',
        color: 'Required.',
        size: 'Required.',
        terms: 'Required.',
      }),
    },
  );
  await save();
  await screen.findAllByText('Required.');
  expect(await axe(container)).toHaveNoViolations();
  // Keep within() referenced for readability of failures above.
  expect(within(container).getAllByText('Required.').length).toBeGreaterThan(0);
});
