import {
  getMessageText,
  type ChatRole,
  type Message,
  type MessagePart,
  type SourcePart,
} from '../../types';
import { formatFileSize } from '../Attachments/files';

export type ExportFormat = 'markdown' | 'json' | 'text';

/** What can be exported: a `Conversation`, or just a title and its messages. */
export interface ExportSource {
  id?: string;
  title?: string;
  messages: Message[];
}

export interface ExportOptions {
  /** Overrides the source's title, which is also the file's name. */
  title?: string;
  /** Shows when each message was sent (in UTC). Defaults to true. */
  includeTimestamps?: boolean;
  /** Includes the model's reasoning in Markdown and text. Defaults to false. JSON always has it. */
  includeReasoning?: boolean;
  /** Includes system messages in Markdown and text. Defaults to false. JSON always has them. */
  includeSystem?: boolean;
  /** Names for each role. Defaults to "You", "Assistant", "System" and "Tool". */
  roleLabels?: Partial<Record<ChatRole, string>>;
  /** Used for the export time. Defaults to `Date.now`. */
  now?: () => number;
}

export interface ExportedFile {
  format: ExportFormat;
  filename: string;
  mimeType: string;
  content: string;
}

export const defaultRoleLabels: Record<ChatRole, string> = {
  user: 'You',
  assistant: 'Assistant',
  system: 'System',
  tool: 'Tool',
};

const FORMATS: Record<ExportFormat, { extension: string; mimeType: string }> = {
  markdown: { extension: 'md', mimeType: 'text/markdown' },
  json: { extension: 'json', mimeType: 'application/json' },
  text: { extension: 'txt', mimeType: 'text/plain' },
};

/** Turns a title into something safe to use as a file name. */
export function slugify(title: string, maxLength = 60): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  return slug;
}

/** `2025-06-15 14:00 UTC`: the same text in every time zone. */
function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/** A code fence long enough that backticks inside the code cannot end it early. */
function fence(code: string, language = ''): string {
  const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map((run) => run.length));
  const marks = '`'.repeat(Math.max(3, longest + 1));
  return `${marks}${language}\n${code.replace(/\n$/, '')}\n${marks}`;
}

function inlineCode(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const marks = '`'.repeat(longest + 1);
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
  return `${marks}${pad}${text}${pad}${marks}`;
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function isEmpty(message: Message): boolean {
  return !message.parts?.length && !message.content.trim();
}

function visibleMessages(source: ExportSource, options: ExportOptions): Message[] {
  return source.messages.filter(
    (message) => !isEmpty(message) && (options.includeSystem || message.role !== 'system'),
  );
}

function sourceLine(source: SourcePart, index: number): string {
  const name = source.url ? `[${source.title}](${source.url})` : source.title;
  return `${index + 1}. ${name}${source.snippet ? `: ${source.snippet}` : ''}`;
}

function partToMarkdown(part: MessagePart, options: ExportOptions): string | null {
  switch (part.type) {
    case 'text':
      return part.text;
    case 'code':
      return `${part.filename ? `**${part.filename}**\n\n` : ''}${fence(part.code, part.language)}`;
    case 'image':
      return `![${part.alt ?? ''}](${part.url})`;
    case 'file': {
      const name = part.url ? `[${part.name}](${part.url})` : part.name;
      return `Attachment: ${name}${part.size !== undefined ? ` (${formatFileSize(part.size)})` : ''}`;
    }
    case 'tool-call':
      return `**Tool call:** ${inlineCode(part.name)}${
        part.arguments === undefined ? '' : `\n\n${fence(stringify(part.arguments), 'json')}`
      }`;
    case 'tool-result':
      return `**Tool result${part.isError ? ' (error)' : ''}:**${
        part.result === undefined ? '' : `\n\n${fence(stringify(part.result))}`
      }`;
    case 'reasoning':
      return options.includeReasoning
        ? `> **Reasoning**\n>\n${part.text
            .split('\n')
            .map((line) => `> ${line}`.trimEnd())
            .join('\n')}`
        : null;
    case 'source':
      return null;
  }
}

function messageToMarkdown(
  message: Message,
  options: ExportOptions,
  labels: Record<ChatRole, string>,
) {
  const blocks: string[] = [`## ${labels[message.role]}`];
  if (options.includeTimestamps !== false) {
    const stamp = formatTimestamp(message.createdAt);
    if (stamp) blocks.push(`_${stamp}_`);
  }

  if (message.parts?.length) {
    for (const part of message.parts) {
      const block = partToMarkdown(part, options);
      if (block) blocks.push(block);
    }
    const sources = message.parts.filter((part): part is SourcePart => part.type === 'source');
    if (sources.length) blocks.push(`**Sources**\n\n${sources.map(sourceLine).join('\n')}`);
  } else {
    blocks.push(message.content);
  }
  return blocks.join('\n\n');
}

function partToText(part: MessagePart, options: ExportOptions): string | null {
  switch (part.type) {
    case 'text':
      return part.text;
    case 'code':
      return part.code;
    case 'image':
      return `[Image: ${part.alt || part.url}]`;
    case 'file':
      return `[Attachment: ${part.name}]`;
    case 'tool-call':
      return `[Tool call: ${part.name}]`;
    case 'tool-result':
      return `[Tool result${part.isError ? ' (error)' : ''}]`;
    case 'reasoning':
      return options.includeReasoning ? `[Reasoning]\n${part.text}` : null;
    case 'source':
      return `[Source: ${part.url ? `${part.title} (${part.url})` : part.title}]`;
  }
}

function messageToText(message: Message, options: ExportOptions, labels: Record<ChatRole, string>) {
  const stamp = options.includeTimestamps !== false ? formatTimestamp(message.createdAt) : '';
  const heading = stamp ? `${labels[message.role]} (${stamp}):` : `${labels[message.role]}:`;
  const body = message.parts?.length
    ? message.parts
        .map((part) => partToText(part, options))
        .filter((text): text is string => Boolean(text))
        .join('\n\n')
    : getMessageText(message);
  return `${heading}\n${body}`;
}

/**
 * Turns a conversation into a file's contents: Markdown (readable, with code fences, tool calls
 * and sources), plain text, or JSON (lossless: every part and the metadata). Pure; nothing is
 * downloaded until you pass the result to `downloadFile`.
 */
export function exportConversation(
  source: ExportSource,
  format: ExportFormat,
  options: ExportOptions = {},
): ExportedFile {
  const title = (options.title ?? source.title ?? '').trim();
  const labels = { ...defaultRoleLabels, ...options.roleLabels };
  const { extension, mimeType } = FORMATS[format];
  const filename = `${slugify(title) || 'conversation'}.${extension}`;
  const exportedAt = (options.now ?? Date.now)();
  let content: string;

  if (format === 'json') {
    content = JSON.stringify(
      {
        id: source.id,
        title: title || undefined,
        exportedAt: new Date(exportedAt).toISOString(),
        messages: source.messages.filter((message) => !isEmpty(message)),
      },
      null,
      2,
    );
  } else {
    const messages = visibleMessages(source, options);
    if (format === 'markdown') {
      const header = title ? `# ${title}\n\n` : '';
      content = `${header}${messages
        .map((message) => messageToMarkdown(message, options, labels))
        .join('\n\n')}\n`;
    } else {
      const header = title ? `${title}\n${'='.repeat(Math.min(title.length, 72))}\n\n` : '';
      content = `${header}${messages
        .map((message) => messageToText(message, options, labels))
        .join('\n\n')}\n`;
    }
  }

  return { format, filename, mimeType, content };
}

/**
 * Saves a file from the browser. Returns false where that is not possible (no DOM, or no
 * `URL.createObjectURL`), so you can fall back to showing the text.
 */
export function downloadFile(file: Pick<ExportedFile, 'filename' | 'mimeType' | 'content'>) {
  if (
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false;
  }
  const blob = new Blob([file.content], { type: `${file.mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke after the browser has started the download.
  setTimeout(() => URL.revokeObjectURL?.(url), 0);
  return true;
}
