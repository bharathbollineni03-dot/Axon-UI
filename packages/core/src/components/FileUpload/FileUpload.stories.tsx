import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FileUpload, getFileKey, type FileUploadProps, type FileUploadState } from './FileUpload';

const meta = {
  title: 'Core/FileUpload',
  component: FileUpload,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    multiple: { control: 'boolean' },
    maxSize: { control: 'number' },
    maxFiles: { control: 'number' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    uploads: { control: false },
    onChange: { action: 'changed' },
    onReject: { action: 'rejected' },
  },
  args: { label: 'Attachments', helperText: 'Drop files or browse.' },
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const ImagesOnly: Story = {
  args: {
    label: 'Profile photo',
    accept: 'image/png,image/jpeg',
    maxSize: 2 * 1024 * 1024,
    multiple: false,
    helperText: undefined,
  },
};

export const LimitedFiles: Story = {
  args: { label: 'Documents', accept: '.pdf,.docx', maxSize: 5 * 1024 * 1024, maxFiles: 3 },
};

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-6)' }}>
      <FileUpload {...args} label="Required" required helperText={undefined} />
      <FileUpload {...args} label="Error" error errorMessage="Attach at least one file" />
      <FileUpload {...args} label="Disabled" disabled />
    </div>
  ),
};

/** A fake uploader: moves each new file from 0 to 100% and sometimes fails. */
function UploadDemo(args: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<Record<string, FileUploadState>>({});
  const started = useRef(new Set<string>());

  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = [];
    for (const file of files) {
      const key = getFileKey(file);
      if (started.current.has(key)) continue;
      started.current.add(key);
      let progress = 0;
      setUploads((current) => ({ ...current, [key]: { status: 'uploading', progress: 0 } }));
      const timer = setInterval(() => {
        progress += 12 + Math.random() * 10;
        if (progress >= 100) {
          clearInterval(timer);
          const failed = file.name.toLowerCase().includes('fail');
          setUploads((current) => ({
            ...current,
            [key]: failed
              ? { status: 'error', error: 'Upload failed. Try again.' }
              : { status: 'done' },
          }));
        } else {
          setUploads((current) => ({ ...current, [key]: { status: 'uploading', progress } }));
        }
      }, 300);
      timers.push(timer);
    }
    return () => timers.forEach(clearInterval);
  }, [files]);

  return (
    <FileUpload
      {...args}
      value={files}
      onChange={setFiles}
      uploads={uploads}
      helperText='Name a file "fail" to see a failed upload.'
    />
  );
}

export const WithUploadProgress: Story = {
  args: { label: 'Upload files', maxSize: 10 * 1024 * 1024 },
  render: (args) => <UploadDemo {...args} />,
};
