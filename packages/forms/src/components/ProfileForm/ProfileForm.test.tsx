import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProfileSchema, profileSchema, ProfileForm } from './ProfileForm';
import { Form } from '../Form/Form';
import { FormAvatarUpload } from '../AvatarUpload/FormAvatarUpload';

const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;
const png = (size = 10, name = 'me.png') =>
  new File([new Uint8Array(size)], name, { type: 'image/png' });

describe('ProfileForm', () => {
  it('renders a picture field, a name, a bio and a save button', () => {
    render(<ProfileForm onSubmit={() => {}} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Your profile' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Profile photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('validates the name', async () => {
    const onSubmit = vi.fn();
    render(<ProfileForm onSubmit={onSubmit} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Enter your name.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('counts the bio and stops at the limit', async () => {
    const user = userEvent.setup();
    render(<ProfileForm onSubmit={() => {}} maxBioLength={20} />);
    expect(screen.getByText('0 / 20')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Bio'), 'x'.repeat(30));
    expect(screen.getByText('20 / 20')).toBeInTheDocument();
  });

  it('submits the name, the bio and no picture by default', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ProfileForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/^Name/), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Bio'), 'Mathematician.');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      avatar: null,
      name: 'Ada Lovelace',
      bio: 'Mathematician.',
    });
  });

  it('starts from the current profile', () => {
    render(
      <ProfileForm
        onSubmit={() => {}}
        defaultValues={{ name: 'Ada Lovelace', bio: 'Mathematician.' }}
      />,
    );
    expect(screen.getByLabelText(/^Name/)).toHaveValue('Ada Lovelace');
    expect(screen.getByLabelText('Bio')).toHaveValue('Mathematician.');
  });

  describe('picture', () => {
    beforeEach(() => {
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn(() => 'blob:preview'),
        revokeObjectURL: vi.fn(),
      });
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('opens the file chooser from the button', async () => {
      const click = vi.spyOn(HTMLInputElement.prototype, 'click');
      await userEvent
        .setup()
        .click(
          (render(<ProfileForm onSubmit={() => {}} />),
          screen.getByRole('button', { name: 'Change photo' })),
        );
      expect(click).toHaveBeenCalled();
    });

    it('takes the chosen picture, previews it and submits it', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      const file = png();
      render(<ProfileForm onSubmit={onSubmit} defaultValues={{ name: 'Ada' }} />);
      await user.upload(fileInput(), file);
      expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument();
      expect(document.querySelector('.axon-avatar img')).toHaveAttribute('src', 'blob:preview');
      await user.click(screen.getByRole('button', { name: 'Save changes' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0].avatar).toBe(file);
    });

    it('drops a newly chosen picture with Undo', async () => {
      const user = userEvent.setup();
      render(<ProfileForm onSubmit={() => {}} avatarUrl="/current.png" />);
      await user.upload(fileInput(), png());
      await user.click(await screen.findByRole('button', { name: 'Undo' }));
      expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
      expect(document.querySelector('.axon-avatar img')).toHaveAttribute('src', '/current.png');
    });

    it('rejects a file that is not an image', async () => {
      // The chooser filters by `accept`, so the test must switch that off to get a text file in.
      const user = userEvent.setup({ applyAccept: false });
      render(<ProfileForm onSubmit={() => {}} defaultValues={{ name: 'Ada' }} />);
      await user.upload(fileInput(), new File(['x'], 'notes.txt', { type: 'text/plain' }));
      await user.click(screen.getByRole('button', { name: 'Save changes' }));
      expect(await screen.findByText('Choose an image file.')).toBeInTheDocument();
    });

    it('rejects a picture that is too large', async () => {
      const user = userEvent.setup();
      render(
        <ProfileForm
          onSubmit={() => {}}
          defaultValues={{ name: 'Ada' }}
          maxAvatarSize={1024 * 1024}
        />,
      );
      await user.upload(fileInput(), png(2 * 1024 * 1024));
      await user.click(screen.getByRole('button', { name: 'Save changes' }));
      expect(await screen.findByText('Choose a picture under 1 MB.')).toBeInTheDocument();
    });

    it('shows the current picture, and a Remove button that calls onRemoveAvatar', async () => {
      const onRemoveAvatar = vi.fn();
      render(
        <ProfileForm
          onSubmit={() => {}}
          avatarUrl="/current.png"
          onRemoveAvatar={onRemoveAvatar}
        />,
      );
      expect(document.querySelector('.axon-avatar img')).toHaveAttribute('src', '/current.png');
      await userEvent.setup().click(screen.getByRole('button', { name: 'Remove photo' }));
      expect(onRemoveAvatar).toHaveBeenCalledTimes(1);
    });

    it('has no Remove button without a current picture', () => {
      render(<ProfileForm onSubmit={() => {}} onRemoveAvatar={() => {}} />);
      expect(screen.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument();
    });

    it('lets the same file be chosen again after Undo', async () => {
      const user = userEvent.setup();
      const file = png();
      render(<ProfileForm onSubmit={() => {}} />);
      await user.upload(fileInput(), file);
      await user.click(await screen.findByRole('button', { name: 'Undo' }));
      await user.upload(fileInput(), file);
      expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument();
    });

    it('releases the preview URL when the picture changes', async () => {
      const user = userEvent.setup();
      render(<ProfileForm onSubmit={() => {}} />);
      await user.upload(fileInput(), png());
      await user.click(await screen.findByRole('button', { name: 'Undo' }));
      await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview'));
    });
  });

  it('shows the hint text, and translates the labels', () => {
    render(
      <ProfileForm
        onSubmit={() => {}}
        title="Tu perfil"
        labels={{
          avatar: 'Foto',
          changePhoto: 'Cambiar foto',
          name: 'Nombre',
          bio: 'Biografía',
          submit: 'Guardar',
          avatarHint: () => 'JPG o PNG.',
        }}
      />,
    );
    expect(screen.getByRole('group', { name: 'Foto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar foto' })).toBeInTheDocument();
    expect(screen.getByText('JPG o PNG.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('can show Cancel, and keep Save off until something changes', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<ProfileForm onSubmit={() => {}} onCancel={onCancel} disableWhenPristine />);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    await user.type(screen.getByLabelText(/^Name/), 'A');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('exports its schema and a factory', () => {
    expect(profileSchema.safeParse({ avatar: null, name: 'Ada', bio: '' }).success).toBe(true);
    expect(
      profileSchema.safeParse({ avatar: null, name: 'Ada', bio: 'x'.repeat(161) }).success,
    ).toBe(false);
    expect(
      createProfileSchema({ maxBioLength: 500 }).safeParse({
        avatar: null,
        name: 'Ada',
        bio: 'x'.repeat(161),
      }).success,
    ).toBe(true);
  });

  it('forwards the ref to the form', () => {
    const ref = createRef<HTMLFormElement>();
    render(<ProfileForm ref={ref} onSubmit={() => {}} />);
    expect(ref.current?.tagName).toBe('FORM');
  });

  it('has no accessibility violations, including with errors showing', async () => {
    const user = userEvent.setup();
    const { container } = render(<ProfileForm onSubmit={() => {}} avatarUrl="/current.png" />);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Enter your name.');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('FormAvatarUpload', () => {
  it('works on its own inside a Form, with a ref to its button', async () => {
    const ref = createRef<HTMLButtonElement>();
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const file = png();
    render(
      <Form defaultValues={{ photo: null }} onSubmit={onSubmit}>
        <FormAvatarUpload ref={ref} name="photo" label="Photo" fallbackName="Ada Lovelace" />
        <button>Save</button>
      </Form>,
    );
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Change photo' }));
    expect(screen.getByText('AL')).toBeInTheDocument();
    await user.upload(fileInput(), file);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toEqual({ photo: file });
  });

  it('can be disabled', () => {
    render(
      <Form onSubmit={() => {}}>
        <FormAvatarUpload name="photo" disabled />
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeDisabled();
  });
});
