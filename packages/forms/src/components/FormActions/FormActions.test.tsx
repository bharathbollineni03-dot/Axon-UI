import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Form } from '../Form/Form';
import { FormTextField } from '../FormBindings/FormBindings';
import { FormActions, type FormActionsProps } from './FormActions';

function Example({
  onSubmit = () => {},
  validate,
  ...actions
}: Omit<FormActionsProps, 'onSubmit'> & {
  onSubmit?: () => void | Promise<void>;
  validate?: (values: { name: string }) => Record<string, string> | undefined;
}) {
  return (
    <Form<{ name: string }> defaultValues={{ name: '' }} onSubmit={onSubmit} validate={validate}>
      <FormTextField name="name" label="Name" />
      <FormActions {...actions} />
    </Form>
  );
}

describe('FormActions', () => {
  it('renders a submit button, "Submit" by default', () => {
    render(<Example />);
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('takes a submit label', () => {
    render(<Example submitLabel="Create account" />);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('shows Cancel only when onCancel is given, as a non-submitting button', async () => {
    const onCancel = vi.fn();
    const { rerender } = render(<Example />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    rerender(<Example onCancel={onCancel} cancelLabel="Discard" />);
    const cancel = screen.getByRole('button', { name: 'Discard' });
    expect(cancel).toHaveAttribute('type', 'button');
    await userEvent.setup().click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('puts extra children before the other buttons', () => {
    render(
      <Example onCancel={() => {}}>
        <button type="button">Save draft</button>
      </Example>,
    );
    const names = screen.getAllByRole('button').map((button) => button.textContent);
    expect(names).toEqual(['Save draft', 'Cancel', 'Submit']);
  });

  it('applies the alignment', () => {
    const { container, rerender } = render(<Example />);
    expect(container.querySelector('.axon-form-actions')).toHaveClass('axon-form-actions--end');
    rerender(<Example align="stretch" />);
    expect(container.querySelector('.axon-form-actions')).toHaveClass('axon-form-actions--stretch');
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveClass('axon-button--full-width');
  });

  it('shows a busy submit button and disables Cancel while submitting', async () => {
    let finish: () => void = () => {};
    const user = userEvent.setup();
    render(
      <Example
        onCancel={() => {}}
        onSubmit={() => new Promise<void>((resolve) => (finish = resolve))}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('aria-busy', 'true'),
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    finish();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit' })).not.toHaveAttribute('aria-busy'),
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  it('can stay disabled until the form changes', async () => {
    const user = userEvent.setup();
    render(<Example disableWhenPristine />);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    await user.type(screen.getByLabelText('Name'), 'a');
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
    await user.clear(screen.getByLabelText('Name'));
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('can stay disabled while the form is invalid', async () => {
    const user = userEvent.setup();
    render(
      <Example
        disableWhenInvalid
        validate={(values) => (values.name.length >= 3 ? undefined : { name: 'Too short.' })}
      />,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled());
    await user.type(screen.getByLabelText('Name'), 'Ada');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
  });

  it('can be disabled for your own reasons', () => {
    render(<Example submitDisabled />);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('forwards the ref and spreads props', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Form onSubmit={() => {}}>
        <FormActions ref={ref} className="extra" data-testid="actions" />
      </Form>,
    );
    expect(ref.current).toBe(screen.getByTestId('actions'));
    expect(ref.current).toHaveClass('axon-form-actions', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Example onCancel={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
