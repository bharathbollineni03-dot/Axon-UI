import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { joinIds } from '../../utils/dom';
import { useMergedRef } from '../../utils/mergeRefs';
import { useControllableState } from '../../hooks/useControllableState';
import { useDebounce } from '../../hooks/useDebounce';
import { CloseIcon } from '../../internal/icons';
import {
  Field,
  inputBoxClassName,
  useFieldIds,
  type InputVariant,
} from '../../internal/Field/Field';
import { highlightMatch } from '../../internal/Listbox/highlight';
import { ListboxPopup } from '../../internal/Listbox/ListboxPopup';
import {
  buildNodes,
  defaultFilter,
  filterItems,
  firstEnabledIndex,
  flattenItems,
  lastEnabledIndex,
  nextEnabledIndex,
  type ListboxItem,
  type ListboxOption,
} from '../../internal/Listbox/options';

export type InputChangeReason = 'input' | 'select' | 'clear' | 'reset';

/**
 * `className` and `style` apply to the outer wrapper and `ref` points at the `<input>`;
 * every other prop (name, placeholder, autoComplete, aria-*, onFocus, ...) goes to the `<input>`.
 */
export interface AutocompleteProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'color' | 'type' | 'prefix' | 'value' | 'defaultValue' | 'onChange' | 'list' | 'role'
> {
  /** Options to filter on the client, optionally grouped. */
  options?: ListboxItem[];
  /**
   * Loads options for a query (debounced). It receives an `AbortSignal` that fires when the query
   * changes or the list closes. Results are not filtered again on the client unless
   * `filterOptions` is a function.
   */
  loadOptions?: (query: string, signal: AbortSignal) => Promise<ListboxItem[]>;
  /** Debounce for `loadOptions`, in ms. Defaults to 300. */
  debounceMs?: number;
  /** The selected option's value (or the typed text with `freeSolo`). `null` means none. */
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null, option: ListboxOption | null) => void;
  /** The text in the input. */
  inputValue?: string;
  defaultInputValue?: string;
  onInputChange?: (text: string, reason: InputChangeReason) => void;
  /** Accepts text that is not in the list: it becomes the value on Enter or blur. */
  freeSolo?: boolean;
  /** Replaces the default case-insensitive "contains" filter, or `false` to disable filtering. */
  filterOptions?: false | ((option: ListboxOption, query: string) => boolean);
  /** Emphasizes the part of each option that matches the query. Defaults to `true`. */
  highlightMatches?: boolean;
  /** Shows a button that clears the input and the value. */
  clearable?: boolean;
  loadingText?: string;
  noOptionsText?: string;
  loadErrorText?: string;
  clearLabel?: string;
  label?: ReactNode;
  helperText?: ReactNode;
  error?: boolean;
  /** Shown in place of `helperText` while `error` is set. */
  errorMessage?: ReactNode;
  size?: AxonSize;
  variant?: InputVariant;
  color?: AxonColor;
  fullWidth?: boolean;
  className?: string;
  style?: CSSProperties;
}

const NO_OPTIONS: ListboxItem[] = [];

/**
 * An editable combobox with list autocomplete (WAI-ARIA combobox pattern): DOM focus stays in the
 * input while arrow keys move through the options via `aria-activedescendant`.
 */
export const Autocomplete = forwardRef<HTMLInputElement, AutocompleteProps>(function Autocomplete(
  {
    options: optionsProp = NO_OPTIONS,
    loadOptions,
    debounceMs = 300,
    value: valueProp,
    defaultValue = null,
    onChange,
    inputValue: inputValueProp,
    defaultInputValue,
    onInputChange,
    freeSolo = false,
    filterOptions,
    highlightMatches = true,
    clearable = false,
    loadingText = 'Loading…',
    noOptionsText = 'No options',
    loadErrorText = "Couldn't load options",
    clearLabel = 'Clear',
    label,
    helperText,
    error = false,
    errorMessage,
    size = 'md',
    variant = 'outline',
    color = 'primary',
    fullWidth = false,
    id: idProp,
    disabled = false,
    readOnly = false,
    required = false,
    className,
    style,
    onBlur,
    onClick,
    'aria-describedby': ariaDescribedBy,
    ...inputProps
  },
  ref,
) {
  const { id, messageId, counterId } = useFieldIds(idProp);
  const listboxId = `${id}-listbox`;
  const optionId = useCallback((index: number) => `${id}-option-${index}`, [id]);

  const [boxElement, setBoxElement] = useState<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mergedRef = useMergedRef(ref, inputRef);

  // Options seen so far, so the selected value keeps its label when the list changes (async).
  const known = useRef(new Map<string, ListboxOption>());

  const [remote, setRemote] = useState<{
    items: ListboxItem[];
    loading: boolean;
    failed: boolean;
  }>({ items: NO_OPTIONS, loading: false, failed: false });
  const source = loadOptions ? remote.items : optionsProp;
  for (const option of flattenItems(source)) known.current.set(option.value, option);

  const [value, setValue] = useControllableState<string | null>({
    value: valueProp,
    defaultValue,
  });
  const selectedOption: ListboxOption | null =
    value === null
      ? null
      : (known.current.get(value) ?? (freeSolo ? { value, label: value } : null));

  const [inputValue, setInputValue] = useControllableState<string>({
    value: inputValueProp,
    defaultValue: defaultInputValue ?? selectedOption?.label ?? '',
  });
  const changeInput = (text: string, reason: InputChangeReason) => {
    setInputValue(text);
    onInputChange?.(text, reason);
  };

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // True while the input holds text the user typed, which is what the list is filtered by.
  const [filtering, setFiltering] = useState(false);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, debounceMs);

  // Keep the text in step with a value that is changed from outside.
  const previousValue = useRef(valueProp);
  useEffect(() => {
    if (previousValue.current === valueProp) return;
    previousValue.current = valueProp;
    if (valueProp === undefined || inputValueProp !== undefined) return;
    const next = valueProp === null ? '' : (known.current.get(valueProp)?.label ?? valueProp);
    setInputValue(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueProp]);

  const loadRef = useRef(loadOptions);
  loadRef.current = loadOptions;
  useEffect(() => {
    if (!loadRef.current || !open) return;
    const controller = new AbortController();
    setRemote((current) => ({ ...current, loading: true, failed: false }));
    loadRef
      .current(debouncedSearch, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setRemote({ items, loading: false, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRemote((current) => ({ ...current, loading: false, failed: true }));
        }
      });
    return () => controller.abort();
  }, [debouncedSearch, open]);

  const visibleItems = useMemo(() => {
    if (!filtering || filterOptions === false || (loadOptions && !filterOptions)) return source;
    const matches = filterOptions ?? defaultFilter;
    return filterItems(source, (option) => matches(option, inputValue));
  }, [source, filtering, filterOptions, loadOptions, inputValue]);

  const { nodes, options } = useMemo(() => buildNodes(visibleItems), [visibleItems]);
  const hasOptions = options.length > 0;

  const status: ReactNode = remote.loading
    ? loadingText
    : remote.failed
      ? loadErrorText
      : !hasOptions && !freeSolo
        ? noOptionsText
        : undefined;
  const listVisible = open && (hasOptions || Boolean(status));
  const expanded = open && hasOptions;

  const commit = (next: string | null, option: ListboxOption | null) => {
    if (next === value) return;
    setValue(next);
    onChange?.(next, option);
  };

  const closeList = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const choose = (option: ListboxOption) => {
    commit(option.value, option);
    changeInput(option.label, 'select');
    setSearchText('');
    setFiltering(false);
    closeList();
    inputRef.current?.focus();
  };

  const clear = () => {
    commit(null, null);
    changeInput('', 'clear');
    setSearchText('');
    setFiltering(false);
  };

  const openList = (target: 'selected' | 'first' | 'last' = 'selected') => {
    if (disabled || readOnly) return;
    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(
      target === 'last'
        ? lastEnabledIndex(options)
        : target === 'selected' && selectedIndex >= 0
          ? selectedIndex
          : firstEnabledIndex(options),
    );
    setOpen(true);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    changeInput(text, 'input');
    setSearchText(text);
    setFiltering(true);
    setActiveIndex(-1);
    setOpen(true);
    if (text === '' && value !== null) commit(null, null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openList();
        else {
          setActiveIndex((index) => {
            const next = nextEnabledIndex(options, index, 1);
            return next === -1 ? index : next;
          });
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) openList('last');
        else {
          setActiveIndex((index) => {
            const next =
              index < 0 ? lastEnabledIndex(options) : nextEnabledIndex(options, index, -1);
            return next === -1 ? index : next;
          });
        }
        break;
      case 'Enter':
        if (expanded && activeIndex >= 0) {
          event.preventDefault();
          choose(options[activeIndex]!);
        } else if (freeSolo && inputValue) {
          commit(inputValue, { value: inputValue, label: inputValue });
          closeList();
        }
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          closeList();
        } else if (inputValue) {
          event.preventDefault();
          clear();
        }
        break;
      case 'Tab':
        closeList();
        break;
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    closeList();
    setFiltering(false);
    if (freeSolo) {
      if (inputValue) commit(inputValue, { value: inputValue, label: inputValue });
      else commit(null, null);
    } else if (inputValue !== (selectedOption?.label ?? '')) {
      changeInput(selectedOption?.label ?? '', 'reset');
    }
    onBlur?.(event);
  };

  const handleBoxMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('input, button') || disabled) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  const message = error && errorMessage ? errorMessage : helperText;
  const showClear = clearable && inputValue !== '' && !disabled && !readOnly;

  return (
    <Field
      baseClass="axon-autocomplete"
      id={id}
      messageId={messageId}
      counterId={counterId}
      label={label}
      required={required}
      disabled={disabled}
      error={error}
      fullWidth={fullWidth}
      message={message}
      className={className}
      style={style}
    >
      {/* The mouse handler only forwards clicks to the input, which stays the focus target. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={setBoxElement}
        className={inputBoxClassName({ size, variant, color, error, disabled, readOnly })}
        onMouseDown={handleBoxMouseDown}
      >
        <input
          autoComplete="off"
          spellCheck={false}
          {...inputProps}
          ref={mergedRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={expanded}
          aria-controls={expanded ? listboxId : undefined}
          aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-invalid={error || undefined}
          aria-describedby={joinIds(ariaDescribedBy, Boolean(message) && messageId)}
          value={inputValue}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          className="axon-input__field"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onClick={(event) => {
            onClick?.(event);
            if (!open) openList();
          }}
        />
        {remote.loading ? <span className="axon-autocomplete__spinner" aria-hidden="true" /> : null}
        {showClear ? (
          <button
            type="button"
            className="axon-input__action"
            aria-label={clearLabel}
            onClick={() => {
              clear();
              inputRef.current?.focus();
            }}
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>
      <ListboxPopup
        open={listVisible}
        reference={boxElement}
        onDismiss={closeList}
        listboxId={listboxId}
        optionId={optionId}
        nodes={nodes}
        activeIndex={activeIndex}
        isSelected={(option) => option.value === value}
        onSelect={(option) => choose(option)}
        onHover={setActiveIndex}
        renderLabel={
          highlightMatches && filtering && inputValue
            ? (option) => highlightMatch(option.label, inputValue)
            : undefined
        }
        status={status}
        loading={remote.loading}
        size={size}
        color={color}
        labelledBy={label ? `${id}-label` : undefined}
      />
    </Field>
  );
});
