import type { Meta, StoryObj } from '@storybook/react';
import { SubmittedValues, useMockSubmit, type MockServer } from '../../stories/mock';
import {
  ForgotPasswordForm,
  type ForgotPasswordFormProps,
  type ForgotPasswordValues,
} from './ForgotPasswordForm';

const meta: Meta<ForgotPasswordFormProps> = {
  title: 'Prebuilt forms/ForgotPasswordForm',
  component: ForgotPasswordForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    showSuccess: { control: 'boolean' },
    headingLevel: { control: 'inline-radio', options: [1, 2, 3] },
    card: { control: 'boolean' },
    onSubmit: { control: false },
  },
};
export default meta;
type Story = StoryObj<ForgotPasswordFormProps>;

function Demo({ server, ...props }: Partial<ForgotPasswordFormProps> & { server?: MockServer }) {
  const { onSubmit, submitted } = useMockSubmit<ForgotPasswordValues>(server);
  return (
    <>
      <ForgotPasswordForm {...props} onSubmit={onSubmit as ForgotPasswordFormProps['onSubmit']} />
      <SubmittedValues values={submitted} />
    </>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} backHref="#login" /> };

export const ServerError: Story = {
  name: 'Server error on the field',
  render: () => (
    <Demo
      backHref="#login"
      server={{ delay: 600, fieldErrors: { email: 'We could not send an email to that address.' } }}
    />
  ),
};

export const ServiceDown: Story = {
  name: 'Request fails (thrown error)',
  render: () => (
    <Demo server={{ delay: 600, throws: 'The mail service is down. Try again soon.' }} />
  ),
};

export const WithoutConfirmation: Story = {
  name: 'Without the built-in confirmation',
  render: () => <Demo showSuccess={false} />,
};

export const Translated: Story = {
  render: () => (
    <Demo
      title="¿Olvidaste tu contraseña?"
      description="Escribe tu correo y te enviaremos un enlace."
      backHref="#login"
      labels={{
        email: 'Correo electrónico',
        submit: 'Enviar enlace',
        backToSignIn: 'Volver a iniciar sesión',
        successTitle: 'Revisa tu correo',
        successMessage: (email) => `Si existe una cuenta para ${email}, te enviamos un enlace.`,
        tryAnotherEmail: 'Usar otro correo',
      }}
    />
  ),
};
