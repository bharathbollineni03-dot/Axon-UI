import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@axonui/core';
import { SubmittedValues, useMockSubmit, type MockServer } from '../../stories/mock';
import { LoginForm, type LoginFormProps, type LoginValues } from './LoginForm';

const meta: Meta<LoginFormProps> = {
  title: 'Prebuilt forms/LoginForm',
  component: LoginForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    identifier: { control: 'inline-radio', options: ['email', 'username', 'either'] },
    headingLevel: { control: 'inline-radio', options: [1, 2, 3] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    showRememberMe: { control: 'boolean' },
    card: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onSubmit: { control: false },
    socialLogins: { control: false },
    logo: { control: false },
    footer: { control: false },
  },
};
export default meta;
type Story = StoryObj<LoginFormProps>;

/** The form wired to a pretend server. Try it: the submit is slow, and then it succeeds. */
function Demo({ server, ...props }: Partial<LoginFormProps> & { server?: MockServer }) {
  const { onSubmit, submitted } = useMockSubmit<LoginValues>(server);
  return (
    <>
      <LoginForm {...props} onSubmit={onSubmit as LoginFormProps['onSubmit']} />
      <SubmittedValues values={submitted} />
    </>
  );
}

const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" role="img" aria-label="Acme">
    <rect width="40" height="40" rx="10" fill="var(--axon-color-primary-solid)" />
    <path d="M12 28 20 10l8 18h-4l-4-9-4 9z" fill="var(--axon-color-primary-on-solid)" />
  </svg>
);

const footer = (
  <>
    Don’t have an account? <a href="#signup">Sign up</a>
  </>
);

export const Playground: Story = {
  render: (args) => <Demo {...args} forgotPasswordHref="#forgot" footer={footer} />,
};

export const WithSocialLogins: Story = {
  render: () => (
    <Demo
      logo={<Logo />}
      title="Welcome back"
      description="Sign in to your Acme account."
      forgotPasswordHref="#forgot"
      footer={footer}
      socialLogins={
        <>
          <Button variant="outline" color="neutral" fullWidth>
            Continue with Google
          </Button>
          <Button variant="outline" color="neutral" fullWidth>
            Continue with GitHub
          </Button>
        </>
      }
    />
  ),
};

export const WithUsername: Story = {
  render: () => <Demo identifier="username" showRememberMe={false} />,
};

export const EmailOrUsername: Story = {
  render: () => <Demo identifier="either" />,
};

export const WrongPassword: Story = {
  name: 'Server error on a field',
  render: () => (
    <Demo
      server={{
        delay: 600,
        fieldErrors: { password: 'That password is not right. 2 attempts left.' },
      }}
    />
  ),
};

export const AccountLocked: Story = {
  name: 'Server error for the whole form',
  render: () => (
    <Demo server={{ delay: 600, formError: 'Your account is locked. Try again in 15 minutes.' }} />
  ),
};

export const ConnectionFails: Story = {
  name: 'Request fails (thrown error)',
  render: () => (
    <Demo server={{ delay: 600, throws: 'Could not reach the server. Check your connection.' }} />
  ),
};

export const WithErrorBanner: Story = {
  name: 'Error banner from your own state',
  render: () => <Demo error="Your session expired. Sign in again to continue." />,
};

export const Translated: Story = {
  render: () => (
    <Demo
      title="Iniciar sesión"
      description="Accede a tu cuenta."
      forgotPasswordHref="#olvide"
      labels={{
        email: 'Correo electrónico',
        password: 'Contraseña',
        remember: 'Recordarme',
        forgotPassword: '¿Olvidaste tu contraseña?',
        submit: 'Entrar',
      }}
    />
  ),
};

export const WithoutCard: Story = {
  render: () => <Demo card={false} headingLevel={2} />,
};

export const Disabled: Story = { render: () => <Demo disabled /> };
