import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { getPortalRoot } from '../../internal/portal';

export interface PortalProps {
  children?: ReactNode;
  /**
   * Where to render the children. By default the closest modal overlay or `.axon-root` around the
   * portal (so theme variables apply), or `<body>` when there is none.
   */
  container?: HTMLElement | null;
  /** Renders the children in place instead of in a portal. */
  disabled?: boolean;
}

/**
 * Renders its children somewhere else in the DOM, outside the clipping and stacking of their
 * parents, while keeping them in the React tree (context, events and refs still work).
 * Nothing renders on the server or on the first client render, so markup always matches.
 */
export function Portal({ children, container, disabled = false }: PortalProps) {
  // A hidden marker tells us where in the DOM we are, to find the right root to portal into.
  const [marker, setMarker] = useState<HTMLSpanElement | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (disabled) return;
    if (container) {
      setTarget(container);
    } else if (marker) {
      setTarget(getPortalRoot(marker) ?? marker.ownerDocument.body);
    }
  }, [disabled, container, marker]);

  if (disabled) return <>{children}</>;

  return (
    <>
      <span hidden ref={setMarker} data-axon-portal="" />
      {target ? createPortal(children, target) : null}
    </>
  );
}
