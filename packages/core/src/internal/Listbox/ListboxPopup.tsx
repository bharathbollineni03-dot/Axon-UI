import { useEffect, useRef, type ReactNode } from 'react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  size as sizeMiddleware,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { getPortalRoot } from '../portal';
import type { ListboxNode, ListboxOption, OptionNode } from './options';

export interface ListboxPopupProps {
  open: boolean;
  /** The element the popup is anchored to (the trigger, or the whole input box). */
  reference: HTMLElement | null;
  /** Called on an outside press. Escape is handled by the owning component. */
  onDismiss: () => void;
  listboxId: string;
  optionId: (index: number) => string;
  nodes: ListboxNode[];
  /** Index of the active (keyboard-highlighted) option, or -1. */
  activeIndex: number;
  isSelected: (option: ListboxOption) => boolean;
  /** Shows the option as partially selected (used by "select all"). */
  isMixed?: (option: ListboxOption) => boolean;
  onSelect: (option: ListboxOption, index: number) => void;
  onHover: (index: number) => void;
  /** Shows a checkbox indicator and sets `aria-multiselectable`. */
  multiple?: boolean;
  /** Custom option label, e.g. with highlighted matches. */
  renderLabel?: (option: ListboxOption) => ReactNode;
  /** Text under the list: "Loading...", "No options", an error, ... Announced politely. */
  status?: ReactNode;
  loading?: boolean;
  size: AxonSize;
  color: AxonColor;
  /** Id of the element labelling the listbox. */
  labelledBy?: string;
}

const CheckIcon = () => (
  <svg
    viewBox="0 0 16 16"
    className="axon-listbox__check-icon"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3.5 8.5 6.5 11.5 12.5 5" />
  </svg>
);

const DashIcon = () => (
  <svg
    viewBox="0 0 16 16"
    className="axon-listbox__check-icon"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M4 8h8" />
  </svg>
);

/**
 * The floating list shared by Select, MultiSelect and Autocomplete. Focus never moves into it:
 * the owner keeps DOM focus on its combobox and points `aria-activedescendant` at the active option.
 */
export function ListboxPopup({
  open,
  reference,
  onDismiss,
  listboxId,
  optionId,
  nodes,
  activeIndex,
  isSelected,
  isMixed,
  onSelect,
  onHover,
  multiple = false,
  renderLabel,
  status,
  loading = false,
  size,
  color,
  labelledBy,
}: ListboxPopupProps) {
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (next) => {
      if (!next) onDismiss();
    },
    elements: { reference },
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      sizeMiddleware({
        padding: 8,
        apply({ rects, elements, availableHeight }) {
          Object.assign(elements.floating.style, {
            minWidth: `${rects.reference.width}px`,
            maxHeight: `${Math.max(120, Math.min(availableHeight, 320))}px`,
          });
        },
      }),
    ],
  });

  const dismiss = useDismiss(context, {
    escapeKey: false,
    // Presses on the trigger are handled by the trigger itself (it toggles the list).
    outsidePress: (event) => !(reference && reference.contains(event.target as Node)),
  });
  const { getFloatingProps } = useInteractions([dismiss]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current?.ownerDocument
      .getElementById(optionId(activeIndex))
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex, optionId]);

  if (!open) return null;

  const renderOption = ({ option, index }: OptionNode) => {
    const selected = isSelected(option);
    const mixed = !selected && (isMixed?.(option) ?? false);
    return (
      // Focus stays on the combobox, so options are pointer targets only; keyboard users act on
      // them through the combobox (aria-activedescendant).
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
      <div
        key={option.value}
        id={optionId(index)}
        role="option"
        aria-selected={selected}
        aria-disabled={option.disabled || undefined}
        className={cx(
          'axon-listbox__option',
          index === activeIndex && 'axon-listbox__option--active',
          selected && 'axon-listbox__option--selected',
          option.disabled && 'axon-listbox__option--disabled',
        )}
        onClick={() => {
          if (!option.disabled) onSelect(option, index);
        }}
        onMouseMove={() => {
          if (!option.disabled && index !== activeIndex) onHover(index);
        }}
      >
        {multiple ? (
          <span
            className={cx('axon-listbox__check', (selected || mixed) && 'axon-listbox__check--on')}
            aria-hidden="true"
          >
            {mixed ? <DashIcon /> : <CheckIcon />}
          </span>
        ) : null}
        <span className="axon-listbox__text">
          <span className="axon-listbox__label">
            {renderLabel ? renderLabel(option) : option.label}
          </span>
          {option.description ? (
            <span className="axon-listbox__description">{option.description}</span>
          ) : null}
        </span>
        {!multiple && selected ? (
          <span className="axon-listbox__selected-mark" aria-hidden="true">
            <CheckIcon />
          </span>
        ) : null}
      </div>
    );
  };

  const hasOptions = nodes.length > 0;

  return (
    <FloatingPortal root={getPortalRoot(reference)}>
      {/* The handler only stops the popup from taking focus from the combobox. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        {...getFloatingProps()}
        ref={refs.setFloating}
        style={floatingStyles}
        className={cx('axon-listbox', `axon-listbox--${size}`, `axon-listbox--${color}`)}
        // Keep focus on the combobox when the popup is pressed or scrolled.
        onMouseDown={(event) => event.preventDefault()}
      >
        {hasOptions ? (
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            aria-labelledby={labelledBy}
            aria-busy={loading || undefined}
            className="axon-listbox__list"
          >
            {nodes.map((node) =>
              node.kind === 'option' ? (
                renderOption(node)
              ) : (
                <div
                  key={node.key}
                  role="group"
                  aria-labelledby={`${listboxId}-group-${node.key}`}
                  className="axon-listbox__group"
                >
                  <div
                    id={`${listboxId}-group-${node.key}`}
                    role="presentation"
                    className="axon-listbox__group-label"
                  >
                    {node.label}
                  </div>
                  {node.options.map(renderOption)}
                </div>
              ),
            )}
          </div>
        ) : null}
        {status ? (
          <div role="status" className="axon-listbox__status">
            {status}
          </div>
        ) : null}
      </div>
    </FloatingPortal>
  );
}
