import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import {
  APIKeyForm,
  createApiKeySchema,
  type APIKeyFormProps,
  type ApiKeyProvider,
} from './APIKeyForm';

const providers: ApiKeyProvider[] = [
  { id: 'openai', name: 'OpenAI', keyPrefix: 'sk-', keyExample: 'sk-…' },
  { id: 'anthropic', name: 'Anthropic', keyPrefix: 'sk-ant-' },
  {
    id: 'custom',
    name: 'Custom (OpenAI compatible)',
    requiresBaseUrl: true,
    baseUrl: 'https://llm.example.com/v1',
  },
];

function renderForm(props: Partial<APIKeyFormProps> = {}) {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const utils = render(<APIKeyForm providers={providers} onSubmit={onSubmit} {...props} />);
  return { ...utils, user, onSubmit };
}

const provider = () => screen.getByRole('combobox', { name: /Provider/ });
const key = () => screen.getByLabelText(/^API key/, { selector: 'input' });
const baseUrl = () => screen.getByLabelText(/^API address/);
const save = () => screen.getByRole('button', { name: 'Save key' });
const test = () => screen.getByRole('button', { name: /^Test connection|^Testing/ });

const choose = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(provider());
  await user.click(await screen.findByRole('option', { name }));
};

const VALID_KEY = 'sk-abcdefghijkl';

describe('APIKeyForm', () => {
  describe('fields', () => {
    it('has a provider, a masked key and a save button', () => {
      renderForm();
      expect(provider()).toHaveTextContent('OpenAI');
      expect(key()).toHaveAttribute('type', 'password');
      expect(save()).toBeInTheDocument();
    });

    it('treats the key as a secret: no autofill, spelling or capitals, and nothing prefilled', () => {
      renderForm({ defaultValues: { provider: 'anthropic' } });
      expect(key()).toHaveAttribute('autocomplete', 'new-password');
      expect(key()).toHaveAttribute('spellcheck', 'false');
      expect(key()).toHaveAttribute('autocapitalize', 'none');
      expect(key()).toHaveValue('');
    });

    it('never prefills the key, even if one is passed in', () => {
      renderForm({ defaultValues: { apiKey: 'sk-leaked-secret' } as never });
      expect(key()).toHaveValue('');
    });

    it('can show the key', async () => {
      const { user } = renderForm();
      await user.type(key(), VALID_KEY);
      await user.click(screen.getByRole('button', { name: 'Show password' }));
      expect(key()).toHaveAttribute('type', 'text');
    });

    it('shows an example key for the chosen provider', async () => {
      const { user } = renderForm();
      expect(key()).toHaveAttribute('placeholder', 'sk-…');
      await choose(user, 'Anthropic');
      expect(key()).not.toHaveAttribute('placeholder', 'sk-…');
    });

    it('asks for an address only for a provider that needs one', async () => {
      const { user } = renderForm();
      expect(screen.queryByLabelText(/^API address/)).not.toBeInTheDocument();
      await choose(user, 'Custom (OpenAI compatible)');
      expect(baseUrl()).toHaveAttribute('placeholder', 'https://llm.example.com/v1');
      expect(baseUrl()).toHaveAttribute('type', 'url');
    });

    it('starts on the provider you give', () => {
      renderForm({ defaultValues: { provider: 'anthropic' } });
      expect(provider()).toHaveTextContent('Anthropic');
    });
  });

  describe('validation', () => {
    it('needs a key', async () => {
      const { user, onSubmit } = renderForm();
      await user.click(save());
      expect(await screen.findByText('Enter your API key.')).toBeInTheDocument();
      expect(key()).toHaveAttribute('aria-invalid', 'true');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('rejects a key that is too short', async () => {
      const { user } = renderForm();
      await user.type(key(), 'sk-1');
      await user.click(save());
      expect(await screen.findByText('This key looks too short.')).toBeInTheDocument();
    });

    it("rejects a key that does not start the way the provider's do", async () => {
      const { user } = renderForm({ defaultValues: { provider: 'anthropic' } });
      await user.type(key(), 'sk-abcdefghijkl');
      await user.click(save());
      expect(await screen.findByText('Anthropic keys start with “sk-ant-”.')).toBeInTheDocument();
    });

    it('needs an address for a provider that requires one, and a real one', async () => {
      const { user, onSubmit } = renderForm({ defaultValues: { provider: 'custom' } });
      await user.type(key(), 'anything-long-enough');
      await user.click(save());
      expect(await screen.findByText('Enter the address of the API.')).toBeInTheDocument();
      await user.type(baseUrl(), 'not a url');
      await user.click(save());
      expect(
        await screen.findByText('Enter a full address starting with http:// or https://.'),
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('allows an empty key while one is already saved', async () => {
      const { user, onSubmit } = renderForm({ hasStoredKey: true });
      expect(key()).toHaveAttribute('placeholder', '•••••••• (saved)');
      expect(screen.getByText(/Leave this empty to keep it/)).toBeInTheDocument();
      await user.click(save());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0]).toEqual({ provider: 'openai', apiKey: '', baseUrl: '' });
    });

    it('still checks a new key while one is saved', async () => {
      const { user } = renderForm({ hasStoredKey: true });
      await user.type(key(), 'short');
      await user.click(save());
      expect(await screen.findByText('This key looks too short.')).toBeInTheDocument();
    });
  });

  describe('submitting', () => {
    it('gives the provider, the trimmed key and the address', async () => {
      const { user, onSubmit } = renderForm();
      await user.type(key(), `  ${VALID_KEY}  `);
      await user.click(save());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0]).toEqual({
        provider: 'openai',
        apiKey: VALID_KEY,
        baseUrl: '',
      });
    });

    it('sends the address for a self-hosted provider', async () => {
      const { user, onSubmit } = renderForm({ defaultValues: { provider: 'custom' } });
      await user.type(key(), 'anything-long-enough');
      await user.type(baseUrl(), 'https://llm.internal/v1');
      await user.click(save());
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({
        provider: 'custom',
        baseUrl: 'https://llm.internal/v1',
      });
    });

    it('shows a server error on the key', async () => {
      const { user } = renderForm({
        onSubmit: () => ({ fieldErrors: { apiKey: 'This key was revoked.' } }),
      });
      await user.type(key(), VALID_KEY);
      await user.click(save());
      expect(await screen.findByText('This key was revoked.')).toBeInTheDocument();
    });
  });

  describe('testing the connection', () => {
    it('has no test button without a handler', () => {
      renderForm();
      expect(screen.queryByRole('button', { name: /Test connection/ })).not.toBeInTheDocument();
    });

    it('checks the form first and does not call out with invalid values', async () => {
      const onTestConnection = vi.fn();
      const { user } = renderForm({ onTestConnection });
      await user.click(test());
      expect(await screen.findByText('Enter your API key.')).toBeInTheDocument();
      expect(onTestConnection).not.toHaveBeenCalled();
    });

    it('tests with the values, and shows the result politely', async () => {
      const onTestConnection = vi.fn(async () => ({
        ok: true,
        message: 'Connected to 12 models.',
      }));
      const { user, onSubmit } = renderForm({ onTestConnection });
      await user.type(key(), VALID_KEY);
      await user.click(test());
      expect(await screen.findByText('Connected to 12 models.')).toBeInTheDocument();
      expect(onTestConnection).toHaveBeenCalledWith({
        provider: 'openai',
        apiKey: VALID_KEY,
        baseUrl: '',
      });
      expect(screen.getByRole('status')).toHaveTextContent('Connected to 12 models.');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows a failure, with a default message when there is none', async () => {
      const { user } = renderForm({ onTestConnection: async () => ({ ok: false }) });
      await user.type(key(), VALID_KEY);
      await user.click(test());
      expect(await screen.findByText('The connection failed.')).toBeInTheDocument();
    });

    it('shows the message of an error that was thrown', async () => {
      const { user } = renderForm({
        onTestConnection: async () => {
          throw new Error('Network unreachable');
        },
      });
      await user.type(key(), VALID_KEY);
      await user.click(test());
      expect(await screen.findByText('Network unreachable')).toBeInTheDocument();
    });

    it('is busy while it waits', async () => {
      let finish: (result: { ok: boolean }) => void = () => {};
      const { user } = renderForm({
        onTestConnection: () => new Promise((resolve) => (finish = resolve)),
      });
      await user.type(key(), VALID_KEY);
      await user.click(test());
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Testing…' })).toBeInTheDocument(),
      );
      expect(screen.getByRole('button', { name: 'Testing…' })).toHaveAttribute('aria-busy', 'true');
      finish({ ok: true });
      expect(await screen.findByText('Connected.')).toBeInTheDocument();
    });

    it('hides a result once the values it was for have changed', async () => {
      const { user } = renderForm({
        onTestConnection: async () => ({ ok: true, message: 'Fine.' }),
      });
      await user.type(key(), VALID_KEY);
      await user.click(test());
      await screen.findByText('Fine.');
      await user.type(key(), 'x');
      expect(screen.queryByText('Fine.')).not.toBeInTheDocument();
    });
  });

  it('shows Cancel when there is a handler', async () => {
    const onCancel = vi.fn();
    const { user } = renderForm({ onCancel });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('is disabled as a whole, and can show an error banner', () => {
    renderForm({
      disabled: true,
      error: 'Keys are managed by your admin.',
      onTestConnection: async () => ({ ok: true }),
    });
    expect(provider()).toBeDisabled();
    expect(key()).toBeDisabled();
    expect(save()).toBeDisabled();
    expect(test()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Keys are managed by your admin.');
  });

  it('forwards a ref to the form and takes a class name', () => {
    const ref = createRef<HTMLFormElement>();
    const { container } = renderForm({ ref, className: 'mine' } as never);
    expect(ref.current).toBe(container.querySelector('form'));
    expect(ref.current).toHaveClass('axon-api-key', 'mine');
  });

  it('can be translated', () => {
    renderForm({
      labels: { provider: 'Proveedor', apiKey: 'Clave de API', submit: 'Guardar', test: 'Probar' },
      onTestConnection: async () => ({ ok: true }),
    });
    expect(screen.getByRole('combobox', { name: /Proveedor/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Clave de API/, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Probar' })).toBeInTheDocument();
  });

  it('has no accessibility violations, with errors and a test result showing', async () => {
    const { container, user } = renderForm({
      defaultValues: { provider: 'custom' },
      onTestConnection: async () => ({ ok: false, message: 'Unauthorized' }),
      onCancel: () => {},
    });
    expect(await axe(container)).toHaveNoViolations();
    await user.click(save());
    await screen.findByText('Enter the address of the API.');
    expect(await axe(container)).toHaveNoViolations();
    await user.type(key(), 'anything-long-enough');
    await user.type(baseUrl(), 'https://llm.example.com');
    await user.click(test());
    await screen.findByText('Unauthorized');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('createApiKeySchema', () => {
  const issues = (value: unknown, options = {}) => {
    const result = createApiKeySchema({ providers, ...options }).safeParse(value);
    return result.success
      ? []
      : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  };

  it('accepts a good key', () => {
    expect(issues({ provider: 'openai', apiKey: VALID_KEY, baseUrl: '' })).toEqual([]);
  });

  it('reports each problem on the field it belongs to', () => {
    expect(issues({ provider: '', apiKey: VALID_KEY, baseUrl: '' })).toEqual([
      'provider: Choose a provider.',
    ]);
    expect(issues({ provider: 'openai', apiKey: '', baseUrl: '' })).toEqual([
      'apiKey: Enter your API key.',
    ]);
    expect(issues({ provider: 'custom', apiKey: 'long-enough-key', baseUrl: 'ftp://x' })).toEqual([
      'baseUrl: Enter a full address starting with http:// or https://.',
    ]);
  });

  it('takes an empty key when one is stored, and translated messages', () => {
    expect(issues({ provider: 'openai', apiKey: '', baseUrl: '' }, { hasStoredKey: true })).toEqual(
      [],
    );
    expect(
      issues(
        { provider: 'anthropic', apiKey: 'sk-abcdefgh', baseUrl: '' },
        { messages: { keyPrefix: (name: string, prefix: string) => `${name}: ${prefix}` } },
      ),
    ).toEqual(['apiKey: Anthropic: sk-ant-']);
  });
});
