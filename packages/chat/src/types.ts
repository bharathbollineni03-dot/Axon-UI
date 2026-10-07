/** Who a message is from. `tool` carries the result of a tool the assistant called. */
export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

/**
 * Where a message is in its life: `pending` (an assistant reply that has not started),
 * `streaming` (tokens are arriving), `done`, or `error` (it failed; it may hold partial text).
 */
export type MessageStatus = 'pending' | 'streaming' | 'done' | 'error';

export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error';

export interface TextPart {
  type: 'text';
  /** Markdown, for an assistant message. */
  text: string;
}

export interface CodePart {
  type: 'code';
  code: string;
  /** A highlight.js language name, such as `ts` or `python`. */
  language?: string;
  filename?: string;
}

export interface ImagePart {
  type: 'image';
  url: string;
  alt?: string;
}

export interface FilePart {
  type: 'file';
  name: string;
  url?: string;
  /** Size in bytes. */
  size?: number;
  mimeType?: string;
}

export interface ToolCallPart {
  type: 'tool-call';
  id: string;
  name: string;
  /** The arguments the model passed. Shown as JSON. */
  arguments?: unknown;
  status?: ToolCallStatus;
}

export interface ToolResultPart {
  type: 'tool-result';
  /** The `id` of the tool call this answers. */
  callId: string;
  name?: string;
  result?: unknown;
  isError?: boolean;
}

/** The model's reasoning, shown collapsed. */
export interface ReasoningPart {
  type: 'reasoning';
  text: string;
  /** How long the model thought, in seconds. */
  duration?: number;
}

/** Where part of an answer came from. */
export interface SourcePart {
  type: 'source';
  id?: string;
  title: string;
  url?: string;
  snippet?: string;
}

export type MessagePart =
  | TextPart
  | CodePart
  | ImagePart
  | FilePart
  | ToolCallPart
  | ToolResultPart
  | ReasoningPart
  | SourcePart;

export interface Message<TMetadata = Record<string, unknown>> {
  id: string;
  role: ChatRole;
  /** The message as plain text or Markdown. When `parts` is set, `content` is its text. */
  content: string;
  /** Rich content. When present it is what the bubble shows. */
  parts?: MessagePart[];
  /** Milliseconds since the epoch. */
  createdAt: number;
  status: MessageStatus;
  /** Anything of yours: a model name, token counts, feedback, the files that were attached. */
  metadata?: TMetadata;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  /** Milliseconds since the epoch. */
  updatedAt: number;
  pinned?: boolean;
}

/** The plain text of a message: its text parts joined, or its `content`. */
export function getMessageText(message: Pick<Message, 'content' | 'parts'>): string {
  if (!message.parts?.length) return message.content;
  const text = message.parts
    .filter((part): part is TextPart => part.type === 'text')
    .map((part) => part.text)
    .join('\n\n');
  return text || message.content;
}
