/**
 * The element popups should render into. Inside a modal overlay (`[data-axon-overlay]`) that is the
 * overlay itself, so a menu or a select opened from a dialog stacks above the dialog and stays
 * inside its focus trap. Otherwise it is the closest `.axon-root` (so theme variables, including
 * dark mode and custom tokens set by ThemeProvider, still apply), or `<body>` when there is none.
 * Returns `undefined` on the server or without a reference, letting the portal use its default.
 */
export function getPortalRoot(reference: Element | null | undefined): HTMLElement | undefined {
  if (!reference) return undefined;
  return (
    reference.closest<HTMLElement>('[data-axon-overlay]') ??
    reference.closest<HTMLElement>('.axon-root') ??
    undefined
  );
}
