import type { Meta, StoryObj } from '@storybook/react';
import { SubmittedValues, useMockSubmit, type MockServer } from '../../stories/mock';
import { NewsletterForm, type NewsletterFormProps, type NewsletterValues } from './NewsletterForm';

const meta: Meta<NewsletterFormProps> = {
  title: 'Prebuilt forms/NewsletterForm',
  component: NewsletterForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    layout: { control: 'inline-radio', options: ['stacked', 'inline'] },
    showName: { control: 'boolean' },
    showSuccess: { control: 'boolean' },
    card: { control: 'boolean' },
    headingLevel: { control: 'inline-radio', options: [1, 2, 3] },
    onSubmit: { control: false },
    consentLabel: { control: false },
  },
};
export default meta;
type Story = StoryObj<NewsletterFormProps>;

function Demo({ server, ...props }: Partial<NewsletterFormProps> & { server?: MockServer }) {
  const { onSubmit, submitted } = useMockSubmit<NewsletterValues>(server);
  return (
    <div style={{ maxWidth: '28rem' }}>
      <NewsletterForm {...props} onSubmit={onSubmit as NewsletterFormProps['onSubmit']} />
      <SubmittedValues values={submitted} />
    </div>
  );
}

export const Playground: Story = {
  render: (args) => <Demo {...args} description="One email a week. No spam." />,
};

export const Inline: Story = {
  name: 'Inline: field and button on one row',
  render: () => <Demo layout="inline" description="Product news, once a month." />,
};

export const WithNameAndConsent: Story = {
  render: () => (
    <Demo
      showName
      consentLabel={
        <>
          I agree to receive emails. I can unsubscribe at any time (<a href="#privacy">privacy</a>).
        </>
      }
    />
  ),
};

export const InACard: Story = {
  render: () => <Demo card description="Join 12,000 readers." />,
};

export const AlreadySubscribed: Story = {
  name: 'Server error on the field',
  render: () => (
    <Demo
      layout="inline"
      server={{ delay: 600, fieldErrors: { email: 'That address is already subscribed.' } }}
    />
  ),
};
