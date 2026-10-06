import { createRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { RangeSlider } from './RangeSlider';

function mockTrack(container: HTMLElement) {
  const track = container.querySelector('.axon-slider__track') as HTMLElement;
  track.getBoundingClientRect = () =>
    ({ left: 0, right: 200, top: 0, bottom: 4, width: 200, height: 4, x: 0, y: 0 }) as DOMRect;
}

const control = (container: HTMLElement) =>
  container.querySelector('.axon-slider__control') as HTMLElement;

beforeAll(() => {
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

const thumbs = () => screen.getAllByRole('slider');

describe('RangeSlider', () => {
  it('renders two labelled thumbs inside a named group', () => {
    render(<RangeSlider label="Price range" defaultValue={[20, 80]} />);
    expect(screen.getByRole('group', { name: 'Price range' })).toBeInTheDocument();
    expect(thumbs()).toHaveLength(2);
    expect(screen.getByRole('slider', { name: 'Minimum' })).toHaveAttribute('aria-valuenow', '20');
    expect(screen.getByRole('slider', { name: 'Maximum' })).toHaveAttribute('aria-valuenow', '80');
  });

  it('defaults to the full range and supports custom thumb labels', () => {
    render(<RangeSlider aria-label="Age" min={18} max={65} thumbLabels={['From', 'To']} />);
    expect(screen.getByRole('group', { name: 'Age' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'From' })).toHaveAttribute('aria-valuenow', '18');
    expect(screen.getByRole('slider', { name: 'To' })).toHaveAttribute('aria-valuenow', '65');
  });

  it("limits each thumb's aria range by its neighbor", () => {
    render(<RangeSlider aria-label="R" defaultValue={[20, 80]} />);
    const [low, high] = thumbs();
    expect(low).toHaveAttribute('aria-valuemin', '0');
    expect(low).toHaveAttribute('aria-valuemax', '80');
    expect(high).toHaveAttribute('aria-valuemin', '20');
    expect(high).toHaveAttribute('aria-valuemax', '100');
  });

  it('forwards the ref and merges className on the root', () => {
    const ref = createRef<HTMLDivElement>();
    render(<RangeSlider ref={ref} aria-label="R" className="extra" />);
    expect(ref.current).toHaveClass('axon-slider', 'axon-slider--range', 'extra');
  });

  describe('keyboard', () => {
    it('moves each thumb independently', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<RangeSlider aria-label="R" defaultValue={[20, 80]} onChange={onChange} />);
      thumbs()[0]!.focus();
      await user.keyboard('{ArrowRight}{ArrowRight}');
      expect(onChange).toHaveBeenLastCalledWith([22, 80]);
      thumbs()[1]!.focus();
      await user.keyboard('{ArrowLeft}');
      expect(onChange).toHaveBeenLastCalledWith([22, 79]);
    });

    it('stops a thumb at its neighbor so the thumbs never cross', async () => {
      const user = userEvent.setup();
      render(<RangeSlider aria-label="R" defaultValue={[40, 50]} />);
      thumbs()[0]!.focus();
      await user.keyboard('{End}');
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '50');
      thumbs()[1]!.focus();
      await user.keyboard('{Home}');
      expect(thumbs()[1]).toHaveAttribute('aria-valuenow', '50');
    });

    it('Home and End jump to the track ends for the outer thumbs', async () => {
      const user = userEvent.setup();
      render(<RangeSlider aria-label="R" defaultValue={[40, 60]} />);
      thumbs()[0]!.focus();
      await user.keyboard('{Home}');
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '0');
      thumbs()[1]!.focus();
      await user.keyboard('{End}');
      expect(thumbs()[1]).toHaveAttribute('aria-valuenow', '100');
    });

    it('calls onChangeEnd after a key press', async () => {
      const onChangeEnd = vi.fn();
      const user = userEvent.setup();
      render(<RangeSlider aria-label="R" defaultValue={[10, 90]} onChangeEnd={onChangeEnd} />);
      thumbs()[1]!.focus();
      await user.keyboard('{ArrowLeft}');
      expect(onChangeEnd).toHaveBeenCalledWith([10, 89]);
    });
  });

  describe('pointer', () => {
    it('moves the closer thumb', () => {
      const onChange = vi.fn();
      const { container } = render(
        <RangeSlider aria-label="R" defaultValue={[20, 80]} onChange={onChange} />,
      );
      mockTrack(container);
      fireEvent.pointerDown(control(container), { clientX: 50, button: 0, pointerId: 1 });
      expect(onChange).toHaveBeenLastCalledWith([25, 80]);
      expect(thumbs()[0]).toHaveFocus();
      fireEvent.pointerUp(control(container), { clientX: 50, pointerId: 1 });
      fireEvent.pointerDown(control(container), { clientX: 190, button: 0, pointerId: 1 });
      expect(onChange).toHaveBeenLastCalledWith([25, 95]);
      expect(thumbs()[1]).toHaveFocus();
    });

    it('drags a thumb but not past the other one', () => {
      const { container } = render(<RangeSlider aria-label="R" defaultValue={[30, 60]} />);
      mockTrack(container);
      fireEvent.pointerDown(control(container), { clientX: 60, button: 0, pointerId: 1 });
      fireEvent.pointerMove(control(container), { clientX: 190, pointerId: 1 });
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '60');
      expect(thumbs()[1]).toHaveAttribute('aria-valuenow', '60');
    });

    it('lets the upper thumb move when both thumbs are at the same value', () => {
      const { container } = render(<RangeSlider aria-label="R" defaultValue={[50, 50]} />);
      mockTrack(container);
      fireEvent.pointerDown(control(container), { clientX: 180, button: 0, pointerId: 1 });
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '50');
      expect(thumbs()[1]).toHaveAttribute('aria-valuenow', '90');
    });
  });

  describe('controlled', () => {
    it('follows the value prop and reports requested changes', async () => {
      const onChange = vi.fn();
      render(<RangeSlider aria-label="R" value={[10, 20]} onChange={onChange} />);
      thumbs()[0]!.focus();
      await userEvent.setup().keyboard('{ArrowRight}');
      expect(onChange).toHaveBeenCalledWith([11, 20]);
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '10');
    });

    it('works with parent state', async () => {
      function Parent() {
        const [value, setValue] = useState<[number, number]>([10, 90]);
        return (
          <>
            <RangeSlider aria-label="R" value={value} onChange={setValue} />
            <output>{value.join('-')}</output>
          </>
        );
      }
      render(<Parent />);
      thumbs()[0]!.focus();
      await userEvent.setup().keyboard('{ArrowRight}');
      expect(screen.getByRole('status')).toHaveTextContent('11-90');
    });
  });

  it('shows both values in the readout and submits both through hidden inputs', () => {
    const { container } = render(
      <RangeSlider label="Range" showValue name="range" defaultValue={[25, 75]} />,
    );
    expect(container.querySelector('.axon-slider__value')).toHaveTextContent('25 – 75');
    const hidden = [...container.querySelectorAll('input[type="hidden"]')] as HTMLInputElement[];
    expect(hidden.map((h) => h.value)).toEqual(['25', '75']);
    expect(hidden.every((h) => h.name === 'range')).toBe(true);
  });

  it('fills only between the thumbs', () => {
    const { container } = render(<RangeSlider aria-label="R" defaultValue={[20, 70]} />);
    expect(container.querySelector('.axon-slider__fill')).toHaveStyle({
      left: '20%',
      width: '50%',
    });
  });

  it('disables both thumbs', () => {
    render(<RangeSlider aria-label="R" disabled />);
    for (const thumb of thumbs()) expect(thumb).toHaveAttribute('aria-disabled', 'true');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <RangeSlider label="Price" defaultValue={[20, 80]} showValue marks />
        <RangeSlider aria-label="Plain" />
        <RangeSlider aria-label="Disabled" disabled />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
