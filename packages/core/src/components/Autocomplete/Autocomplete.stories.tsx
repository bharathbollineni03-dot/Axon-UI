import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Autocomplete, type AutocompleteProps } from './Autocomplete';

const cities = [
  'Amsterdam',
  'Athens',
  'Austin',
  'Barcelona',
  'Berlin',
  'Boston',
  'Brussels',
  'Budapest',
  'Chicago',
  'Copenhagen',
  'Dublin',
  'Edinburgh',
  'Helsinki',
  'Lisbon',
  'London',
  'Madrid',
  'Montréal',
  'Oslo',
  'Paris',
  'Prague',
  'Rome',
  'Stockholm',
  'Vienna',
  'Zürich',
].map((name) => ({ value: name.toLowerCase(), label: name }));

/** A mock search API: filters after a short delay, and aborts when the signal fires. */
function searchCities(query: string, signal: AbortSignal) {
  return new Promise<typeof cities>((resolve, reject) => {
    const timer = setTimeout(() => {
      const q = query.toLowerCase();
      resolve(cities.filter((city) => city.label.toLowerCase().includes(q)).slice(0, 8));
    }, 600);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

const meta = {
  title: 'Core/Autocomplete',
  component: Autocomplete,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['outline', 'filled'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    freeSolo: { control: 'boolean' },
    clearable: { control: 'boolean' },
    highlightMatches: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    options: { control: false },
    loadOptions: { control: false },
    onChange: { action: 'changed' },
    onInputChange: { action: 'input changed' },
  },
  args: {
    label: 'City',
    options: cities,
    placeholder: 'Start typing…',
    helperText: 'Type to filter, then use the arrow keys.',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 24rem)', minHeight: '22rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Autocomplete>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { args: { clearable: true } };

export const FreeText: Story = {
  args: {
    freeSolo: true,
    label: 'Departure city',
    helperText: 'Pick a suggestion or type anything and press Enter.',
  },
};

export const AsyncOptions: Story = {
  args: {
    options: undefined,
    loadOptions: searchCities,
    label: 'Search cities (async)',
    helperText: 'Debounced; results arrive after a short delay.',
    clearable: true,
  },
};

export const Grouped: Story = {
  args: {
    options: [
      { label: 'Europe', options: cities.slice(0, 6) },
      { label: 'North America', options: [cities[2]!, cities[5]!, cities[8]!] },
    ],
  },
};

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      <Autocomplete {...args} label="Required" required />
      <Autocomplete {...args} label="Error" error errorMessage="Select a city" />
      <Autocomplete {...args} label="Disabled" disabled defaultValue="paris" />
      <Autocomplete {...args} label="Filled" variant="filled" />
    </div>
  ),
};

function ControlledDemo(args: AutocompleteProps) {
  const [value, setValue] = useState<string | null>('rome');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' }}>
      <Autocomplete {...args} value={value} onChange={setValue} />
      <button type="button" onClick={() => setValue('oslo')}>
        Set to Oslo (value = {String(value)})
      </button>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
