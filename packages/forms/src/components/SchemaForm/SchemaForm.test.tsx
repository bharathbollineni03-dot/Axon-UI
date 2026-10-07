import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { SchemaForm, type SchemaFormProps } from './SchemaForm';
import type { SchemaFormField } from './schema';

const fields: SchemaFormField[] = [
  { type: 'text', name: 'name', label: 'Name', required: true, placeholder: 'Ada Lovelace' },
  {
    type: 'email',
    name: 'email',
    label: 'Email',
    required: true,
    helperText: 'We never share it.',
  },
  { type: 'textarea', name: 'bio', label: 'Bio', maxLength: 50 },
  { type: 'number', name: 'age', label: 'Age', min: 18 },
  {
    type: 'select',
    name: 'country',
    label: 'Country',
    required: true,
    options: [
      { value: 'uk', label: 'United Kingdom' },
      { value: 'us', label: 'United States' },
    ],
  },
  {
    type: 'radio',
    name: 'plan',
    label: 'Plan',
    options: [
      { value: 'free', label: 'Free' },
      { value: 'pro', label: 'Pro' },
    ],
  },
  { type: 'checkbox', name: 'terms', label: 'I accept the terms', required: true },
  { type: 'switch', name: 'alerts', label: 'Alerts' },
];

function Example(props: Partial<SchemaFormProps> = {}) {
  return <SchemaForm fields={fields} onSubmit={() => {}} submitLabel="Save" {...props} />;
}

describe('SchemaForm', () => {
  it('renders each field from the config', () => {
    render(<Example />);
    expect(screen.getByLabelText(/Name/)).toHaveAttribute('placeholder', 'Ada Lovelace');
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Bio').tagName).toBe('TEXTAREA');
    expect(screen.getByLabelText('Age')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Country/ })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Plan' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'I accept the terms' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Alerts' })).toBeInTheDocument();
    expect(screen.getByText('We never share it.')).toBeInTheDocument();
  });

  it('marks required fields', () => {
    render(<Example />);
    expect(screen.getByLabelText(/Name/)).toBeRequired();
  });

  it('shows the generated validation messages on submit', async () => {
    const onSubmit = vi.fn();
    render(<Example onSubmit={onSubmit} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }));
    expect((await screen.findAllByText('This field is required.')).length).toBeGreaterThanOrEqual(
      3,
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates the rules from the config', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.type(screen.getByLabelText(/Email/), 'nope');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('submits the values', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Example onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/Name/), 'Ada');
    await user.type(screen.getByLabelText(/Email/), 'ada@example.com');
    await user.type(screen.getByLabelText('Age'), '36');
    await user.click(screen.getByRole('combobox', { name: /Country/ }));
    await user.click(await screen.findByRole('option', { name: 'United Kingdom' }));
    await user.click(screen.getByRole('radio', { name: 'Pro' }));
    await user.click(screen.getByRole('checkbox', { name: 'I accept the terms' }));
    await user.click(screen.getByRole('switch', { name: 'Alerts' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      bio: '',
      age: 36,
      country: 'uk',
      plan: 'pro',
      terms: true,
      alerts: true,
    });
  });

  it('starts from the field defaults and the defaultValues prop', () => {
    render(
      <Example
        fields={[
          { type: 'text', name: 'a', label: 'A', defaultValue: 'from field' },
          { type: 'text', name: 'b', label: 'B', defaultValue: 'from field' },
        ]}
        defaultValues={{ b: 'from prop' }}
      />,
    );
    expect(screen.getByLabelText('A')).toHaveValue('from field');
    expect(screen.getByLabelText('B')).toHaveValue('from prop');
  });

  describe('sections', () => {
    it('groups fields under a titled fieldset', () => {
      render(
        <Example
          fields={[
            {
              type: 'section',
              title: 'Address',
              description: 'Where you live',
              fields: [{ type: 'text', name: 'address.city', label: 'City' }],
            },
          ]}
        />,
      );
      expect(screen.getByRole('group', { name: 'Address' })).toHaveAccessibleDescription(
        'Where you live',
      );
      expect(screen.getByLabelText('City')).toBeInTheDocument();
    });

    it('submits nested values', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(
        <Example
          onSubmit={onSubmit}
          fields={[
            {
              type: 'section',
              title: 'Address',
              fields: [{ type: 'text', name: 'address.city', label: 'City' }],
            },
          ]}
        />,
      );
      await user.type(screen.getByLabelText('City'), 'London');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0]).toEqual({ address: { city: 'London' } });
    });
  });

  describe('conditional fields', () => {
    const conditional: SchemaFormField[] = [
      { type: 'checkbox', name: 'company', label: 'I work for a company' },
      {
        type: 'text',
        name: 'companyName',
        label: 'Company name',
        required: true,
        hidden: (values) => values['company'] !== true,
      },
    ];

    it('shows a field only while its condition holds', async () => {
      const user = userEvent.setup();
      render(<Example fields={conditional} />);
      expect(screen.queryByLabelText(/Company name/)).not.toBeInTheDocument();
      await user.click(screen.getByRole('checkbox', { name: 'I work for a company' }));
      expect(await screen.findByLabelText(/Company name/)).toBeInTheDocument();
      await user.click(screen.getByRole('checkbox', { name: 'I work for a company' }));
      await waitFor(() => expect(screen.queryByLabelText(/Company name/)).not.toBeInTheDocument());
    });

    it('does not validate a hidden field, and leaves it out of the values', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<Example fields={conditional} onSubmit={onSubmit} />);
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toEqual({ company: false });
    });

    it('validates the field once it is shown', async () => {
      const user = userEvent.setup();
      render(<Example fields={conditional} />);
      await user.click(screen.getByRole('checkbox', { name: 'I work for a company' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('This field is required.')).toBeInTheDocument();
    });

    it('supports a static hidden flag', () => {
      render(
        <Example
          fields={[
            { type: 'text', name: 'a', label: 'A' },
            { type: 'text', name: 'b', label: 'B', hidden: true },
          ]}
        />,
      );
      expect(screen.queryByLabelText('B')).not.toBeInTheDocument();
    });
  });

  describe('options', () => {
    it('lets a schema prop replace the generated one', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(
        <Example
          fields={[{ type: 'text', name: 'code', label: 'Code' }]}
          schema={z.object({ code: z.string().regex(/^\d+$/, 'Digits only.') }) as never}
          onSubmit={onSubmit}
        />,
      );
      await user.type(screen.getByLabelText('Code'), 'abc');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('Digits only.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('translates the generated messages', async () => {
      const user = userEvent.setup();
      render(
        <Example
          fields={[{ type: 'text', name: 'a', label: 'A', required: true }]}
          messages={{ required: 'Obligatorio.' }}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('Obligatorio.')).toBeInTheDocument();
    });

    it('has a Cancel button when onCancel is given', async () => {
      const onCancel = vi.fn();
      render(<Example onCancel={onCancel} cancelLabel="Discard" />);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Discard' }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('can leave the actions out, or replace them', () => {
      const { rerender } = render(<Example actions={false} />);
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
      rerender(<Example actions={<button type="submit">Go</button>} />);
      expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
    });

    it('passes props to the actions row', () => {
      render(<Example actionsProps={{ align: 'start' }} />);
      expect(document.querySelector('.axon-form-actions')).toHaveClass('axon-form-actions--start');
    });

    it('puts the fields in columns from the sm breakpoint up', () => {
      render(
        <Example columns={2} fields={[{ type: 'text', name: 'a', label: 'A', span: 'full' }]} />,
      );
      expect(document.querySelector('.axon-grid')).toBeInTheDocument();
    });

    it('shows server errors like any form', async () => {
      const user = userEvent.setup();
      render(
        <Example
          fields={[{ type: 'email', name: 'email', label: 'Email' }]}
          onSubmit={() => ({ fieldErrors: { email: 'Already registered.' } })}
        />,
      );
      await user.type(screen.getByLabelText('Email'), 'ada@example.com');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('Already registered.')).toBeInTheDocument();
    });

    it('forwards the ref and spreads props onto the form', () => {
      const ref = createRef<HTMLFormElement>();
      render(
        <SchemaForm
          ref={ref}
          fields={fields}
          onSubmit={() => {}}
          aria-label="Sign up"
          data-testid="form"
        />,
      );
      expect(ref.current).toBe(screen.getByTestId('form'));
    });
  });

  it('has no accessibility violations, including with errors showing', async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findAllByText('This field is required.');
    expect(await axe(container)).toHaveNoViolations();
  });
});
