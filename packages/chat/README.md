# @axonui/chat

Components and hooks for an AI chat interface: a chat window with streaming replies, Markdown and highlighted code, tool calls and sources, a composer with attachments, slash commands and @mentions, a conversation sidebar, and the settings forms around it (model, system prompt, prompt templates, API keys, assistant persona, knowledge upload).

It is **provider-agnostic**. The package never makes a network call, holds an API key or imports a provider SDK. You give `useChat` one function that turns the conversation into a reply, and everything else is UI.

```bash
pnpm add @axonui/chat @axonui/core @axonui/forms @axonui/theme
```

```tsx
import { ThemeProvider } from '@axonui/theme';
import { ChatWindow, useChat } from '@axonui/chat';
import '@axonui/theme/styles.css';
import '@axonui/core/styles.css';
import '@axonui/forms/styles.css'; // only if you use the settings forms
import '@axonui/chat/styles.css';

export function Assistant() {
  const chat = useChat({
    // Return the reply as a string, or stream it as an AsyncIterable<string>
    // (see "Provider adapters" for streaming).
    onSend: async (history, { signal }) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        signal,
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      return (await response.json()).reply;
    },
  });

  return (
    <ThemeProvider>
      <div style={{ height: '40rem' }}>
        <ChatWindow chat={chat} title="Assistant" onNewChat={chat.reset} />
      </div>
    </ThemeProvider>
  );
}
```

`@axonui/chat/styles.css` builds on `@axonui/core/styles.css` and the theme tokens, so load those too.

## `useChat`

```ts
const chat = useChat({ onSend, initialMessages, onFinish, onError });
```

`onSend(history, { signal })` receives the conversation, ending with the message to answer, and returns the reply: a `Promise<string>`, or an `AsyncIterable<string>` of pieces as they arrive. `signal` aborts when the user presses stop; pass it to `fetch` so the request is cancelled too (`stop()` works even if you do not, but the request keeps running).

| Returned                                                   | What it is                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `messages`, `setMessages`                                  | The conversation. A message has `id`, `role`, `content`, optional `parts`, `status`, `metadata`. |
| `input`, `setInput`                                        | The composer's text, if you want to control it.                                                  |
| `send(content?, { parts, metadata })`                      | Sends a message (the current `input` when `content` is omitted).                                 |
| `stop()`                                                   | Stops the reply that is streaming; the text so far is kept.                                      |
| `regenerate(id?)`                                          | Answers again, replacing the last reply (or the one after message `id`).                         |
| `editAndResend(id, content)`                               | Changes an earlier message, drops everything after it and answers again.                         |
| `deleteMessage(id)`, `updateMessage(id, patch)`, `reset()` | Edit the list.                                                                                   |
| `isStreaming`, `error`, `clearError()`                     | State of the current reply.                                                                      |

A message's `status` is `pending` (waiting for the first piece), `streaming`, `done` or `error`. Rich replies use `parts`: `text`, `code`, `image`, `file`, `tool-call`, `tool-result`, `reasoning` and `source`.

## Components

| Group          | Components                                                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Window         | `ChatWindow` (`page`, `embedded` and `floating` modes), `ChatHeader`, `ChatEmptyState`, `ChatErrorState`, `SuggestedPrompts`                                               |
| Messages       | `MessageList` (long threads are virtualized), `MessageBubble` (copy, edit, regenerate, rate, delete), `Markdown`, `CodeBlock`, `ToolCallCard`, `SourceList` and `Citation` |
| Streaming      | `StreamingText`, `TypingIndicator`, `ThinkingIndicator`                                                                                                                    |
| Composer       | `PromptInput` (attachments, slash commands, @mentions, character or token count), `AttachmentList`, `useAttachments`                                                       |
| Conversations  | `ConversationSidebar` (grouped by day, search, rename, pin, delete), `ModelSelector`, `FeedbackDialog`, `ShareConversationDialog`, `ExportConversation`                    |
| Settings forms | `ChatSettingsForm`, `SystemPromptEditor`, `PromptTemplateForm`, `APIKeyForm`, `PersonaForm`, `KnowledgeUploadForm`                                                         |

Every piece works alone. `ChatWindow` is `MessageList` and `PromptInput` in a frame, so if it is not the layout you want, compose the parts yourself.

### A fuller layout

```tsx
<div style={{ display: 'grid', gridTemplateColumns: '18rem 1fr', height: '100vh' }}>
  <ConversationSidebar
    conversations={conversations} // { id, title, updatedAt, pinned? }[]
    activeId={activeId}
    onSelect={setActiveId}
    onNewChat={startNewChat}
    onRename={rename}
    onPin={pin}
    onDelete={remove}
  />
  <ChatWindow
    chat={chat}
    title={active.title}
    modelSelector={<ModelSelector models={models} value={model} onChange={setModel} />}
    headerActions={
      <ExportConversation conversation={{ title: active.title, messages: chat.messages }} />
    }
    onFeedback={(message, rating) => rating === 'down' && openFeedbackFor(message)}
  />
</div>
```

The "Chat app" story in Storybook wires every piece together against a mock backend.

## What is rendered, and how safely

- **Markdown** is rendered with `react-markdown` and GitHub-flavoured extras (tables, task lists, strikethrough). Raw HTML in a reply is **not** rendered: it is shown as text. `javascript:` and other unsafe link targets are dropped, and links to other sites open in a new tab with `rel="noopener noreferrer nofollow"`.
- **Code** is highlighted with `highlight.js` for about twenty common languages and themed with the library's colour tokens, so it follows light and dark mode. Add a language with `registerCodeLanguage('lua', definition)`; anything unknown shows as plain text.
- **Images** in a reply load from whatever URL the model gave (with `referrerPolicy="no-referrer"`). To show only their alt text instead, pass `bubbleProps={{ markdownProps: { allowImages: false } }}` to `ChatWindow` (or `allowImages={false}` to `Markdown`).

## Accessibility

- The conversation is a focusable `role="log"` named "Conversation". It does **not** announce every streamed token. A separate polite live region reads a reply **once, when it is complete**, and reports errors.
- New content scrolls into view only while you are at the bottom; scroll up to read and it lets go, with a "Jump to latest" button.
- Message actions are a roving-tabindex toolbar (one tab stop, arrow keys inside). The composer sends with Enter and Shift+Enter makes a new line; set `composerProps={{ submitKey: 'mod-enter' }}` to send with Ctrl/Cmd+Enter instead. Slash commands and @mentions open a listbox that follows `aria-activedescendant`, so focus stays in the text box.
- The conversation sidebar is a navigation landmark with one tab stop: arrow keys, Home and End move between conversations, F2 renames, Delete deletes. Dialogs trap focus and return it on close.
- The streaming cursor, the typing dots and smooth scrolling respect `prefers-reduced-motion`.

## Provider adapters

`onSend` is the only seam, so a provider needs a small adapter. Storybook (`Chat / Provider adapters`) runs two real ones against a pretend server: an **OpenAI-compatible** chat-completions stream and an **Anthropic-compatible** messages stream. The code is in [`src/stories/streamingAdapters.ts`](src/stories/streamingAdapters.ts) with tests; copy what you need. It is about 100 lines: build the request from `history`, read the response as server-sent events, `yield` the text pieces.

```ts
const onSend = createOpenAICompatibleSender({
  url: '/api/chat', // YOUR server
  model: 'your-model',
  system: 'You are a helpful assistant.',
});
```

> **Keep API keys on your server.** Point the adapter at an endpoint of your own that adds the key and forwards the request. A key in browser code can be read by anyone who opens the page. If users bring their own key, `APIKeyForm` collects it, but save it server-side; do not keep it in `localStorage`.

## Settings forms

Built on [`@axonui/forms`](../forms/README.md), so they validate with zod, show server errors on the field they name, and can be translated and extended in the same way. None of them saves anything: each hands values to your `onSubmit`.

```tsx
<ChatSettingsForm
  models={models}
  defaultValues={{ model: 'fast', temperature: 0.7 }}
  onSubmit={async (settings) => {
    await save(settings); // { model, temperature, topP, maxTokens, stream }
  }}
/>
```

| Form                  | Submits                                                                             | Notes                                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `ChatSettingsForm`    | `{ model, temperature, topP, maxTokens, stream }`                                   | Sliders for temperature and top P, a number field for reply length, a streaming switch, "Reset to defaults".                 |
| `SystemPromptEditor`  | `{ prompt, presetId }`                                                              | Pick a preset to fill the box, save the text as a new preset, delete presets. `presetId` is the preset the text matches.     |
| `PromptTemplateForm`  | `{ values, prompt }`                                                                | Each `{{variable}}` in a template becomes a field, with a live preview. Server errors name variables, not field ids.         |
| `APIKeyForm`          | `{ provider, apiKey, baseUrl }`                                                     | Masked key that is never prefilled, optional while one is saved, checks key prefixes, "Test connection" through your server. |
| `PersonaForm`         | name, avatar, description, tone, greeting, instructions, `starterPrompts: string[]` | Starter prompts are one per line in the box and a list in the result.                                                        |
| `KnowledgeUploadForm` | `{ files }`                                                                         | File picker with limits and a list of documents with status: uploading (progress), processing, ready or failed, with retry.  |

Each form exports its schema factory (`createChatSettingsSchema()` and so on) for other limits or translated messages, its `default…Labels` for translation, and takes a `schema` prop to replace validation.

## Theming

Everything uses the `--axon-*` tokens from `@axonui/theme`; there is nothing chat-specific to configure. Override a token on any ancestor to restyle a part of the app. Class names are stable and BEM-style (`axon-message-bubble`, `axon-prompt-input__textarea`) if you need a hook.

## Using it with a framework

The components are client components (they use state and effects). In Next.js's App Router, import them from a file that starts with `"use client"`, or wrap them in one. Nothing reads `window` or `document` while rendering, only in effects and event handlers, so they are safe to render on the server.
