import { createRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Rating } from './Rating';

/** Gives the rating a 100px-wide box (so each of 5 stars is 20px). */
function mockBox(element: HTMLElement) {
  element.getBoundingClientRect = () =>
    ({ left: 0, right: 100, top: 0, bottom: 20, width: 100, height: 20, x: 0, y: 0 }) as DOMRect;
}

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

const filledWidths = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('.axon-rating__filled')].map((el) => el.style.width);

describe('Rating', () => {
  it('is a slider exposing its value and a text alternative', () => {
    render(<Rating aria-label="Quality" defaultValue={3} />);
    const rating = screen.getByRole('slider', { name: 'Quality' });
    expect(rating).toHaveAttribute('aria-valuenow', '3');
    expect(rating).toHaveAttribute('aria-valuemin', '0');
    expect(rating).toHaveAttribute('aria-valuemax', '5');
    expect(rating).toHaveAttribute('aria-valuetext', '3 out of 5 stars');
    expect(rating).toHaveAttribute('tabindex', '0');
  });

  it('defaults its name to "Rating" and reports "No rating" when empty', () => {
    render(<Rating />);
    expect(screen.getByRole('slider', { name: 'Rating' })).toHaveAttribute(
      'aria-valuetext',
      'No rating',
    );
  });

  it('renders max icons and fills them according to the value', () => {
    const { container } = render(<Rating defaultValue={2.5} precision={0.5} max={4} />);
    expect(container.querySelectorAll('.axon-rating__item')).toHaveLength(4);
    expect(filledWidths(container)).toEqual(['100%', '100%', '50%', '0%']);
  });

  it('forwards the ref, merges className and applies size/color modifiers', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Rating ref={ref} className="extra" size="lg" color="danger" data-testid="r" />);
    expect(ref.current).toBe(screen.getByTestId('r'));
    expect(ref.current).toHaveClass(
      'axon-rating',
      'extra',
      'axon-rating--lg',
      'axon-rating--danger',
    );
  });

  it('defaults to the warning color', () => {
    render(<Rating data-testid="r" />);
    expect(screen.getByTestId('r')).toHaveClass('axon-rating--warning');
  });

  it('supports custom icons', () => {
    render(
      <Rating icon={<i data-testid="full" />} emptyIcon={<i data-testid="empty" />} max={2} />,
    );
    expect(screen.getAllByTestId('full')).toHaveLength(2);
    expect(screen.getAllByTestId('empty')).toHaveLength(2);
  });

  describe('pointer', () => {
    it('sets the rating from the pointer position', () => {
      const onChange = vi.fn();
      render(<Rating onChange={onChange} />);
      const rating = screen.getByRole('slider');
      mockBox(rating);
      fireEvent.click(rating, { clientX: 50 });
      expect(onChange).toHaveBeenCalledWith(3);
      expect(rating).toHaveAttribute('aria-valuenow', '3');
    });

    it('picks half values with precision 0.5', () => {
      const onChange = vi.fn();
      render(<Rating precision={0.5} onChange={onChange} />);
      const rating = screen.getByRole('slider');
      mockBox(rating);
      fireEvent.click(rating, { clientX: 45 });
      expect(onChange).toHaveBeenCalledWith(2.5);
    });

    it('clears the rating when the current value is clicked again', () => {
      const onChange = vi.fn();
      render(<Rating defaultValue={3} onChange={onChange} />);
      const rating = screen.getByRole('slider');
      mockBox(rating);
      fireEvent.click(rating, { clientX: 50 });
      expect(onChange).toHaveBeenCalledWith(0);
      expect(rating).toHaveAttribute('aria-valuenow', '0');
    });

    it('keeps the value when allowClear is false', () => {
      const onChange = vi.fn();
      render(<Rating defaultValue={3} allowClear={false} onChange={onChange} />);
      const rating = screen.getByRole('slider');
      mockBox(rating);
      fireEvent.click(rating, { clientX: 50 });
      expect(onChange).not.toHaveBeenCalled();
      expect(rating).toHaveAttribute('aria-valuenow', '3');
    });

    it('previews the hovered value and restores it on leave', () => {
      const { container } = render(<Rating defaultValue={1} />);
      const rating = screen.getByRole('slider');
      mockBox(rating);
      fireEvent.pointerMove(rating, { clientX: 70, pointerId: 1 });
      expect(filledWidths(container)).toEqual(['100%', '100%', '100%', '100%', '0%']);
      fireEvent.pointerLeave(rating);
      expect(filledWidths(container)).toEqual(['100%', '0%', '0%', '0%', '0%']);
    });
  });

  describe('keyboard', () => {
    it('steps with the arrow keys', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Rating defaultValue={2} onChange={onChange} />);
      screen.getByRole('slider').focus();
      await user.keyboard('{ArrowRight}{ArrowUp}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '4');
      await user.keyboard('{ArrowLeft}');
      expect(onChange).toHaveBeenLastCalledWith(3);
    });

    it('steps by half with precision 0.5', async () => {
      const user = userEvent.setup();
      render(<Rating defaultValue={2} precision={0.5} />);
      screen.getByRole('slider').focus();
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '2.5');
    });

    it('jumps with Home and End and stays within range', async () => {
      const user = userEvent.setup();
      render(<Rating defaultValue={2} />);
      screen.getByRole('slider').focus();
      await user.keyboard('{End}{ArrowRight}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '5');
      await user.keyboard('{Home}{ArrowLeft}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
    });

    it('does not go below one star when allowClear is false', async () => {
      const user = userEvent.setup();
      render(<Rating defaultValue={2} allowClear={false} />);
      screen.getByRole('slider').focus();
      await user.keyboard('{Home}');
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '1');
    });
  });

  describe('controlled', () => {
    it('follows the value prop and reports requested changes', async () => {
      const onChange = vi.fn();
      render(<Rating value={2} onChange={onChange} />);
      screen.getByRole('slider').focus();
      await userEvent.setup().keyboard('{ArrowRight}');
      expect(onChange).toHaveBeenCalledWith(3);
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '2');
    });

    it('works with parent state', async () => {
      function Parent() {
        const [value, setValue] = useState(1);
        return (
          <>
            <Rating value={value} onChange={setValue} />
            <output>{value}</output>
          </>
        );
      }
      render(<Parent />);
      screen.getByRole('slider').focus();
      await userEvent.setup().keyboard('{End}');
      expect(screen.getByRole('status')).toHaveTextContent('5');
    });
  });

  describe('read-only', () => {
    it('is an image with a text alternative and ignores input', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Rating readOnly value={3.5} precision={0.5} aria-label="Average" onChange={onChange} />,
      );
      const image = screen.getByRole('img', { name: 'Average: 3.5 out of 5 stars' });
      expect(image).not.toHaveAttribute('tabindex');
      mockBox(image);
      await user.click(image);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    });

    it('uses just the value text without an aria-label', () => {
      render(<Rating readOnly value={4} />);
      expect(screen.getByRole('img', { name: '4 out of 5 stars' })).toBeInTheDocument();
    });
  });

  describe('disabled', () => {
    it('is not focusable and ignores input', async () => {
      const onChange = vi.fn();
      render(<Rating disabled defaultValue={2} onChange={onChange} />);
      const rating = screen.getByRole('slider');
      expect(rating).toHaveAttribute('aria-disabled', 'true');
      expect(rating).toHaveAttribute('tabindex', '-1');
      mockBox(rating);
      fireEvent.click(rating, { clientX: 90 });
      fireEvent.keyDown(rating, { key: 'ArrowRight' });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('supports a custom value text', () => {
    render(<Rating defaultValue={2} getValueText={(v, max) => `${v} de ${max}`} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '2 de 5');
  });

  it('submits through a hidden input when named', () => {
    const { container } = render(<Rating name="score" defaultValue={4} />);
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden).toHaveAttribute('name', 'score');
    expect(hidden.value).toBe('4');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Rating aria-label="Interactive" defaultValue={3} />
        <Rating aria-label="Read only" readOnly value={4.5} precision={0.5} />
        <Rating aria-label="Disabled" disabled />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
