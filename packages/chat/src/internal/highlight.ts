import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

/** The languages that are highlighted out of the box. Others show as plain text. */
const builtIn = {
  bash,
  c,
  cpp,
  csharp,
  css,
  diff,
  go,
  java,
  javascript,
  json,
  kotlin,
  markdown,
  php,
  python,
  ruby,
  rust,
  shell,
  sql,
  swift,
  typescript,
  xml,
  yaml,
};

for (const [name, definition] of Object.entries(builtIn)) {
  hljs.registerLanguage(name, definition);
}

/**
 * Adds a language to the highlighter, for example
 * `registerCodeLanguage('lua', (await import('highlight.js/lib/languages/lua')).default)`.
 */
export function registerCodeLanguage(
  name: string,
  definition: Parameters<typeof hljs.registerLanguage>[1],
): void {
  hljs.registerLanguage(name, definition);
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

export interface HighlightResult {
  /** Markup with `hljs-*` spans. Every character of the code is escaped. */
  html: string;
  /** The language that was used, or `undefined` when it was not recognised. */
  language: string | undefined;
}

/**
 * Highlights `code`. A language the highlighter does not know comes back as escaped plain text,
 * so the result is always safe to put in the page as HTML.
 */
export function highlightCode(code: string, language?: string): HighlightResult {
  const id = resolveLanguageId(language);
  if (id) {
    try {
      const result = hljs.highlight(code, { language: id, ignoreIllegals: true });
      return { html: result.value, language: id };
    } catch {
      // Fall through to plain text.
    }
  }
  return { html: escapeHtml(code), language: undefined };
}

/**
 * The registered language an alias stands for: `ts` and `tsx` are `typescript`, `py` is `python`.
 * highlight.js accepts aliases but does not say which language they resolved to.
 */
function resolveLanguageId(language: string | undefined): string | undefined {
  const name = language?.trim().toLowerCase();
  if (!name) return undefined;
  const definition = hljs.getLanguage(name);
  if (!definition) return undefined;
  return hljs.listLanguages().find((id) => hljs.getLanguage(id) === definition) ?? name;
}
