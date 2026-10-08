import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import type { ChatModel } from '../ModelSelector/ModelSelector';
import {
  ChatSettingsForm,
  createChatSettingsSchema,
  type ChatSettingsFormProps,
} from './ChatSettingsForm';

const models: ChatModel[] = [
  { id: 'fast', name: 'Axon Fast', description: 'Quick answers' },
  { id: 'smart', name: 'Axon Smart', description: 'Hard problems' },
  { id: 'old', name: 'Axon Classic', disabled: true },
];

function renderForm(props: Partial<ChatSettingsFormProps> = {}) {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const utils = render(<ChatSettingsForm models={models} onSubmit={onSubmit} {...props} />);
  return { ...utils, user, onSubmit };
}

const model = () => screen.getByRole('combobox', { name: /Model/ });
const temperature = () => screen.getByRole('slider', { name: /Temperature/ });
const topP = () => screen.getByRole('slider', { name: /Top P/ });
const tokens = () => screen.getByRole('spinbutton', { name: /Maximum reply length/ });
const stream = () => screen.getByRole('switch', { name: /Stream replies/ });
const save = () => screen.getByRole('button', { name: 'Save settings' });

const submitted = async (onSubmit: ReturnType<typeof vi.fn>) => {
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  return onSubmit.mock.calls.at(-1)![0];
};

describe('ChatSettingsForm', () => {
  it('has a field for each setting', () => {
    renderForm();
    expect(model()).toBeInTheDocument();
    expect(temperature()).toBeInTheDocument();
    expect(topP()).toBeInTheDocument();
    expect(tokens()).toBeInTheDocument();
    expect(stream()).toBeInTheDocument();
    expect(save()).toBeInTheDocument();
  });

  it('starts on the first model and sensible defaults', async () => {
    const { user, onSubmit } = renderForm();
    expect(model()).toHaveTextContent('Axon Fast');
    expect(temperature()).toHaveAttribute('aria-valuenow', '0.7');
    expect(topP()).toHaveAttribute('aria-valuenow', '1');
    expect(tokens()).toHaveValue('1024');
    expect(stream()).toBeChecked();
    await user.click(save());
    expect(await submitted(onSubmit)).toEqual({
      model: 'fast',
      temperature: 0.7,
      topP: 1,
      maxTokens: 1024,
      stream: true,
    });
  });

  it('starts from the values you give', async () => {
    const { user, onSubmit } = renderForm({
      defaultValues: { model: 'smart', temperature: 1.2, maxTokens: 4096, stream: false },
    });
    expect(model()).toHaveTextContent('Axon Smart');
    expect(temperature()).toHaveAttribute('aria-valuenow', '1.2');
    expect(stream()).not.toBeChecked();
    await user.click(save());
    expect(await submitted(onSubmit)).toMatchObject({
      model: 'smart',
      temperature: 1.2,
      maxTokens: 4096,
      stream: false,
    });
  });

  it('submits what was changed', async () => {
    const { user, onSubmit } = renderForm();
    await user.click(model());
    await user.click(await screen.findByRole('option', { name: /Axon Smart/ }));
    temperature().focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    topP().focus();
    await user.keyboard('{ArrowLeft}');
    await user.clear(tokens());
    await user.type(tokens(), '2048');
    await user.click(stream());
    await user.click(save());
    expect(await submitted(onSubmit)).toEqual({
      model: 'smart',
      temperature: 0.9,
      topP: 0.95,
      maxTokens: 2048,
      stream: false,
    });
  });

  it('lists the models with their descriptions, and will not pick a disabled one', async () => {
    const { user } = renderForm();
    await user.click(model());
    expect(await screen.findByRole('option', { name: /Axon Fast/ })).toHaveTextContent(
      'Quick answers',
    );
    expect(screen.getByRole('option', { name: /Axon Classic/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('shows models under their group headings', async () => {
    const { user } = renderForm({
      models: [
        { id: 'a', name: 'Alpha', group: 'Cloud' },
        { id: 'b', name: 'Beta', group: 'Local' },
      ],
    });
    await user.click(model());
    expect(await screen.findByRole('group', { name: 'Cloud' })).toHaveTextContent('Alpha');
    expect(screen.getByRole('group', { name: 'Local' })).toHaveTextContent('Beta');
  });

  describe('validation', () => {
    it('needs a reply length', async () => {
      const { user, onSubmit } = renderForm();
      await user.clear(tokens());
      await user.click(save());
      expect(await screen.findByText('Enter the most tokens a reply may use.')).toBeInTheDocument();
      expect(tokens()).toHaveAttribute('aria-invalid', 'true');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('pulls a reply length that is too large back to the limit', async () => {
      const { user, onSubmit } = renderForm({ maxTokens: { max: 8000 } });
      await user.clear(tokens());
      await user.type(tokens(), '9000');
      await user.click(save());
      expect(await submitted(onSubmit)).toMatchObject({ maxTokens: 8000 });
    });

    it('needs a model when there are none to start with', async () => {
      const { user, onSubmit } = renderForm({ models: [] });
      await user.click(save());
      expect(await screen.findByText('Choose a model.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('uses the temperature range for the slider', () => {
      renderForm({ temperature: { min: 0, max: 1, step: 0.05 } });
      expect(temperature()).toHaveAttribute('aria-valuemax', '1');
    });

    it('can be given a schema of its own', async () => {
      const { user, onSubmit } = renderForm({
        schema: createChatSettingsSchema({
          messages: { modelRequired: 'Elige un modelo.' },
        }) as never,
        models: [],
      });
      await user.click(save());
      expect(await screen.findByText('Elige un modelo.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('shows a server error on the field it names', async () => {
    const { user } = renderForm({
      onSubmit: () => ({ fieldErrors: { maxTokens: 'Too many for your plan.' } }),
    });
    await user.click(save());
    expect(await screen.findByText('Too many for your plan.')).toBeInTheDocument();
  });

  it('puts every field back with "Reset to defaults"', async () => {
    const { user } = renderForm({ defaultValues: { temperature: 1 } });
    temperature().focus();
    await user.keyboard('{ArrowRight}');
    await user.clear(tokens());
    await user.type(tokens(), '10');
    await user.click(stream());
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(temperature()).toHaveAttribute('aria-valuenow', '1');
    expect(tokens()).toHaveValue('1024');
    expect(stream()).toBeChecked();
  });

  it('can hide the reset button, and shows Cancel when there is a handler', async () => {
    const onCancel = vi.fn();
    const { user } = renderForm({ showReset: false, onCancel });
    expect(screen.queryByRole('button', { name: 'Reset to defaults' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('is disabled as a whole', () => {
    renderForm({ disabled: true });
    expect(model()).toBeDisabled();
    expect(tokens()).toBeDisabled();
    expect(stream()).toBeDisabled();
    expect(save()).toBeDisabled();
  });

  it('shows an error banner and extra fields', () => {
    renderForm({ error: 'Settings are locked.', children: <p>Extra content</p> });
    expect(screen.getByRole('alert')).toHaveTextContent('Settings are locked.');
    expect(screen.getByText('Extra content')).toBeInTheDocument();
  });

  it('forwards a ref to the form and takes a class name', () => {
    const ref = createRef<HTMLFormElement>();
    const { container } = renderForm({ ref, className: 'mine' } as never);
    expect(ref.current).toBe(container.querySelector('form'));
    expect(ref.current).toHaveClass('axon-chat-settings', 'mine');
  });

  it('can be translated', () => {
    renderForm({
      labels: {
        model: 'Modelo',
        temperature: 'Temperatura',
        submit: 'Guardar',
        reset: 'Restablecer',
      },
    });
    expect(screen.getByRole('combobox', { name: /Modelo/ })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /Temperatura/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restablecer' })).toBeInTheDocument();
  });

  it('has no accessibility violations, including with errors showing', async () => {
    const { container, user } = renderForm({ onCancel: () => {} });
    expect(await axe(container)).toHaveNoViolations();
    await user.clear(tokens());
    await user.click(save());
    await screen.findByText('Enter the most tokens a reply may use.');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('createChatSettingsSchema', () => {
  const valid = { model: 'fast', temperature: 0.7, topP: 1, maxTokens: 1024, stream: true };
  const messagesFor = (value: unknown, options = {}) => {
    const result = createChatSettingsSchema(options).safeParse(value);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it('accepts the defaults', () => {
    expect(messagesFor(valid)).toEqual([]);
  });

  it('checks every limit, with a message for each', () => {
    expect(messagesFor({ ...valid, model: '' })).toEqual(['Choose a model.']);
    expect(messagesFor({ ...valid, temperature: 3 })).toEqual([
      'Temperature must be between 0 and 2.',
    ]);
    expect(messagesFor({ ...valid, topP: 1.5 })).toEqual(['Top P must be between 0 and 1.']);
    expect(messagesFor({ ...valid, maxTokens: 1.5 })).toEqual(['Use a whole number of tokens.']);
    expect(messagesFor({ ...valid, maxTokens: 0 })).toEqual(['Use between 1 and 128000 tokens.']);
    expect(messagesFor({ ...valid, maxTokens: null })).toEqual([
      'Enter the most tokens a reply may use.',
    ]);
  });

  it('takes other limits and translated messages', () => {
    const options = {
      temperature: { max: 1 },
      maxTokens: { max: 100 },
      messages: { temperatureRange: (min: number, max: number) => `De ${min} a ${max}` },
    };
    expect(messagesFor({ ...valid, maxTokens: 50, temperature: 1.5 }, options)).toEqual([
      'De 0 a 1',
    ]);
    expect(messagesFor({ ...valid, maxTokens: 101 }, options)).toEqual([
      'Use between 1 and 100 tokens.',
    ]);
  });
});
