import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Tab, TabList, TabPanel, Tabs, type TabsProps } from './Tabs';

function Example(props: Partial<TabsProps> & { disableSecond?: boolean }) {
  const { disableSecond, ...rest } = props;
  return (
    <Tabs {...rest}>
      <TabList aria-label="Account">
        <Tab value="profile">Profile</Tab>
        <Tab value="security" disabled={disableSecond}>
          Security
        </Tab>
        <Tab value="billing">Billing</Tab>
      </TabList>
      <TabPanel value="profile">Profile content</TabPanel>
      <TabPanel value="security">Security content</TabPanel>
      <TabPanel value="billing">Billing content</TabPanel>
    </Tabs>
  );
}

const tab = (name: string) => screen.getByRole('tab', { name });

describe('Tabs', () => {
  it('has a tablist of tabs, each linked to its panel', () => {
    render(<Example />);
    expect(screen.getByRole('tablist', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    const profile = tab('Profile');
    const panel = screen.getByRole('tabpanel', { name: 'Profile' });
    expect(profile).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', profile.id);
  });

  it('selects the first enabled tab when there is no initial value', () => {
    render(<Example disableSecond />);
    expect(tab('Profile')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Profile content')).toBeVisible();
    expect(screen.getByText('Security content')).not.toBeVisible();
  });

  it('starts on defaultValue', () => {
    render(<Example defaultValue="billing" />);
    expect(tab('Billing')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Billing content')).toBeVisible();
    expect(screen.getByText('Profile content')).not.toBeVisible();
  });

  it('keeps only the selected tab in the tab order (roving tabindex)', () => {
    render(<Example defaultValue="security" />);
    expect(tab('Security')).toHaveAttribute('tabindex', '0');
    expect(tab('Profile')).toHaveAttribute('tabindex', '-1');
    expect(tab('Billing')).toHaveAttribute('tabindex', '-1');
  });

  it('selects a tab on click and reports it', async () => {
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    await userEvent.setup().click(tab('Billing'));
    expect(onChange).toHaveBeenCalledWith('billing');
    expect(tab('Billing')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Billing content')).toBeVisible();
  });

  it('does not select a disabled tab', async () => {
    render(<Example disableSecond />);
    await userEvent.setup().click(tab('Security'));
    expect(tab('Profile')).toHaveAttribute('aria-selected', 'true');
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState('profile');
      return (
        <>
          <button type="button" onClick={() => setValue('billing')}>
            Jump
          </button>
          <Example value={value} onChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'Jump' }));
    expect(tab('Billing')).toHaveAttribute('aria-selected', 'true');
    await user.click(tab('Profile'));
    expect(screen.getByRole('status')).toHaveTextContent('profile');
  });

  it('forwards refs and applies modifiers', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Tabs ref={ref} variant="pills" size="lg" color="success" className="extra" defaultValue="a">
        <TabList aria-label="Refs">
          <Tab value="a">A</Tab>
        </TabList>
        <TabPanel value="a">x</TabPanel>
      </Tabs>,
    );
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current).toHaveClass(
      'axon-tabs',
      'axon-tabs--pills',
      'axon-tabs--lg',
      'axon-tabs--success',
      'axon-tabs--horizontal',
      'extra',
    );
  });

  describe('keyboard (horizontal)', () => {
    it('moves with ←/→ and selects as it goes, wrapping at the ends', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      expect(tab('Profile')).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(tab('Security')).toHaveFocus();
      expect(tab('Security')).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{ArrowRight}{ArrowRight}');
      expect(tab('Profile')).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(tab('Billing')).toHaveFocus();
    });

    it('jumps with Home and End', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      await user.keyboard('{End}');
      expect(tab('Billing')).toHaveFocus();
      await user.keyboard('{Home}');
      expect(tab('Profile')).toHaveFocus();
    });

    it('skips disabled tabs', async () => {
      const user = userEvent.setup();
      render(<Example disableSecond />);
      await user.tab();
      await user.keyboard('{ArrowRight}');
      expect(tab('Billing')).toHaveFocus();
    });

    it('ignores ↑/↓', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      await user.keyboard('{ArrowDown}');
      expect(tab('Profile')).toHaveFocus();
    });

    it('moves focus from the selected tab into the panel with Tab', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      await user.tab();
      expect(screen.getByRole('tabpanel')).toHaveFocus();
    });
  });

  describe('manual activation', () => {
    it('moves focus without selecting until Enter or Space', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example activation="manual" onChange={onChange} />);
      onChange.mockClear();
      await user.tab();
      await user.keyboard('{ArrowRight}');
      expect(tab('Security')).toHaveFocus();
      expect(tab('Profile')).toHaveAttribute('aria-selected', 'true');
      expect(onChange).not.toHaveBeenCalled();
      await user.keyboard('{Enter}');
      expect(tab('Security')).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{ArrowRight}');
      await user.keyboard(' ');
      expect(tab('Billing')).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('vertical', () => {
    it('sets aria-orientation and moves with ↑/↓ instead', async () => {
      const user = userEvent.setup();
      render(<Example orientation="vertical" />);
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
      expect(screen.getByRole('tablist').parentElement).toHaveClass('axon-tabs--vertical');
      await user.tab();
      await user.keyboard('{ArrowRight}');
      expect(tab('Profile')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(tab('Security')).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(tab('Profile')).toHaveFocus();
    });
  });

  describe('lazy panels', () => {
    const Probe = ({ id }: { id: string }) => <span>{id} body</span>;

    function Lazy(props: Partial<TabsProps>) {
      return (
        <Tabs {...props}>
          <TabList aria-label="Lazy">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a">
            <Probe id="a" />
          </TabPanel>
          <TabPanel value="b">
            <Probe id="b" />
          </TabPanel>
        </Tabs>
      );
    }

    it('renders every panel up front by default', () => {
      render(<Lazy />);
      expect(screen.getByText('b body')).toBeInTheDocument();
    });

    it('with `lazy`, mounts a panel the first time its tab is selected and keeps it', async () => {
      const user = userEvent.setup();
      render(<Lazy lazy />);
      expect(screen.getByText('a body')).toBeInTheDocument();
      expect(screen.queryByText('b body')).not.toBeInTheDocument();
      await user.click(tab('B'));
      expect(screen.getByText('b body')).toBeInTheDocument();
      await user.click(tab('A'));
      expect(screen.getByText('b body')).toBeInTheDocument();
    });

    it('with `lazy` and `unmountOnHide`, drops a panel again when it is deselected', async () => {
      const user = userEvent.setup();
      render(<Lazy lazy unmountOnHide />);
      await user.click(tab('B'));
      expect(screen.queryByText('a body')).not.toBeInTheDocument();
      expect(screen.getByText('b body')).toBeInTheDocument();
    });
  });

  it('puts an icon before the label and hides it from assistive technology', () => {
    render(
      <Tabs defaultValue="a">
        <TabList aria-label="Icons">
          <Tab value="a" icon={<svg data-testid="icon" />}>
            Home
          </Tab>
        </TabList>
        <TabPanel value="a">x</TabPanel>
      </Tabs>,
    );
    expect(tab('Home')).toBeInTheDocument();
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('throws a helpful error outside <Tabs>', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Tab value="x">x</Tab>)).toThrow(/Tabs/);
    spy.mockRestore();
  });

  it('has no axe violations (horizontal and vertical)', async () => {
    const { container } = render(
      <>
        <Example />
        <Example orientation="vertical" variant="pills" disableSecond />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
