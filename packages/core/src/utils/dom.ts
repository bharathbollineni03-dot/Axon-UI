/**
 * Sets an input's value the way a user typing would, so React fires `onChange` for both
 * controlled and uncontrolled inputs. (Assigning `input.value` directly is swallowed by React.)
 */
export function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Joins ids for `aria-describedby`, skipping empty ones. Returns `undefined` when none remain. */
export function joinIds(...ids: (string | false | null | undefined)[]): string | undefined {
  const joined = ids.filter(Boolean).join(' ');
  return joined || undefined;
}
