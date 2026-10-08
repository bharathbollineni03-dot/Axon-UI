import { cloneElement, type ReactElement } from 'react';
import { Button, DropdownMenu, MenuItem } from '@axonui/core';
import { DownloadIcon } from '../../internal/icons';
import {
  downloadFile,
  exportConversation,
  type ExportFormat,
  type ExportOptions,
  type ExportSource,
  type ExportedFile,
} from './serializeConversation';

export interface ExportConversationLabels {
  export: string;
  menu: string;
  markdown: string;
  json: string;
  text: string;
}

export const defaultExportConversationLabels: ExportConversationLabels = {
  export: 'Export',
  menu: 'Export conversation',
  markdown: 'Markdown (.md)',
  json: 'JSON (.json)',
  text: 'Plain text (.txt)',
};

export interface ExportConversationProps {
  /** The conversation to export: a `Conversation`, or `{ title, messages }`. */
  conversation: ExportSource;
  /** Which formats to offer. Defaults to all three. */
  formats?: ExportFormat[];
  options?: ExportOptions;
  /**
   * Receives the finished file. Without it the file is downloaded. With it, you decide what
   * happens to it: save it on a server, open a preview, and so on.
   */
  onExport?: (file: ExportedFile) => void;
  /** The element that opens the menu. Defaults to an "Export" button. */
  trigger?: ReactElement;
  disabled?: boolean;
  labels?: Partial<ExportConversationLabels>;
}

/**
 * A button that opens a menu of export formats for a conversation. It is disabled while there is
 * nothing to export.
 */
export function ExportConversation({
  conversation,
  formats = ['markdown', 'json', 'text'],
  options,
  onExport,
  trigger,
  disabled,
  labels: labelsProp,
}: ExportConversationProps) {
  const labels = { ...defaultExportConversationLabels, ...labelsProp };
  const empty = !conversation.messages.some((message) => message.parts?.length || message.content);
  const isDisabled = disabled || empty;

  const choose = (format: ExportFormat) => {
    const file = exportConversation(conversation, format, options);
    if (onExport) onExport(file);
    else downloadFile(file);
  };

  const anchor = trigger ? (
    cloneElement(trigger as ReactElement<{ disabled?: boolean }>, { disabled: isDisabled })
  ) : (
    <Button variant="outline" startIcon={<DownloadIcon />} disabled={isDisabled}>
      {labels.export}
    </Button>
  );

  return (
    <DropdownMenu trigger={anchor} aria-label={labels.menu}>
      {formats.map((format) => (
        <MenuItem key={format} onClick={() => choose(format)}>
          {labels[format]}
        </MenuItem>
      ))}
    </DropdownMenu>
  );
}
