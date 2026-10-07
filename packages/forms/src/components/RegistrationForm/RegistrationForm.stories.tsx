import type { Meta, StoryObj } from '@storybook/react';
import { FormTextField } from '../FormBindings/FormBindings';
import { SubmittedValues, useMockSubmit, type MockServer } from '../../stories/mock';
import {
  RegistrationForm,
  type RegistrationFormProps,
  type RegistrationValues,
} from './RegistrationForm';

const meta: Meta<RegistrationFormProps> = {
  title: 'Prebuilt forms/RegistrationForm',
  component: RegistrationForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    showPasswordStrength: { control: 'boolean' },
    requireTerms: { control: 'boolean' },
    headingLevel: { control: 'inline-radio', options: [1, 2, 3] },
    card: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onSubmit: { control: false },
    footer: { control: false },
    logo: { control: false },
  },
};
export default meta;
type Story = StoryObj<RegistrationFormProps>;

function Demo({ server, ...props }: Partial<RegistrationFormProps> & { server?: MockServer }) {
  const { onSubmit, submitted } = useMockSubmit<RegistrationValues>(server);
  return (
    <>
      <RegistrationForm {...props} onSubmit={onSubmit as RegistrationFormProps['onSubmit']} />
      <SubmittedValues values={submitted} />
    </>
  );
}

const footer = (
  <>
    Already have an account? <a href="#login">Sign in</a>
  </>
);

export const Playground: Story = { render: (args) => <Demo {...args} footer={footer} /> };

export const StrictPasswordRules: Story = {
  render: () => (
    <Demo
      passwordRules={{
        minLength: 12,
        requireUppercase: true,
        requireNumber: true,
        requireSymbol: true,
      }}
      description="Passwords need 12+ characters with a capital, a number and a symbol."
    />
  ),
};

export const WithTermsLinks: Story = {
  render: () => (
    <Demo
      labels={{
        terms: (
          <>
            I agree to the <a href="#terms">Terms of Service</a> and the{' '}
            <a href="#privacy">Privacy Policy</a>
          </>
        ),
      }}
    />
  ),
};

export const WithExtraField: Story = {
  name: 'With an extra field',
  render: () => (
    <Demo>
      <FormTextField
        name="company"
        label="Company (optional)"
        autoComplete="organization"
        fullWidth
      />
    </Demo>
  ),
};

export const EmailAlreadyRegistered: Story = {
  name: 'Server error on a field',
  render: () => (
    <Demo server={{ delay: 600, fieldErrors: { email: 'That email is already registered.' } }} />
  ),
};

export const SignUpsClosed: Story = {
  name: 'Server error for the whole form',
  render: () => <Demo server={{ delay: 600, formError: 'Sign-ups are closed right now.' }} />,
};

export const WithoutStrengthMeter: Story = {
  render: () => <Demo showPasswordStrength={false} requireTerms={false} />,
};

export const Translated: Story = {
  render: () => (
    <Demo
      title="Crea tu cuenta"
      labels={{
        name: 'Nombre completo',
        email: 'Correo electrónico',
        password: 'Contraseña',
        confirmPassword: 'Confirmar contraseña',
        terms: 'Acepto los términos y la política de privacidad',
        submit: 'Crear cuenta',
        passwordStrength: {
          meter: 'Seguridad de la contraseña',
          scores: ['', 'Débil', 'Regular', 'Buena', 'Fuerte'],
        },
      }}
    />
  ),
};
