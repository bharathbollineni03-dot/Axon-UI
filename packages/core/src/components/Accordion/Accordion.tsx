import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import { useMergedRef } from '../../utils/mergeRefs';
import { useControllableState } from '../../hooks/useControllableState';
import { useId } from '../../hooks/useId';
import { ChevronDownIcon } from '../../internal/icons';

interface AccordionContextValue {
  value: string[];
  toggle: (item: string) => void;
  baseId: string;
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

const itemId = (baseId: string, value: string, part: 'trigger' | 'panel') =>
  `${baseId}-${part}-${encodeURIComponent(value)}`;

const EMPTY: string[] = [];

export interface AccordionProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** `single` keeps one item open at a time; `multiple` lets any number be open. */
  type?: 'single' | 'multiple';
  /** For `single`: whether the open item can be closed again. Defaults to `true`. */
  collapsible?: boolean;
  /** The values of the open items. Controlled. */
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  /** Heading level used for every item's title, so the accordion fits the page outline. Defaults to 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  variant?: 'outlined' | 'flush';
  children?: ReactNode;
}

/** A stack of collapsible sections following the WAI-ARIA accordion pattern. */
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  {
    type = 'single',
    collapsible = true,
    value: valueProp,
    defaultValue = EMPTY,
    onChange,
    headingLevel = 3,
    variant = 'outlined',
    className,
    id,
    children,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const baseId = useId(id, 'axon-accordion');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRef(ref, rootRef);
  const [value, setValue] = useControllableState<string[]>({
    value: valueProp,
    defaultValue,
    onChange,
  });

  const toggle = useCallback(
    (item: string) => {
      setValue((current) => {
        const open = current.includes(item);
        if (type === 'multiple') {
          return open ? current.filter((v) => v !== item) : [...current, item];
        }
        if (open) return collapsible ? [] : current;
        return [item];
      });
    },
    [setValue, type, collapsible],
  );

  const context = useMemo(
    () => ({ value, toggle, baseId, headingLevel }),
    [value, toggle, baseId, headingLevel],
  );

  // Up/Down/Home/End move focus between the item headers (optional in the pattern, but expected).
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const triggers = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>(
        '[data-axon-accordion-trigger]:not(:disabled)',
      ) ?? [],
    );
    const current = triggers.indexOf(event.target as HTMLElement);
    if (current === -1) return;
    let target: number;
    switch (event.key) {
      case 'ArrowDown':
        target = (current + 1) % triggers.length;
        break;
      case 'ArrowUp':
        target = (current - 1 + triggers.length) % triggers.length;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = triggers.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    triggers[target]!.focus();
  };

  return (
    <AccordionContext.Provider value={context}>
      {/* The handler only moves focus between the headers (native buttons) that receive the keys. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        {...rest}
        ref={mergedRef}
        id={id}
        className={cx('axon-accordion', `axon-accordion--${variant}`, className)}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
});

export interface AccordionItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Identifies the item in the accordion's `value`. */
  value: string;
  /** The header text. */
  title: ReactNode;
  /** Shown under the title in secondary text. */
  subtitle?: ReactNode;
  /** Shown before the title. Decorative. */
  icon?: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(function AccordionItem(
  { value: itemValue, title, subtitle, icon, disabled = false, className, children, ...rest },
  ref,
) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('AccordionItem must be used inside <Accordion>.');
  const { value, toggle, baseId, headingLevel } = context;
  const open = value.includes(itemValue);
  const Heading = `h${headingLevel}` as const;
  const triggerId = itemId(baseId, itemValue, 'trigger');
  const panelId = itemId(baseId, itemValue, 'panel');

  return (
    <div
      {...rest}
      ref={ref}
      className={cx('axon-accordion__item', open && 'axon-accordion__item--open', className)}
    >
      <Heading className="axon-accordion__heading">
        <button
          type="button"
          id={triggerId}
          data-axon-accordion-trigger=""
          aria-expanded={open}
          aria-controls={panelId}
          disabled={disabled}
          className="axon-accordion__trigger"
          onClick={() => toggle(itemValue)}
        >
          {icon ? (
            <span className="axon-accordion__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <span className="axon-accordion__title">
            <span>{title}</span>
            {subtitle ? <span className="axon-accordion__subtitle">{subtitle}</span> : null}
          </span>
          <span className="axon-accordion__chevron" aria-hidden="true">
            <ChevronDownIcon />
          </span>
        </button>
      </Heading>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!open}
        className="axon-accordion__panel"
      >
        <div className="axon-accordion__content">{children}</div>
      </div>
    </div>
  );
});
