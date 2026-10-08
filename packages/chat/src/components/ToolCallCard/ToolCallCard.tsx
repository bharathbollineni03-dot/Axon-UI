import { forwardRef, type HTMLAttributes } from 'react';
import { Spinner, useControllableState, useId } from '@axonui/core';
import type { ToolCallStatus } from '../../types';
import { AlertIcon, CheckIcon, ChevronRightIcon, ToolIcon } from '../../internal/icons';
import { CodeBlock } from '../CodeBlock/CodeBlock';

export interface ToolCallCardLabels {
  status: Record<ToolCallStatus, string>;
  arguments: string;
  result: string;
  /** The toggle button, given the tool name and whether the details are open. */
  toggle: (name: string, open: boolean) => string;
}

export const defaultToolCallLabels: ToolCallCardLabels = {
  status: { pending: 'Waiting', running: 'Running', success: 'Done', error: 'Failed' },
  arguments: 'Arguments',
  result: 'Result',
  toggle: (name, open) => `${open ? 'Hide' : 'Show'} details of ${name}`,
};

export interface ToolCallCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The tool's name, such as `search_web`. */
  name: string;
  /** What the model passed to the tool. Shown as JSON. */
  arguments?: unknown;
  /** What the tool returned. Shown as JSON (or text, for a string). */
  result?: unknown;
  /** Defaults to `success` or `error` once there is a result, and `pending` before. */
  status?: ToolCallStatus;
  /** Marks the result as an error. */
  isError?: boolean;
  /** Whether the details are shown. Controlled; pair with `onOpenChange`. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  labels?: Partial<ToolCallCardLabels>;
}

const isString = (value: unknown): value is string => typeof value === 'string';

function stringify(value: unknown): string {
  if (isString(value)) return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Shows a tool the assistant called: its name, a status, and (collapsed) the arguments it passed
 * and the result it got back.
 */
export const ToolCallCard = forwardRef<HTMLDivElement, ToolCallCardProps>(function ToolCallCard(
  {
    name,
    arguments: args,
    result,
    status: statusProp,
    isError = false,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    labels: labelsProp,
    id,
    className,
    ...rest
  },
  ref,
) {
  const labels = { ...defaultToolCallLabels, ...labelsProp };
  const status: ToolCallStatus =
    statusProp ?? (result !== undefined ? (isError ? 'error' : 'success') : 'pending');
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const baseId = useId(id, 'axon-tool-call');
  const hasDetails = args !== undefined || result !== undefined;

  return (
    <div
      {...rest}
      ref={ref}
      id={baseId}
      className={['axon-tool-call', `axon-tool-call--${status}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="axon-tool-call__header"
        aria-expanded={hasDetails ? open : undefined}
        aria-controls={hasDetails ? `${baseId}-details` : undefined}
        aria-label={hasDetails ? labels.toggle(name, open) : undefined}
        disabled={!hasDetails}
        onClick={() => setOpen(!open)}
      >
        <ToolIcon className="axon-tool-call__icon" />
        <code className="axon-tool-call__name">{name}</code>
        <span className="axon-tool-call__status">
          {status === 'running' ? (
            <Spinner size="sm" color="inherit" decorative />
          ) : status === 'success' ? (
            <CheckIcon />
          ) : status === 'error' ? (
            <AlertIcon />
          ) : null}
          <span>{labels.status[status]}</span>
        </span>
        {hasDetails ? <ChevronRightIcon className="axon-tool-call__chevron" /> : null}
      </button>
      {hasDetails ? (
        <div id={`${baseId}-details`} className="axon-tool-call__details" hidden={!open}>
          {args !== undefined ? (
            <section className="axon-tool-call__section" aria-label={labels.arguments}>
              <h4 className="axon-tool-call__heading">{labels.arguments}</h4>
              <CodeBlock code={stringify(args)} language={isString(args) ? undefined : 'json'} />
            </section>
          ) : null}
          {result !== undefined ? (
            <section className="axon-tool-call__section" aria-label={labels.result}>
              <h4 className="axon-tool-call__heading">{labels.result}</h4>
              <CodeBlock
                code={stringify(result)}
                language={isString(result) ? undefined : 'json'}
              />
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
