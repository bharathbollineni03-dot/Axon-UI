import type { Meta, StoryObj } from '@storybook/react';
import { SubmittedValues, useMockSubmit, type MockServer } from '../../stories/mock';
import { ProfileForm, type ProfileFormProps, type ProfileValues } from './ProfileForm';

const meta: Meta<ProfileFormProps> = {
  title: 'Prebuilt forms/ProfileForm',
  component: ProfileForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    maxBioLength: { control: { type: 'number', min: 20, max: 500 } },
    disableWhenPristine: { control: 'boolean' },
    headingLevel: { control: 'inline-radio', options: [1, 2, 3] },
    card: { control: 'boolean' },
    onSubmit: { control: false },
    onCancel: { control: false },
    onRemoveAvatar: { control: false },
  },
};
export default meta;
type Story = StoryObj<ProfileFormProps>;

function Demo({ server, ...props }: Partial<ProfileFormProps> & { server?: MockServer }) {
  const { onSubmit, submitted } = useMockSubmit<ProfileValues>(server);
  return (
    <>
      <ProfileForm {...props} onSubmit={onSubmit as ProfileFormProps['onSubmit']} />
      <SubmittedValues values={submitted} />
    </>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const ExistingProfile: Story = {
  render: () => (
    <Demo
      defaultValues={{ name: 'Ada Lovelace', bio: 'Mathematician. Wrote the first program.' }}
      avatarUrl="https://i.pravatar.cc/160?img=47"
      onRemoveAvatar={() => {}}
      onCancel={() => {}}
      disableWhenPristine
    />
  ),
};

export const InitialsOnly: Story = {
  name: 'No picture yet (initials)',
  render: () => <Demo defaultValues={{ name: 'Grace Hopper' }} />,
};

export const UploadFails: Story = {
  name: 'Server error on the picture',
  render: () => (
    <Demo
      defaultValues={{ name: 'Ada Lovelace' }}
      server={{ delay: 600, fieldErrors: { avatar: 'We could not process that image.' } }}
    />
  ),
};

export const ShortBio: Story = {
  render: () => <Demo maxBioLength={60} defaultValues={{ name: 'Ada' }} />,
};
