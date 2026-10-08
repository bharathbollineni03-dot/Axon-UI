import { expect, test } from '@playwright/test';
import { colorModes, openStory, readStories } from '../storybook';

/**
 * Screenshots of representative stories, in light and dark mode, compared with committed baselines
 * (see CONTRIBUTING.md: baselines are rendered on Linux by the "Update visual baselines" workflow).
 * A story that depends on today's date, random data or the network does not belong here.
 */
const representative = [
  // Core
  'core-button--variants',
  'core-iconbutton--variants',
  'core-textfield--variants',
  'core-checkbox--states',
  'core-switch--states',
  'core-select--grouped',
  'core-slider--steps',
  'core-rating--half-stars',
  'core-multiselect--with-values',
  'layout-card--variants',
  'layout-chip--variants',
  'layout-badge--standalone',
  'layout-divider--with-label',
  'layout-list--playground',
  'navigation-tabs--variants',
  'navigation-accordion--multiple',
  'navigation-breadcrumbs--collapsed',
  'navigation-pagination--variants',
  'navigation-stepper--vertical',
  'navigation-sidebar--playground',
  'navigation-appbar--colored',
  'feedback-alert--statuses',
  'feedback-skeleton--variants',
  'feedback-emptystate--sizes',
  // Forms
  'forms-bindings--all-bindings',
  'forms-formwizard--playground',
  'prebuilt-forms-loginform--playground',
  'prebuilt-forms-registrationform--playground',
  'prebuilt-forms-profileform--existing-profile',
  'prebuilt-forms-otpverificationform--playground',
  // Charts
  'charts-linechart--playground',
  'charts-areachart--stacked',
  'charts-barchart--grouped',
  'charts-combochart--bars-and-a-line-on-two-axes',
  'charts-piechart-and-donutchart--donut',
  'charts-scatterchart--coloured-by-group',
  'charts-radarchart--current-against-target',
  'charts-gauge--with-thresholds',
  'charts-heatmap--categories',
  'charts-sparkline--playground',
  'charts-statcard--playground',
  // Chat
  'chat-messagebubble--assistant',
  'chat-codeblock--playground',
  'chat-markdown--playground',
  'chat-chatwindow--with-history',
  'chat-conversationsidebar--playground',
  'chat-promptinput--playground',
  // Table
  'table-table--striped',
  'table-datagrid--playground',
  'table-datagrid--striped-and-bordered',
  'table-datagrid--pinned-columns',
  'table-datagrid--grouped-with-aggregates',
  // Foundations and the example pages
  'foundations-colors--semantic-tokens',
  'foundations-typography--type-scale',
  'examples-admin-dashboard--page',
  'examples-auth-pages--sign-in',
  'examples-auth-pages--account',
  'examples-ai-chat-app--app',
];

const known = new Set(readStories().map((story) => story.id));
const missing = representative.filter((id) => !known.has(id));

test('every story the visual checks name still exists', () => {
  expect(missing, 'Stories were renamed or removed: update tests/visual/stories.spec.ts').toEqual(
    [],
  );
});

for (const id of representative.filter((candidate) => known.has(candidate))) {
  for (const mode of colorModes) {
    test(`${id} (${mode})`, async ({ page }) => {
      await openStory(page, id, mode);
      // A short pause for charts and fonts; reduced motion is on, so nothing animates.
      await page.waitForTimeout(150);
      await expect(page).toHaveScreenshot(`${id}-${mode}.png`, { fullPage: true });
    });
  }
}
