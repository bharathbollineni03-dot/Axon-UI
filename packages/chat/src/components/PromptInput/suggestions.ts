import type { ReactNode } from 'react';

/** A command typed after a slash at the start of the message, such as `/summarize`. */
export interface SlashCommand {
  /** What is typed, without the slash. */
  name: string;
  description?: string;
  icon?: ReactNode;
  /** Other words that find this command. */
  keywords?: string[];
  /** Replaces what was typed (`/sum`). Defaults to `/name ` so the user can add arguments. */
  insertText?: string;
  /**
   * Runs when the command is chosen, instead of inserting text. `clear()` empties the box; a
   * command that acts at once (like `/clear`) calls it.
   */
  onSelect?: (api: { clear: () => void; setValue: (value: string) => void }) => void;
}

/** A person or thing that can be mentioned with `@`. */
export interface Mention {
  id: string;
  label: string;
  description?: string;
  avatar?: ReactNode;
}

/** A fixed list, or a function that finds mentions for what was typed (it may be async). */
export type MentionSource = Mention[] | ((query: string) => Mention[] | Promise<Mention[]>);

export type TriggerKind = 'slash' | 'mention';

export interface Trigger {
  kind: TriggerKind;
  /** What has been typed after the `/` or `@`. */
  query: string;
  /** Where the trigger character is, and where the caret is: the range to replace. */
  start: number;
  end: number;
}

/**
 * Finds the slash command or mention being typed at the caret, if any. A slash only counts at the
 * very start of the message, and a mention only after whitespace or at the start, so paths and
 * email addresses in the text are left alone.
 */
export function findTrigger(
  text: string,
  caret: number,
  enabled: { slash: boolean; mention: boolean },
): Trigger | null {
  const before = text.slice(0, caret);
  if (enabled.slash) {
    const match = /^\/(\S*)$/.exec(before);
    if (match) return { kind: 'slash', query: match[1] ?? '', start: 0, end: caret };
  }
  if (enabled.mention) {
    const match = /(?:^|\s)@([^\s@]*)$/.exec(before);
    if (match) {
      const query = match[1] ?? '';
      return { kind: 'mention', query, start: before.length - query.length - 1, end: caret };
    }
  }
  return null;
}

/** Replaces the trigger's text with `replacement`, and says where the caret should go after. */
export function applySuggestion(
  text: string,
  trigger: Pick<Trigger, 'start' | 'end'>,
  replacement: string,
): { text: string; caret: number } {
  const next = text.slice(0, trigger.start) + replacement + text.slice(trigger.end);
  return { text: next, caret: trigger.start + replacement.length };
}

/** The commands that match what was typed: names that start with it first, then the rest. */
export function filterCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return commands;
  const starts: SlashCommand[] = [];
  const contains: SlashCommand[] = [];
  for (const command of commands) {
    const name = command.name.toLowerCase();
    if (name.startsWith(needle)) starts.push(command);
    else if (
      name.includes(needle) ||
      command.description?.toLowerCase().includes(needle) ||
      command.keywords?.some((keyword) => keyword.toLowerCase().includes(needle))
    ) {
      contains.push(command);
    }
  }
  return [...starts, ...contains];
}

/** The mentions in a fixed list that match what was typed. */
export function filterMentions(mentions: Mention[], query: string): Mention[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return mentions;
  const starts: Mention[] = [];
  const contains: Mention[] = [];
  for (const mention of mentions) {
    const label = mention.label.toLowerCase();
    if (label.startsWith(needle)) starts.push(mention);
    else if (label.includes(needle) || mention.description?.toLowerCase().includes(needle)) {
      contains.push(mention);
    }
  }
  return [...starts, ...contains];
}
