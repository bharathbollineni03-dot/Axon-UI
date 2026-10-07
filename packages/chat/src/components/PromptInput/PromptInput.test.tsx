import { createRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mention, SlashCommand } from './suggestions';
import { PromptInput, type PromptInputProps } from './PromptInput';

const box = () => screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
const sendButton = () => screen.getByRole('button', { name: 'Send message' });
const file = (name: string, size = 10, type = 'text/plain') =>
  new File([new Uint8Array(size)], name, { type });
const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;

const commands: SlashCommand[] = [
  { name: 'summarize', description: 'Shorten the text' },
  { name: 'translate', description: 'Into another language' },
  { name: 'clear', description: 'Start over' },
];
const people: Mention[] = [
  { id: '1', label: 'Ada Lovelace', description: 'Mathematician' },
  { id: '2', label: 'Grace Hopper' },
  { id: '3', label: 'Alan Turing' },
];

describe('PromptInput', () => {
  describe('basics', () => {
    it('is a text box named "Message" with a placeholder', () => {
      render(<PromptInput />);
      expect(box()).toHaveAttribute('placeholder', 'Send a message…');
    });

    it('can be named another way', () => {
      render(<PromptInput aria-label="Ask the assistant" />);
      expect(screen.getByRole('textbox', { name: 'Ask the assistant' })).toBeInTheDocument();
    });

    it('forwards the ref to the text area, and className and style to the box', () => {
      const ref = createRef<HTMLTextAreaElement>();
      const { container } = render(
        <PromptInput ref={ref} className="extra" style={{ margin: 4 }} />,
      );
      expect(ref.current).toBe(box());
      expect(container.firstChild).toHaveClass('axon-prompt-input', 'extra');
      expect((container.firstChild as HTMLElement).style.margin).toBe('4px');
    });

    it('spreads other props onto the text area', () => {
      render(<PromptInput name="prompt" data-testid="ta" />);
      expect(box()).toHaveAttribute('name', 'prompt');
      expect(screen.getByTestId('ta')).toBe(box());
    });

    it('works uncontrolled, and controlled', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<PromptInput defaultValue="start" />);
      expect(box()).toHaveValue('start');
      await user.type(box(), ' more');
      expect(box()).toHaveValue('start more');
      unmount();

      const onChange = vi.fn();
      render(<PromptInput value="fixed" onChange={onChange} />);
      await user.type(box(), 'x');
      expect(onChange).toHaveBeenCalledWith('fixedx');
      expect(box()).toHaveValue('fixed');
    });
  });

  describe('sending', () => {
    it('has send off until there is something to send', async () => {
      const user = userEvent.setup();
      render(<PromptInput />);
      expect(sendButton()).toBeDisabled();
      await user.type(box(), '   ');
      expect(sendButton()).toBeDisabled();
      await user.type(box(), 'hi');
      expect(sendButton()).toBeEnabled();
    });

    it('sends the trimmed text with Enter, and clears the box', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<PromptInput onSubmit={onSubmit} />);
      await user.type(box(), '  hello world  {Enter}');
      expect(onSubmit).toHaveBeenCalledWith('hello world', []);
      expect(box()).toHaveValue('');
    });

    it('sends with the button', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<PromptInput onSubmit={onSubmit} />);
      await user.type(box(), 'hi');
      await user.click(sendButton());
      expect(onSubmit).toHaveBeenCalledWith('hi', []);
    });

    it('makes a new line with Shift+Enter, and does not send', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<PromptInput onSubmit={onSubmit} />);
      await user.type(box(), 'line one{Shift>}{Enter}{/Shift}line two');
      expect(box()).toHaveValue('line one\nline two');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not send an empty message with Enter', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<PromptInput onSubmit={onSubmit} />);
      await user.type(box(), '   {Enter}');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('never sends while an input method is still composing a character', () => {
      const onSubmit = vi.fn();
      render(<PromptInput onSubmit={onSubmit} defaultValue="にほん" />);
      fireEvent.keyDown(box(), { key: 'Enter', isComposing: true });
      fireEvent.keyDown(box(), { key: 'Enter', keyCode: 229 });
      expect(onSubmit).not.toHaveBeenCalled();
      fireEvent.keyDown(box(), { key: 'Enter' });
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('can be set so that only Ctrl or Cmd + Enter sends', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<PromptInput onSubmit={onSubmit} submitKey="mod-enter" />);
      await user.type(box(), 'first{Enter}second');
      expect(box()).toHaveValue('first\nsecond');
      expect(onSubmit).not.toHaveBeenCalled();
      await user.keyboard('{Control>}{Enter}{/Control}');
      expect(onSubmit).toHaveBeenCalledWith('first\nsecond', []);
      await user.type(box(), 'again{Meta>}{Enter}{/Meta}');
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it('lets a keydown handler of yours cancel the send', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(
        <PromptInput
          onSubmit={onSubmit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault();
          }}
        />,
      );
      await user.type(box(), 'hi{Enter}');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('asks a controlled parent to clear the value', async () => {
      const user = userEvent.setup();
      function Parent() {
        const [text, setText] = useState('');
        return <PromptInput value={text} onChange={setText} onSubmit={() => {}} />;
      }
      render(<Parent />);
      await user.type(box(), 'hi{Enter}');
      expect(box()).toHaveValue('');
    });

    it('is off when disabled, or when you turn send off', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(<PromptInput onSubmit={onSubmit} defaultValue="hi" disabled />);
      expect(box()).toBeDisabled();
      expect(sendButton()).toBeDisabled();
      rerender(<PromptInput onSubmit={onSubmit} defaultValue="hi" sendDisabled />);
      await user.click(box());
      await user.keyboard('{Enter}');
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('while a reply is streaming', () => {
    it('shows stop in place of send, and calls onStop', async () => {
      const onStop = vi.fn();
      render(<PromptInput streaming onStop={onStop} />);
      expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument();
      await userEvent.setup().click(screen.getByRole('button', { name: 'Stop generating' }));
      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('does not send with Enter, but keeps what was typed', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<PromptInput streaming onStop={() => {}} onSubmit={onSubmit} />);
      await user.type(box(), 'next question{Enter}');
      expect(onSubmit).not.toHaveBeenCalled();
      expect(box()).toHaveValue('next question');
    });

    it('shows a disabled send when there is no stop handler', () => {
      render(<PromptInput streaming />);
      expect(sendButton()).toBeDisabled();
    });
  });

  describe('counter', () => {
    it('counts characters, against the limit', async () => {
      const user = userEvent.setup();
      render(<PromptInput showCount="characters" maxLength={10} />);
      expect(screen.getByText('0 / 10')).toBeInTheDocument();
      await user.type(box(), 'hello');
      expect(screen.getByText('5 / 10')).toBeInTheDocument();
    });

    it('counts characters with no limit', async () => {
      const user = userEvent.setup();
      render(<PromptInput showCount="characters" />);
      await user.type(box(), 'hey');
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('estimates tokens, or uses your counter', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<PromptInput showCount="tokens" />);
      await user.type(box(), 'twelve chars');
      expect(screen.getByText('~3 tokens')).toBeInTheDocument();
      unmount();
      render(<PromptInput showCount="tokens" countTokens={(text) => text.split(' ').length} />);
      await user.type(box(), 'one two three');
      expect(screen.getByText('~3 tokens')).toBeInTheDocument();
    });

    it('describes the box, so the count is read with it', () => {
      render(<PromptInput showCount="characters" maxLength={10} />);
      expect(box()).toHaveAccessibleDescription('0 / 10');
    });

    it('flags a message over the limit and does not send it', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<PromptInput showCount="characters" maxLength={5} onSubmit={onSubmit} />);
      await user.type(box(), 'too long');
      expect(box()).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('8 / 5')).toHaveClass('axon-prompt-input__count--over');
      expect(sendButton()).toBeDisabled();
      await user.keyboard('{Enter}');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not stop typing at the limit, so a long paste can be trimmed by hand', async () => {
      const user = userEvent.setup();
      render(<PromptInput maxLength={3} />);
      await user.type(box(), 'abcdef');
      expect(box()).toHaveValue('abcdef');
    });
  });

  describe('growing', () => {
    it('sets its height from its content, up to maxRows, then scrolls', () => {
      let scrollHeight = 30;
      vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockImplementation(
        () => scrollHeight,
      );
      const { rerender } = render(<PromptInput value="a" onChange={() => {}} maxRows={3} />);
      expect(box().style.height).toBe('30px');
      expect(box().style.overflowY).toBe('hidden');
      scrollHeight = 500;
      rerender(<PromptInput value={'a\n'.repeat(30)} onChange={() => {}} maxRows={3} />);
      // The limit is three lines of the default 24px line height.
      expect(box().style.height).toBe('72px');
      expect(box().style.overflowY).toBe('auto');
    });

    it('starts with the number of rows you ask for', () => {
      render(<PromptInput minRows={3} />);
      expect(box()).toHaveAttribute('rows', '3');
    });
  });

  describe('attachments', () => {
    beforeEach(() => {
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn(() => 'blob:thumb'),
        revokeObjectURL: vi.fn(),
      });
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('has no paperclip unless attachments are allowed', () => {
      render(<PromptInput />);
      expect(screen.queryByRole('button', { name: 'Attach files' })).not.toBeInTheDocument();
    });

    it('opens the file chooser from the paperclip', async () => {
      const click = vi.spyOn(HTMLInputElement.prototype, 'click');
      render(<PromptInput allowAttachments />);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Attach files' }));
      expect(click).toHaveBeenCalled();
    });

    it('shows a chip for each chosen file, and removes one', async () => {
      const user = userEvent.setup();
      render(<PromptInput allowAttachments />);
      await user.upload(fileInput(), [file('a.txt'), file('b.txt')]);
      expect(screen.getByRole('list', { name: 'Attachments' })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      await user.click(screen.getByRole('button', { name: 'Remove a.txt' }));
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });

    it('can send with only attachments, and hands them to onSubmit, then clears them', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      const a = file('a.txt');
      render(<PromptInput allowAttachments onSubmit={onSubmit} />);
      await user.upload(fileInput(), a);
      expect(sendButton()).toBeEnabled();
      await user.click(sendButton());
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit.mock.calls[0]![0]).toBe('');
      expect(onSubmit.mock.calls[0]![1]).toHaveLength(1);
      expect(onSubmit.mock.calls[0]![1][0].file).toBe(a);
      expect(screen.queryByRole('list', { name: 'Attachments' })).not.toBeInTheDocument();
    });

    it('lets the same file be chosen again after it was removed', async () => {
      const user = userEvent.setup();
      const a = file('a.txt');
      render(<PromptInput allowAttachments />);
      await user.upload(fileInput(), a);
      await user.click(screen.getByRole('button', { name: 'Remove a.txt' }));
      await user.upload(fileInput(), a);
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });

    it('turns away files that break the rules, and says why', async () => {
      const onAttachmentReject = vi.fn();
      const user = userEvent.setup({ applyAccept: false });
      render(
        <PromptInput
          allowAttachments
          accept="image/*"
          maxFileSize={100}
          maxFiles={2}
          onAttachmentReject={onAttachmentReject}
        />,
      );
      await user.upload(fileInput(), [
        file('ok.png', 10, 'image/png'),
        file('notes.txt', 10, 'text/plain'),
        file('big.png', 500, 'image/png'),
        file('two.png', 10, 'image/png'),
        file('three.png', 10, 'image/png'),
      ]);
      // The two that fit are attached.
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.getByText('ok.png')).toBeInTheDocument();
      expect(screen.getByText('two.png')).toBeInTheDocument();
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('notes.txt is not an accepted file type.');
      expect(alert).toHaveTextContent('big.png is larger than 100 B.');
      expect(alert).toHaveTextContent('three.png was not added: you can attach up to 2 files.');
      expect(onAttachmentReject).toHaveBeenCalledTimes(1);
      expect(box()).toHaveAccessibleDescription(/notes\.txt is not an accepted file type/);
    });

    it('clears the rejection message when something is attached next', async () => {
      const user = userEvent.setup({ applyAccept: false });
      render(<PromptInput allowAttachments accept="image/*" />);
      await user.upload(fileInput(), file('a.txt'));
      expect(screen.getByRole('alert')).toBeInTheDocument();
      await user.upload(fileInput(), file('b.png', 5, 'image/png'));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('takes files pasted into the box', () => {
      render(<PromptInput allowAttachments />);
      const image = file('screenshot.png', 20, 'image/png');
      const notPrevented = fireEvent.paste(box(), {
        clipboardData: { files: [image], getData: () => '' },
      });
      expect(screen.getByText('screenshot.png')).toBeInTheDocument();
      // A screenshot has no text, so the default paste is cancelled.
      expect(notPrevented).toBe(false);
    });

    it('lets pasted text through when files came with it', () => {
      render(<PromptInput allowAttachments />);
      const notPrevented = fireEvent.paste(box(), {
        clipboardData: { files: [file('a.txt')], getData: () => 'some text' },
      });
      expect(screen.getByText('a.txt')).toBeInTheDocument();
      expect(notPrevented).toBe(true);
    });

    it('ignores a paste with no files', () => {
      render(<PromptInput allowAttachments />);
      fireEvent.paste(box(), { clipboardData: { files: [], getData: () => 'text' } });
      expect(screen.queryByRole('list', { name: 'Attachments' })).not.toBeInTheDocument();
    });

    it('does not take pasted files when attachments are not allowed', () => {
      render(<PromptInput />);
      fireEvent.paste(box(), { clipboardData: { files: [file('a.txt')], getData: () => '' } });
      expect(screen.queryByText('a.txt')).not.toBeInTheDocument();
    });

    it('takes files dropped on the box, with a hint while they are over it', () => {
      const { container } = render(<PromptInput allowAttachments />);
      const root = container.firstChild as HTMLElement;
      const dataTransfer = { types: ['Files'], files: [file('dropped.txt')] };
      fireEvent.dragEnter(root, { dataTransfer });
      expect(screen.getByText('Drop files to attach them')).toBeInTheDocument();
      expect(root).toHaveClass('axon-prompt-input--dragging');
      fireEvent.drop(root, { dataTransfer });
      expect(screen.queryByText('Drop files to attach them')).not.toBeInTheDocument();
      expect(screen.getByText('dropped.txt')).toBeInTheDocument();
    });

    it('hides the hint when the drag leaves', () => {
      const { container } = render(<PromptInput allowAttachments />);
      const root = container.firstChild as HTMLElement;
      fireEvent.dragEnter(root, { dataTransfer: { types: ['Files'], files: [] } });
      fireEvent.dragLeave(root, { relatedTarget: document.body });
      expect(screen.queryByText('Drop files to attach them')).not.toBeInTheDocument();
    });

    it('ignores a drag that carries no files, such as selected text', () => {
      const { container } = render(<PromptInput allowAttachments />);
      const root = container.firstChild as HTMLElement;
      fireEvent.dragEnter(root, { dataTransfer: { types: ['text/plain'], files: [] } });
      expect(screen.queryByText('Drop files to attach them')).not.toBeInTheDocument();
    });

    it('does not accept drops when disabled', () => {
      const { container } = render(<PromptInput allowAttachments disabled />);
      const root = container.firstChild as HTMLElement;
      fireEvent.drop(root, { dataTransfer: { types: ['Files'], files: [file('a.txt')] } });
      expect(screen.queryByText('a.txt')).not.toBeInTheDocument();
    });

    it('works controlled', async () => {
      const onAttachmentsChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PromptInput allowAttachments attachments={[]} onAttachmentsChange={onAttachmentsChange} />,
      );
      await user.upload(fileInput(), file('a.txt'));
      expect(onAttachmentsChange).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('list', { name: 'Attachments' })).not.toBeInTheDocument();
    });
  });

  describe('slash commands', () => {
    const open = async (text = '/') => {
      const user = userEvent.setup();
      render(<PromptInput slashCommands={commands} />);
      await user.type(box(), text);
      return user;
    };

    it('opens a list of commands when the message starts with a slash', async () => {
      await open();
      const list = screen.getByRole('listbox', { name: 'Commands' });
      expect(screen.getAllByRole('option')).toHaveLength(3);
      expect(list).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /\/summarize/ })).toBeInTheDocument();
    });

    it('filters as the user types', async () => {
      await open('/tr');
      expect(screen.getAllByRole('option')).toHaveLength(1);
      expect(screen.getByRole('option', { name: /\/translate/ })).toBeInTheDocument();
    });

    it('stays closed for text that does not start with a slash, or matches nothing', async () => {
      const user = await open('hello /');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      await user.clear(box());
      await user.type(box(), '/zzz');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('points the text box at the highlighted option', async () => {
      await open();
      const listbox = screen.getByRole('listbox');
      expect(box()).toHaveAttribute('aria-controls', listbox.id);
      const first = screen.getAllByRole('option')[0]!;
      expect(first).toHaveAttribute('aria-selected', 'true');
      expect(box()).toHaveAttribute('aria-activedescendant', first.id);
      expect(box()).toHaveAttribute('aria-autocomplete', 'list');
    });

    it('has no pointers to a list that is not there', () => {
      render(<PromptInput slashCommands={commands} />);
      expect(box()).not.toHaveAttribute('aria-controls');
      expect(box()).not.toHaveAttribute('aria-activedescendant');
    });

    it('moves the highlight with the arrow keys, wrapping around', async () => {
      const user = await open();
      await user.keyboard('{ArrowDown}');
      expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{ArrowUp}{ArrowUp}');
      expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{ArrowDown}');
      expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('inserts the chosen command with Enter, and does not send', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<PromptInput slashCommands={commands} onSubmit={onSubmit} />);
      await user.type(box(), '/{ArrowDown}{Enter}');
      expect(box()).toHaveValue('/translate ');
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('chooses with Tab, and with a click', async () => {
      const user = await open('/su');
      await user.keyboard('{Tab}');
      expect(box()).toHaveValue('/summarize ');
      await user.clear(box());
      await user.type(box(), '/');
      await user.click(screen.getByRole('option', { name: /\/clear/ }));
      expect(box()).toHaveValue('/clear ');
      expect(box()).toHaveFocus();
    });

    it('puts the caret after the inserted command, ready for arguments', async () => {
      const user = await open('/su');
      await user.keyboard('{Enter}');
      expect(box().selectionStart).toBe('/summarize '.length);
      await user.type(box(), 'this');
      expect(box()).toHaveValue('/summarize this');
    });

    it('closes with Escape and stays closed until the text changes to a new trigger', async () => {
      const user = await open('/s');
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      await user.type(box(), 'u');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      await user.clear(box());
      await user.type(box(), '/');
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('can run an action instead of inserting text', async () => {
      const onSelect = vi.fn(({ clear }: { clear: () => void }) => clear());
      const user = userEvent.setup();
      render(<PromptInput slashCommands={[{ name: 'clear', onSelect }]} defaultValue="" />);
      await user.type(box(), '/cl{Enter}');
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(box()).toHaveValue('');
    });

    it('uses a command’s own text', async () => {
      const user = userEvent.setup();
      render(
        <PromptInput slashCommands={[{ name: 'tldr', insertText: 'Give me the TL;DR of: ' }]} />,
      );
      await user.type(box(), '/t{Enter}');
      expect(box()).toHaveValue('Give me the TL;DR of: ');
    });

    it('shows icons and descriptions', async () => {
      const user = userEvent.setup();
      render(
        <PromptInput
          slashCommands={[{ name: 'x', description: 'Does x', icon: <svg data-testid="i" /> }]}
        />,
      );
      await user.type(box(), '/');
      expect(screen.getByText('Does x')).toBeInTheDocument();
      expect(screen.getByTestId('i').parentElement).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('mentions', () => {
    it('opens after an @, and filters', async () => {
      const user = userEvent.setup();
      render(<PromptInput mentions={people} />);
      await user.type(box(), 'ask @a');
      expect(screen.getByRole('listbox', { name: 'Mentions' })).toBeInTheDocument();
      // Names that start with "a" come first, then the one that only contains it.
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
        'Ada LovelaceMathematician',
        'Alan Turing',
        'Grace Hopper',
      ]);
      await user.type(box(), 'l');
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Alan Turing']);
    });

    it('inserts the chosen name and reports it', async () => {
      const onMentionSelect = vi.fn();
      const user = userEvent.setup();
      render(<PromptInput mentions={people} onMentionSelect={onMentionSelect} />);
      await user.type(box(), 'ask @gr{Enter}');
      expect(box()).toHaveValue('ask @Grace Hopper ');
      expect(onMentionSelect).toHaveBeenCalledWith(people[1]);
    });

    it('keeps the text after the caret when inserting in the middle', async () => {
      const user = userEvent.setup();
      render(<PromptInput mentions={people} defaultValue="hello @gr and more" />);
      box().focus();
      box().setSelectionRange(9, 9);
      fireEvent.select(box());
      await user.keyboard('{Enter}');
      expect(box()).toHaveValue('hello @Grace Hopper  and more');
    });

    it('leaves an email address alone', async () => {
      const user = userEvent.setup();
      render(<PromptInput mentions={people} />);
      await user.type(box(), 'write to ada@example.com');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('searches with a function, for a long list', async () => {
      const search = vi.fn(async (query: string) =>
        people.filter((person) => person.label.toLowerCase().includes(query.toLowerCase())),
      );
      const user = userEvent.setup();
      render(<PromptInput mentions={search} />);
      await user.type(box(), '@turing');
      expect(await screen.findByRole('option', { name: /Alan Turing/ })).toBeInTheDocument();
      expect(search).toHaveBeenLastCalledWith('turing');
    });

    it('does not search again just because the function was recreated', async () => {
      const calls: string[] = [];
      function Host() {
        const [, force] = useState(0);
        return (
          <>
            <button onClick={() => force((n) => n + 1)}>rerender</button>
            <PromptInput
              mentions={async (query) => {
                calls.push(query);
                return people;
              }}
            />
          </>
        );
      }
      const user = userEvent.setup();
      render(<Host />);
      await user.type(box(), '@a');
      await screen.findAllByRole('option');
      const before = calls.length;
      await user.click(screen.getByRole('button', { name: 'rerender' }));
      await user.click(screen.getByRole('button', { name: 'rerender' }));
      expect(calls.length).toBe(before);
    });

    it('ignores the answer to a search that is out of date', async () => {
      let resolveSlow: (value: Mention[]) => void = () => {};
      const search = vi.fn((query: string) =>
        query === 'a'
          ? new Promise<Mention[]>((resolve) => {
              resolveSlow = resolve;
            })
          : Promise.resolve([people[2]!]),
      );
      const user = userEvent.setup();
      render(<PromptInput mentions={search} />);
      await user.type(box(), '@a');
      await user.type(box(), 'l');
      expect(await screen.findByRole('option', { name: /Alan Turing/ })).toBeInTheDocument();
      resolveSlow([people[0]!]);
      await waitFor(() => {
        expect(screen.queryByRole('option', { name: /Ada Lovelace/ })).not.toBeInTheDocument();
      });
    });

    it('stays closed when the search fails', async () => {
      const user = userEvent.setup();
      render(<PromptInput mentions={() => Promise.reject(new Error('down'))} />);
      await user.type(box(), '@a');
      await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    });
  });

  describe('slots', () => {
    it('renders a voice input button before send, and a start slot after the paperclip', () => {
      render(
        <PromptInput
          allowAttachments
          voiceInput={<button>Dictate</button>}
          startSlot={<button>Model</button>}
        />,
      );
      expect(screen.getByRole('button', { name: 'Dictate' })).toBeInTheDocument();
      const names = screen
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label') ?? b.textContent);
      expect(names).toEqual(['Attach files', 'Model', 'Dictate', 'Send message']);
    });
  });

  it('translates its labels', () => {
    render(
      <PromptInput
        allowAttachments
        labels={{ input: 'Mensaje', send: 'Enviar', attach: 'Adjuntar' }}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Mensaje' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adjuntar' })).toBeInTheDocument();
  });

  it('has no accessibility violations, including with a menu, chips and a counter', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const props: PromptInputProps = {
      allowAttachments: true,
      accept: 'image/*',
      slashCommands: commands,
      showCount: 'characters',
      maxLength: 100,
      voiceInput: <button>Dictate</button>,
    };
    const { container } = render(<PromptInput {...props} />);
    expect(await axe(container)).toHaveNoViolations();
    await user.upload(fileInput(), [file('a.png', 5, 'image/png'), file('b.txt')]);
    await user.type(box(), '/');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
