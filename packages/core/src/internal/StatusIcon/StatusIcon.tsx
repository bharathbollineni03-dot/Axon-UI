import { AlertCircleIcon, AlertTriangleIcon, CheckCircleIcon, InfoIcon } from '../icons';

/** The four kinds of message `Alert` and the toasts can carry. */
export type Status = 'info' | 'success' | 'warning' | 'danger';

const icons = {
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: AlertTriangleIcon,
  danger: AlertCircleIcon,
} as const;

/** The default icon for a status. Decorative: the message text carries the meaning. */
export function StatusIcon({ status }: { status: Status }) {
  const Icon = icons[status];
  return <Icon />;
}
