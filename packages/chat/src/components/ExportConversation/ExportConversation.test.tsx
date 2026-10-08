import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import { Button } from '@axonui/core';
import type { Message } from '../../types';
import { ExportConversation } from './ExportConversation';

const messages: Message[] = [
  { id: '1', role: 'user', content: 'Hi', createdAt: 1_750_000_000_000, status: 'done' },
  { id: '2', role: 'assistant', content: 'Hello!', createdAt: 1_750_000_001_000, status: 'done' },
];
const conversation = { id: 'c1', title: 'Greeting', messages };

const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
afterEach(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});

async function openMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Export' }));
  return user;
}

describe('ExportConversation', () => {
  it('is a button that opens a menu of formats', async () => {
    render(<ExportConversation conversation={conversation} />);
    const button = screen.getByRole('button', { name: 'Export' });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    await openMenu();
    const items = screen.getAllByRole('menuitem').map((item) => item.textContent);
    expect(items).toEqual(['Markdown (.md)', 'JSON (.json)', 'Plain text (.txt)']);
  });

  it('hands the finished file to onExport', async () => {
    const onExport = vi.fn();
    render(<ExportConversation conversation={conversation} onExport={onExport} />);
    const user = await openMenu();
    await user.click(screen.getByRole('menuitem', { name: 'JSON (.json)' }));
    expect(onExport).toHaveBeenCalledTimes(1);
    const file = onExport.mock.calls[0]![0];
    expect(file).toMatchObject({ format: 'json', filename: 'greeting.json' });
    expect(JSON.parse(file.content).messages).toHaveLength(2);
  });

  it('downloads the file when there is no onExport', async () => {
    const create = vi.fn(() => 'blob:x');
    URL.createObjectURL = create;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ExportConversation conversation={conversation} />);
    const user = await openMenu();
    await user.click(screen.getByRole('menuitem', { name: 'Markdown (.md)' }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('offers only the formats you choose', async () => {
    render(<ExportConversation conversation={conversation} formats={['markdown', 'text']} />);
    await openMenu();
    expect(screen.queryByRole('menuitem', { name: /JSON/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('passes the options on', async () => {
    const onExport = vi.fn();
    render(
      <ExportConversation
        conversation={conversation}
        options={{ includeTimestamps: false, title: 'Custom' }}
        onExport={onExport}
      />,
    );
    const user = await openMenu();
    await user.click(screen.getByRole('menuitem', { name: 'Markdown (.md)' }));
    const file = onExport.mock.calls[0]![0];
    expect(file.filename).toBe('custom.md');
    expect(file.content).not.toContain('UTC');
  });

  it('is disabled while there is nothing to export', () => {
    render(<ExportConversation conversation={{ title: 'Empty', messages: [] }} />);
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });

  it('can be disabled', () => {
    render(<ExportConversation conversation={conversation} disabled />);
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });

  it('can use your own trigger', async () => {
    render(
      <ExportConversation
        conversation={conversation}
        trigger={<Button variant="ghost">Save a copy</Button>}
      />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save a copy' }));
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
  });

  it('can be translated', async () => {
    render(
      <ExportConversation
        conversation={conversation}
        labels={{ export: 'Exportar', markdown: 'Markdown', menu: 'Exportar conversación' }}
      />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Exportar' }));
    expect(screen.getByRole('menu', { name: 'Exportar conversación' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Markdown' })).toBeInTheDocument();
  });

  it('has no accessibility violations, closed or open', async () => {
    const { container } = render(<ExportConversation conversation={conversation} />);
    expect(await axe(container)).toHaveNoViolations();
    await openMenu();
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
  });
});
