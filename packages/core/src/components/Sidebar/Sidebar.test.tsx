import { createRef, forwardRef, useState, type AnchorHTMLAttributes } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar, SidebarItem, SidebarSection, SidebarToggle, type SidebarProps } from './Sidebar';

function Example(props: Partial<SidebarProps>) {
  return (
    <Sidebar aria-label="Main" {...props}>
      <SidebarSection title="Workspace">
        <SidebarItem href="/home" icon={<svg />} label="Home" active />
        <SidebarItem href="/inbox" icon={<svg />} label="Inbox" badge="3" />
        <SidebarItem icon={<svg />} label="Archive" onClick={() => undefined} />
      </SidebarSection>
    </Sidebar>
  );
}

describe('Sidebar', () => {
  it('is a navigation landmark with the given name', () => {
    render(<Example />);
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('defaults the landmark name to "Sidebar"', () => {
    render(
      <Sidebar>
        <SidebarItem href="/" label="Home" />
      </Sidebar>,
    );
    expect(screen.getByRole('navigation', { name: 'Sidebar' })).toBeInTheDocument();
  });

  it('renders links for items with an href and buttons otherwise', () => {
    render(<Example />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/home');
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
  });

  it('marks the active item with aria-current="page"', () => {
    render(<Example />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Inbox/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Home' })).toHaveClass('axon-sidebar__item--active');
  });

  it('groups items under a labelled section', () => {
    render(<Example />);
    expect(screen.getByRole('group', { name: 'Workspace' })).toBeInTheDocument();
  });

  it('shows a badge after the label', () => {
    render(<Example />);
    expect(screen.getByRole('link', { name: 'Inbox 3' })).toBeInTheDocument();
  });

  it('calls onClick and does nothing when disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Sidebar aria-label="Main">
        <SidebarItem label="Run" onClick={onClick} />
        <SidebarItem label="Locked" onClick={onClick} disabled />
        <SidebarItem href="/x" label="Dead link" onClick={onClick} disabled />
      </Sidebar>,
    );
    await user.click(screen.getByRole('button', { name: 'Run' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Locked' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Locked' })).toBeDisabled();
    const dead = screen.getByRole('link', { name: 'Dead link' });
    expect(dead).not.toHaveAttribute('href');
    expect(dead).toHaveAttribute('aria-disabled', 'true');
    await user.click(dead);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders items with another component through `as`', () => {
    const Router = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
      function Router(props, ref) {
        return (
          <a ref={ref} data-router="" {...props}>
            {props.children}
          </a>
        );
      },
    );
    render(
      <Sidebar aria-label="Main">
        <SidebarItem as={Router} href="/a" label="A" />
      </Sidebar>,
    );
    expect(screen.getByRole('link', { name: 'A' })).toHaveAttribute('data-router');
  });

  it('pins header and footer around the items', () => {
    render(
      <Sidebar aria-label="Main" header={<span>Logo</span>} footer={<span>Account</span>}>
        <SidebarItem href="/" label="Home" />
      </Sidebar>,
    );
    expect(screen.getByRole('navigation').textContent).toBe('LogoHomeAccount');
  });

  it('forwards the ref, className and width variables', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Sidebar
        ref={ref}
        aria-label="Main"
        className="extra"
        width={300}
        collapsedWidth="5rem"
        data-testid="sb"
        color="success"
      >
        <SidebarItem href="/" label="Home" />
      </Sidebar>,
    );
    const element = screen.getByTestId('sb');
    expect(ref.current).toBe(element);
    expect(element).toHaveClass('axon-sidebar', 'axon-sidebar--success', 'extra');
    expect(element.style.getPropertyValue('--axon-sidebar-width')).toBe('300px');
    expect(element.style.getPropertyValue('--axon-sidebar-collapsed-width')).toBe('5rem');
  });

  describe('collapsing', () => {
    it('keeps item names for assistive technology and adds a tooltip when collapsed', () => {
      render(<Example collapsed />);
      expect(screen.getByRole('navigation')).toHaveClass('axon-sidebar--collapsed');
      const home = screen.getByRole('link', { name: 'Home' });
      expect(home).toHaveAttribute('title', 'Home');
      expect(home.querySelector('.axon-sidebar__label')).toHaveClass('axon-visually-hidden');
    });

    it('does not add a tooltip when expanded', () => {
      render(<Example />);
      expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('title');
    });

    it('keeps the section title available as the group name when collapsed', () => {
      render(<Example collapsed />);
      expect(screen.getByRole('group', { name: 'Workspace' })).toBeInTheDocument();
    });

    it('toggles with SidebarToggle, uncontrolled', async () => {
      const onCollapsedChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Sidebar aria-label="Main" onCollapsedChange={onCollapsedChange} footer={<SidebarToggle />}>
          <SidebarItem href="/" label="Home" />
        </Sidebar>,
      );
      await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
      expect(onCollapsedChange).toHaveBeenCalledWith(true);
      expect(screen.getByRole('navigation')).toHaveClass('axon-sidebar--collapsed');
      await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
      expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
      expect(screen.getByRole('navigation')).not.toHaveClass('axon-sidebar--collapsed');
    });

    it('starts collapsed with defaultCollapsed', () => {
      render(<Example defaultCollapsed />);
      expect(screen.getByRole('navigation')).toHaveClass('axon-sidebar--collapsed');
    });

    it('works controlled', async () => {
      function Controlled() {
        const [collapsed, setCollapsed] = useState(false);
        return (
          <Sidebar
            aria-label="Main"
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            footer={<SidebarToggle collapseLabel="Narrow" expandLabel="Widen" />}
          >
            <SidebarItem href="/" label="Home" />
          </Sidebar>
        );
      }
      const user = userEvent.setup();
      render(<Controlled />);
      await user.click(screen.getByRole('button', { name: 'Narrow' }));
      expect(screen.getByRole('navigation')).toHaveClass('axon-sidebar--collapsed');
      expect(screen.getByRole('button', { name: 'Widen' })).toBeInTheDocument();
    });
  });

  it('has no axe violations (expanded and collapsed)', async () => {
    const { container } = render(
      <>
        <Example />
        <Example collapsed aria-label="Collapsed" />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
