import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
  type TextareaHTMLAttributes,
} from 'react';
import { IconButton, useControllableState, useId } from '@axon/core';
import { PaperclipIcon, SendIcon, StopIcon } from '../../internal/icons';
import { useMergedRef } from '../../internal/mergeRefs';
import { AttachmentList, type AttachmentListLabels } from '../Attachments/AttachmentList';
import {
  formatFileSize,
  type Attachment,
  type AttachmentRejection,
  type AttachmentRejectionReason,
  type FileRules,
} from '../Attachments/files';
import { useAttachments } from '../Attachments/useAttachments';
import { SuggestionMenu, suggestionOptionId, type SuggestionItem } from './SuggestionMenu';
import {
  applySuggestion,
  filterCommands,
  filterMentions,
  findTrigger,
  type Mention,
  type MentionSource,
  type SlashCommand,
} from './suggestions';

// Layout effects warn on the server; an ordinary effect is fine there.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface PromptInputLabels {
  /** The text box's accessible name. */
  input: string;
  send: string;
  stop: string;
  attach: string;
  /** Shown over the box while files are dragged onto it. */
  dropFiles: string;
  slashMenu: string;
  mentionMenu: string;
  /** Why a file was turned away. */
  rejected: (reason: AttachmentRejectionReason, name: string, rules: FileRules) => string;
  characterCount: (count: number, max: number | undefined) => string;
  tokenCount: (count: number) => string;
  attachmentList: Partial<AttachmentListLabels>;
}

export const defaultPromptInputLabels: PromptInputLabels = {
  input: 'Message',
  send: 'Send message',
  stop: 'Stop generating',
  attach: 'Attach files',
  dropFiles: 'Drop files to attach them',
  slashMenu: 'Commands',
  mentionMenu: 'Mentions',
  rejected: (reason, name, rules) =>
    reason === 'type'
      ? `${name} is not an accepted file type.`
      : reason === 'size'
        ? `${name} is larger than ${formatFileSize(rules.maxFileSize ?? 0)}.`
        : `${name} was not added: you can attach up to ${rules.maxFiles} files.`,
  characterCount: (count, max) => (max === undefined ? `${count}` : `${count} / ${max}`),
  tokenCount: (count) => `~${count} tokens`,
  attachmentList: {},
};

export interface PromptInputProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'defaultValue' | 'onChange' | 'onSubmit' | 'rows' | 'maxLength' | 'className' | 'style'
> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /**
   * Called with the trimmed text and the attachments when the user sends. The box (and the
   * attachments, when uncontrolled) are cleared right after.
   */
  onSubmit?: (value: string, attachments: Attachment[]) => void;
  /** Shows a stop button in place of send while `streaming`. */
  onStop?: () => void;
  /** A reply is on its way: the send button becomes stop, and Enter does not send. */
  streaming?: boolean;
  /**
   * `enter` (default): Enter sends and Shift+Enter makes a new line. `mod-enter`: Ctrl or Cmd +
   * Enter sends and Enter makes a new line.
   */
  submitKey?: 'enter' | 'mod-enter';
  minRows?: number;
  maxRows?: number;
  /** Longest message, in characters. Over it, send is off. */
  maxLength?: number;
  /** Shows a counter under the box. */
  showCount?: 'characters' | 'tokens';
  /** Counts tokens for `showCount="tokens"`. Defaults to about one per four characters. */
  countTokens?: (text: string) => number;

  /** Adds a paperclip button, drag-and-drop and paste for files. Defaults to false. */
  allowAttachments?: boolean;
  attachments?: Attachment[];
  defaultAttachments?: Attachment[];
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  /** Which files are accepted, in the `accept` attribute's format. */
  accept?: string;
  maxFileSize?: number;
  maxFiles?: number;
  onAttachmentReject?: (rejections: AttachmentRejection[]) => void;

  /** Commands offered when the message starts with `/`. */
  slashCommands?: SlashCommand[];
  /** Offered after an `@`. A fixed list, or a (memoised) function that searches. */
  mentions?: MentionSource;
  onMentionSelect?: (mention: Mention) => void;

  /** A button for voice input, placed before send. */
  voiceInput?: ReactNode;
  /** Anything else, placed after the paperclip. */
  startSlot?: ReactNode;
  /** Turns send off for your own reasons. */
  sendDisabled?: boolean;
  labels?: Partial<PromptInputLabels>;
  className?: string;
  style?: CSSProperties;
}

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

/**
 * The box a message is written in: a text area that grows with its text, a send button that turns
 * into stop while a reply streams, and optional attachments (picker, drag-and-drop, paste),
 * slash commands, `@mentions`, a counter and a voice-input slot. Enter sends and Shift+Enter makes
 * a new line (configurable); an IME that is still composing never sends. `ref` goes to the text
 * area; `className` and `style` go to the outer box.
 */
export const PromptInput = forwardRef<HTMLTextAreaElement, PromptInputProps>(function PromptInput(
  {
    value: valueProp,
    defaultValue,
    onChange,
    onSubmit,
    onStop,
    streaming = false,
    submitKey = 'enter',
    minRows = 1,
    maxRows = 8,
    maxLength,
    showCount,
    countTokens = estimateTokens,
    allowAttachments = false,
    attachments: attachmentsProp,
    defaultAttachments,
    onAttachmentsChange,
    accept,
    maxFileSize,
    maxFiles,
    onAttachmentReject,
    slashCommands,
    mentions,
    onMentionSelect,
    voiceInput,
    startSlot,
    sendDisabled = false,
    disabled = false,
    placeholder = 'Send a message…',
    labels: labelsProp,
    className,
    style,
    id,
    onKeyDown,
    onPaste,
    onSelect,
    onFocus,
    'aria-describedby': describedByProp,
    ...rest
  },
  ref,
) {
  const labels = { ...defaultPromptInputLabels, ...labelsProp };
  const baseId = useId(id, 'axon-prompt');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mergedRef = useMergedRef<HTMLTextAreaElement>(ref, textareaRef);
  const fileInput = useRef<HTMLInputElement>(null);

  const [value, setValue] = useControllableState<string>({
    value: valueProp,
    defaultValue: defaultValue ?? '',
    onChange,
  });
  const { attachments, add, remove, clear, rejections, clearRejections } = useAttachments({
    value: attachmentsProp,
    defaultValue: defaultAttachments,
    onChange: onAttachmentsChange,
    onReject: onAttachmentReject,
    accept,
    maxFileSize,
    maxFiles,
  });
  const [dragging, setDragging] = useState(false);

  // ---- Sending ----
  const trimmed = value.trim();
  const overLimit = maxLength !== undefined && value.length > maxLength;
  const canSend =
    !disabled &&
    !streaming &&
    !sendDisabled &&
    !overLimit &&
    (trimmed.length > 0 || attachments.length > 0);

  const submit = () => {
    if (!canSend) return;
    clearRejections();
    onSubmit?.(trimmed, attachments);
    setValue('');
    clear();
  };

  // ---- Growing with the text ----
  useIsoLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    const line = Number.parseFloat(getComputedStyle(element).lineHeight) || 24;
    const limit = line * maxRows + (element.offsetHeight - element.clientHeight);
    element.style.height = `${Math.min(element.scrollHeight, limit)}px`;
    element.style.overflowY = element.scrollHeight > limit ? 'auto' : 'hidden';
  }, [value, minRows, maxRows]);

  // ---- Slash commands and mentions ----
  const [caret, setCaret] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const pendingCaret = useRef<number | null>(null);

  const rawTrigger = useMemo(
    () =>
      findTrigger(value, caret, {
        slash: Boolean(slashCommands?.length),
        mention: Boolean(mentions),
      }),
    [value, caret, slashCommands, mentions],
  );
  const trigger =
    rawTrigger && dismissed !== `${rawTrigger.kind}:${rawTrigger.start}` ? rawTrigger : null;

  useEffect(() => {
    if (!rawTrigger) setDismissed(null);
  }, [rawTrigger]);

  const commandMatches = useMemo(
    () => (trigger?.kind === 'slash' ? filterCommands(slashCommands ?? [], trigger.query) : []),
    [trigger?.kind, trigger?.query, slashCommands],
  );

  // Mentions from a function are looked up asynchronously. The function lives in a ref so an
  // inline one does not start a new search on every render; only the query does.
  const mentionsRef = useRef(mentions);
  mentionsRef.current = mentions;
  const [foundMentions, setFoundMentions] = useState<Mention[]>([]);
  const mentionQuery = trigger?.kind === 'mention' ? trigger.query : null;
  useEffect(() => {
    const source = mentionsRef.current;
    if (mentionQuery === null || typeof source !== 'function') {
      setFoundMentions([]);
      return;
    }
    let stale = false;
    Promise.resolve(source(mentionQuery)).then(
      (result) => {
        if (!stale) setFoundMentions(result);
      },
      () => {
        if (!stale) setFoundMentions([]);
      },
    );
    return () => {
      stale = true;
    };
  }, [mentionQuery]);

  const mentionMatches = useMemo(
    () =>
      trigger?.kind !== 'mention'
        ? []
        : Array.isArray(mentions)
          ? filterMentions(mentions, trigger.query)
          : foundMentions,
    [trigger?.kind, trigger?.query, mentions, foundMentions],
  );

  const items = useMemo<SuggestionItem[]>(
    () =>
      trigger?.kind === 'slash'
        ? commandMatches.map((command) => ({
            id: `cmd-${command.name}`,
            label: `/${command.name}`,
            description: command.description,
            icon: command.icon,
          }))
        : mentionMatches.map((mention) => ({
            id: `men-${mention.id}`,
            label: mention.label,
            description: mention.description,
            icon: mention.avatar,
          })),
    [trigger?.kind, commandMatches, mentionMatches],
  );

  const menuOpen = trigger !== null && items.length > 0;
  const menuId = `${baseId}-suggestions`;

  useEffect(() => {
    setActiveIndex(0);
  }, [trigger?.kind, trigger?.query]);

  const place = (text: string, position: number) => {
    pendingCaret.current = position;
    setValue(text);
  };

  const choose = (index: number) => {
    if (!trigger) return;
    if (trigger.kind === 'slash') {
      const command = commandMatches[index];
      if (!command) return;
      if (command.onSelect) {
        const cleared = applySuggestion(value, trigger, '');
        place(cleared.text, cleared.caret);
        command.onSelect({
          clear: () => place('', 0),
          setValue: (text) => place(text, text.length),
        });
        return;
      }
      const next = applySuggestion(value, trigger, command.insertText ?? `/${command.name} `);
      place(next.text, next.caret);
    } else {
      const mention = mentionMatches[index];
      if (!mention) return;
      const next = applySuggestion(value, trigger, `@${mention.label} `);
      place(next.text, next.caret);
      onMentionSelect?.(mention);
    }
  };

  // After a suggestion is inserted, put the caret after it.
  useIsoLayoutEffect(() => {
    const position = pendingCaret.current;
    const element = textareaRef.current;
    if (position === null || !element) return;
    pendingCaret.current = null;
    element.setSelectionRange(position, position);
    setCaret(position);
  });

  // ---- Keyboard ----
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (menuOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((current) => (current + step + items.length) % items.length);
        return;
      }
      if ((event.key === 'Enter' || event.key === 'Tab') && !event.shiftKey) {
        event.preventDefault();
        choose(activeIndex);
        return;
      }
      if (event.key === 'Escape' && trigger) {
        event.preventDefault();
        event.stopPropagation();
        setDismissed(`${trigger.kind}:${trigger.start}`);
        return;
      }
    }

    // 229 is what some browsers report for a key pressed during IME composition.
    const composing = event.nativeEvent.isComposing || event.keyCode === 229;
    if (event.key !== 'Enter' || event.shiftKey || composing) return;
    const modifier = event.ctrlKey || event.metaKey;
    if (submitKey === 'enter' || modifier) {
      event.preventDefault();
      submit();
    }
  };

  const track = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    setCaret(event.currentTarget.selectionStart ?? 0);
  };

  // ---- Files ----
  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    onPaste?.(event);
    if (event.defaultPrevented || !allowAttachments) return;
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.length === 0) return;
    add(files);
    // A pasted screenshot has no text; pasted text that came with files should still go in.
    if (!event.clipboardData.getData('text/plain')) event.preventDefault();
  };

  const hasFiles = (event: DragEvent) =>
    Array.from(event.dataTransfer?.types ?? []).includes('Files');

  const dropHandlers = allowAttachments
    ? {
        onDragEnter: (event: DragEvent) => {
          if (disabled || !hasFiles(event)) return;
          event.preventDefault();
          setDragging(true);
        },
        onDragOver: (event: DragEvent) => {
          if (disabled || !hasFiles(event)) return;
          event.preventDefault();
        },
        onDragLeave: (event: DragEvent<HTMLDivElement>) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        },
        onDrop: (event: DragEvent) => {
          if (disabled || !hasFiles(event)) return;
          event.preventDefault();
          setDragging(false);
          add(Array.from(event.dataTransfer.files));
        },
      }
    : {};

  // ---- Counter and descriptions ----
  const counterId = `${baseId}-count`;
  const errorId = `${baseId}-errors`;
  const count = showCount === 'tokens' ? countTokens(value) : value.length;
  const describedBy =
    [
      describedByProp,
      showCount ? counterId : undefined,
      rejections.length > 0 ? errorId : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  const rules: FileRules = { accept, maxFileSize, maxFiles };
  const showStop = streaming && Boolean(onStop);

  return (
    <div
      className={[
        'axon-prompt-input',
        dragging && 'axon-prompt-input--dragging',
        disabled && 'axon-prompt-input--disabled',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      {...dropHandlers}
    >
      {attachments.length > 0 ? (
        <AttachmentList
          attachments={attachments}
          onRemove={remove}
          disabled={disabled}
          labels={labels.attachmentList}
          className="axon-prompt-input__attachments"
        />
      ) : null}

      {rejections.length > 0 ? (
        <div id={errorId} className="axon-prompt-input__rejections" role="alert">
          {rejections.map((rejection, index) => (
            <p key={index}>{labels.rejected(rejection.reason, rejection.file.name, rules)}</p>
          ))}
        </div>
      ) : null}

      <div className="axon-prompt-input__box">
        <textarea
          {...rest}
          ref={mergedRef}
          id={baseId}
          rows={minRows}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={rest['aria-labelledby'] ? undefined : (rest['aria-label'] ?? labels.input)}
          aria-describedby={describedBy}
          aria-invalid={overLimit || undefined}
          aria-autocomplete={slashCommands?.length || mentions ? 'list' : undefined}
          aria-controls={menuOpen ? menuId : undefined}
          aria-activedescendant={menuOpen ? suggestionOptionId(menuId, activeIndex) : undefined}
          className="axon-prompt-input__textarea"
          onChange={(event) => {
            setValue(event.target.value);
            setCaret(event.target.selectionStart ?? event.target.value.length);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onSelect={(event) => {
            onSelect?.(event);
            track(event);
          }}
          onClick={track}
          onFocus={(event) => {
            onFocus?.(event);
            track(event);
          }}
        />

        <div className="axon-prompt-input__toolbar">
          <div className="axon-prompt-input__start">
            {allowAttachments ? (
              <>
                <IconButton
                  aria-label={labels.attach}
                  title={labels.attach}
                  disabled={disabled}
                  onClick={() => fileInput.current?.click()}
                >
                  <PaperclipIcon />
                </IconButton>
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  multiple={maxFiles !== 1}
                  accept={accept}
                  tabIndex={-1}
                  onChange={(event) => {
                    add(event.target.files ?? []);
                    // The same file can be chosen again after it was removed.
                    event.target.value = '';
                  }}
                />
              </>
            ) : null}
            {startSlot}
          </div>

          <div className="axon-prompt-input__end">
            {showCount ? (
              <span
                id={counterId}
                className={[
                  'axon-prompt-input__count',
                  overLimit && 'axon-prompt-input__count--over',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {showCount === 'tokens'
                  ? labels.tokenCount(count)
                  : labels.characterCount(count, maxLength)}
              </span>
            ) : null}
            {voiceInput}
            {showStop ? (
              <IconButton
                aria-label={labels.stop}
                title={labels.stop}
                variant="solid"
                color="neutral"
                onClick={onStop}
              >
                <StopIcon />
              </IconButton>
            ) : (
              <IconButton
                aria-label={labels.send}
                title={labels.send}
                variant="solid"
                color="primary"
                disabled={!canSend}
                onClick={submit}
              >
                <SendIcon />
              </IconButton>
            )}
          </div>
        </div>
      </div>

      {menuOpen ? (
        <SuggestionMenu
          id={menuId}
          items={items}
          activeIndex={activeIndex}
          label={trigger?.kind === 'slash' ? labels.slashMenu : labels.mentionMenu}
          onSelect={choose}
          onHover={setActiveIndex}
        />
      ) : null}

      {dragging ? (
        <div className="axon-prompt-input__drop" aria-hidden="true">
          {labels.dropFiles}
        </div>
      ) : null}
    </div>
  );
});
