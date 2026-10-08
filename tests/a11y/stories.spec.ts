import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { colorModes, openStory, readStories } from '../storybook';
import { exemptions } from './exemptions';

/**
 * Every story, in light and dark mode, must have no axe violations (WCAG 2.2 A and AA, plus axe's
 * best practices), colour contrast included. A story that shows a problem on purpose is listed in
 * ./exemptions.ts with the reason.
 */

// These rules look at the whole page, which in a component story is just a frame around the example.
const pageLevelRules = [
  'region',
  'landmark-one-main',
  'page-has-heading-one',
  'bypass',
  'document-title',
  'html-has-lang',
  'landmark-unique',
];

for (const story of readStories()) {
  for (const mode of colorModes) {
    test(`${story.title} / ${story.name} (${mode})`, async ({ page }) => {
      // axe's colour-contrast check is slow on a dense grid, and slower still with every worker busy.
      test.setTimeout(90_000);
      await openStory(page, story.id, mode);

      const exempt = exemptions[story.id] ?? [];
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .disableRules([...pageLevelRules, ...exempt])
        .analyze();

      const report = results.violations.map((violation) => {
        const nodes = violation.nodes
          .slice(0, 3)
          .map(
            (node) =>
              `    ${node.target.join(' ')}\n      ${node.failureSummary?.split('\n').slice(0, 3).join(' ')}`,
          )
          .join('\n');
        return `${violation.id} (${violation.impact}): ${violation.help}\n${nodes}`;
      });
      expect(report, report.join('\n')).toEqual([]);
    });
  }
}
