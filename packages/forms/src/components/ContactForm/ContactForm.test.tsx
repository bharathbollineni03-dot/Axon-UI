import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { contactSchema, createContactSchema, ContactForm } from './ContactForm';

async function fill(user = userEvent.setup(), message = 'Hello, I have a question about billing.') {
  await user.type(screen.getByLabelText(/^Name/), 'Ada Lovelace');
  await user.type(screen.getByLabelText(/^Email/), 'ada@example.com');
  await user.type(screen.getByLabelText(/^Message/), message);
}

describe('ContactForm', () => {
  it('renders the fields and a send button', () => {
    render(<ContactForm onSubmit={() => {}} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Contact us' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/^Message/).tagName).toBe('TEXTAREA');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Subject')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  describe('validation', () => {
    it('asks for the name, email and message', async () => {
      const onSubmit = vi.fn();
      render(<ContactForm onSubmit={onSubmit} />);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Send message' }));
      expect(await screen.findByText('Enter your name.')).toBeInTheDocument();
      expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
      expect(screen.getByText('Write a message.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('rejects a message that is too short', async () => {
      const user = userEvent.setup();
      render(<ContactForm onSubmit={() => {}} />);
      await fill(user, 'Hi');
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      expect(await screen.findByText('Write at least 10 characters.')).toBeInTheDocument();
    });

    it('takes the length limits you set', async () => {
      const user = userEvent.setup();
      render(<ContactForm onSubmit={() => {}} minMessageLength={30} />);
      await fill(user, 'Short but over ten');
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      expect(await screen.findByText('Write at least 30 characters.')).toBeInTheDocument();
    });
  });

  it('counts the message', async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={() => {}} maxMessageLength={100} />);
    expect(screen.getByText('0 / 100')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Message/), 'hello');
    expect(screen.getByText('5 / 100')).toBeInTheDocument();
  });

  describe('optional fields', () => {
    it('adds a topic select, and submits the choice', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(
        <ContactForm
          onSubmit={onSubmit}
          topics={[
            { value: 'billing', label: 'Billing' },
            { value: 'support', label: 'Support' },
          ]}
        />,
      );
      await fill(user);
      await user.click(screen.getByRole('combobox', { name: /Topic/ }));
      await user.click(await screen.findByRole('option', { name: 'Support' }));
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({ topic: 'support' });
    });

    it('adds a subject line', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ContactForm onSubmit={onSubmit} showSubject />);
      await fill(user);
      await user.type(screen.getByLabelText('Subject'), 'Invoice');
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({ subject: 'Invoice' });
    });

    it('adds a consent checkbox that must be ticked', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ContactForm onSubmit={onSubmit} consentLabel="I agree to be contacted" />);
      await fill(user);
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      expect(await screen.findByText('Please agree to continue.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
      await user.click(screen.getByRole('checkbox', { name: 'I agree to be contacted' }));
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({ consent: true });
    });

    it('can make consent optional', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(
        <ContactForm onSubmit={onSubmit} consentLabel="Keep me posted" requireConsent={false} />,
      );
      await fill(user);
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });
  });

  describe('confirmation', () => {
    it('replaces the form with a confirmation after success', async () => {
      const user = userEvent.setup();
      render(<ContactForm onSubmit={() => {}} />);
      await fill(user);
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      expect(await screen.findByRole('heading', { name: 'Message sent' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('We will reply as soon as we can.');
      // (The card itself is labelled "Message sent", so look for the field by its role.)
      expect(screen.queryByRole('textbox', { name: /^Message/ })).not.toBeInTheDocument();
    });

    it('writes another message with a fresh form', async () => {
      const user = userEvent.setup();
      render(<ContactForm onSubmit={() => {}} />);
      await fill(user);
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      await user.click(await screen.findByRole('button', { name: 'Send another message' }));
      expect(await screen.findByLabelText(/^Message/)).toBeInTheDocument();
    });

    it('stays on the form when sending fails', async () => {
      const user = userEvent.setup();
      render(
        <ContactForm
          onSubmit={() => {
            throw new Error('Could not send.');
          }}
        />,
      );
      await fill(user);
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Could not send.');
      expect(screen.queryByRole('heading', { name: 'Message sent' })).not.toBeInTheDocument();
    });

    it('can be turned off', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ContactForm onSubmit={onSubmit} showSuccess={false} />);
      await fill(user);
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(screen.queryByRole('heading', { name: 'Message sent' })).not.toBeInTheDocument();
    });
  });

  it('submits the values', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      topic: null,
      subject: '',
      message: 'Hello, I have a question about billing.',
      consent: false,
    });
  });

  it('translates the labels', () => {
    render(
      <ContactForm
        onSubmit={() => {}}
        title="Contacto"
        labels={{ name: 'Nombre', email: 'Correo', message: 'Mensaje', submit: 'Enviar' }}
      />,
    );
    expect(screen.getByLabelText(/^Nombre/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });

  it('exports its schema and a factory', () => {
    const valid = {
      name: 'Ada',
      email: 'a@b.co',
      topic: null,
      subject: '',
      message: 'A message that is long enough.',
      consent: false,
    };
    expect(contactSchema.safeParse(valid).success).toBe(true);
    expect(createContactSchema({ requireConsent: true }).safeParse(valid).success).toBe(false);
  });

  it('has no accessibility violations, including with errors showing', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ContactForm
        onSubmit={() => {}}
        topics={[{ value: 'a', label: 'A' }]}
        showSubject
        consentLabel="I agree"
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByText('Enter your name.');
    expect(await axe(container)).toHaveNoViolations();
  });
});
