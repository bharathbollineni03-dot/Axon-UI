import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import {
  PersonaForm,
  createPersonaSchema,
  parseStarterPrompts,
  type PersonaFormProps,
} from './PersonaForm';

function renderForm(props: Partial<PersonaFormProps> = {}) {
  const onSubmit = vi.fn();
  const user = userEvent.setup({ applyAccept: false });
  const utils = render(<PersonaForm onSubmit={onSubmit} {...props} />);
  return { ...utils, user, onSubmit };
}

const name = () => screen.getByRole('textbox', { name: /^Name/ });
const description = () => screen.getByRole('textbox', { name: /^Description/ });
const greeting = () => screen.getByRole('textbox', { name: /^Opening message/ });
const instructions = () => screen.getByRole('textbox', { name: /^Instructions/ });
const prompts = () => screen.getByRole('textbox', { name: /^Starter prompts/ });
const tone = () => screen.getByRole('combobox', { name: /Tone of voice/ });
const save = () => screen.getByRole('button', { name: 'Save assistant' });
const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;
const png = (size = 10) => new File([new Uint8Array(size)], 'me.png', { type: 'image/png' });

const submitted = async (onSubmit: ReturnType<typeof vi.fn>) => {
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  return onSubmit.mock.calls.at(-1)![0];
};

describe('PersonaForm', () => {
  it('has an identity group and a behavior group', () => {
    renderForm();
    expect(screen.getByRole('group', { name: 'Identity' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Behavior' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Picture' })).toBeInTheDocument();
    for (const field of [name(), description(), greeting(), instructions(), prompts(), tone()]) {
      expect(field).toBeInTheDocument();
    }
  });

  it('starts empty, or from the values you give, with prompts one per line', () => {
    const { unmount } = renderForm();
    expect(name()).toHaveValue('');
    expect(tone()).toHaveTextContent('No preference');
    unmount();
    renderForm({
      defaultValues: {
        name: 'Ada',
        description: 'A math tutor',
        tone: 'friendly',
        starterPrompts: ['Explain limits', 'Quiz me'],
      },
    });
    expect(name()).toHaveValue('Ada');
    expect(description()).toHaveValue('A math tutor');
    expect(tone()).toHaveTextContent('Friendly');
    expect(prompts()).toHaveValue('Explain limits\nQuiz me');
  });

  it('submits everything, with the starter prompts as a list', async () => {
    const { user, onSubmit } = renderForm();
    await user.type(name(), '  Ada  ');
    await user.type(description(), 'Math tutor');
    await user.click(tone());
    await user.click(await screen.findByRole('option', { name: 'Concise' }));
    await user.type(greeting(), 'Hello! What shall we learn?');
    await user.type(instructions(), 'Explain step by step.');
    await user.type(prompts(), 'Explain limits{Enter}{Enter}  Quiz me  {Enter}');
    await user.click(save());
    expect(await submitted(onSubmit)).toEqual({
      name: 'Ada',
      avatar: null,
      description: 'Math tutor',
      tone: 'concise',
      greeting: 'Hello! What shall we learn?',
      instructions: 'Explain step by step.',
      starterPrompts: ['Explain limits', 'Quiz me'],
    });
  });

  it('submits no tone and no prompts as null and an empty list', async () => {
    const { user, onSubmit } = renderForm();
    await user.type(name(), 'Ada');
    await user.click(save());
    expect(await submitted(onSubmit)).toMatchObject({ tone: null, starterPrompts: [] });
  });

  it('uses the tones you give', async () => {
    const { user } = renderForm({ tones: [{ value: 'pirate', label: 'Pirate' }] });
    await user.click(tone());
    expect(await screen.findByRole('option', { name: 'Pirate' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Friendly' })).not.toBeInTheDocument();
  });

  describe('validation', () => {
    it('needs a name', async () => {
      const { user, onSubmit } = renderForm();
      await user.click(save());
      expect(await screen.findByText('Give the assistant a name.')).toBeInTheDocument();
      expect(name()).toHaveAttribute('aria-invalid', 'true');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('limits the number of starter prompts', async () => {
      const { user, onSubmit } = renderForm({ maxStarterPrompts: 2 });
      await user.type(name(), 'Ada');
      await user.type(prompts(), 'one{Enter}two{Enter}three');
      await user.click(save());
      expect(await screen.findByText('Add at most 2 starter prompts.')).toBeInTheDocument();
      expect(prompts()).toHaveAttribute('aria-invalid', 'true');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('limits the length of a starter prompt', async () => {
      const { user, onSubmit } = renderForm();
      await user.type(name(), 'Ada');
      await user.click(prompts());
      await user.paste('x'.repeat(121));
      await user.click(save());
      expect(
        await screen.findByText('Keep each starter prompt to 120 characters or fewer.'),
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('limits the instructions', () => {
      renderForm({ maxInstructions: 50 });
      expect(instructions()).toHaveAttribute('maxlength', '50');
    });

    it('shows a server error on a field', async () => {
      const { user } = renderForm({
        onSubmit: () => ({ fieldErrors: { name: 'That name is taken.' } }),
      });
      await user.type(name(), 'Ada');
      await user.click(save());
      expect(await screen.findByText('That name is taken.')).toBeInTheDocument();
    });
  });

  describe('picture', () => {
    it('submits a chosen picture', async () => {
      const { user, onSubmit } = renderForm();
      const file = png();
      await user.type(name(), 'Ada');
      await user.upload(fileInput(), file);
      await user.click(save());
      expect((await submitted(onSubmit)).avatar).toBe(file);
    });

    it('refuses a file that is not an image', async () => {
      const { user, onSubmit } = renderForm();
      await user.type(name(), 'Ada');
      await user.upload(fileInput(), new File(['x'], 'notes.txt', { type: 'text/plain' }));
      await user.click(save());
      expect(await screen.findByText('Choose an image file.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('refuses a picture that is too big', async () => {
      const { user, onSubmit } = renderForm();
      await user.type(name(), 'Ada');
      await user.upload(fileInput(), png(3 * 1024 * 1024));
      await user.click(save());
      expect(await screen.findByText('Choose a picture under 2 MB.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('lets the current picture be removed', async () => {
      const onRemoveAvatar = vi.fn();
      const { user } = renderForm({ avatarUrl: 'https://example.com/a.png', onRemoveAvatar });
      await user.click(screen.getByRole('button', { name: 'Remove photo' }));
      expect(onRemoveAvatar).toHaveBeenCalledTimes(1);
    });
  });

  it('shows Cancel when there is a handler', async () => {
    const onCancel = vi.fn();
    const { user } = renderForm({ onCancel });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('is disabled as a whole, and shows a banner and extra fields', () => {
    renderForm({ disabled: true, error: 'Locked.', children: <p>Extra content</p> });
    expect(name()).toBeDisabled();
    expect(tone()).toBeDisabled();
    expect(save()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Locked.');
    expect(screen.getByText('Extra content')).toBeInTheDocument();
  });

  it('forwards a ref to the form and takes a class name', () => {
    const ref = createRef<HTMLFormElement>();
    const { container } = renderForm({ ref, className: 'mine' } as never);
    expect(ref.current).toBe(container.querySelector('form'));
    expect(ref.current).toHaveClass('axon-persona', 'mine');
  });

  it('can be translated', () => {
    renderForm({
      labels: {
        identity: 'Identidad',
        name: 'Nombre',
        submit: 'Guardar',
        starterPromptsHelp: (max) => `Hasta ${max}.`,
      },
    });
    expect(screen.getByRole('group', { name: 'Identidad' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Nombre/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(prompts()).toHaveAccessibleDescription('Hasta 6.');
  });

  it('has no accessibility violations, empty and with errors', async () => {
    const { container, user } = renderForm({ onCancel: () => {} });
    expect(await axe(container)).toHaveNoViolations();
    await user.click(save());
    await screen.findByText('Give the assistant a name.');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('parseStarterPrompts', () => {
  it('splits into trimmed, non-empty lines, whatever the line endings', () => {
    expect(parseStarterPrompts(' a \r\n\r\n b\nc  \n')).toEqual(['a', 'b', 'c']);
    expect(parseStarterPrompts('')).toEqual([]);
  });
});

describe('createPersonaSchema', () => {
  const valid = {
    name: 'Ada',
    avatar: null,
    description: '',
    tone: null,
    greeting: '',
    instructions: '',
    starterPrompts: '',
  };
  const issues = (value: unknown, options = {}) => {
    const result = createPersonaSchema(options).safeParse(value);
    return result.success
      ? []
      : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  };

  it('turns the prompt box into a list', () => {
    const result = createPersonaSchema().parse({ ...valid, starterPrompts: 'a\n b ' });
    expect(result.starterPrompts).toEqual(['a', 'b']);
  });

  it('reports problems on the field they belong to, with translated messages', () => {
    expect(issues({ ...valid, name: ' ' })).toEqual(['name: Give the assistant a name.']);
    expect(issues({ ...valid, starterPrompts: 'a\nb\nc' }, { maxStarterPrompts: 2 })).toEqual([
      'starterPrompts: Add at most 2 starter prompts.',
    ]);
    expect(
      issues({ ...valid, name: '' }, { messages: { nameRequired: 'Falta el nombre.' } }),
    ).toEqual(['name: Falta el nombre.']);
  });
});
