import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Accordion, AccordionItem, type AccordionProps } from './Accordion';

function Example(props: Partial<AccordionProps> & { disableSecond?: boolean }) {
  const { disableSecond, ...rest } = props;
  return (
    <Accordion {...rest}>
      <AccordionItem value="one" title="One" subtitle="First">
        One body
      </AccordionItem>
      <AccordionItem value="two" title="Two" disabled={disableSecond}>
        Two body
      </AccordionItem>
      <AccordionItem value="three" title="Three">
        Three body
      </AccordionItem>
    </Accordion>
  );
}

const header = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

describe('Accordion', () => {
  it('renders a heading with a button per item, all collapsed by default', () => {
    render(<Example />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    for (const name of ['One', 'Two', 'Three']) {
      expect(header(name)).toHaveAttribute('aria-expanded', 'false');
    }
    expect(screen.getByText('One body')).not.toBeVisible();
  });

  it('links each button to a labelled region', async () => {
    render(<Example defaultValue={['one']} />);
    const button = header('One');
    const region = screen.getByRole('region', { name: /One/ });
    expect(button).toHaveAttribute('aria-controls', region.id);
    expect(region).toHaveAttribute('aria-labelledby', button.id);
    expect(region).toHaveTextContent('One body');
  });

  it('uses the chosen heading level', () => {
    render(<Example headingLevel={2} />);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
  });

  it('shows the subtitle inside the button', () => {
    render(<Example />);
    expect(header('One')).toHaveTextContent('First');
  });

  describe('single (default)', () => {
    it('opens one item at a time', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.click(header('One'));
      expect(screen.getByText('One body')).toBeVisible();
      await user.click(header('Three'));
      expect(screen.getByText('Three body')).toBeVisible();
      expect(screen.getByText('One body')).not.toBeVisible();
      expect(header('One')).toHaveAttribute('aria-expanded', 'false');
    });

    it('collapses the open item on a second click', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Example defaultValue={['one']} onChange={onChange} />);
      await user.click(header('One'));
      expect(screen.getByText('One body')).not.toBeVisible();
      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('keeps the open item open when `collapsible` is false', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Example defaultValue={['one']} collapsible={false} onChange={onChange} />);
      await user.click(header('One'));
      expect(screen.getByText('One body')).toBeVisible();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('multiple', () => {
    it('lets any number of items stay open', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Example type="multiple" onChange={onChange} />);
      await user.click(header('One'));
      await user.click(header('Three'));
      expect(screen.getByText('One body')).toBeVisible();
      expect(screen.getByText('Three body')).toBeVisible();
      expect(onChange).toHaveBeenLastCalledWith(['one', 'three']);
      await user.click(header('One'));
      expect(onChange).toHaveBeenLastCalledWith(['three']);
    });
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState<string[]>(['two']);
      return <Example value={value} onChange={setValue} />;
    }
    const user = userEvent.setup();
    render(<Controlled />);
    expect(screen.getByText('Two body')).toBeVisible();
    await user.click(header('Three'));
    expect(screen.getByText('Three body')).toBeVisible();
    expect(screen.getByText('Two body')).not.toBeVisible();
  });

  it('does not open a disabled item', async () => {
    const user = userEvent.setup();
    render(<Example disableSecond />);
    expect(header('Two')).toBeDisabled();
    await user.click(header('Two'));
    expect(screen.getByText('Two body')).not.toBeVisible();
  });

  describe('keyboard', () => {
    it('toggles with Enter and Space', async () => {
      const user = userEvent.setup();
      render(<Example type="multiple" />);
      await user.tab();
      await user.keyboard('{Enter}');
      expect(header('One')).toHaveAttribute('aria-expanded', 'true');
      await user.keyboard(' ');
      expect(header('One')).toHaveAttribute('aria-expanded', 'false');
    });

    it('moves between headers with ↓/↑ (wrapping) and Home/End', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      await user.keyboard('{ArrowDown}');
      expect(header('Two')).toHaveFocus();
      await user.keyboard('{ArrowDown}{ArrowDown}');
      expect(header('One')).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(header('Three')).toHaveFocus();
      await user.keyboard('{Home}');
      expect(header('One')).toHaveFocus();
      await user.keyboard('{End}');
      expect(header('Three')).toHaveFocus();
    });

    it('skips disabled headers', async () => {
      const user = userEvent.setup();
      render(<Example disableSecond />);
      await user.tab();
      await user.keyboard('{ArrowDown}');
      expect(header('Three')).toHaveFocus();
    });

    it('does not steal arrow keys from content inside a panel', async () => {
      const user = userEvent.setup();
      render(
        <Accordion defaultValue={['a']}>
          <AccordionItem value="a" title="A">
            <input aria-label="Name" />
          </AccordionItem>
          <AccordionItem value="b" title="B">
            b
          </AccordionItem>
        </Accordion>,
      );
      await user.click(screen.getByRole('textbox'));
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  it('forwards refs, className and extra props', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Accordion ref={ref} className="extra" variant="flush" data-testid="acc">
        <AccordionItem value="a" title="A" className="item" icon={<svg data-testid="icon" />}>
          a
        </AccordionItem>
      </Accordion>,
    );
    expect(ref.current).toBe(screen.getByTestId('acc'));
    expect(ref.current).toHaveClass('axon-accordion', 'axon-accordion--flush', 'extra');
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('throws a helpful error outside <Accordion>', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() =>
      render(
        <AccordionItem value="x" title="X">
          x
        </AccordionItem>,
      ),
    ).toThrow(/Accordion/);
    spy.mockRestore();
  });

  it('has no axe violations (closed, open, disabled)', async () => {
    const { container } = render(
      <>
        <Example />
        <Example type="multiple" defaultValue={['one', 'three']} disableSecond />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
