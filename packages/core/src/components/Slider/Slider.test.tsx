import { createRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Slider } from './Slider';

/** jsdom has no layout: give the track a 200px-wide box starting at x = 0. */
function mockTrack(container: HTMLElement) {
  const track = container.querySelector('.axon-slider__track') as HTMLElement;
  track.getBoundingClientRect = () =>
    ({ left: 0, right: 200, top: 0, bottom: 4, width: 200, height: 4, x: 0, y: 0 }) as DOMRect;
}

const control = (container: HTMLElement) =>
  container.querySelector('.axon-slider__control') as HTMLElement;

beforeAll(() => {
  // Older jsdom builds lack PointerEvent, which would drop clientX from fireEvent.
  if (typeof window.PointerEvent === 'undefined') {
    window.PointerEvent = class extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    } as unknown as typeof PointerEvent;
  }
});

describe('Slider', () => {
  it('renders a slider exposing its value and range', () => {
    render(<Slider aria-label="Volume" defaultValue={30} min={10} max={50} />);
    const thumb = screen.getByRole('slider', { name: 'Volume' });
    expect(thumb).toHaveAttribute('aria-valuenow', '30');
    expect(thumb).toHaveAttribute('aria-valuemin', '10');
    expect(thumb).toHaveAttribute('aria-valuemax', '50');
    expect(thumb).toHaveAttribute('aria-orientation', 'horizontal');
    expect(thumb).toHaveAttribute('tabindex', '0');
  });

  it('defaults to min and the range 0-100', () => {
    render(<Slider aria-label="V" />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '100');
  });

  it('is named by a visible label', () => {
    render(<Slider label="Brightness" defaultValue={5} />);
    expect(screen.getByRole('slider', { name: 'Brightness' })).toBeInTheDocument();
  });

  it('forwards the ref and spreads props onto the root, merging className', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Slider
        ref={ref}
        aria-label="V"
        className="extra"
        style={{ margin: 2 }}
        data-testid="root"
        size="lg"
        color="success"
      />,
    );
    expect(ref.current).toBe(screen.getByTestId('root'));
    expect(ref.current).toHaveClass(
      'axon-slider',
      'extra',
      'axon-slider--lg',
      'axon-slider--success',
    );
    expect(ref.current).toHaveStyle({ margin: '2px' });
  });

  describe('keyboard', () => {
    it('steps with the arrow keys', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Slider aria-label="V" defaultValue={50} step={5} onChange={onChange} />);
      screen.getByRole('slider').focus();
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '55');
      await user.keyboard('{ArrowUp}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '60');
      await user.keyboard('{ArrowLeft}{ArrowDown}{ArrowDown}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '45');
      expect(onChange).toHaveBeenLastCalledWith(45);
    });

    it('moves by about 10% with Page keys and jumps with Home and End', async () => {
      const user = userEvent.setup();
      render(<Slider aria-label="V" defaultValue={50} />);
      screen.getByRole('slider').focus();
      await user.keyboard('{PageUp}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '60');
      await user.keyboard('{PageDown}{PageDown}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '40');
      await user.keyboard('{Home}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
      await user.keyboard('{End}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '100');
    });

    it('never goes outside min and max', async () => {
      const user = userEvent.setup();
      render(<Slider aria-label="V" defaultValue={99} />);
      screen.getByRole('slider').focus();
      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '100');
    });

    it('avoids floating point drift with fractional steps', async () => {
      const user = userEvent.setup();
      render(<Slider aria-label="V" min={0} max={1} step={0.1} defaultValue={0.1} />);
      screen.getByRole('slider').focus();
      await user.keyboard('{ArrowRight}{ArrowRight}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0.3');
    });

    it('calls onChangeEnd after a key press', async () => {
      const onChangeEnd = vi.fn();
      const user = userEvent.setup();
      render(<Slider aria-label="V" defaultValue={10} onChangeEnd={onChangeEnd} />);
      screen.getByRole('slider').focus();
      await user.keyboard('{ArrowRight}');
      expect(onChangeEnd).toHaveBeenCalledWith(11);
    });

    it('ignores other keys', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Slider aria-label="V" defaultValue={10} onChange={onChange} />);
      screen.getByRole('slider').focus();
      await user.keyboard('a{Enter}');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('pointer', () => {
    it('moves the thumb to the pressed position and snaps to the step', () => {
      const onChange = vi.fn();
      const onChangeEnd = vi.fn();
      const { container } = render(
        <Slider aria-label="V" step={10} onChange={onChange} onChangeEnd={onChangeEnd} />,
      );
      mockTrack(container);
      fireEvent.pointerDown(control(container), { clientX: 96, button: 0, pointerId: 1 });
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '50');
      expect(screen.getByRole('slider')).toHaveFocus();
      fireEvent.pointerMove(control(container), { clientX: 150, pointerId: 1 });
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '80');
      fireEvent.pointerUp(control(container), { clientX: 150, pointerId: 1 });
      expect(onChange).toHaveBeenLastCalledWith(80);
      expect(onChangeEnd).toHaveBeenCalledTimes(1);
      expect(onChangeEnd).toHaveBeenCalledWith(80);
    });

    it('clamps to the ends when dragged beyond the track', () => {
      const { container } = render(<Slider aria-label="V" defaultValue={50} />);
      mockTrack(container);
      fireEvent.pointerDown(control(container), { clientX: 100, button: 0, pointerId: 1 });
      fireEvent.pointerMove(control(container), { clientX: 900, pointerId: 1 });
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '100');
      fireEvent.pointerMove(control(container), { clientX: -300, pointerId: 1 });
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
    });

    it('stops tracking after pointer up', () => {
      const { container } = render(<Slider aria-label="V" />);
      mockTrack(container);
      fireEvent.pointerDown(control(container), { clientX: 20, button: 0, pointerId: 1 });
      fireEvent.pointerUp(control(container), { clientX: 20, pointerId: 1 });
      fireEvent.pointerMove(control(container), { clientX: 180, pointerId: 1 });
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '10');
    });

    it('does nothing when disabled', () => {
      const onChange = vi.fn();
      const { container } = render(
        <Slider aria-label="V" disabled defaultValue={20} onChange={onChange} />,
      );
      mockTrack(container);
      fireEvent.pointerDown(control(container), { clientX: 180, button: 0, pointerId: 1 });
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '20');
    });
  });

  describe('controlled', () => {
    it('follows the value prop and reports requested changes', async () => {
      const onChange = vi.fn();
      render(<Slider aria-label="V" value={20} onChange={onChange} />);
      screen.getByRole('slider').focus();
      await userEvent.setup().keyboard('{ArrowRight}');
      expect(onChange).toHaveBeenCalledWith(21);
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '20');
    });

    it('works with parent state', async () => {
      function Parent() {
        const [value, setValue] = useState(10);
        return (
          <>
            <Slider aria-label="V" value={value} onChange={setValue} />
            <output>{value}</output>
          </>
        );
      }
      render(<Parent />);
      screen.getByRole('slider').focus();
      await userEvent.setup().keyboard('{End}');
      expect(screen.getByRole('status')).toHaveTextContent('100');
    });
  });

  describe('marks, tooltip and value text', () => {
    it('renders ticks at every step with marks={true}', () => {
      const { container } = render(<Slider aria-label="V" min={0} max={4} marks />);
      expect(container.querySelectorAll('.axon-slider__mark')).toHaveLength(5);
    });

    it('renders custom labelled marks hidden from assistive technology', () => {
      const { container } = render(
        <Slider
          aria-label="V"
          defaultValue={25}
          marks={[
            { value: 0, label: '0°' },
            { value: 50, label: '50°' },
            { value: 100, label: '100°' },
          ]}
        />,
      );
      expect(container.querySelector('.axon-slider__marks')).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByText('50°')).toBeInTheDocument();
      expect(container.querySelectorAll('.axon-slider__mark--active')).toHaveLength(1);
    });

    it('formats the tooltip, aria-valuetext and the value readout', () => {
      const { container } = render(
        <Slider
          aria-label="Price"
          label="Price"
          showValue
          defaultValue={30}
          formatValue={(v) => `$${v}`}
        />,
      );
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '$30');
      expect(container.querySelector('.axon-slider__tooltip')).toHaveTextContent('$30');
      expect(container.querySelector('.axon-slider__value')).toHaveTextContent('$30');
    });

    it.each(['auto', 'always', 'never'] as const)('applies the %s tooltip mode', (mode) => {
      render(<Slider aria-label="V" tooltip={mode} data-testid="root" />);
      expect(screen.getByTestId('root')).toHaveClass(`axon-slider--tooltip-${mode}`);
    });
  });

  it('submits its value through a hidden input when named', () => {
    const { container } = render(<Slider aria-label="V" name="volume" defaultValue={42} />);
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden).toHaveAttribute('name', 'volume');
    expect(hidden.value).toBe('42');
  });

  it('is not focusable and marked disabled when disabled', () => {
    const { container } = render(<Slider aria-label="V" disabled />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('slider')).toHaveAttribute('tabindex', '-1');
    expect(container.firstElementChild).toHaveClass('axon-slider--disabled');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Slider label="Volume" defaultValue={20} showValue marks />
        <Slider aria-label="Plain" />
        <Slider aria-label="Disabled" disabled />
        <Slider
          aria-label="Marks"
          marks={[
            { value: 0, label: 'Low' },
            { value: 100, label: 'High' },
          ]}
        />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
