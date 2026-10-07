import { axe } from 'jest-axe';

/**
 * Runs axe over a whole document body, for components that render popups or dialogs in a portal.
 *
 *  - `region` is a page-level rule that does not apply to component fragments.
 *  - `aria-command-name` is skipped because floating-ui gives its invisible focus-guard spans
 *    `role="button"` when it detects Safari, and jsdom's user agent claims to be Apple's. Real
 *    Chrome never adds the role; the Storybook runs check the guards in a real browser.
 */
export function axeWithPortal(root: Element) {
  return axe(root, {
    rules: { region: { enabled: false }, 'aria-command-name': { enabled: false } },
  });
}
