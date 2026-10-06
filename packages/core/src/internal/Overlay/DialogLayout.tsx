import { useState, type ReactNode } from 'react';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { CloseIcon } from '../icons';
import { IconButton } from '../../components/IconButton';

/**
 * Whether an element's content is taller than the element, so it scrolls. Re-checked when the
 * element resizes or its content changes.
 */
function useOverflowing<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  useIsomorphicLayoutEffect(() => {
    if (!element) return undefined;
    const check = () => setOverflowing(element.scrollHeight > element.clientHeight + 1);
    check();
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(check);
    resize?.observe(element);
    const mutation =
      typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(check);
    mutation?.observe(element, { childList: true, subtree: true, characterData: true });
    return () => {
      resize?.disconnect();
      mutation?.disconnect();
    };
  }, [element]);
  return [setElement, overflowing] as const;
}

export type DialogTitleTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface DialogLayoutProps {
  title?: ReactNode;
  titleAs?: DialogTitleTag;
  titleId: string;
  description?: ReactNode;
  descriptionId: string;
  footer?: ReactNode;
  showCloseButton: boolean;
  closeLabel: string;
  onCloseClick: () => void;
  children?: ReactNode;
}

/** The header, body and footer shared by `Modal` and `Drawer`. */
export function DialogLayout({
  title,
  titleAs: Title = 'h2',
  titleId,
  description,
  descriptionId,
  footer,
  showCloseButton,
  closeLabel,
  onCloseClick,
  children,
}: DialogLayoutProps) {
  const [bodyRef, scrollable] = useOverflowing<HTMLDivElement>();
  return (
    <>
      {title || showCloseButton ? (
        <div className="axon-overlay__header">
          {title ? (
            <Title id={titleId} className="axon-overlay__title">
              {title}
            </Title>
          ) : (
            <span className="axon-overlay__title" />
          )}
          {showCloseButton ? (
            <IconButton aria-label={closeLabel} size="sm" onClick={onCloseClick}>
              <CloseIcon />
            </IconButton>
          ) : null}
        </div>
      ) : null}
      {description ? (
        <p id={descriptionId} className="axon-overlay__description">
          {description}
        </p>
      ) : null}
      {/* A scrolling region must be reachable by keyboard, or its overflow cannot be read. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div ref={bodyRef} tabIndex={scrollable ? 0 : undefined} className="axon-overlay__body">
        {children}
      </div>
      {footer ? <div className="axon-overlay__footer">{footer}</div> : null}
    </>
  );
}
