// Data model and state
export {
  getMessageText,
  type ChatRole,
  type CodePart,
  type Conversation,
  type FilePart,
  type ImagePart,
  type Message,
  type MessagePart,
  type MessageStatus,
  type ReasoningPart,
  type SourcePart,
  type TextPart,
  type ToolCallPart,
  type ToolCallStatus,
  type ToolResultPart,
} from './types';
export {
  useChat,
  type ChatSender,
  type SendContext,
  type SendOptions,
  type UseChatOptions,
  type UseChatReturn,
} from './hooks/useChat';
export {
  useAutoScroll,
  type UseAutoScrollOptions,
  type UseAutoScrollReturn,
} from './hooks/useAutoScroll';
export { useCopyToClipboard } from './hooks/useCopyToClipboard';

// Chat window pieces
export { Markdown, type MarkdownProps } from './components/Markdown/Markdown';
export {
  CodeBlock,
  defaultCodeBlockLabels,
  type CodeBlockLabels,
  type CodeBlockProps,
} from './components/CodeBlock/CodeBlock';
export { highlightCode, registerCodeLanguage, type HighlightResult } from './internal/highlight';
export { StreamingText, type StreamingTextProps } from './components/StreamingText/StreamingText';
export {
  TypingIndicator,
  type TypingIndicatorProps,
} from './components/StreamingText/TypingIndicator';
export {
  ThinkingIndicator,
  defaultThinkingLabels,
  type ThinkingIndicatorLabels,
  type ThinkingIndicatorProps,
} from './components/StreamingText/ThinkingIndicator';
export {
  ToolCallCard,
  defaultToolCallLabels,
  type ToolCallCardLabels,
  type ToolCallCardProps,
} from './components/ToolCallCard/ToolCallCard';
export {
  Citation,
  SourceList,
  type CitationProps,
  type Source,
  type SourceListProps,
} from './components/SourceList/SourceList';
export {
  MessageBubble,
  defaultMessageBubbleLabels,
  type MessageAction,
  type MessageBubbleLabels,
  type MessageBubbleProps,
  type MessageFeedback,
} from './components/MessageBubble/MessageBubble';
export {
  MessageList,
  defaultMessageListLabels,
  type MessageListLabels,
  type MessageListProps,
} from './components/MessageList/MessageList';
export {
  ChatHeader,
  defaultChatHeaderLabels,
  type ChatHeaderLabels,
  type ChatHeaderProps,
} from './components/ChatHeader/ChatHeader';

// Composer
export {
  PromptInput,
  defaultPromptInputLabels,
  type PromptInputLabels,
  type PromptInputProps,
} from './components/PromptInput/PromptInput';
export {
  filterCommands,
  filterMentions,
  findTrigger,
  type Mention,
  type MentionSource,
  type SlashCommand,
} from './components/PromptInput/suggestions';
export {
  AttachmentList,
  defaultAttachmentListLabels,
  type AttachmentListLabels,
  type AttachmentListProps,
} from './components/Attachments/AttachmentList';
export {
  formatFileSize,
  matchesAccept,
  validateFiles,
  type Attachment,
  type AttachmentRejection,
  type AttachmentRejectionReason,
  type FileRules,
} from './components/Attachments/files';
export {
  useAttachments,
  type UseAttachmentsOptions,
  type UseAttachmentsReturn,
} from './components/Attachments/useAttachments';
export {
  SuggestedPrompts,
  type SuggestedPrompt,
  type SuggestedPromptsProps,
} from './components/SuggestedPrompts/SuggestedPrompts';

// The window
export {
  ChatEmptyState,
  type ChatEmptyStateProps,
} from './components/ChatEmptyState/ChatEmptyState';
export {
  ChatErrorState,
  defaultChatErrorStateLabels,
  type ChatErrorStateLabels,
  type ChatErrorStateProps,
} from './components/ChatErrorState/ChatErrorState';
export {
  ChatWindow,
  defaultChatWindowLabels,
  type ChatWindowLabels,
  type ChatWindowProps,
} from './components/ChatWindow/ChatWindow';

// Conversations, models and feedback
export {
  ConversationSidebar,
  defaultConversationSidebarLabels,
  type ConversationSidebarLabelOverrides,
  type ConversationSidebarLabels,
  type ConversationSidebarProps,
} from './components/ConversationSidebar/ConversationSidebar';
export {
  getConversationAge,
  groupConversations,
  matchesConversation,
  type ConversationGroup,
  type ConversationGroupId,
  type ConversationSummary,
} from './components/ConversationSidebar/groupConversations';
export {
  ModelSelector,
  defaultModelSelectorLabels,
  type ChatModel,
  type ModelSelectorLabels,
  type ModelSelectorProps,
} from './components/ModelSelector/ModelSelector';
export {
  FeedbackDialog,
  defaultFeedbackDialogLabels,
  defaultFeedbackReasons,
  type FeedbackDialogLabels,
  type FeedbackDialogProps,
  type FeedbackRating,
  type FeedbackReason,
  type FeedbackValue,
} from './components/FeedbackDialog/FeedbackDialog';
export {
  ShareConversationDialog,
  defaultShareConversationDialogLabels,
  type ShareConversationDialogLabels,
  type ShareConversationDialogProps,
} from './components/ShareConversationDialog/ShareConversationDialog';
export {
  ExportConversation,
  defaultExportConversationLabels,
  type ExportConversationLabels,
  type ExportConversationProps,
} from './components/ExportConversation/ExportConversation';
export {
  defaultRoleLabels,
  downloadFile,
  exportConversation,
  slugify,
  type ExportFormat,
  type ExportOptions,
  type ExportSource,
  type ExportedFile,
} from './components/ExportConversation/serializeConversation';
