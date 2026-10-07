import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button, Divider, Heading, Stack, Tab, TabList, TabPanel, Tabs, Text } from '@axon/core';
import {
  ChangePasswordForm,
  ContactForm,
  ForgotPasswordForm,
  LoginForm,
  NewsletterForm,
  OTPVerificationForm,
  ProfileForm,
  RegistrationForm,
  ResetPasswordForm,
} from '@axon/forms';

const meta: Meta = {
  title: 'Examples/Auth pages',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Every prebuilt form from `@axon/forms`, wired into a small sign-in flow and an account page. Each form validates on the client, shows server errors from `onSubmit` on the right field, and never takes focus unless asked.',
      },
    },
  },
};
export default meta;
type Story = StoryObj;

const wait = (ms = 700) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Page = 'login' | 'register' | 'forgot' | 'otp' | 'reset';

function Logo() {
  return (
    <strong
      style={{
        fontFamily: 'var(--axon-font-sans)',
        fontSize: 'var(--axon-font-size-xl)',
        color: 'var(--axon-color-primary-text)',
      }}
    >
      Axon
    </strong>
  );
}

function SwitchPage({
  to,
  onGo,
  children,
}: {
  to: Page;
  onGo: (page: Page) => void;
  children: ReactNode;
}) {
  return (
    <Button variant="link" size="sm" onClick={() => onGo(to)}>
      {children}
    </Button>
  );
}

function SignInFlow() {
  const [page, setPage] = useState<Page>('login');
  const [email, setEmail] = useState('');

  switch (page) {
    case 'register':
      return (
        <RegistrationForm
          centered
          logo={<Logo />}
          onSubmit={async (values) => {
            await wait();
            // A server can answer with errors for particular fields.
            if (values.email === 'taken@example.com')
              return { fieldErrors: { email: 'That email already has an account.' } };
            setEmail(values.email);
            setPage('otp');
          }}
          footer={
            <Text size="sm">
              Already registered?{' '}
              <SwitchPage to="login" onGo={setPage}>
                Sign in
              </SwitchPage>
            </Text>
          }
        />
      );
    case 'forgot':
      return (
        <ForgotPasswordForm
          centered
          logo={<Logo />}
          onSubmit={async (values) => {
            await wait();
            setEmail(values.email);
            setPage('reset');
          }}
          footer={
            <SwitchPage to="login" onGo={setPage}>
              Back to sign in
            </SwitchPage>
          }
        />
      );
    case 'otp':
      return (
        <OTPVerificationForm
          centered
          logo={<Logo />}
          description={email ? `We sent a code to ${email}. Try 123456.` : undefined}
          onResend={() => wait(400)}
          onSubmit={async (values) => {
            await wait();
            if (values.code !== '123456')
              return { fieldErrors: { code: 'That code is not right.' } };
            setPage('login');
          }}
          footer={
            <SwitchPage to="login" onGo={setPage}>
              Back to sign in
            </SwitchPage>
          }
        />
      );
    case 'reset':
      return (
        <ResetPasswordForm
          centered
          logo={<Logo />}
          onSubmit={async () => {
            await wait();
            setPage('login');
          }}
        />
      );
    default:
      return (
        <LoginForm
          centered
          logo={<Logo />}
          forgotPasswordHref="#"
          onForgotPassword={() => setPage('forgot')}
          onSubmit={async (values) => {
            await wait();
            if (values.password === 'wrong')
              return { formError: 'The email or password is not right.' };
          }}
          socialLogins={
            <Stack gap={2}>
              <Button variant="outline" color="neutral" fullWidth>
                Continue with Google
              </Button>
              <Button variant="outline" color="neutral" fullWidth>
                Continue with GitHub
              </Button>
            </Stack>
          }
          footer={
            <Text size="sm">
              New here?{' '}
              <SwitchPage to="register" onGo={setPage}>
                Create an account
              </SwitchPage>
            </Text>
          }
        />
      );
  }
}

export const SignIn: Story = {
  name: 'Sign in, register, verify and reset',
  render: () => <SignInFlow />,
};

function AccountPage() {
  return (
    <main
      style={{
        maxWidth: '44rem',
        margin: '0 auto',
        padding: 'var(--axon-space-8) var(--axon-space-4)',
        display: 'grid',
        gap: 'var(--axon-space-4)',
      }}
    >
      <Heading level={1} size="2xl">
        Account
      </Heading>
      <Tabs defaultValue="profile">
        <TabList aria-label="Account sections">
          <Tab value="profile">Profile</Tab>
          <Tab value="security">Security</Tab>
          <Tab value="notifications">Notifications</Tab>
          <Tab value="support">Support</Tab>
        </TabList>
        <TabPanel value="profile">
          <ProfileForm
            card={false}
            headingLevel={2}
            title="Your profile"
            defaultValues={{
              firstName: 'Ada',
              lastName: 'Lovelace',
              email: 'ada@example.com',
              bio: 'Wrote the first program.',
            }}
            onSubmit={() => wait()}
            onCancel={() => undefined}
          />
        </TabPanel>
        <TabPanel value="security">
          <ChangePasswordForm
            card={false}
            headingLevel={2}
            title="Change your password"
            onSubmit={() => wait()}
          />
        </TabPanel>
        <TabPanel value="notifications">
          <NewsletterForm
            card={false}
            headingLevel={2}
            title="Email updates"
            onSubmit={() => wait()}
          />
        </TabPanel>
        <TabPanel value="support">
          <ContactForm
            card={false}
            headingLevel={2}
            title="Contact support"
            onSubmit={() => wait()}
          />
        </TabPanel>
      </Tabs>
      <Divider />
      <Text size="sm" color="secondary">
        Forms inside a page use <code>card={'{false}'}</code> and a heading level that fits the page
        outline.
      </Text>
    </main>
  );
}

export const Account: Story = {
  name: 'Account settings',
  render: () => <AccountPage />,
};
