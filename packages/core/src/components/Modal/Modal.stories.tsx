import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { DropdownMenu } from '../DropdownMenu';
import { MenuItem } from '../Menu';
import { Select } from '../Select';
import { TextField } from '../TextField';
import { Modal, type ModalProps, type ModalSize } from './Modal';

const meta = {
  title: 'Overlays/Modal',
  component: Modal,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'xl', 'full'] },
    scrollBehavior: { control: 'inline-radio', options: ['inside', 'outside'] },
    role: { control: 'inline-radio', options: ['dialog', 'alertdialog'] },
    showCloseButton: { control: 'boolean' },
    closeOnEscape: { control: 'boolean' },
    closeOnBackdrop: { control: 'boolean' },
  },
  args: {
    open: false,
    title: 'Modal',
    size: 'md',
    onClose: () => undefined,
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A button that opens the modal passed as a render function. */
function Trigger({
  label = 'Open modal',
  children,
}: {
  label?: string;
  children: (api: { open: boolean; close: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{label}</Button>
      {children({ open, close: () => setOpen(false) })}
    </>
  );
}

const lorem =
  'Overlays are for tasks that need the whole of the user’s attention. Keep them short, give them a clear way out and return the user to where they were.';

export const Playground: Story = {
  render: (args) => (
    <Trigger>
      {({ open, close }) => (
        <Modal
          {...(args as ModalProps)}
          open={open}
          onClose={close}
          title="Project settings"
          description="Changes apply to everyone on the team."
          footer={
            <>
              <Button variant="outline" color="neutral" onClick={close}>
                Cancel
              </Button>
              <Button onClick={close}>Save</Button>
            </>
          }
        >
          <p style={{ margin: 0 }}>{lorem}</p>
        </Modal>
      )}
    </Trigger>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--axon-space-2)', flexWrap: 'wrap' }}>
      {(['sm', 'md', 'lg', 'xl', 'full'] as ModalSize[]).map((size) => (
        <Trigger key={size} label={`Size ${size}`}>
          {({ open, close }) => (
            <Modal open={open} onClose={close} title={`Size ${size}`} size={size}>
              <p style={{ margin: 0 }}>{lorem}</p>
            </Modal>
          )}
        </Trigger>
      ))}
    </div>
  ),
};

export const LongContent: Story = {
  name: 'Long content (scrolls inside)',
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--axon-space-2)' }}>
      {(['inside', 'outside'] as const).map((scrollBehavior) => (
        <Trigger key={scrollBehavior} label={`Scroll ${scrollBehavior}`}>
          {({ open, close }) => (
            <Modal
              open={open}
              onClose={close}
              title="Terms of service"
              scrollBehavior={scrollBehavior}
              footer={<Button onClick={close}>Accept</Button>}
            >
              {Array.from({ length: 16 }, (_, i) => (
                <p key={i} style={{ marginTop: 0 }}>
                  {i + 1}. {lorem}
                </p>
              ))}
            </Modal>
          )}
        </Trigger>
      ))}
    </div>
  ),
};

function FormExample() {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Rename</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Rename file"
        initialFocusRef={input}
        footer={
          <>
            <Button variant="outline" color="neutral" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Rename</Button>
          </>
        }
      >
        <TextField ref={input} label="New name" defaultValue="report.pdf" />
      </Modal>
    </>
  );
}

export const WithForm: Story = {
  name: 'With a form (initial focus on the field)',
  render: () => <FormExample />,
};

export const PopupsInside: Story = {
  name: 'Menus and selects inside',
  render: () => (
    <Trigger>
      {({ open, close }) => (
        <Modal
          open={open}
          onClose={close}
          title="Share"
          footer={<Button onClick={close}>Done</Button>}
        >
          <div style={{ display: 'grid', gap: 'var(--axon-space-4)' }}>
            <Select
              label="Who can see this"
              options={[
                { value: 'team', label: 'My team' },
                { value: 'org', label: 'Everyone in the company' },
                { value: 'public', label: 'Anyone with the link' },
              ]}
              defaultValue="team"
            />
            <div>
              <DropdownMenu trigger={<Button variant="outline">More actions</Button>}>
                <MenuItem>Copy link</MenuItem>
                <MenuItem>Download</MenuItem>
              </DropdownMenu>
            </div>
          </div>
        </Modal>
      )}
    </Trigger>
  ),
};

function NestedExample() {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);
  return (
    <>
      <Button onClick={() => setOuter(true)}>Open first</Button>
      <Modal
        open={outer}
        onClose={() => setOuter(false)}
        title="First modal"
        footer={<Button onClick={() => setOuter(false)}>Close</Button>}
      >
        <p style={{ marginTop: 0 }}>Esc closes only the modal on top.</p>
        <Button variant="outline" onClick={() => setInner(true)}>
          Open second
        </Button>
        <Modal open={inner} onClose={() => setInner(false)} title="Second modal" size="sm">
          <p style={{ margin: 0 }}>Closing this returns focus to the button above.</p>
        </Modal>
      </Modal>
    </>
  );
}

export const Nested: Story = {
  render: () => <NestedExample />,
};

export const NotDismissible: Story = {
  name: 'Not dismissible by Esc or backdrop',
  render: () => (
    <Trigger>
      {({ open, close }) => (
        <Modal
          open={open}
          onClose={close}
          title="Choose a plan"
          closeOnEscape={false}
          closeOnBackdrop={false}
          showCloseButton={false}
          footer={<Button onClick={close}>Continue</Button>}
        >
          <p style={{ margin: 0 }}>The only way out is the button.</p>
        </Modal>
      )}
    </Trigger>
  ),
};
