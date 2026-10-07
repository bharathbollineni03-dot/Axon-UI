import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Checkbox, DatePicker, NumberInput, TextField } from '@axon/core';
import { formatCellValue, toDate, toDateInputValue } from '../../internal/format';
import type { DataGridLabels } from '../../labels';
import type { DataGridColumn, DataGridEditorConfig } from '../../types';

/** The editor a column uses: the one it names, or one that suits the value it holds. */
export function resolveEditor(
  editable: DataGridColumn<never>['editable'],
  value: unknown,
): DataGridEditorConfig | null {
  if (!editable) return null;
  if (typeof editable === 'object') return editable;
  if (typeof value === 'boolean') return { type: 'checkbox' };
  if (typeof value === 'number') return { type: 'number' };
  if (value instanceof Date) return { type: 'date' };
  return { type: 'text' };
}

/** Whether two values are the same for the purpose of "did the edit change anything". */
function same(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a === null || a === undefined || a === '') return b === null || b === undefined || b === '';
  return Object.is(a, b);
}

/** A date chosen in the picker, in the form the cell held its date in. */
function likeOriginal(date: Date | null, original: unknown): unknown {
  if (!date) return null;
  if (typeof original === 'string') return toDateInputValue(date);
  if (typeof original === 'number') return date.getTime();
  return date;
}

interface CellEditorProps<Row> {
  definition: DataGridColumn<Row>;
  editor: Exclude<DataGridEditorConfig, { type: 'checkbox' }>;
  row: Row;
  value: unknown;
  labels: DataGridLabels;
  locale: string | undefined;
  /** Saves the new value. Resolves when it is saved and rejects with the reason it was not. */
  save: (value: unknown) => void | Promise<void>;
  /** Closes the editor, saved or not. */
  close: () => void;
}

/**
 * The input in an editable cell. Enter (or leaving a text or number field) saves, Escape puts the
 * old value back, and a message from `validate` or from a failed save keeps the editor open.
 */
export function CellEditor<Row>({
  definition,
  editor,
  row,
  value,
  labels,
  locale,
  save,
  close,
}: CellEditorProps<Row>) {
  const messageId = useId();
  const [draft, setDraft] = useState<unknown>(value ?? (editor.type === 'number' ? null : ''));
  const draftRef = useRef(draft);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const finished = useRef(false);
  const mounted = useRef(true);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // Take focus when the editor opens, with the text selected so typing replaces it.
  useEffect(() => {
    const element = inputRef.current;
    element?.focus();
    if (element instanceof HTMLInputElement) element.select();
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const change = (next: unknown) => {
    draftRef.current = next;
    setDraft(next);
  };

  const cancel = () => {
    finished.current = true;
    close();
  };

  /** Checks, saves and closes; or says why not and stays. */
  const submit = async (next: unknown = draftRef.current) => {
    if (working.current || finished.current) return;
    if (same(next, value)) {
      cancel();
      return;
    }
    const message = definition.validate?.(next as never, row);
    if (message) {
      setError(message);
      return;
    }
    working.current = true;
    setBusy(true);
    setError(null);
    try {
      await save(next);
      finished.current = true;
      if (mounted.current) close();
    } catch (failure) {
      working.current = false;
      if (!mounted.current) return;
      setBusy(false);
      setError(failure instanceof Error && failure.message ? failure.message : labels.saveFailed);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    } else if (event.key === 'Enter' && editor.type !== 'date') {
      // No preventDefault: a number field settles its own text (rounding, limits) on this very key,
      // and skips that if the key was already handled. It has done so by the next microtask.
      void Promise.resolve().then(() => submit());
    }
  };

  const ariaProps = {
    'aria-label': labels.editingCell(definition.header),
    'aria-describedby': error ? messageId : undefined,
  };

  let input;
  switch (editor.type) {
    case 'number':
      input = (
        <NumberInput
          {...ariaProps}
          error={!!error}
          ref={inputRef as never}
          size="sm"
          hideSteppers
          value={typeof draft === 'number' ? draft : null}
          min={editor.min}
          max={editor.max}
          step={editor.step}
          precision={editor.precision}
          disabled={busy}
          onChange={change}
          onKeyDown={onKeyDown}
          onBlur={() => void submit()}
        />
      );
      break;
    case 'select': {
      // A native select: it commits on Enter or when it loses focus, like the other editors, rather
      // than on the first arrow key, and every browser and screen reader knows how to use it.
      const kind = typeof value;
      const coerce = (text: string) =>
        kind === 'number' ? Number(text) : kind === 'boolean' ? text === 'true' : text;
      const current = draft === null || draft === undefined ? '' : String(draft);
      const known = editor.options.some((option) => option.value === current);
      input = (
        <select
          {...ariaProps}
          aria-invalid={error ? true : undefined}
          ref={inputRef as never}
          className="axon-datagrid__native-select"
          value={current}
          disabled={busy}
          onChange={(event) => change(coerce(event.target.value))}
          onKeyDown={onKeyDown}
          onBlur={() => void submit()}
        >
          {known ? null : <option value={current}>{current}</option>}
          {editor.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
      break;
    }
    case 'date':
      input = (
        <DatePicker
          {...ariaProps}
          error={!!error}
          ref={inputRef as never}
          size="sm"
          locale={locale}
          clearable
          value={toDate(draft)}
          disabled={busy}
          onChange={(date) => void submit(likeOriginal(date, value))}
          onKeyDown={onKeyDown}
        />
      );
      break;
    default:
      input = (
        <TextField
          {...ariaProps}
          error={!!error}
          ref={inputRef as never}
          size="sm"
          fullWidth
          value={typeof draft === 'string' ? draft : formatCellValue(draft, locale)}
          placeholder={editor.type === 'text' ? editor.placeholder : undefined}
          maxLength={editor.type === 'text' ? editor.maxLength : undefined}
          disabled={busy}
          onChange={(event) => change(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => void submit()}
        />
      );
  }

  return (
    <div className="axon-datagrid__editor" aria-busy={busy || undefined}>
      {input}
      {error ? (
        <div id={messageId} role="alert" className="axon-datagrid__edit-error">
          {error}
        </div>
      ) : null}
    </div>
  );
}

interface CheckboxEditorProps<Row> {
  definition: DataGridColumn<Row>;
  row: Row;
  value: unknown;
  labels: DataGridLabels;
  tabIndex: number;
  save: (value: unknown) => void | Promise<void>;
}

/** A checkbox that is a cell's whole editor: pressing it saves at once. */
export function CheckboxEditor<Row>({
  definition,
  row,
  value,
  labels,
  tabIndex,
  save,
}: CheckboxEditorProps<Row>) {
  const messageId = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = async (checked: boolean) => {
    const message = definition.validate?.(checked as never, row);
    if (message) {
      setError(message);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await save(checked);
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : labels.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="axon-datagrid__editor">
      <Checkbox
        size="sm"
        aria-label={labels.editingCell(definition.header)}
        aria-describedby={error ? messageId : undefined}
        checked={value === true}
        disabled={busy}
        tabIndex={tabIndex}
        onChange={(event) => void toggle(event.target.checked)}
        onClick={(event) => event.stopPropagation()}
      />
      {error ? (
        <div id={messageId} role="alert" className="axon-datagrid__edit-error">
          {error}
        </div>
      ) : null}
    </div>
  );
}
