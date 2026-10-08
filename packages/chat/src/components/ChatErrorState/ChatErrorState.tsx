import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { Alert, Button } from '@axonui/core';

export interface ChatErrorStateLabels {
  title: string;
  /** Used when `error` has no message. */
  fallback: string;
  retry: string;
  dismiss: string;
}

export const defaultChatErrorStateLabels: ChatErrorStateLabels = {
  title: 'Something went wrong',
  fallback: 'The assistant could not answer. Check your connection and try again.',
  retry: 'Try again',
  dismiss: 'Dismiss',
};

export interface ChatErrorStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** The error, or a message. An `Error`'s `message` is shown. */
  error?: Error | string | null;
  /** Shows a retry button. */
  onRetry?: () => void;
  /** Shows a close button on the alert. */
  onDismiss?: () => void;
  /** Extra buttons next to retry. */
  actions?: ReactNode;
  /** Whether the retry button shows a busy state. */
  retrying?: boolean;
  labels?: Partial<ChatErrorStateLabels>;
}

/**
 * A failed chat, with a retry button: an alert (`role="alert"`) with the error message. Use it
 * above the composer, or in place of the conversation when it could not load.
 */
export const ChatErrorState = forwardRef<HTMLDivElement, ChatErrorStateProps>(
  function ChatErrorState(
    {
      error,
      onRetry,
      onDismiss,
      actions,
      retrying = false,
      labels: labelsProp,
      className,
      ...rest
    },
    ref,
  ) {
    const labels = { ...defaultChatErrorStateLabels, ...labelsProp };
    const message = typeof error === 'string' ? error : error?.message;
    return (
      <div {...rest} ref={ref} className={['axon-chat-error', className].filter(Boolean).join(' ')}>
        <Alert
          status="danger"
          title={labels.title}
          onClose={onDismiss}
          closeLabel={labels.dismiss}
          actions={
            onRetry || actions ? (
              <>
                {onRetry ? (
                  <Button
                    size="sm"
                    color="danger"
                    variant="outline"
                    loading={retrying}
                    onClick={onRetry}
                  >
                    {labels.retry}
                  </Button>
                ) : null}
                {actions}
              </>
            ) : undefined
          }
        >
          {message || labels.fallback}
        </Alert>
      </div>
    );
  },
);
