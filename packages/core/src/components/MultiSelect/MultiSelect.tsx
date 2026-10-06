import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { joinIds } from '../../utils/dom';
import { useMergedRef } from '../../utils/mergeRefs';
import { useControllableState } from '../../hooks/useControllableState';
import { ChevronDownIcon, CloseIcon } from '../../internal/icons';
import {
  Field,
  inputBoxClassName,
  useFieldIds,
  type InputVariant,
} from '../../internal/Field/Field';
import { ListboxPopup } from '../../internal/Listbox/ListboxPopup';
import {
  buildNodes,
  firstEnabledIndex,
  lastEnabledIndex,
  nextEnabledIndex,
  type ListboxItem,
  type ListboxOption,
} from '../../internal/Listbox/options';
import { findByTypeahead, isPrintable, useTypeaheadBuffer } from '../../internal/Listbox/typeahead';

const SELECT_ALL_VALUE = '__axon_select_all__';
const EMPTY: string[] = [];

/**
 * `className` and `style` apply to the outer wrapper and `ref` points at the combobox button;
 * `name` is submitted through hidden inputs (one per selected value).
 */
export interface MultiSelectProps {
  options: ListboxItem[];
  /** The selected values, in the order they were chosen. */
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  /** Adds a "Select all" option at the top. Pass a string to change its text. */
  selectAll?: boolean | string;
  /** Shows a button that clears every selection. */
  clearable?: boolean;
  label?: ReactNode;
  helperText?: ReactNode;
  error?: boolean;
  /** Shown in place of `helperText` while `error` is set. */
  errorMessage?: ReactNode;
  size?: AxonSize;
  variant?: InputVariant;
  color?: AxonColor;
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  'aria-describedby'?: string;
  onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;
  onFocus?: (event: FocusEvent<HTMLButtonElement>) => void;
}

/**
 * A multi-selection listbox. The selection is shown as removable chips; the list stays open
 * while you pick, and DOM focus stays on the combobox button throughout.
 */
export const MultiSelect = forwardRef<HTMLButtonElement, MultiSelectProps>(function MultiSelect(
  {
    options: items,
    value: valueProp,
    defaultValue = EMPTY,
    onChange,
    placeholder,
    selectAll = false,
    clearable = false,
    label,
    helperText,
    error = false,
    errorMessage,
    size = 'md',
    variant = 'outline',
    color = 'primary',
    fullWidth = false,
    disabled = false,
    required = false,
    name,
    id: idProp,
    className,
    style,
    'aria-describedby': ariaDescribedBy,
    ...buttonProps
  },
  ref,
) {
  const { id, messageId, counterId } = useFieldIds(idProp);
  const listboxId = `${id}-listbox`;
  const chipsId = `${id}-selected`;
  const optionId = useCallback((index: number) => `${id}-option-${index}`, [id]);

  const [boxElement, setBoxElement] = useState<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const mergedRef = useMergedRef(ref, triggerRef);

  const selectAllLabel = typeof selectAll === 'string' ? selectAll : 'Select all';
  const listItems = useMemo<ListboxItem[]>(
    () => (selectAll ? [{ value: SELECT_ALL_VALUE, label: selectAllLabel }, ...items] : items),
    [items, selectAll, selectAllLabel],
  );
  const { nodes, options } = useMemo(() => buildNodes(listItems), [listItems]);
  const realOptions = useMemo(
    () => options.filter((option) => option.value !== SELECT_ALL_VALUE),
    [options],
  );

  const [values, setValues] = useControllableState<string[]>({
    value: valueProp,
    defaultValue,
    onChange,
  });
  const labelOf = useCallback(
    (v: string) => realOptions.find((option) => option.value === v)?.label ?? v,
    [realOptions],
  );

  const enabledValues = realOptions.filter((o) => !o.disabled).map((o) => o.value);
  const allSelected = enabledValues.length > 0 && enabledValues.every((v) => values.includes(v));
  const someSelected = enabledValues.some((v) => values.includes(v));

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const nextTypeahead = useTypeaheadBuffer();

  const openList = (target: 'first' | 'last' = 'first') => {
    if (disabled) return;
    setActiveIndex(target === 'last' ? lastEnabledIndex(options) : firstEnabledIndex(options));
    setOpen(true);
  };
  const closeList = () => setOpen(false);

  const toggle = (option: ListboxOption) => {
    if (option.value === SELECT_ALL_VALUE) {
      setValues((current) =>
        allSelected
          ? current.filter((v) => !enabledValues.includes(v))
          : [...current, ...enabledValues.filter((v) => !current.includes(v))],
      );
      return;
    }
    setValues((current) =>
      current.includes(option.value)
        ? current.filter((v) => v !== option.value)
        : [...current, option.value],
    );
  };

  const remove = (v: string) => {
    setValues((current) => current.filter((item) => item !== v));
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const { key } = event;

    if (key === 'Backspace' && values.length > 0) {
      event.preventDefault();
      setValues((current) => current.slice(0, -1));
      return;
    }

    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault();
        openList();
      } else if (key === 'Home' || key === 'End') {
        event.preventDefault();
        openList(key === 'Home' ? 'first' : 'last');
      } else if (isPrintable(event)) {
        const match = findByTypeahead(options, nextTypeahead(key), -1);
        if (match >= 0) {
          event.preventDefault();
          setActiveIndex(match);
          setOpen(true);
        }
      }
      return;
    }

    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => {
          const next = nextEnabledIndex(options, index, 1);
          return next === -1 ? index : next;
        });
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => {
          const next = nextEnabledIndex(options, index, -1);
          return next === -1 ? index : next;
        });
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(firstEnabledIndex(options));
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(lastEnabledIndex(options));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0) toggle(options[activeIndex]!);
        break;
      case 'Escape':
        event.preventDefault();
        closeList();
        break;
      case 'Tab':
        closeList();
        break;
      default:
        if (isPrintable(event)) {
          const match = findByTypeahead(options, nextTypeahead(key), activeIndex);
          if (match >= 0) {
            event.preventDefault();
            setActiveIndex(match);
          }
        }
    }
  };

  // Pressing the empty part of the box (not a chip button) behaves like pressing the trigger.
  const handleBoxClick = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled || (event.target as HTMLElement).closest('button')) return;
    triggerRef.current?.focus();
    if (open) closeList();
    else openList();
  };

  const message = error && errorMessage ? errorMessage : helperText;
  const hasOptions = realOptions.length > 0;
  const expanded = open && hasOptions;

  return (
    <Field
      baseClass="axon-multi-select"
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
      {/* Clicks on empty space only forward to the combobox button, which stays the focus target. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        ref={setBoxElement}
        className={inputBoxClassName({
          size,
          variant,
          color,
          error,
          disabled,
          className: cx('axon-multi-select__box', open && 'axon-multi-select__box--open'),
        })}
        onClick={handleBoxClick}
      >
        {values.length > 0 ? (
          <ul id={chipsId} className="axon-multi-select__chips" aria-label="Selected">
            {values.map((v) => (
              <li key={v} className="axon-multi-select__chip">
                <span className="axon-multi-select__chip-label">{labelOf(v)}</span>
                {disabled ? null : (
                  <button
                    type="button"
                    className="axon-multi-select__chip-remove"
                    aria-label={`Remove ${labelOf(v)}`}
                    onClick={() => remove(v)}
                  >
                    <CloseIcon />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        <button
          {...buttonProps}
          ref={mergedRef}
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={expanded}
          aria-controls={expanded ? listboxId : undefined}
          aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-required={required || undefined}
          aria-invalid={error || undefined}
          aria-describedby={joinIds(
            ariaDescribedBy,
            values.length > 0 && chipsId,
            Boolean(message) && messageId,
          )}
          disabled={disabled}
          className="axon-multi-select__trigger"
          onClick={(event) => {
            event.stopPropagation();
            if (open) closeList();
            else openList();
          }}
          onKeyDown={handleKeyDown}
        >
          <span
            className={cx(
              'axon-multi-select__placeholder',
              values.length > 0 && 'axon-multi-select__placeholder--hidden',
            )}
          >
            {values.length === 0 ? (placeholder ?? '') : ''}
          </span>
        </button>
        {clearable && values.length > 0 && !disabled ? (
          <button
            type="button"
            className="axon-input__action"
            aria-label="Clear all"
            onClick={() => {
              setValues([]);
              triggerRef.current?.focus();
            }}
          >
            <CloseIcon />
          </button>
        ) : null}
        <span className="axon-multi-select__chevron" aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </div>
      {name
        ? values.map((v) => (
            <input key={v} type="hidden" name={name} value={v} disabled={disabled} />
          ))
        : null}
      <ListboxPopup
        open={open}
        reference={boxElement}
        onDismiss={closeList}
        listboxId={listboxId}
        optionId={optionId}
        nodes={nodes}
        activeIndex={activeIndex}
        multiple
        isSelected={(option) =>
          option.value === SELECT_ALL_VALUE ? allSelected : values.includes(option.value)
        }
        isMixed={(option) => option.value === SELECT_ALL_VALUE && someSelected && !allSelected}
        onSelect={(option) => toggle(option)}
        onHover={setActiveIndex}
        status={hasOptions ? undefined : 'No options'}
        size={size}
        color={color}
        labelledBy={label ? `${id}-label` : undefined}
      />
    </Field>
  );
});
