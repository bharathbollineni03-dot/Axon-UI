import { useEffect, useRef, type ReactNode } from 'react';

export interface SuggestionItem {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
}

interface SuggestionMenuProps {
  id: string;
  items: SuggestionItem[];
  activeIndex: number;
  label: string;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
}

/** The id of one option, which the text box points at with `aria-activedescendant`. */
export const suggestionOptionId = (menuId: string, index: number) => `${menuId}-option-${index}`;

/** A listbox of suggestions above the text box. Focus stays in the box; this only shows and picks. */
export function SuggestionMenu({
  id,
  items,
  activeIndex,
  label,
  onSelect,
  onHover,
}: SuggestionMenuProps) {
  const activeRef = useRef<HTMLLIElement>(null);

  // Keep the highlighted option in view when the arrow keys move past the visible ones.
  useEffect(() => {
    const element = activeRef.current;
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <ul id={id} role="listbox" aria-label={label} className="axon-suggestions">
      {items.map((item, index) => {
        const active = index === activeIndex;
        return (
          // Keyboard selection happens on the text box (the options are never focused), so this
          // click handler is only the pointer's way to the same action.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <li
            key={item.id}
            id={suggestionOptionId(id, index)}
            ref={active ? activeRef : undefined}
            role="option"
            aria-selected={active}
            className={['axon-suggestions__option', active && 'axon-suggestions__option--active']
              .filter(Boolean)
              .join(' ')}
            // Pressing an option must not take focus from the text box, or the menu would close.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(index)}
            onMouseMove={() => {
              if (!active) onHover(index);
            }}
          >
            {item.icon ? (
              <span className="axon-suggestions__icon" aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            <span className="axon-suggestions__text">
              <span className="axon-suggestions__label">{item.label}</span>
              {item.description ? (
                <span className="axon-suggestions__description">{item.description}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
