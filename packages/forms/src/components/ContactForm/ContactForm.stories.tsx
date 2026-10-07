import type { Meta, StoryObj } from '@storybook/react';
import { SubmittedValues, useMockSubmit, type MockServer } from '../../stories/mock';
import { ContactForm, type ContactFormProps, type ContactValues } from './ContactForm';

const meta: Meta<ContactFormProps> = {
  title: 'Prebuilt forms/ContactForm',
  component: ContactForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    showSubject: { control: 'boolean' },
    showSuccess: { control: 'boolean' },
    minMessageLength: { control: { type: 'number', min: 0, max: 200 } },
    maxMessageLength: { control: { type: 'number', min: 50, max: 5000 } },
    headingLevel: { control: 'inline-radio', options: [1, 2, 3] },
    card: { control: 'boolean' },
    onSubmit: { control: false },
    consentLabel: { control: false },
  },
};
export default meta;
type Story = StoryObj<ContactFormProps>;

function Demo({ server, ...props }: Partial<ContactFormProps> & { server?: MockServer }) {
  const { onSubmit, submitted } = useMockSubmit<ContactValues>(server);
  return (
    <>
      <ContactForm {...props} onSubmit={onSubmit as ContactFormProps['onSubmit']} />
      <SubmittedValues values={submitted} />
    </>
  );
}

const topics = [
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Support' },
  { value: 'billing', label: 'Billing' },
  { value: 'other', label: 'Something else' },
];

export const Playground: Story = {
  render: (args) => <Demo {...args} description="We reply within one business day." />,
};

export const WithTopicAndSubject: Story = {
  render: () => <Demo topics={topics} showSubject />,
};

export const WithConsent: Story = {
  render: () => (
    <Demo
      consentLabel={
        <>
          I agree to be contacted about my request (<a href="#privacy">Privacy Policy</a>)
        </>
      }
    />
  ),
};

export const SendFails: Story = {
  name: 'Request fails (thrown error)',
  render: () => (
    <Demo server={{ delay: 600, throws: 'We could not send your message. Try again.' }} />
  ),
};

export const RateLimited: Story = {
  name: 'Server error for the whole form',
  render: () => (
    <Demo server={{ delay: 600, formError: 'You have sent too many messages. Try again later.' }} />
  ),
};

export const Translated: Story = {
  render: () => (
    <Demo
      title="Contáctanos"
      topics={[{ value: 'ventas', label: 'Ventas' }]}
      labels={{
        name: 'Nombre',
        email: 'Correo electrónico',
        topic: 'Tema',
        topicPlaceholder: 'Elige un tema',
        message: 'Mensaje',
        submit: 'Enviar mensaje',
        successTitle: 'Mensaje enviado',
        successMessage: 'Gracias por escribirnos. Te responderemos pronto.',
        sendAnother: 'Enviar otro mensaje',
      }}
    />
  ),
};
