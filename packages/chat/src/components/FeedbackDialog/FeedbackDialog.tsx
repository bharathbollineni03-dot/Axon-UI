import { useState, type FormEvent, type ReactNode } from 'react';
import { Alert, Button, Chip, Modal, RadioGroup, TextArea } from '@axonui/core';
import { ThumbsDownIcon, ThumbsUpIcon } from '../../internal/icons';

export type FeedbackRating = 'up' | 'down';

export interface FeedbackValue {
  rating: FeedbackRating;
  /** The ids of the reasons chosen. */
  reasons: string[];
  comment: string;
}

export interface FeedbackReason {
  id: string;
  label: string;
}

export interface FeedbackDialogLabels {
  title: string;
  description: string;
  rating: string;
  up: string;
  down: string;
  reasons: string;
  comment: string;
  commentPlaceholder: string;
  commentRequired: string;
  ratingRequired: string;
  submit: string;
  cancel: string;
  submitError: string;
}

export const defaultFeedbackDialogLabels: FeedbackDialogLabels = {
  title: 'Give feedback',
  description: 'Tell us how this response was. It helps make answers better.',
  rating: 'How was this response?',
  up: 'Good response',
  down: 'Bad response',
  reasons: 'What stood out?',
  comment: 'Anything else? (optional)',
  commentPlaceholder: 'Add details',
  commentRequired: 'Add a few words about what went wrong.',
  ratingRequired: 'Choose good or bad response.',
  submit: 'Send feedback',
  cancel: 'Cancel',
  submitError: 'Your feedback could not be sent. Try again.',
};

export const defaultFeedbackReasons: Record<FeedbackRating, FeedbackReason[]> = {
  up: [
    { id: 'accurate', label: 'Accurate' },
    { id: 'helpful', label: 'Helpful' },
    { id: 'clear', label: 'Clear and well written' },
    { id: 'creative', label: 'Creative' },
  ],
  down: [
    { id: 'inaccurate', label: 'Not accurate' },
    { id: 'unhelpful', label: 'Not helpful' },
    { id: 'instructions', label: 'Did not follow instructions' },
    { id: 'harmful', label: 'Unsafe or offensive' },
    { id: 'verbose', label: 'Too long or off topic' },
  ],
};

export interface FeedbackDialogProps {
  open: boolean;
  /** The dialog asked to close: Cancel, Esc, the close button or a backdrop press. */
  onClose: () => void;
  /**
   * Called with the feedback. If it returns a promise the dialog waits for it (the buttons show a
   * busy state) and shows an error if it rejects. The dialog never closes itself: close it from
   * here, or once the promise resolves.
   */
  onSubmit: (feedback: FeedbackValue) => void | Promise<unknown>;
  /** Which thumb to start on, such as the one that opened the dialog. */
  defaultRating?: FeedbackRating | null;
  /** The reasons offered for a good and a bad response. Defaults are provided. */
  reasons?: Partial<Record<FeedbackRating, FeedbackReason[]>>;
  /** Asks for a comment with a bad response. Defaults to false. */
  requireCommentOnDown?: boolean;
  maxCommentLength?: number;
  /** Shown above the form, such as a quote of the response being rated. */
  children?: ReactNode;
  labels?: Partial<FeedbackDialogLabels>;
}

interface BodyProps extends Omit<FeedbackDialogProps, 'open'> {
  labels: FeedbackDialogLabels;
}

/** The form. It is mounted only while the dialog is open, so it starts fresh each time. */
function FeedbackBody({
  onClose,
  onSubmit,
  defaultRating = null,
  reasons: reasonsProp,
  requireCommentOnDown = false,
  maxCommentLength = 2000,
  children,
  labels,
}: BodyProps) {
  const [rating, setRating] = useState<FeedbackRating | null>(defaultRating);
  const [chosen, setChosen] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  const reasons = { ...defaultFeedbackReasons, ...reasonsProp };
  const options = rating ? reasons[rating] : [];
  const needsComment = requireCommentOnDown && rating === 'down' && !comment.trim();
  const ratingError = attempted && !rating;
  const commentError = attempted && needsComment;

  const changeRating = (next: FeedbackRating) => {
    setRating(next);
    // Reasons differ for each rating, so a choice made for the other one no longer applies.
    setChosen([]);
  };

  const toggle = (id: string) =>
    setChosen((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (!rating || needsComment) return;
    setFailed(false);
    setSubmitting(true);
    try {
      await onSubmit({ rating, reasons: chosen, comment: comment.trim() });
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="axon-feedback" onSubmit={submit} noValidate>
      {children}
      {failed ? (
        <Alert status="danger" role="alert">
          {labels.submitError}
        </Alert>
      ) : null}

      <RadioGroup
        label={labels.rating}
        orientation="horizontal"
        value={rating}
        onChange={(value) => changeRating(value as FeedbackRating)}
        error={ratingError}
        errorMessage={ratingError ? labels.ratingRequired : undefined}
        disabled={submitting}
        options={[
          {
            value: 'up',
            label: (
              <span className="axon-feedback__choice">
                <ThumbsUpIcon /> {labels.up}
              </span>
            ),
          },
          {
            value: 'down',
            label: (
              <span className="axon-feedback__choice">
                <ThumbsDownIcon /> {labels.down}
              </span>
            ),
          },
        ]}
      />

      {options.length ? (
        <div role="group" aria-label={labels.reasons} className="axon-feedback__reasons">
          <span className="axon-feedback__reasons-label" aria-hidden="true">
            {labels.reasons}
          </span>
          <div className="axon-feedback__chips">
            {options.map((reason) => (
              <Chip
                key={reason.id}
                variant={chosen.includes(reason.id) ? 'solid' : 'outline'}
                color={chosen.includes(reason.id) ? 'primary' : 'neutral'}
                selected={chosen.includes(reason.id)}
                disabled={submitting}
                onClick={() => toggle(reason.id)}
              >
                {reason.label}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      <TextArea
        fullWidth
        label={labels.comment}
        placeholder={labels.commentPlaceholder}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={maxCommentLength}
        minRows={3}
        disabled={submitting}
        error={commentError}
        errorMessage={commentError ? labels.commentRequired : undefined}
      />

      <div className="axon-feedback__footer">
        <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
          {labels.cancel}
        </Button>
        <Button type="submit" loading={submitting}>
          {labels.submit}
        </Button>
      </div>
    </form>
  );
}

/**
 * A dialog for rating a response: good or bad, reasons to pick from (they change with the rating),
 * and a comment. It does not store anything; `onSubmit` gets the result.
 */
export function FeedbackDialog({
  open,
  onClose,
  labels: labelsProp,
  ...rest
}: FeedbackDialogProps) {
  const labels = { ...defaultFeedbackDialogLabels, ...labelsProp };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={labels.title}
      description={labels.description}
    >
      <FeedbackBody {...rest} onClose={onClose} labels={labels} />
    </Modal>
  );
}
