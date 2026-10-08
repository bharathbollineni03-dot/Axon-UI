import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

export type ColorMode = 'light' | 'dark';
export const colorModes: ColorMode[] = ['light', 'dark'];

export interface StoryEntry {
  id: string;
  title: string;
  name: string;
  type: 'story' | 'docs';
}

/** Every story in the built Storybook (documentation pages are not stories). */
export function readStories(): StoryEntry[] {
  const file = path.resolve(__dirname, '../apps/docs/storybook-static/index.json');
  const index = JSON.parse(readFileSync(file, 'utf8')) as { entries: Record<string, StoryEntry> };
  return Object.values(index.entries).filter((entry) => entry.type === 'story');
}

/** Opens one story in Storybook's preview iframe and waits until it has rendered. */
export async function openStory(page: Page, id: string, mode: ColorMode) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:${mode}`);
  await page.waitForSelector('body.sb-show-main', { timeout: 20_000 });
  // The theme decorator sets the mode in an effect; wait for it, and for fonts and layout to settle.
  await page.waitForFunction(
    (expected) => document.documentElement.getAttribute('data-axon-theme') === expected,
    mode,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
}
