import {
  createRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import { Menu, type MenuProps } from './Menu';
import {
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  SubMenu,
} from './MenuItems';

/** Renders a menu anchored to a button that stays on the page, so outside presses can be tested. */
function Harness({
  children,
  menuRef,
  onClose = () => undefined,
  ...props
}: Partial<Omit<MenuProps, 'anchor' | 'children'>> & {
  children?: ReactNode;
  menuRef?: Ref<HTMLDivElement>;
}) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  return (
    <>
      <button ref={setAnchor} type="button">
        Anchor
      </button>
      <button type="button">Elsewhere</button>
      <Menu ref={menuRef} open anchor={anchor} onClose={onClose} aria-label="Actions" {...props}>
        {children}
      </Menu>
    </>
  );
}

const basicItems = (
  <>
    <MenuItem>Cut</MenuItem>
    <MenuItem>Copy</MenuItem>
    <MenuItem disabled>Paste</MenuItem>
    <MenuItem>Select all</MenuItem>
  </>
);

const item = (name: string | RegExp) => screen.getByRole('menuitem', { name });

describe('Menu', () => {
  it('renders nothing while closed', () => {
    render(
      <Menu open={false} anchor={null} onClose={() => undefined}>
        <MenuItem>One</MenuItem>
      </Menu>,
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('is a vertical menu of menuitems, named by aria-label', async () => {
    render(<Harness>{basicItems}</Harness>);
    const menu = await screen.findByRole('menu', { name: 'Actions' });
    expect(menu).toHaveAttribute('aria-orientation', 'vertical');
    expect(screen.getAllByRole('menuitem')).toHaveLength(4);
  });

  it('forwards the ref and extra props to the panel and applies modifiers', async () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Harness menuRef={ref} className="extra" data-testid="panel" color="success">
        {basicItems}
      </Harness>,
    );
    const menu = await screen.findByRole('menu');
    expect(ref.current).toBe(menu);
    expect(menu).toHaveClass('axon-menu', 'axon-menu--success', 'extra');
    expect(menu).toHaveAttribute('data-testid', 'panel');
  });

  describe('initial focus', () => {
    it('focuses the first item by default', async () => {
      render(<Harness>{basicItems}</Harness>);
      await waitFor(() => expect(item('Cut')).toHaveFocus());
    });

    it('can focus the last item', async () => {
      render(<Harness initialFocus="last">{basicItems}</Harness>);
      await waitFor(() => expect(item('Select all')).toHaveFocus());
    });

    it('can focus the panel itself', async () => {
      render(<Harness initialFocus="panel">{basicItems}</Harness>);
      await waitFor(() => expect(screen.getByRole('menu')).toHaveFocus());
    });

    it('can leave focus alone', async () => {
      render(<Harness initialFocus="none">{basicItems}</Harness>);
      await screen.findByRole('menu');
      expect(document.body).toHaveFocus();
    });
  });

  describe('keyboard', () => {
    it('moves with ↓/↑, wrapping and skipping disabled items', async () => {
      const user = userEvent.setup();
      render(<Harness>{basicItems}</Harness>);
      await waitFor(() => expect(item('Cut')).toHaveFocus());
      await user.keyboard('{ArrowDown}');
      expect(item('Copy')).toHaveFocus();
      await user.keyboard('{ArrowDown}'); // skips the disabled Paste
      expect(item('Select all')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(item('Cut')).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(item('Select all')).toHaveFocus();
    });

    it('starts at the first item on ↓ and at the last on ↑ when the panel has focus', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<Harness initialFocus="panel">{basicItems}</Harness>);
      await waitFor(() => expect(screen.getByRole('menu')).toHaveFocus());
      await user.keyboard('{ArrowDown}');
      expect(item('Cut')).toHaveFocus();
      unmount();

      render(<Harness initialFocus="panel">{basicItems}</Harness>);
      await waitFor(() => expect(screen.getByRole('menu')).toHaveFocus());
      await user.keyboard('{ArrowUp}');
      expect(item('Select all')).toHaveFocus();
    });

    it('jumps with Home and End', async () => {
      const user = userEvent.setup();
      render(<Harness>{basicItems}</Harness>);
      await waitFor(() => expect(item('Cut')).toHaveFocus());
      await user.keyboard('{End}');
      expect(item('Select all')).toHaveFocus();
      await user.keyboard('{Home}');
      expect(item('Cut')).toHaveFocus();
    });

    it('closes with Escape and Tab, telling the owner why', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<Harness onClose={onClose}>{basicItems}</Harness>);
      await waitFor(() => expect(item('Cut')).toHaveFocus());
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenLastCalledWith('escape');
      await user.keyboard('{Tab}');
      expect(onClose).toHaveBeenLastCalledWith('tab');
    });

    it('does not let Escape reach handlers above the menu', async () => {
      const onKeyDown = vi.fn();
      const user = userEvent.setup();
      render(
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div onKeyDown={onKeyDown}>
          <Harness>{basicItems}</Harness>
        </div>,
      );
      await waitFor(() => expect(item('Cut')).toHaveFocus());
      await user.keyboard('{Escape}');
      expect(onKeyDown).not.toHaveBeenCalled();
    });

    it('activates the focused item with Enter and with Space', async () => {
      const onCut = vi.fn();
      const onCopy = vi.fn();
      const user = userEvent.setup();
      render(
        <Harness>
          <MenuItem onClick={onCut}>Cut</MenuItem>
          <MenuItem onClick={onCopy}>Copy</MenuItem>
        </Harness>,
      );
      await waitFor(() => expect(item('Cut')).toHaveFocus());
      await user.keyboard('{Enter}');
      expect(onCut).toHaveBeenCalledTimes(1);
      await user.keyboard('{ArrowDown}');
      await user.keyboard(' ');
      expect(onCopy).toHaveBeenCalledTimes(1);
    });
  });

  describe('typeahead', () => {
    const fruit = (
      <>
        <MenuItem>Apple</MenuItem>
        <MenuItem>Apricot</MenuItem>
        <MenuItem>Banana</MenuItem>
        <MenuItem>Blueberry</MenuItem>
        <MenuItem disabled>Cherry</MenuItem>
        <MenuItem>New file</MenuItem>
      </>
    );

    it('focuses the first item starting with the typed letter', async () => {
      const user = userEvent.setup();
      render(<Harness>{fruit}</Harness>);
      await waitFor(() => expect(item('Apple')).toHaveFocus());
      await user.keyboard('b');
      expect(item('Banana')).toHaveFocus();
    });

    it('extends the search with more letters typed in quick succession', async () => {
      const user = userEvent.setup();
      render(<Harness>{fruit}</Harness>);
      await waitFor(() => expect(item('Apple')).toHaveFocus());
      await user.keyboard('bl');
      expect(item('Blueberry')).toHaveFocus();
    });

    it('cycles through matches when the same letter is repeated', async () => {
      const user = userEvent.setup();
      render(<Harness>{fruit}</Harness>);
      await waitFor(() => expect(item('Apple')).toHaveFocus());
      await user.keyboard('b');
      expect(item('Banana')).toHaveFocus();
      await user.keyboard('b');
      expect(item('Blueberry')).toHaveFocus();
      await user.keyboard('b');
      expect(item('Banana')).toHaveFocus();
    });

    it('ignores disabled items and keeps focus when nothing matches', async () => {
      const user = userEvent.setup();
      render(<Harness>{fruit}</Harness>);
      await waitFor(() => expect(item('Apple')).toHaveFocus());
      await user.keyboard('c');
      expect(item('Apple')).toHaveFocus();
    });

    it('treats Space as part of the search once one has started', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Harness>
          <MenuItem>Apple</MenuItem>
          <MenuItem onClick={onClick}>New file</MenuItem>
          <MenuItem onClick={onClick}>New folder</MenuItem>
        </Harness>,
      );
      await waitFor(() => expect(item('Apple')).toHaveFocus());
      await user.keyboard('new f');
      expect(onClick).not.toHaveBeenCalled();
      expect(item('New file')).toHaveFocus();
      await user.keyboard('o');
      expect(item('New folder')).toHaveFocus();
    });

    it('does not start a search with Space', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Harness>
          <MenuItem onClick={onClick}>Apple</MenuItem>
        </Harness>,
      );
      await waitFor(() => expect(item('Apple')).toHaveFocus());
      await user.keyboard(' ');
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('closing', () => {
    it('asks to close after an item is chosen', async () => {
      const onClose = vi.fn();
      const onClick = vi.fn();
      render(
        <Harness onClose={onClose}>
          <MenuItem onClick={onClick}>Cut</MenuItem>
        </Harness>,
      );
      await userEvent.setup().click(await screen.findByRole('menuitem', { name: 'Cut' }));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledWith('select');
    });

    it('stays open when the item has closeOnSelect={false}', async () => {
      const onClose = vi.fn();
      render(
        <Harness onClose={onClose}>
          <MenuItem closeOnSelect={false}>Cut</MenuItem>
        </Harness>,
      );
      await userEvent.setup().click(await screen.findByRole('menuitem', { name: 'Cut' }));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does nothing when a disabled item is pressed', async () => {
      const onClose = vi.fn();
      const onClick = vi.fn();
      render(
        <Harness onClose={onClose}>
          <MenuItem disabled onClick={onClick}>
            Paste
          </MenuItem>
        </Harness>,
      );
      const paste = await screen.findByRole('menuitem', { name: 'Paste' });
      expect(paste).toHaveAttribute('aria-disabled', 'true');
      await userEvent.setup().click(paste);
      expect(onClick).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('asks to close on a press outside, but not on the anchor', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<Harness onClose={onClose}>{basicItems}</Harness>);
      await screen.findByRole('menu');
      await user.click(screen.getByRole('button', { name: 'Anchor' }));
      expect(onClose).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
      expect(onClose).toHaveBeenCalledWith('outside');
    });

    it('does not close when the press is inside the menu', async () => {
      const onClose = vi.fn();
      render(
        <Harness onClose={onClose}>
          <MenuGroup label="Group">
            <MenuCheckboxItem>Opt</MenuCheckboxItem>
          </MenuGroup>
        </Harness>,
      );
      await userEvent.setup().click(await screen.findByText('Group'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('hover', () => {
    it('focuses the item under the pointer, so it behaves like the keyboard highlight', async () => {
      const user = userEvent.setup();
      render(<Harness>{basicItems}</Harness>);
      await waitFor(() => expect(item('Cut')).toHaveFocus());
      await user.hover(item('Select all'));
      expect(item('Select all')).toHaveFocus();
    });

    it('does not focus a disabled item', async () => {
      const user = userEvent.setup();
      render(<Harness>{basicItems}</Harness>);
      await waitFor(() => expect(item('Cut')).toHaveFocus());
      await user.hover(item('Paste'));
      expect(item('Cut')).toHaveFocus();
    });
  });

  describe('items', () => {
    it('shows an icon and a shortcut, and marks destructive items', async () => {
      render(
        <Harness>
          <MenuItem icon={<svg data-testid="icon" />} shortcut="⌘C" destructive>
            Copy
          </MenuItem>
        </Harness>,
      );
      const copy = await screen.findByRole('menuitem');
      expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
      expect(copy).toHaveTextContent('Copy⌘C');
      expect(copy).toHaveClass('axon-menu__item--destructive');
    });

    it('renders a link for an item with an href, activated by Space as well as Enter', async () => {
      const onClick = vi.fn((event: ReactMouseEvent) => event.preventDefault());
      const user = userEvent.setup();
      render(
        <Harness>
          <MenuItem href="/docs" onClick={onClick}>
            Docs
          </MenuItem>
        </Harness>,
      );
      const docs = await screen.findByRole('menuitem', { name: 'Docs' });
      expect(docs.tagName).toBe('A');
      expect(docs).toHaveAttribute('href', '/docs');
      await waitFor(() => expect(docs).toHaveFocus());
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('groups items under a heading, and separates groups', async () => {
      render(
        <Harness>
          <MenuGroup label="Edit">
            <MenuItem>Cut</MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuItem>Quit</MenuItem>
        </Harness>,
      );
      expect(await screen.findByRole('group', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('separator')).toBeInTheDocument();
      expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    });

    it('keeps arrow navigation across groups', async () => {
      const user = userEvent.setup();
      render(
        <Harness>
          <MenuGroup label="A">
            <MenuItem>One</MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup label="B">
            <MenuItem>Two</MenuItem>
          </MenuGroup>
        </Harness>,
      );
      await waitFor(() => expect(item('One')).toHaveFocus());
      await user.keyboard('{ArrowDown}');
      expect(item('Two')).toHaveFocus();
    });
  });

  describe('checkbox items', () => {
    it('toggle, stay open and report the change (uncontrolled)', async () => {
      const onClose = vi.fn();
      const onCheckedChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Harness onClose={onClose}>
          <MenuCheckboxItem onCheckedChange={onCheckedChange}>Show grid</MenuCheckboxItem>
        </Harness>,
      );
      const box = await screen.findByRole('menuitemcheckbox', { name: 'Show grid' });
      expect(box).toHaveAttribute('aria-checked', 'false');
      await user.click(box);
      expect(box).toHaveAttribute('aria-checked', 'true');
      expect(onCheckedChange).toHaveBeenCalledWith(true);
      await user.click(box);
      expect(box).toHaveAttribute('aria-checked', 'false');
      expect(onClose).not.toHaveBeenCalled();
    });

    it('start checked with defaultChecked and can close on select', async () => {
      const onClose = vi.fn();
      render(
        <Harness onClose={onClose}>
          <MenuCheckboxItem defaultChecked closeOnSelect>
            Show grid
          </MenuCheckboxItem>
        </Harness>,
      );
      const box = await screen.findByRole('menuitemcheckbox');
      expect(box).toHaveAttribute('aria-checked', 'true');
      await userEvent.setup().click(box);
      expect(onClose).toHaveBeenCalledWith('select');
    });

    it('work controlled', async () => {
      const onCheckedChange = vi.fn();
      render(
        <Harness>
          <MenuCheckboxItem checked onCheckedChange={onCheckedChange}>
            Show grid
          </MenuCheckboxItem>
        </Harness>,
      );
      const box = await screen.findByRole('menuitemcheckbox');
      await userEvent.setup().click(box);
      expect(onCheckedChange).toHaveBeenCalledWith(false);
      expect(box).toHaveAttribute('aria-checked', 'true');
    });

    it('toggle from the keyboard', async () => {
      const user = userEvent.setup();
      render(
        <Harness>
          <MenuCheckboxItem>Show grid</MenuCheckboxItem>
        </Harness>,
      );
      const box = await screen.findByRole('menuitemcheckbox');
      await waitFor(() => expect(box).toHaveFocus());
      await user.keyboard('{Enter}');
      expect(box).toHaveAttribute('aria-checked', 'true');
      await user.keyboard(' ');
      expect(box).toHaveAttribute('aria-checked', 'false');
    });

    it('do not toggle when disabled', async () => {
      render(
        <Harness>
          <MenuCheckboxItem disabled>Show grid</MenuCheckboxItem>
        </Harness>,
      );
      const box = await screen.findByRole('menuitemcheckbox');
      await userEvent.setup().click(box);
      expect(box).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('radio groups', () => {
    const sort = (props: { onValueChange?: (v: string) => void; value?: string } = {}) => (
      <Harness>
        <MenuRadioGroup label="Sort by" defaultValue="name" {...props}>
          <MenuRadioItem value="name">Name</MenuRadioItem>
          <MenuRadioItem value="date">Date</MenuRadioItem>
        </MenuRadioGroup>
      </Harness>
    );

    it('are a labelled group of menuitemradios with one checked', async () => {
      render(sort());
      expect(await screen.findByRole('group', { name: 'Sort by' })).toBeInTheDocument();
      expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(screen.getByRole('menuitemradio', { name: 'Date' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });

    it('move the check, stay open and report the value', async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(sort({ onValueChange }));
      await user.click(await screen.findByRole('menuitemradio', { name: 'Date' }));
      expect(onValueChange).toHaveBeenCalledWith('date');
      expect(screen.getByRole('menuitemradio', { name: 'Date' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('work controlled', async () => {
      const onValueChange = vi.fn();
      render(sort({ value: 'name', onValueChange }));
      await userEvent.setup().click(await screen.findByRole('menuitemradio', { name: 'Date' }));
      expect(onValueChange).toHaveBeenCalledWith('date');
      expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    it('throw a helpful error outside a group', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(() =>
        render(
          <Harness>
            <MenuRadioItem value="x">X</MenuRadioItem>
          </Harness>,
        ),
      ).toThrow(/MenuRadioGroup/);
      spy.mockRestore();
    });
  });

  describe('submenus', () => {
    const tree = (onClose = () => undefined, onShare = () => undefined) => (
      <Harness onClose={onClose}>
        <MenuItem>New</MenuItem>
        <SubMenu label="Share">
          <MenuItem onClick={onShare}>Email</MenuItem>
          <MenuItem>Link</MenuItem>
          <SubMenu label="Social">
            <MenuItem>Mastodon</MenuItem>
          </SubMenu>
        </SubMenu>
        <SubMenu label="Locked" disabled>
          <MenuItem>Never</MenuItem>
        </SubMenu>
        <MenuItem>Print</MenuItem>
      </Harness>
    );

    it('has a trigger that announces the popup and its state', async () => {
      render(tree());
      const share = await screen.findByRole('menuitem', { name: /Share/ });
      expect(share).toHaveAttribute('aria-haspopup', 'menu');
      expect(share).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('menuitem', { name: 'Email' })).not.toBeInTheDocument();
    });

    it('opens with → and focuses its first item; the panel is named by the trigger', async () => {
      const user = userEvent.setup();
      render(tree());
      await waitFor(() => expect(item('New')).toHaveFocus());
      await user.keyboard('{ArrowDown}');
      expect(item(/Share/)).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(item(/Share/)).toHaveAttribute('aria-expanded', 'true');
      expect(item('Email')).toHaveFocus();
      const panels = screen.getAllByRole('menu');
      expect(panels).toHaveLength(2);
      expect(panels[1]).toHaveAccessibleName('Share');
      expect(item(/Share/)).toHaveAttribute('aria-controls', panels[1]!.id);
    });

    it('opens with Enter and with Space', async () => {
      const user = userEvent.setup();
      render(tree());
      await waitFor(() => expect(item('New')).toHaveFocus());
      await user.keyboard('{ArrowDown}{Enter}');
      expect(item('Email')).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      await user.keyboard(' ');
      expect(item('Email')).toHaveFocus();
    });

    it('goes back with ← and with Esc, returning focus to the trigger and keeping the parent open', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(tree(onClose));
      await waitFor(() => expect(item('New')).toHaveFocus());
      await user.keyboard('{ArrowDown}{ArrowRight}');
      await user.keyboard('{ArrowLeft}');
      expect(screen.queryByRole('menuitem', { name: 'Email' })).not.toBeInTheDocument();
      expect(item(/Share/)).toHaveFocus();
      await user.keyboard('{ArrowRight}{Escape}');
      expect(screen.queryByRole('menuitem', { name: 'Email' })).not.toBeInTheDocument();
      expect(item(/Share/)).toHaveFocus();
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getAllByRole('menu')).toHaveLength(1);
    });

    it('does not use ← to close the root menu', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(tree(onClose));
      await waitFor(() => expect(item('New')).toHaveFocus());
      await user.keyboard('{ArrowLeft}');
      expect(onClose).not.toHaveBeenCalled();
    });

    it('opens when the pointer rests on the trigger, without taking focus into it', async () => {
      const user = userEvent.setup();
      render(tree());
      await user.hover(await screen.findByRole('menuitem', { name: /Share/ }));
      expect(await screen.findByRole('menuitem', { name: 'Email' })).toBeInTheDocument();
      expect(item(/Share/)).toHaveFocus();
    });

    it('moves focus into a submenu that hover already opened when → is pressed', async () => {
      const user = userEvent.setup();
      render(tree());
      await user.hover(await screen.findByRole('menuitem', { name: /Share/ }));
      await screen.findByRole('menuitem', { name: 'Email' });
      await user.keyboard('{ArrowRight}');
      expect(item('Email')).toHaveFocus();
      expect(screen.getAllByRole('menu')).toHaveLength(2);
    });

    it('closes when the pointer moves to a sibling item', async () => {
      const user = userEvent.setup();
      render(tree());
      await user.hover(await screen.findByRole('menuitem', { name: /Share/ }));
      await screen.findByRole('menuitem', { name: 'Email' });
      await user.hover(item('Print'));
      await waitFor(() =>
        expect(screen.queryByRole('menuitem', { name: 'Email' })).not.toBeInTheDocument(),
      );
    });

    it('opens on click', async () => {
      const user = userEvent.setup();
      render(tree());
      await user.click(await screen.findByRole('menuitem', { name: /Share/ }));
      expect(await screen.findByRole('menuitem', { name: 'Email' })).toBeInTheDocument();
    });

    it('does not close the whole menu when its trigger is chosen', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(tree(onClose));
      await user.click(await screen.findByRole('menuitem', { name: /Share/ }));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes the whole tree, reporting "select", when a submenu item is chosen', async () => {
      const onClose = vi.fn();
      const onShare = vi.fn();
      const user = userEvent.setup();
      render(tree(onClose, onShare));
      await user.click(await screen.findByRole('menuitem', { name: /Share/ }));
      await user.click(await screen.findByRole('menuitem', { name: 'Email' }));
      expect(onShare).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledWith('select');
    });

    it('does not treat a press inside a submenu as outside', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(tree(onClose));
      await user.click(await screen.findByRole('menuitem', { name: /Share/ }));
      await user.click(await screen.findByRole('menuitem', { name: /Social/ }));
      await user.click(await screen.findByRole('menuitem', { name: 'Mastodon' }));
      expect(onClose).not.toHaveBeenCalledWith('outside');
      expect(onClose).toHaveBeenCalledWith('select');
    });

    it('nests: → opens a third level and ← closes only that level', async () => {
      const user = userEvent.setup();
      render(tree());
      await waitFor(() => expect(item('New')).toHaveFocus());
      await user.keyboard('{ArrowDown}{ArrowRight}{ArrowDown}{ArrowDown}{ArrowRight}');
      expect(item('Mastodon')).toHaveFocus();
      expect(screen.getAllByRole('menu')).toHaveLength(3);
      await user.keyboard('{ArrowLeft}');
      expect(item(/Social/)).toHaveFocus();
      expect(screen.getAllByRole('menu')).toHaveLength(2);
    });

    it('closes on Tab from inside a submenu, for the whole tree', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(tree(onClose));
      await waitFor(() => expect(item('New')).toHaveFocus());
      await user.keyboard('{ArrowDown}{ArrowRight}{Tab}');
      expect(onClose).toHaveBeenCalledWith('tab');
    });

    it('does not open a disabled submenu', async () => {
      const user = userEvent.setup();
      render(tree());
      const locked = await screen.findByRole('menuitem', { name: /Locked/ });
      expect(locked).toHaveAttribute('aria-disabled', 'true');
      await user.click(locked);
      expect(screen.queryByRole('menuitem', { name: 'Never' })).not.toBeInTheDocument();
    });

    it('keeps the typeahead of the parent separate from the submenu', async () => {
      const user = userEvent.setup();
      render(tree());
      await waitFor(() => expect(item('New')).toHaveFocus());
      await user.keyboard('{ArrowDown}{ArrowRight}');
      await user.keyboard('l');
      expect(item('Link')).toHaveFocus();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations with every kind of item, and with a submenu open', async () => {
      const user = userEvent.setup();
      render(
        <Harness>
          <MenuGroup label="Edit">
            <MenuItem icon={<svg />} shortcut="⌘C">
              Copy
            </MenuItem>
            <MenuItem disabled>Paste</MenuItem>
            <MenuItem destructive>Delete</MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuCheckboxItem defaultChecked>Show grid</MenuCheckboxItem>
          <MenuRadioGroup label="Sort" defaultValue="a">
            <MenuRadioItem value="a">A</MenuRadioItem>
            <MenuRadioItem value="b">B</MenuRadioItem>
          </MenuRadioGroup>
          <MenuItem href="/docs">Docs</MenuItem>
          <SubMenu label="More">
            <MenuItem>Inner</MenuItem>
          </SubMenu>
        </Harness>,
      );
      await screen.findByRole('menu');
      expect(await axeWithPortal(document.body)).toHaveNoViolations();
      await user.click(screen.getByRole('menuitem', { name: /More/ }));
      await screen.findByRole('menuitem', { name: 'Inner' });
      await act(async () => undefined);
      expect(await axeWithPortal(document.body)).toHaveNoViolations();
    });
  });
});
