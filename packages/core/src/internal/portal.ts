/**
 * The element popups should render into: the closest `.axon-root` (so theme variables, including
 * dark mode and custom tokens set by ThemeProvider, still apply), or `<body>` when there is none.
 * Returns `undefined` on the server or without a reference, letting the portal use its default.
 */
export function getPortalRoot(reference: Element | null | undefined): HTMLElement | undefined {
  if (!reference) return undefined;
  return reference.closest<HTMLElement>('.axon-root') ?? undefined;
}
