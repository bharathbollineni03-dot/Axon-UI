import { createRef } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import {
  SystemPromptEditor,
  createSystemPromptSchema,
  type SystemPromptEditorProps,
  type SystemPromptPreset,
} from './SystemPromptEditor';

const presets: SystemPromptPreset[] = [
  { id: 'brief', name: 'Brief', prompt: 'Answer in one sentence.', description: 'Short replies' },
  { id: 'tutor', name: 'Tutor', prompt: 'Explain step by step, then check understanding.' },
];

function renderEditor(props: Partial<SystemPromptEditorProps> = {}) {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const utils = render(<SystemPromptEditor onSubmit={onSubmit} {...props} />);
  return { ...utils, user, onSubmit };
}

const prompt = () => screen.getByRole('textbox', { name: /System prompt/ });
const save = () => screen.getByRole('button', { name: 'Save prompt' });
const presetSelect = () => screen.getByRole('combobox', { name: /Preset/ });
const saveAsPreset = () => screen.getByRole('button', { name: 'Save as preset…' });

const choosePreset = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(presetSelect());
  await user.click(await screen.findByRole('option', { name: new RegExp(name) }));
};

describe('SystemPromptEditor', () => {
  it('is a text box with a character counter and a save button', () => {
    renderEditor({ maxLength: 500 });
    expect(prompt()).toHaveValue('');
    expect(prompt()).toHaveAttribute('maxlength', '500');
    expect(screen.getByText('0 / 500')).toBeInTheDocument();
    expect(save()).toBeInTheDocument();
  });

  it('starts with the prompt you give, and submits what was written', async () => {
    const { user, onSubmit } = renderEditor({ defaultPrompt: 'Be kind.' });
    expect(prompt()).toHaveValue('Be kind.');
    await user.type(prompt(), ' Be brief.');
    await user.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toEqual({ prompt: 'Be kind. Be brief.', presetId: null });
  });

  it('allows an empty prompt unless it is required', async () => {
    const { user, onSubmit } = renderEditor();
    await user.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toEqual({ prompt: '', presetId: null });
  });

  it('can require a prompt', async () => {
    const { user, onSubmit } = renderEditor({ required: true });
    await user.click(save());
    expect(
      await screen.findByText('Write the instructions the assistant should follow.'),
    ).toBeInTheDocument();
    expect(prompt()).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a server error on the prompt', async () => {
    const { user } = renderEditor({
      defaultPrompt: 'x',
      onSubmit: () => ({ fieldErrors: { prompt: 'Contains a blocked phrase.' } }),
    });
    await user.click(save());
    expect(await screen.findByText('Contains a blocked phrase.')).toBeInTheDocument();
  });

  describe('presets', () => {
    it('shows the preset list only when there are presets', () => {
      const { unmount } = renderEditor();
      expect(screen.queryByRole('combobox', { name: /Preset/ })).not.toBeInTheDocument();
      unmount();
      renderEditor({ presets });
      expect(presetSelect()).toBeInTheDocument();
    });

    it('fills the text box with the chosen preset, and says which one was used', async () => {
      const { user, onSubmit } = renderEditor({ presets });
      await choosePreset(user, 'Tutor');
      expect(prompt()).toHaveValue('Explain step by step, then check understanding.');
      expect(presetSelect()).toHaveTextContent('Tutor');
      await user.click(save());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0]).toEqual({
        prompt: 'Explain step by step, then check understanding.',
        presetId: 'tutor',
      });
    });

    it('lists each preset with its description', async () => {
      const { user } = renderEditor({ presets });
      await user.click(presetSelect());
      expect(await screen.findByRole('option', { name: /Brief/ })).toHaveTextContent(
        'Short replies',
      );
    });

    it('starts on the preset whose text it was given', () => {
      renderEditor({ presets, defaultPrompt: 'Answer in one sentence.' });
      expect(presetSelect()).toHaveTextContent('Brief');
    });

    it('goes back to "Custom" once the text is changed', async () => {
      const { user } = renderEditor({ presets });
      await choosePreset(user, 'Brief');
      await user.type(prompt(), ' Please.');
      expect(presetSelect()).toHaveTextContent('Custom');
    });
  });

  describe('saving a preset', () => {
    it('is not offered without a handler', () => {
      renderEditor({ defaultPrompt: 'Text' });
      expect(screen.queryByRole('button', { name: 'Save as preset…' })).not.toBeInTheDocument();
    });

    it('needs some text, and a prompt that is not already a preset', async () => {
      const { user } = renderEditor({ onSavePreset: () => {}, presets });
      expect(saveAsPreset()).toBeDisabled();
      await user.type(prompt(), 'My own prompt');
      expect(saveAsPreset()).toBeEnabled();
      await choosePreset(user, 'Brief');
      expect(saveAsPreset()).toBeDisabled();
    });

    it('asks for a name, saves with Enter, and does not submit the form', async () => {
      const onSavePreset = vi.fn();
      const { user, onSubmit } = renderEditor({ onSavePreset, defaultPrompt: 'Be funny.' });
      await user.click(saveAsPreset());
      const name = screen.getByRole('textbox', { name: 'Preset name' });
      await waitFor(() => expect(name).toHaveFocus());
      await user.type(name, 'Comedian{Enter}');
      await waitFor(() =>
        expect(onSavePreset).toHaveBeenCalledWith({ name: 'Comedian', prompt: 'Be funny.' }),
      );
      expect(onSubmit).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(screen.queryByRole('group', { name: 'Save as preset…' })).toBeNull(),
      );
      expect(screen.getByText('Preset saved.')).toHaveAttribute('role', 'status');
    });

    it('saves with the button', async () => {
      const onSavePreset = vi.fn();
      const { user } = renderEditor({ onSavePreset, defaultPrompt: 'Be funny.' });
      await user.click(saveAsPreset());
      await user.type(screen.getByRole('textbox', { name: 'Preset name' }), 'Comedian');
      await user.click(screen.getByRole('button', { name: 'Save preset' }));
      await waitFor(() => expect(onSavePreset).toHaveBeenCalledTimes(1));
    });

    it('asks for a name when there is none, and for a new one when it is taken', async () => {
      const onSavePreset = vi.fn();
      const { user } = renderEditor({ onSavePreset, presets, defaultPrompt: 'Something new' });
      await user.click(saveAsPreset());
      await user.click(screen.getByRole('button', { name: 'Save preset' }));
      expect(await screen.findByText('Enter a name for the preset.')).toBeInTheDocument();
      await user.type(screen.getByRole('textbox', { name: 'Preset name' }), 'tutor');
      await user.click(screen.getByRole('button', { name: 'Save preset' }));
      expect(
        await screen.findByText('A preset with this name already exists.'),
      ).toBeInTheDocument();
      expect(onSavePreset).not.toHaveBeenCalled();
    });

    it('shows an error when saving fails, and keeps the name', async () => {
      const { user } = renderEditor({
        onSavePreset: async () => {
          throw new Error('nope');
        },
        defaultPrompt: 'Text',
      });
      await user.click(saveAsPreset());
      await user.type(screen.getByRole('textbox', { name: 'Preset name' }), 'Mine{Enter}');
      expect(
        await screen.findByText('The preset could not be saved. Try again.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Preset name' })).toHaveValue('Mine');
    });

    it('can be cancelled with the button or Escape', async () => {
      const { user } = renderEditor({ onSavePreset: () => {}, defaultPrompt: 'Text' });
      await user.click(saveAsPreset());
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('textbox', { name: 'Preset name' })).not.toBeInTheDocument();
      await user.click(saveAsPreset());
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('textbox', { name: 'Preset name' })).not.toBeInTheDocument();
    });
  });

  describe('deleting a preset', () => {
    it('is offered only while a preset is in use', async () => {
      const { user } = renderEditor({ presets, onDeletePreset: () => {} });
      expect(screen.queryByRole('button', { name: 'Delete preset' })).not.toBeInTheDocument();
      await choosePreset(user, 'Brief');
      expect(screen.getByRole('button', { name: 'Delete preset' })).toBeInTheDocument();
    });

    it('asks first, and does nothing when cancelled', async () => {
      const onDeletePreset = vi.fn();
      const { user } = renderEditor({ presets, onDeletePreset, defaultPrompt: presets[0]!.prompt });
      await user.click(screen.getByRole('button', { name: 'Delete preset' }));
      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toHaveTextContent('“Brief” will be removed from your presets.');
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      expect(onDeletePreset).not.toHaveBeenCalled();
    });

    it('deletes the preset when confirmed', async () => {
      const onDeletePreset = vi.fn();
      const { user } = renderEditor({ presets, onDeletePreset, defaultPrompt: presets[1]!.prompt });
      await user.click(screen.getByRole('button', { name: 'Delete preset' }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
      );
      await waitFor(() => expect(onDeletePreset).toHaveBeenCalledWith(presets[1]));
    });

    it('shows an error when deleting fails', async () => {
      const { user } = renderEditor({
        presets,
        defaultPrompt: presets[0]!.prompt,
        onDeletePreset: async () => {
          throw new Error('nope');
        },
      });
      await user.click(screen.getByRole('button', { name: 'Delete preset' }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
      );
      expect(await screen.findByRole('alert')).toHaveTextContent('could not be deleted');
    });
  });

  it('shows Cancel when there is a handler', async () => {
    const onCancel = vi.fn();
    const { user } = renderEditor({ onCancel });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('is disabled as a whole, and can show an error banner', () => {
    renderEditor({ disabled: true, presets, onSavePreset: () => {}, error: 'Locked.' });
    expect(prompt()).toBeDisabled();
    expect(save()).toBeDisabled();
    expect(presetSelect()).toBeDisabled();
    expect(saveAsPreset()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Locked.');
  });

  it('forwards a ref to the form and takes a class name', () => {
    const ref = createRef<HTMLFormElement>();
    const { container } = renderEditor({ ref, className: 'mine' } as never);
    expect(ref.current).toBe(container.querySelector('form'));
    expect(ref.current).toHaveClass('axon-system-prompt', 'mine');
  });

  it('can be translated', () => {
    renderEditor({
      presets,
      onSavePreset: () => {},
      labels: {
        prompt: 'Instrucciones',
        preset: 'Plantilla',
        submit: 'Guardar',
        savePreset: 'Guardar plantilla…',
      },
    });
    expect(screen.getByRole('textbox', { name: /Instrucciones/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Plantilla/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar plantilla…' })).toBeInTheDocument();
  });

  it('has no accessibility violations, including while saving a preset', async () => {
    const { container, user } = renderEditor({
      presets,
      onSavePreset: () => {},
      onDeletePreset: () => {},
      onCancel: () => {},
      defaultPrompt: 'Some text',
    });
    expect(await axe(container)).toHaveNoViolations();
    await user.click(saveAsPreset());
    expect(await axe(container)).toHaveNoViolations();
    await user.keyboard('{Escape}');
    await choosePreset(user, 'Tutor');
    await user.click(screen.getByRole('button', { name: 'Delete preset' }));
    await screen.findByRole('alertdialog');
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
  });
});

describe('createSystemPromptSchema', () => {
  const issues = (value: unknown, options = {}) => {
    const result = createSystemPromptSchema(options).safeParse(value);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it('allows anything within the limit, even nothing', () => {
    expect(issues({ prompt: '' })).toEqual([]);
    expect(issues({ prompt: 'x'.repeat(8000) })).toEqual([]);
  });

  it('enforces the limit, and a required prompt', () => {
    expect(issues({ prompt: 'x'.repeat(8001) })).toEqual([
      'Keep the instructions to 8000 characters or fewer.',
    ]);
    expect(issues({ prompt: '   ' }, { required: true })).toEqual([
      'Write the instructions the assistant should follow.',
    ]);
  });

  it('takes translated messages', () => {
    expect(
      issues(
        { prompt: 'abc' },
        { maxLength: 2, messages: { promptTooLong: (n: number) => `Máx ${n}` } },
      ),
    ).toEqual(['Máx 2']);
  });
});
