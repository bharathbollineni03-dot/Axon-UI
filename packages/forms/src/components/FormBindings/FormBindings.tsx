import { forwardRef, type ChangeEvent, type FocusEvent, type ReactNode } from 'react';
import {
  Checkbox,
  CheckboxGroup,
  DatePicker,
  FileUpload,
  MultiSelect,
  NumberInput,
  OTPInput,
  RadioGroup,
  Select,
  Slider,
  Switch,
  TextArea,
  TextField,
  TimePicker,
  type CheckboxGroupProps,
  type CheckboxProps,
  type DatePickerProps,
  type FileUploadProps,
  type MultiSelectProps,
  type NumberInputProps,
  type OTPInputProps,
  type RadioGroupProps,
  type SelectProps,
  type SliderProps,
  type SwitchProps,
  type TextAreaProps,
  type TextFieldProps,
  type TimePickerProps,
} from '@axonui/core';
import { useMergedRef } from '../../internal/mergeRefs';
import { useFormField, type FormControlProps } from '../FormField/useFormField';

/**
 * The bindings connect one `@axonui/core` input to the surrounding form. They take the input's own
 * props (label, helperText, size, options, ...), plus `name`. The form supplies the value, the
 * change and blur handling and the error state. `onChange` and `onBlur` still work: they run
 * after the form has handled the event.
 */

type Managed = 'name' | 'value' | 'defaultValue' | 'error' | 'errorMessage';

/** A message under a checkbox or switch, in the error color, in place of its description. */
const errorDescription = (message: string) => (
  <span className="axon-form-field-error">{message}</span>
);

/** Runs the form's handler, then the one the caller passed. */
const then =
  <E,>(first: (event: E) => void, second?: (event: E) => void) =>
  (event: E) => {
    first(event);
    second?.(event);
  };

// ---------------------------------------------------------------------------------------------
// Text

export type FormTextFieldProps = Omit<TextFieldProps, Managed> & FormControlProps;

export const FormTextField = forwardRef<HTMLInputElement, FormTextFieldProps>(
  function FormTextField(
    { name, control, defaultValue, shouldUnregister, onChange, onBlur, disabled, ...rest },
    ref,
  ) {
    const {
      field,
      invalid,
      errorMessage,
      disabled: isDisabled,
    } = useFormField(
      { name, control, defaultValue: defaultValue ?? '', shouldUnregister },
      disabled,
    );
    const mergedRef = useMergedRef<HTMLInputElement>(ref, field.ref);
    return (
      <TextField
        {...rest}
        ref={mergedRef}
        name={field.name}
        value={(field.value as string | undefined) ?? ''}
        onChange={then(field.onChange, onChange)}
        onBlur={then(() => field.onBlur(), onBlur)}
        disabled={isDisabled}
        error={invalid}
        errorMessage={errorMessage}
      />
    );
  },
);

export type FormTextAreaProps = Omit<TextAreaProps, Managed> & FormControlProps;

export const FormTextArea = forwardRef<HTMLTextAreaElement, FormTextAreaProps>(
  function FormTextArea(
    { name, control, defaultValue, shouldUnregister, onChange, onBlur, disabled, ...rest },
    ref,
  ) {
    const {
      field,
      invalid,
      errorMessage,
      disabled: isDisabled,
    } = useFormField(
      { name, control, defaultValue: defaultValue ?? '', shouldUnregister },
      disabled,
    );
    const mergedRef = useMergedRef<HTMLTextAreaElement>(ref, field.ref);
    return (
      <TextArea
        {...rest}
        ref={mergedRef}
        name={field.name}
        value={(field.value as string | undefined) ?? ''}
        onChange={then(field.onChange, onChange)}
        onBlur={then(() => field.onBlur(), onBlur)}
        disabled={isDisabled}
        error={invalid}
        errorMessage={errorMessage}
      />
    );
  },
);

export type FormNumberInputProps = Omit<NumberInputProps, Managed> & FormControlProps;

/** The form value is a `number`, or `null` while the field is empty. */
export const FormNumberInput = forwardRef<HTMLInputElement, FormNumberInputProps>(
  function FormNumberInput(
    { name, control, defaultValue, shouldUnregister, onChange, onBlur, disabled, ...rest },
    ref,
  ) {
    const {
      field,
      invalid,
      errorMessage,
      disabled: isDisabled,
    } = useFormField(
      { name, control, defaultValue: defaultValue ?? null, shouldUnregister },
      disabled,
    );
    const mergedRef = useMergedRef<HTMLInputElement>(ref, field.ref);
    return (
      <NumberInput
        {...rest}
        ref={mergedRef}
        name={field.name}
        value={(field.value as number | null | undefined) ?? null}
        onChange={then(field.onChange, onChange)}
        onBlur={then(() => field.onBlur(), onBlur)}
        disabled={isDisabled}
        error={invalid}
        errorMessage={errorMessage}
      />
    );
  },
);

export type FormOTPInputProps = Omit<OTPInputProps, Managed | 'onChange'> &
  FormControlProps & { onChange?: (value: string) => void };

export const FormOTPInput = forwardRef<HTMLInputElement, FormOTPInputProps>(function FormOTPInput(
  { name, control, defaultValue, shouldUnregister, onChange, onBlur, disabled, ...rest },
  ref,
) {
  const {
    field,
    invalid,
    errorMessage,
    disabled: isDisabled,
  } = useFormField({ name, control, defaultValue: defaultValue ?? '', shouldUnregister }, disabled);
  const mergedRef = useMergedRef<HTMLInputElement>(ref, field.ref);
  return (
    <OTPInput
      {...rest}
      ref={mergedRef}
      name={field.name}
      value={(field.value as string | undefined) ?? ''}
      onChange={then(field.onChange, onChange)}
      onBlur={then((_: FocusEvent<HTMLInputElement>) => field.onBlur(), onBlur)}
      disabled={isDisabled}
      error={invalid}
      errorMessage={errorMessage}
    />
  );
});

// ---------------------------------------------------------------------------------------------
// Choosing from options

export type FormSelectProps = Omit<SelectProps, Managed | 'onChange'> &
  FormControlProps & { onChange?: (value: string) => void };

/** The form value is the selected option's `value`, or `null` while nothing is selected. */
export const FormSelect = forwardRef<HTMLButtonElement, FormSelectProps>(function FormSelect(
  { name, control, defaultValue, shouldUnregister, onChange, onBlur, disabled, ...rest },
  ref,
) {
  const {
    field,
    invalid,
    errorMessage,
    disabled: isDisabled,
  } = useFormField(
    { name, control, defaultValue: defaultValue ?? null, shouldUnregister },
    disabled,
  );
  const mergedRef = useMergedRef<HTMLButtonElement>(ref, field.ref);
  return (
    <Select
      {...rest}
      ref={mergedRef}
      name={field.name}
      value={(field.value as string | null | undefined) ?? null}
      onChange={then(field.onChange, onChange)}
      onBlur={then((_: FocusEvent<HTMLButtonElement>) => field.onBlur(), onBlur)}
      disabled={isDisabled}
      error={invalid}
      errorMessage={errorMessage}
    />
  );
});

export type FormMultiSelectProps = Omit<MultiSelectProps, Managed | 'onChange'> &
  FormControlProps & { onChange?: (value: string[]) => void };

/** The form value is an array of the selected options' `value`s. */
export const FormMultiSelect = forwardRef<HTMLButtonElement, FormMultiSelectProps>(
  function FormMultiSelect(
    { name, control, defaultValue, shouldUnregister, onChange, onBlur, disabled, ...rest },
    ref,
  ) {
    const {
      field,
      invalid,
      errorMessage,
      disabled: isDisabled,
    } = useFormField(
      { name, control, defaultValue: defaultValue ?? [], shouldUnregister },
      disabled,
    );
    const mergedRef = useMergedRef<HTMLButtonElement>(ref, field.ref);
    return (
      <MultiSelect
        {...rest}
        ref={mergedRef}
        name={field.name}
        value={(field.value as string[] | undefined) ?? []}
        onChange={then(field.onChange, onChange)}
        onBlur={then((_: FocusEvent<HTMLButtonElement>) => field.onBlur(), onBlur)}
        disabled={isDisabled}
        error={invalid}
        errorMessage={errorMessage}
      />
    );
  },
);

export type FormRadioGroupProps = Omit<RadioGroupProps, Managed | 'onChange'> &
  FormControlProps & { onChange?: (value: string) => void };

/** The form value is the selected option's `value`, or `null` while nothing is selected. */
export const FormRadioGroup = forwardRef<HTMLFieldSetElement, FormRadioGroupProps>(
  function FormRadioGroup(
    { name, control, defaultValue, shouldUnregister, onChange, onBlur, disabled, ...rest },
    ref,
  ) {
    const {
      field,
      invalid,
      errorMessage,
      disabled: isDisabled,
    } = useFormField(
      { name, control, defaultValue: defaultValue ?? null, shouldUnregister },
      disabled,
    );
    const mergedRef = useMergedRef<HTMLFieldSetElement>(ref, field.ref);
    return (
      <RadioGroup
        {...rest}
        ref={mergedRef}
        name={field.name}
        value={(field.value as string | null | undefined) ?? null}
        onChange={then(field.onChange, onChange)}
        onBlur={then(() => field.onBlur(), onBlur)}
        disabled={isDisabled}
        error={invalid}
        errorMessage={errorMessage}
      />
    );
  },
);

export type FormCheckboxGroupProps = Omit<CheckboxGroupProps, Managed | 'onChange'> &
  FormControlProps & { onChange?: (value: string[]) => void };

/** The form value is an array of the checked options' `value`s. */
export const FormCheckboxGroup = forwardRef<HTMLFieldSetElement, FormCheckboxGroupProps>(
  function FormCheckboxGroup(
    { name, control, defaultValue, shouldUnregister, onChange, onBlur, disabled, ...rest },
    ref,
  ) {
    const {
      field,
      invalid,
      errorMessage,
      disabled: isDisabled,
    } = useFormField(
      { name, control, defaultValue: defaultValue ?? [], shouldUnregister },
      disabled,
    );
    const mergedRef = useMergedRef<HTMLFieldSetElement>(ref, field.ref);
    return (
      <CheckboxGroup
        {...rest}
        ref={mergedRef}
        name={field.name}
        value={(field.value as string[] | undefined) ?? []}
        onChange={then(field.onChange, onChange)}
        onBlur={then(() => field.onBlur(), onBlur)}
        disabled={isDisabled}
        error={invalid}
        errorMessage={errorMessage}
      />
    );
  },
);

// ---------------------------------------------------------------------------------------------
// On and off

export type FormCheckboxProps = Omit<
  CheckboxProps,
  Managed | 'checked' | 'defaultChecked' | 'description'
> &
  FormControlProps & {
    /** Text under the label. While the field has an error, the error message replaces it. */
    description?: ReactNode;
  };

/** The form value is a `boolean`. */
export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(function FormCheckbox(
  {
    name,
    control,
    defaultValue,
    shouldUnregister,
    onChange,
    onBlur,
    disabled,
    description,
    ...rest
  },
  ref,
) {
  const {
    field,
    invalid,
    errorMessage,
    disabled: isDisabled,
  } = useFormField(
    { name, control, defaultValue: defaultValue ?? false, shouldUnregister },
    disabled,
  );
  const mergedRef = useMergedRef<HTMLInputElement>(ref, field.ref);
  return (
    <Checkbox
      {...rest}
      ref={mergedRef}
      name={field.name}
      checked={Boolean(field.value)}
      onChange={then(
        (event: ChangeEvent<HTMLInputElement>) => field.onChange(event.target.checked),
        onChange,
      )}
      onBlur={then(() => field.onBlur(), onBlur)}
      disabled={isDisabled}
      error={invalid}
      description={invalid && errorMessage ? errorDescription(errorMessage) : description}
    />
  );
});

export type FormSwitchProps = Omit<
  SwitchProps,
  Managed | 'checked' | 'defaultChecked' | 'description'
> &
  FormControlProps & {
    /** Text under the label. While the field has an error, the error message replaces it. */
    description?: ReactNode;
  };

/** The form value is a `boolean`. */
export const FormSwitch = forwardRef<HTMLInputElement, FormSwitchProps>(function FormSwitch(
  {
    name,
    control,
    defaultValue,
    shouldUnregister,
    onChange,
    onBlur,
    disabled,
    description,
    ...rest
  },
  ref,
) {
  const {
    field,
    invalid,
    errorMessage,
    disabled: isDisabled,
  } = useFormField(
    { name, control, defaultValue: defaultValue ?? false, shouldUnregister },
    disabled,
  );
  const mergedRef = useMergedRef<HTMLInputElement>(ref, field.ref);
  return (
    <Switch
      {...rest}
      ref={mergedRef}
      name={field.name}
      checked={Boolean(field.value)}
      onChange={then(
        (event: ChangeEvent<HTMLInputElement>) => field.onChange(event.target.checked),
        onChange,
      )}
      onBlur={then(() => field.onBlur(), onBlur)}
      disabled={isDisabled}
      description={invalid && errorMessage ? errorDescription(errorMessage) : description}
    />
  );
});

// ---------------------------------------------------------------------------------------------
// Dates, times and files

export type FormDatePickerProps = Omit<DatePickerProps, Managed | 'onChange'> &
  FormControlProps & { onChange?: (date: Date | null) => void };

/** The form value is a `Date`, or `null` while the field is empty. */
export const FormDatePicker = forwardRef<HTMLInputElement, FormDatePickerProps>(
  function FormDatePicker(
    { name, control, defaultValue, shouldUnregister, onChange, onBlur, disabled, ...rest },
    ref,
  ) {
    const {
      field,
      invalid,
      errorMessage,
      disabled: isDisabled,
    } = useFormField(
      { name, control, defaultValue: defaultValue ?? null, shouldUnregister },
      disabled,
    );
    const mergedRef = useMergedRef<HTMLInputElement>(ref, field.ref);
    return (
      <DatePicker
        {...rest}
        ref={mergedRef}
        name={field.name}
        value={(field.value as Date | null | undefined) ?? null}
        onChange={then(field.onChange, onChange)}
        onBlur={then(() => field.onBlur(), onBlur)}
        disabled={isDisabled}
        error={invalid}
        errorMessage={errorMessage}
      />
    );
  },
);

export type FormTimePickerProps = Omit<TimePickerProps, Managed | 'onChange'> &
  FormControlProps & { onChange?: (value: string | null) => void };

/** The form value is a 24-hour `"HH:mm"` string, or `null` while the field is empty. */
export const FormTimePicker = forwardRef<HTMLInputElement, FormTimePickerProps>(
  function FormTimePicker(
    { name, control, defaultValue, shouldUnregister, onChange, onBlur, disabled, ...rest },
    ref,
  ) {
    const {
      field,
      invalid,
      errorMessage,
      disabled: isDisabled,
    } = useFormField(
      { name, control, defaultValue: defaultValue ?? null, shouldUnregister },
      disabled,
    );
    const mergedRef = useMergedRef<HTMLInputElement>(ref, field.ref);
    return (
      <TimePicker
        {...rest}
        ref={mergedRef}
        name={field.name}
        value={(field.value as string | null | undefined) ?? null}
        onChange={then(field.onChange, onChange)}
        onBlur={then(() => field.onBlur(), onBlur)}
        disabled={isDisabled}
        error={invalid}
        errorMessage={errorMessage}
      />
    );
  },
);

export type FormFileUploadProps = Omit<FileUploadProps, Managed | 'onChange'> &
  FormControlProps & { onChange?: (files: File[]) => void };

/** The form value is an array of `File`s. */
export const FormFileUpload = forwardRef<HTMLInputElement, FormFileUploadProps>(
  function FormFileUpload(
    { name, control, defaultValue, shouldUnregister, onChange, disabled, ...rest },
    ref,
  ) {
    const {
      field,
      invalid,
      errorMessage,
      disabled: isDisabled,
    } = useFormField(
      { name, control, defaultValue: defaultValue ?? [], shouldUnregister },
      disabled,
    );
    const mergedRef = useMergedRef<HTMLInputElement>(ref, field.ref);
    return (
      <FileUpload
        {...rest}
        ref={mergedRef}
        name={field.name}
        value={(field.value as File[] | undefined) ?? []}
        // A file drop has no blur, so choosing files is what marks the field as touched.
        onChange={then((files: File[]) => {
          field.onChange(files);
          field.onBlur();
        }, onChange)}
        disabled={isDisabled}
        error={invalid}
        errorMessage={errorMessage}
      />
    );
  },
);

// ---------------------------------------------------------------------------------------------
// Sliders

export type FormSliderProps = Omit<SliderProps, Managed | 'onChange' | 'onChangeEnd'> &
  FormControlProps & {
    onChange?: (value: number) => void;
    /** Text under the slider. While the field has an error, the error message replaces it. */
    helperText?: ReactNode;
  };

/**
 * The form value is a `number`; it starts at `min` unless the form has a value. The core `Slider`
 * has no message area, so this adds one under it that is announced when an error appears.
 */
export const FormSlider = forwardRef<HTMLDivElement, FormSliderProps>(function FormSlider(
  {
    name,
    control,
    defaultValue,
    shouldUnregister,
    onChange,
    onBlur,
    disabled,
    helperText,
    min = 0,
    className,
    ...rest
  },
  ref,
) {
  const {
    field,
    invalid,
    errorMessage,
    disabled: isDisabled,
  } = useFormField(
    { name, control, defaultValue: defaultValue ?? min, shouldUnregister },
    disabled,
  );
  const mergedRef = useMergedRef<HTMLDivElement>(ref, field.ref);
  const message = invalid && errorMessage ? errorMessage : helperText;
  return (
    <div className="axon-form-slider">
      <Slider
        {...rest}
        ref={mergedRef}
        className={className}
        min={min}
        name={field.name}
        value={(field.value as number | undefined) ?? min}
        onChange={then(field.onChange, onChange)}
        onBlur={then(() => field.onBlur(), onBlur)}
        disabled={isDisabled}
      />
      <div
        aria-live="polite"
        className={
          invalid ? 'axon-form-slider__message axon-form-field-error' : 'axon-form-slider__message'
        }
      >
        {message}
      </div>
    </div>
  );
});
