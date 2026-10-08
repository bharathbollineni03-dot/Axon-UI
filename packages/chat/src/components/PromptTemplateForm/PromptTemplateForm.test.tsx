import { createRef } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { FormSubmitError } from '@axonui/forms';
import { describe, expect, it, vi } from 'vitest';
import { PromptTemplateForm, type PromptTemplateFormProps } from './PromptTemplateForm';

const TEMPLATE = 'Write a {{tone}} email to {{customer_name}} about {{topic}}.';

function renderForm(props: Partial<PromptTemplateFormProps> = {}) {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const utils = render(<PromptTemplateForm template={TEMPLATE} onSubmit={onSubmit} {...props} />);
  return { ...utils, user, onSubmit };
}

const use = () => screen.getByRole('button', { name: 'Use prompt' });
const preview = () => screen.getByRole('region', { name: 'Preview' });
const field = (name: string | RegExp) => screen.getByRole('textbox', { name });

async function fillAll(user: ReturnType<typeof userEvent.setup>) {
  await user.type(field(/^Tone/), 'friendly');
  await user.type(field(/^Customer name/), 'Ada');
  await user.type(field(/^Topic/), 'your order');
}

describe('PromptTemplateForm', () => {
  describe('fields', () => {
    it('makes a field for each variable, with a readable label', () => {
      renderForm();
      expect(screen.getAllByRole('textbox')).toHaveLength(3);
      expect(field(/^Tone/)).toBeInTheDocument();
      expect(field(/^Customer name/)).toBeInTheDocument();
      expect(field(/^Topic/)).toBeInTheDocument();
    });

    it('makes one field for a variable that is used more than once', () => {
      renderForm({ template: '{{name}} says hi. Bye, {{name}}.' });
      expect(screen.getAllByRole('textbox')).toHaveLength(1);
    });

    it('takes a label, description, placeholder and default for each variable', () => {
      renderForm({
        variables: {
          tone: {
            label: 'Voice',
            description: 'How it should sound',
            placeholder: 'e.g. warm',
            defaultValue: 'formal',
          },
        },
      });
      expect(field(/^Voice/)).toHaveValue('formal');
      expect(field(/^Voice/)).toHaveAttribute('placeholder', 'e.g. warm');
      expect(field(/^Voice/)).toHaveAccessibleDescription('How it should sound');
    });

    it('can use a text area for a long answer', () => {
      renderForm({ variables: { topic: { multiline: true } } });
      expect(field(/^Topic/).tagName).toBe('TEXTAREA');
      expect(field(/^Tone/).tagName).toBe('INPUT');
    });

    it('works for names with dots, which form libraries treat as nesting', async () => {
      const { user, onSubmit } = renderForm({ template: 'Hello {{user.name}}' });
      await user.type(field(/^User name/), 'Ada');
      await user.click(use());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0]).toEqual({
        values: { 'user.name': 'Ada' },
        prompt: 'Hello Ada',
      });
    });

    it('starts again when the template changes', async () => {
      const { user, rerender } = renderForm();
      await user.type(field(/^Tone/), 'warm');
      rerender(<PromptTemplateForm template="Explain {{tone}} simply" onSubmit={() => {}} />);
      expect(field(/^Tone/)).toHaveValue('');
    });

    it('says so when there are no variables, and still submits', async () => {
      const { user, onSubmit } = renderForm({ template: 'Be helpful.' });
      expect(screen.getByText(/no variables/)).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      await user.click(use());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0]).toEqual({ values: {}, prompt: 'Be helpful.' });
    });
  });

  describe('preview', () => {
    it('asks people to fill in the fields before there is anything to show', () => {
      renderForm();
      expect(within(preview()).getByText(/appears here as you fill in/)).toBeInTheDocument();
    });

    it('shows the prompt as it is filled, leaving the blanks as placeholders', async () => {
      const { user } = renderForm();
      await user.type(field(/^Customer name/), 'Ada');
      expect(preview()).toHaveTextContent('Write a {{tone}} email to Ada about {{topic}}.');
      await user.type(field(/^Tone/), 'friendly');
      expect(preview()).toHaveTextContent('Write a friendly email to Ada about {{topic}}.');
    });

    it('shows a template with no variables as it is', () => {
      renderForm({ template: 'Be helpful.' });
      expect(preview()).toHaveTextContent('Be helpful.');
    });

    it('can be turned off', () => {
      renderForm({ showPreview: false });
      expect(screen.queryByRole('region', { name: 'Preview' })).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('needs every field by default', async () => {
      const { user, onSubmit } = renderForm();
      await user.click(use());
      expect(await screen.findByText('Enter tone.')).toBeInTheDocument();
      expect(screen.getByText('Enter customer name.')).toBeInTheDocument();
      expect(screen.getByText('Enter topic.')).toBeInTheDocument();
      expect(field(/^Tone/)).toHaveAttribute('aria-invalid', 'true');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('treats spaces as empty', async () => {
      const { user, onSubmit } = renderForm({ template: '{{a}}' });
      await user.type(field(/^A/), '   ');
      await user.click(use());
      expect(await screen.findByText('Enter a.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('lets a variable be optional', async () => {
      const { user, onSubmit } = renderForm({ variables: { tone: { required: false } } });
      await user.type(field(/^Customer name/), 'Ada');
      await user.type(field(/^Topic/), 'billing');
      await user.click(use());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0].prompt).toBe('Write a  email to Ada about billing.');
      expect(onSubmit.mock.calls[0]![0].values.tone).toBe('');
    });

    it('takes translated messages', async () => {
      const { user } = renderForm({ messages: { required: (label) => `Falta ${label}.` } });
      await user.click(use());
      expect(await screen.findByText('Falta Tone.')).toBeInTheDocument();
    });
  });

  describe('submitting', () => {
    it('gives the answers by variable name and the finished prompt', async () => {
      const { user, onSubmit } = renderForm();
      await fillAll(user);
      await user.click(use());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0]).toEqual({
        values: { tone: 'friendly', customer_name: 'Ada', topic: 'your order' },
        prompt: 'Write a friendly email to Ada about your order.',
      });
    });

    it('trims the answers', async () => {
      const { user, onSubmit } = renderForm({ template: 'Hi {{name}}' });
      await user.type(field(/^Name/), '  Ada  ');
      await user.click(use());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0]).toEqual({ values: { name: 'Ada' }, prompt: 'Hi Ada' });
    });

    it('does not read $ patterns in an answer', async () => {
      const { user, onSubmit } = renderForm({ template: 'Cost {{price}}' });
      await user.type(field(/^Price/), '$& 5');
      await user.click(use());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0].prompt).toBe('Cost $& 5');
    });

    it('shows a returned error on the variable it names', async () => {
      const { user } = renderForm({
        onSubmit: () => ({ fieldErrors: { customer_name: 'No such customer.' } }),
      });
      await fillAll(user);
      await user.click(use());
      expect(await screen.findByText('No such customer.')).toBeInTheDocument();
      expect(field(/^Customer name/)).toHaveAttribute('aria-invalid', 'true');
    });

    it('shows a thrown error on the variable it names', async () => {
      const { user } = renderForm({
        onSubmit: () => {
          throw new FormSubmitError({ fieldErrors: { topic: 'Topic is blocked.' } });
        },
      });
      await fillAll(user);
      await user.click(use());
      expect(await screen.findByText('Topic is blocked.')).toBeInTheDocument();
    });

    it('lets onSubmit put an error on a variable with setError', async () => {
      const { user } = renderForm({
        onSubmit: (_result, helpers) => {
          helpers.setError('tone', 'Too casual.');
        },
      });
      await fillAll(user);
      await user.click(use());
      expect(await screen.findByText('Too casual.')).toBeInTheDocument();
    });

    it('shows an error from a throw that is not about a field in the banner', async () => {
      const { user } = renderForm({
        onSubmit: () => {
          throw new Error('Server down');
        },
      });
      await fillAll(user);
      await user.click(use());
      expect(await screen.findByRole('alert')).toHaveTextContent('Server down');
    });
  });

  it('shows Cancel when there is a handler', async () => {
    const onCancel = vi.fn();
    const { user } = renderForm({ onCancel });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('is disabled as a whole, and can show an error banner', () => {
    renderForm({ disabled: true, error: 'Locked.' });
    for (const box of screen.getAllByRole('textbox')) expect(box).toBeDisabled();
    expect(use()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Locked.');
  });

  it('forwards a ref to the form and takes a class name', () => {
    const ref = createRef<HTMLFormElement>();
    const { container } = renderForm({ ref, className: 'mine' } as never);
    expect(ref.current).toBe(container.querySelector('form'));
    expect(ref.current).toHaveClass('axon-prompt-template', 'mine');
  });

  it('can be translated', () => {
    renderForm({
      labels: { submit: 'Usar', preview: 'Vista previa', previewEmpty: 'Rellena los campos.' },
    });
    expect(screen.getByRole('button', { name: 'Usar' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Vista previa' })).toHaveTextContent(
      'Rellena los campos.',
    );
  });

  it('has no accessibility violations, empty, filled and with errors', async () => {
    const { container, user } = renderForm({
      variables: { topic: { multiline: true, description: 'What it is about' } },
      onCancel: () => {},
    });
    expect(await axe(container)).toHaveNoViolations();
    await user.click(use());
    await screen.findByText('Enter tone.');
    expect(await axe(container)).toHaveNoViolations();
    await fillAll(user);
    expect(await axe(container)).toHaveNoViolations();
  });
});
