import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { joinIds } from '../../utils/dom';
import { useMergedRef } from '../../utils/mergeRefs';
import { useControllableState } from '../../hooks/useControllableState';
import { ChevronDownIcon } from '../../internal/icons';
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

export type {
  ListboxGroup as SelectGroup,
  ListboxItem as SelectItem,
  ListboxOption as SelectOption,
} from '../../internal/Listbox/options';

/**
 * `className` and `style` apply to the outer wrapper and `ref` points at the combobox button;
 * `name` and the remaining button attributes (aria-*, data-*, onFocus, ...) go to the button.
 */
export interface SelectProps {
  /** Options, optionally grouped: `{ label, options: [...] }`. */
  options: ListboxItem[];
  /** The selected option's value; `null` means nothing is selected. */
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
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
  /** Submitted with forms through a hidden input. */
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
 * A custom listbox select following the WAI-ARIA select-only combobox pattern: DOM focus stays on
 * the button and the highlighted option is exposed through `aria-activedescendant`.
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    options: items,
    value: valueProp,
    defaultValue = null,
    onChange,
    placeholder,
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
  const optionId = useCallback((index: number) => `${id}-option-${index}`, [id]);

  const [triggerElement, setTriggerElement] = useState<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const mergedRef = useMergedRef(ref, triggerRef, setTriggerElement);

  const { nodes, options } = useMemo(() => buildNodes(items), [items]);

  const [value, setValue] = useControllableState<string | null>({
    value: valueProp,
    defaultValue,
    onChange: (next) => {
      if (next !== null) onChange?.(next);
    },
  });
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex]! : undefined;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const nextTypeahead = useTypeaheadBuffer();

  const openList = (target: 'selected' | 'first' | 'last' = 'selected') => {
    if (disabled) return;
    const index =
      target === 'last'
        ? lastEnabledIndex(options)
        : target === 'first' || selectedIndex < 0
          ? firstEnabledIndex(options)
          : selectedIndex;
    setActiveIndex(index);
    setOpen(true);
  };

  const closeList = () => setOpen(false);

  const choose = (option: ListboxOption) => {
    setValue(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const { key } = event;

    if (!open) {
      if (key === 'ArrowDown' || key === 'Enter' || key === ' ') {
        event.preventDefault();
        openList();
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        openList();
      } else if (key === 'Home') {
        event.preventDefault();
        openList('first');
      } else if (key === 'End') {
        event.preventDefault();
        openList('last');
      } else if (isPrintable(event)) {
        const match = findByTypeahead(options, nextTypeahead(key), selectedIndex);
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
        if (activeIndex >= 0) choose(options[activeIndex]!);
        else closeList();
        break;
      case 'Escape':
        event.preventDefault();
        closeList();
        break;
      case 'Tab':
        // Tab accepts the highlighted option and lets focus move on.
        if (activeIndex >= 0) setValue(options[activeIndex]!.value);
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

  const message = error && errorMessage ? errorMessage : helperText;
  const hasOptions = options.length > 0;
  const expanded = open && hasOptions;

  return (
    <Field
      baseClass="axon-select"
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
        aria-describedby={joinIds(ariaDescribedBy, Boolean(message) && messageId)}
        disabled={disabled}
        className={inputBoxClassName({
          size,
          variant,
          color,
          error,
          disabled,
          className: cx('axon-select__trigger', open && 'axon-select__trigger--open'),
        })}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={handleKeyDown}
      >
        <span className={cx('axon-select__value', !selected && 'axon-select__value--placeholder')}>
          {selected ? selected.label : (placeholder ?? '')}
        </span>
        <span className="axon-select__chevron" aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </button>
      {name ? <input type="hidden" name={name} value={value ?? ''} disabled={disabled} /> : null}
      <ListboxPopup
        open={open}
        reference={triggerElement}
        onDismiss={closeList}
        listboxId={listboxId}
        optionId={optionId}
        nodes={nodes}
        activeIndex={activeIndex}
        isSelected={(option) => option.value === value}
        onSelect={(option) => choose(option)}
        onHover={setActiveIndex}
        status={hasOptions ? undefined : 'No options'}
        size={size}
        color={color}
        labelledBy={label ? `${id}-label` : undefined}
      />
    </Field>
  );
});
