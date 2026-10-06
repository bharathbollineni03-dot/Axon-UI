import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cx } from '../../utils/cx';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import {
  firstEnabledIndex,
  lastEnabledIndex,
  nextEnabledIndex,
  type ListboxOption,
} from '../../internal/Listbox/options';

export interface TimeColumnProps {
  id: string;
  label: string;
  options: ListboxOption[];
  /** The selected option's value, or `null`. */
  selected: string | null;
  onSelect: (value: string) => void;
  /** Called when the user presses Enter (confirm). */
  onConfirm: () => void;
  /** Moves DOM focus here on mount. */
  focusOnMount?: boolean;
}

/**
 * One scrollable column of a time picker (hours, minutes or AM/PM): a `listbox` that keeps focus
 * and exposes the active option through `aria-activedescendant`. Moving selects, like a native
 * time spinner.
 */
export function TimeColumn({
  id,
  label,
  options,
  selected,
  onSelect,
  onConfirm,
  focusOnMount,
}: TimeColumnProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndex = options.findIndex((option) => option.value === selected);
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);

  // Follow the selection when it changes from elsewhere (typing, another column, "Now").
  useEffect(() => {
    if (selectedIndex >= 0) setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  useIsomorphicLayoutEffect(() => {
    if (focusOnMount) listRef.current?.focus();
  }, [focusOnMount]);

  useEffect(() => {
    listRef.current?.ownerDocument
      .getElementById(`${id}-option-${activeIndex}`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [id, activeIndex]);

  const move = (index: number) => {
    if (index < 0) return;
    setActiveIndex(index);
    onSelect(options[index]!.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        move(nextEnabledIndex(options, activeIndex, 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(nextEnabledIndex(options, activeIndex, -1));
        break;
      case 'Home':
        event.preventDefault();
        move(firstEnabledIndex(options));
        break;
      case 'End':
        event.preventDefault();
        move(lastEnabledIndex(options));
        break;
      case 'Enter':
        event.preventDefault();
        onConfirm();
        break;
      case ' ':
        event.preventDefault();
        if (!options[activeIndex]?.disabled) onSelect(options[activeIndex]!.value);
        break;
    }
  };

  return (
    // The column is a focusable listbox; options are pointer targets and keyboard users act on
    // them through the listbox (aria-activedescendant).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={listRef}
      id={id}
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={`${id}-option-${activeIndex}`}
      className="axon-time-list__column"
      onKeyDown={handleKeyDown}
    >
      {options.map((option, index) => (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
        <div
          key={option.value}
          id={`${id}-option-${index}`}
          role="option"
          aria-selected={option.value === selected}
          aria-disabled={option.disabled || undefined}
          className={cx(
            'axon-time-list__option',
            index === activeIndex && 'axon-time-list__option--active',
            option.value === selected && 'axon-time-list__option--selected',
            option.disabled && 'axon-time-list__option--disabled',
          )}
          onClick={() => {
            if (option.disabled) return;
            setActiveIndex(index);
            onSelect(option.value);
          }}
        >
          {option.label}
        </div>
      ))}
    </div>
  );
}
