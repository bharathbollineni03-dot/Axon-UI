import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import { ModelSelector, type ChatModel } from './ModelSelector';

const models: ChatModel[] = [
  { id: 'fast', name: 'Axon Fast', description: 'Quick answers', badge: 'New' },
  { id: 'smart', name: 'Axon Smart', description: 'Best for hard problems' },
  { id: 'legacy', name: 'Axon Classic', description: 'Older model', disabled: true },
];

const trigger = () => screen.getByRole('button', { name: /^Model:/ });

describe('ModelSelector', () => {
  it('is a menu button named "Model", showing the chosen model and its badge', () => {
    render(<ModelSelector models={models} defaultValue="fast" />);
    expect(trigger()).toHaveAccessibleName('Model: Axon Fast New');
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('shows a prompt to choose when nothing is chosen', () => {
    render(<ModelSelector models={models} />);
    expect(trigger()).toHaveAccessibleName('Model: Select a model');
  });

  it('lists each model with its badge and description, the chosen one checked', async () => {
    render(<ModelSelector models={models} defaultValue="smart" />);
    await userEvent.setup().click(trigger());
    const options = screen.getAllByRole('menuitemradio');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Axon Fast New Quick answers');
    expect(options[1]).toHaveAttribute('aria-checked', 'true');
    expect(options[0]).toHaveAttribute('aria-checked', 'false');
    expect(options[2]).toHaveAttribute('aria-disabled', 'true');
  });

  it('chooses a model, closes, and shows it', async () => {
    const onChange = vi.fn();
    render(<ModelSelector models={models} defaultValue="fast" onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(trigger());
    await user.click(screen.getByRole('menuitemradio', { name: /Axon Smart/ }));
    expect(onChange).toHaveBeenCalledWith('smart');
    expect(trigger()).toHaveAccessibleName('Model: Axon Smart');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger()).toHaveFocus();
  });

  it('works with the keyboard', async () => {
    const onChange = vi.fn();
    render(<ModelSelector models={models} defaultValue="fast" onChange={onChange} />);
    const user = userEvent.setup();
    trigger().focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getAllByRole('menuitemradio')[0]).toHaveFocus());
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('smart');
  });

  it('can not choose a disabled model', async () => {
    const onChange = vi.fn();
    render(<ModelSelector models={models} onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(trigger());
    await user.click(screen.getByRole('menuitemradio', { name: /Axon Classic/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('works controlled', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<ModelSelector models={models} value="fast" onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(trigger());
    await user.click(screen.getByRole('menuitemradio', { name: /Axon Smart/ }));
    expect(onChange).toHaveBeenCalledWith('smart');
    expect(trigger()).toHaveAccessibleName('Model: Axon Fast New');
    rerender(<ModelSelector models={models} value="smart" onChange={onChange} />);
    expect(trigger()).toHaveAccessibleName('Model: Axon Smart');
  });

  it('lists models under their group headings', async () => {
    render(
      <ModelSelector
        models={[
          { id: 'a', name: 'Alpha', group: 'Anthropic' },
          { id: 'b', name: 'Beta', group: 'Open source' },
          { id: 'c', name: 'Gamma', group: 'Anthropic' },
        ]}
        defaultValue="c"
      />,
    );
    await userEvent.setup().click(trigger());
    const anthropic = screen.getByRole('group', { name: 'Anthropic' });
    expect(anthropic).toHaveTextContent('Alpha');
    expect(anthropic).toHaveTextContent('Gamma');
    expect(screen.getByRole('group', { name: 'Open source' })).toHaveTextContent('Beta');
    expect(screen.getByRole('menuitemradio', { name: 'Gamma' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('is disabled when asked, or when there are no models', () => {
    const { rerender } = render(<ModelSelector models={models} disabled />);
    expect(trigger()).toBeDisabled();
    rerender(<ModelSelector models={[]} />);
    expect(trigger()).toBeDisabled();
  });

  it('forwards a ref to the button and takes a class name', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<ModelSelector ref={ref} models={models} className="mine" />);
    expect(ref.current).toBe(trigger());
    expect(trigger()).toHaveClass('mine');
  });

  it('can be translated', async () => {
    render(
      <ModelSelector
        models={models}
        labels={{ model: 'Modelo', placeholder: 'Elige un modelo' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Modelo: Elige un modelo' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button'));
    expect(screen.getByRole('menu', { name: 'Modelo' })).toBeInTheDocument();
  });

  it('has no accessibility violations, closed or open', async () => {
    const { container } = render(<ModelSelector models={models} defaultValue="fast" />);
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.setup().click(trigger());
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
  });
});
