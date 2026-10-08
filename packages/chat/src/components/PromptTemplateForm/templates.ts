/** `{{name}}`, with optional spaces inside. Names are letters, digits, `_`, `.` and `-`. */
const variablePattern = () => /\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g;

/** The variables a template uses, once each, in the order they first appear. */
export function extractTemplateVariables(template: string): string[] {
  const names: string[] = [];
  for (const match of template.matchAll(variablePattern())) {
    const name = match[1]!;
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

export interface RenderTemplateOptions {
  /**
   * What to do with a variable that has no value (or only spaces): `keep` leaves `{{name}}` in
   * place, which suits a preview; `empty` removes it. Defaults to `keep`.
   */
  missing?: 'keep' | 'empty';
}

/**
 * Fills a template's `{{variables}}` from `values`. A value is inserted exactly as it is, so
 * `$&` and other replacement patterns in it have no special meaning.
 */
export function renderPromptTemplate(
  template: string,
  values: Record<string, string | undefined>,
  { missing = 'keep' }: RenderTemplateOptions = {},
): string {
  return template.replace(variablePattern(), (match, name: string) => {
    const value = values[name];
    if (value === undefined || (missing === 'keep' && value.trim() === '')) {
      return missing === 'keep' ? match : '';
    }
    return value;
  });
}

/** A readable label for a variable: `customer_name` and `customerName` both give "Customer name". */
export function humanizeVariableName(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
