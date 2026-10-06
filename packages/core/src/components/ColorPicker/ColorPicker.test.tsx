import { createRef, useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { ColorPicker, defaultSwatches } from './ColorPicker';

const hex = () => screen.getByRole('textbox') as HTMLInputElement;
const swatches = () => within(screen.getByRole('radiogroup')).getAllByRole('radio');
const swatch = (name: string) => screen.getByRole('radio', { name });

describe('ColorPicker', () => {
  it('has a hex input named by its label and a group of swatches', () => {
    render(<ColorPicker label="Brand color" />);
    expect(screen.getByRole('textbox', { name: 'Brand color' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Color swatches' })).toBeInTheDocument();
    expect(swatches()).toHaveLength(defaultSwatches.length);
    expect(swatch('Primary 500')).toHaveStyle({ backgroundColor: '#3b82f6' });
  });

  it('forwards the ref to the hex input and puts className/style on the wrapper', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <ColorPicker ref={ref} label="C" className="extra" style={{ margin: 2 }} />,
    );
    expect(ref.current).toBe(hex());
    expect(container.firstElementChild).toHaveClass('axon-field', 'axon-color-picker', 'extra');
    expect(container.firstElementChild).toHaveStyle({ margin: '2px' });
  });

  describe('swatches', () => {
    it('selects a swatch on click, showing it in the hex field and reporting a lowercase hex', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ColorPicker label="C" onChange={onChange} />);
      await user.click(swatch('Danger 500'));
      expect(onChange).toHaveBeenCalledWith('#ef4444');
      expect(hex().value).toBe('#ef4444');
      expect(swatch('Danger 500')).toHaveAttribute('aria-checked', 'true');
      expect(swatch('Primary 500')).toHaveAttribute('aria-checked', 'false');
    });

    it('starts from defaultValue (any case) with that swatch checked', () => {
      render(<ColorPicker label="C" defaultValue="#3B82F6" />);
      expect(hex().value).toBe('#3b82f6');
      expect(swatch('Primary 500')).toHaveAttribute('aria-checked', 'true');
    });

    it('keeps a single tab stop: the checked swatch, or the first when none is', () => {
      const { rerender } = render(<ColorPicker label="C" />);
      expect(swatches().filter((s) => s.tabIndex === 0)).toEqual([swatches()[0]]);
      rerender(<ColorPicker label="C" key="v" defaultValue="#ef4444" />);
      expect(swatches().filter((s) => s.tabIndex === 0)).toEqual([swatch('Danger 500')]);
    });

    it('moves and selects with the arrow keys, wrapping at the ends', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <ColorPicker label="C" swatches={['#ff0000', '#00ff00', '#0000ff']} onChange={onChange} />,
      );
      swatches()[0]!.focus();
      await user.keyboard('{ArrowRight}');
      expect(swatches()[1]).toHaveFocus();
      expect(onChange).toHaveBeenLastCalledWith('#00ff00');
      await user.keyboard('{ArrowDown}{ArrowRight}');
      expect(swatches()[0]).toHaveFocus();
      expect(onChange).toHaveBeenLastCalledWith('#ff0000');
      await user.keyboard('{ArrowLeft}');
      expect(swatches()[2]).toHaveFocus();
      await user.keyboard('{Home}');
      expect(swatches()[0]).toHaveFocus();
      await user.keyboard('{End}');
      expect(swatches()[2]).toHaveFocus();
      expect(onChange).toHaveBeenLastCalledWith('#0000ff');
    });

    it('supports custom swatches with labels, normalizing hex and dropping invalid ones', () => {
      render(
        <ColorPicker
          label="C"
          swatches={['#F00', { value: '00ff00', label: 'Lime' }, 'not-a-color', { value: '#00f' }]}
        />,
      );
      expect(swatches().map((s) => s.getAttribute('aria-label'))).toEqual([
        '#ff0000',
        'Lime',
        '#0000ff',
      ]);
    });

    it('marks pale swatches so the check mark stays readable', () => {
      render(<ColorPicker label="C" swatches={['#fde68a', '#1e3a8a']} />);
      expect(swatches()[0]).toHaveClass('axon-color-picker__swatch--light');
      expect(swatches()[1]).not.toHaveClass('axon-color-picker__swatch--light');
    });

    it('omits the swatch group when there are none', () => {
      render(<ColorPicker label="C" swatches={[]} />);
      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    });
  });

  describe('hex input', () => {
    it('commits a valid hex as it is typed, normalized', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ColorPicker label="C" onChange={onChange} />);
      await user.type(hex(), '#3B82F');
      expect(onChange).not.toHaveBeenCalled();
      await user.type(hex(), '6');
      expect(onChange).toHaveBeenLastCalledWith('#3b82f6');
      expect(swatch('Primary 500')).toHaveAttribute('aria-checked', 'true');
    });

    it('does not commit shorthand while typing, only on blur or Enter', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ColorPicker label="C" onChange={onChange} />);
      await user.type(hex(), 'abc');
      expect(onChange).not.toHaveBeenCalled();
      await user.tab();
      expect(onChange).toHaveBeenLastCalledWith('#aabbcc');
      expect(hex().value).toBe('#aabbcc');
      await user.clear(hex());
      await user.type(hex(), '#0f0{Enter}');
      expect(onChange).toHaveBeenLastCalledWith('#00ff00');
      expect(hex().value).toBe('#00ff00');
    });

    it('does not fire intermediate colors while typing a full hex', async () => {
      const onChange = vi.fn();
      render(<ColorPicker label="C" onChange={onChange} />);
      await userEvent.setup().type(hex(), '#3b82f6');
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('#3b82f6');
    });

    it('goes back to the last valid color for unusable text on blur', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ColorPicker label="C" defaultValue="#ef4444" onChange={onChange} />);
      await user.clear(hex());
      await user.type(hex(), 'banana');
      await user.tab();
      expect(hex().value).toBe('#ef4444');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('clears the color when emptied', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ColorPicker label="C" defaultValue="#ef4444" onChange={onChange} />);
      await user.clear(hex());
      await user.tab();
      expect(onChange).toHaveBeenCalledWith(null);
      expect(
        screen.getAllByRole('radio').every((r) => r.getAttribute('aria-checked') === 'false'),
      ).toBe(true);
    });

    it('limits the length to a hex color', () => {
      render(<ColorPicker label="C" />);
      expect(hex()).toHaveAttribute('maxlength', '7');
    });
  });

  describe('native chooser', () => {
    it('is offered by default and reports the chosen color', () => {
      const onChange = vi.fn();
      render(<ColorPicker label="C" onChange={onChange} />);
      const native = screen.getByLabelText('Custom color');
      fireEvent.change(native, { target: { value: '#123456' } });
      expect(onChange).toHaveBeenCalledWith('#123456');
      expect(hex().value).toBe('#123456');
    });

    it('can be hidden', () => {
      render(<ColorPicker label="C" allowCustom={false} />);
      expect(screen.queryByLabelText('Custom color')).not.toBeInTheDocument();
    });
  });

  describe('controlled', () => {
    it('follows the value prop and reports requested changes', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ColorPicker label="C" value="#ef4444" onChange={onChange} />);
      await user.click(swatch('Primary 500'));
      expect(onChange).toHaveBeenCalledWith('#3b82f6');
      expect(hex().value).toBe('#ef4444');
      expect(swatch('Danger 500')).toHaveAttribute('aria-checked', 'true');
    });

    it('works with parent state, including external changes', async () => {
      function Parent() {
        const [color, setColor] = useState<string | null>(null);
        return (
          <>
            <ColorPicker label="C" value={color} onChange={setColor} />
            <button onClick={() => setColor('#22c55e')}>set</button>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);
      await user.click(swatch('Danger 700'));
      expect(hex().value).toBe('#b91c1c');
      await user.click(screen.getByRole('button', { name: 'set' }));
      expect(hex().value).toBe('#22c55e');
      expect(swatch('Success 500')).toHaveAttribute('aria-checked', 'true');
    });
  });

  it('submits the hex through a hidden input when named', () => {
    const { container } = render(<ColorPicker label="C" name="brand" defaultValue="#ef4444" />);
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden).toHaveAttribute('name', 'brand');
    expect(hidden.value).toBe('#ef4444');
  });

  it('describes the field with helper or error text and marks required/invalid', () => {
    const { rerender } = render(<ColorPicker label="C" helperText="Pick one" required />);
    expect(hex()).toHaveAccessibleDescription('Pick one');
    expect(hex()).toBeRequired();
    rerender(<ColorPicker label="C" helperText="x" error errorMessage="Required" />);
    expect(hex()).toHaveAccessibleDescription('Required');
    expect(hex()).toHaveAttribute('aria-invalid', 'true');
  });

  it('is inert when disabled', () => {
    render(<ColorPicker label="C" disabled />);
    expect(hex()).toBeDisabled();
    expect(screen.getByLabelText('Custom color')).toBeDisabled();
    for (const radio of swatches()) expect(radio).toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <ColorPicker label="Brand" defaultValue="#3b82f6" helperText="Pick one" />
        <ColorPicker label="Error" error errorMessage="Required" required />
        <ColorPicker label="Disabled" disabled />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
