import { describe, expect, it } from 'vitest';
import {
  createSchemaFromFields,
  defaultSchemaFormMessages,
  defaultValuesFromFields,
  flattenFields,
  getPath,
  setPath,
  validateField,
  type SchemaFieldConfig,
  type SchemaFormField,
  type TextSchemaField,
} from './schema';

const text = (overrides: Partial<TextSchemaField> = {}) =>
  ({ type: 'text', name: 'name', ...overrides }) as SchemaFieldConfig;

describe('validateField', () => {
  const m = defaultSchemaFormMessages;

  describe('text', () => {
    it('is valid when empty and optional, required otherwise', () => {
      expect(validateField(text(), '')).toBeUndefined();
      expect(validateField(text({ required: true }), '')).toBe(m.required);
      expect(validateField(text({ required: true }), '   ')).toBe(m.required);
      expect(validateField(text({ required: true }), undefined)).toBe(m.required);
    });

    it('checks the length', () => {
      expect(validateField(text({ minLength: 3 }), 'ab')).toBe(m.minLength(3));
      expect(validateField(text({ minLength: 3 }), 'abc')).toBeUndefined();
      expect(validateField(text({ maxLength: 3 }), 'abcd')).toBe(m.maxLength(3));
    });

    it('checks an email', () => {
      const email = { type: 'email', name: 'e' } as SchemaFieldConfig;
      expect(validateField(email, 'nope')).toBe(m.email);
      expect(validateField(email, 'a@b')).toBe(m.email);
      expect(validateField(email, 'ada@example.com')).toBeUndefined();
    });

    it('checks a url', () => {
      const url = { type: 'url', name: 'u' } as SchemaFieldConfig;
      expect(validateField(url, 'example')).toBe(m.url);
      expect(validateField(url, 'https://example.com')).toBeUndefined();
    });

    it('checks a pattern against the whole value, with its own message', () => {
      const field = text({ pattern: '[a-z]+', patternMessage: 'Lowercase letters only.' });
      expect(validateField(field, 'abc')).toBeUndefined();
      expect(validateField(field, 'abc1')).toBe('Lowercase letters only.');
      expect(validateField(text({ pattern: '[a-z]+' }), 'ABC')).toBe(m.pattern);
    });

    it('uses custom messages', () => {
      expect(validateField(text({ required: true }), '', { ...m, required: 'Obligatorio.' })).toBe(
        'Obligatorio.',
      );
    });

    it('treats a textarea like text, without a pattern', () => {
      const area = { type: 'textarea', name: 'bio', maxLength: 5 } as SchemaFieldConfig;
      expect(validateField(area, 'toolong')).toBe(m.maxLength(5));
    });
  });

  describe('number', () => {
    const number = (o = {}) => ({ type: 'number', name: 'n', ...o }) as SchemaFieldConfig;
    it('is valid when empty and optional', () => {
      expect(validateField(number(), null)).toBeUndefined();
      expect(validateField(number({ required: true }), null)).toBe(m.required);
    });
    it('checks the range', () => {
      expect(validateField(number({ min: 1 }), 0)).toBe(m.min(1));
      expect(validateField(number({ max: 5 }), 6)).toBe(m.max(5));
      expect(validateField(number({ min: 1, max: 5 }), 3)).toBeUndefined();
      expect(validateField(number({ min: 0 }), 0)).toBeUndefined();
    });
    it('rejects NaN and non-numbers', () => {
      expect(validateField(number(), Number.NaN)).toBe(m.number);
      expect(validateField(number(), 'abc')).toBe(m.number);
    });
  });

  it('requires a select or radio choice', () => {
    const select = { type: 'select', name: 's', options: [], required: true } as SchemaFieldConfig;
    expect(validateField(select, null)).toBe(m.required);
    expect(validateField(select, 'a')).toBeUndefined();
  });

  it('checks the number of items in a multi choice', () => {
    const multi = (o = {}) =>
      ({ type: 'checkboxes', name: 'c', options: [], ...o }) as SchemaFieldConfig;
    expect(validateField(multi({ required: true }), [])).toBe(m.required);
    expect(validateField(multi({ minItems: 2 }), ['a'])).toBe(m.minItems(2));
    expect(validateField(multi({ maxItems: 1 }), ['a', 'b'])).toBe(m.maxItems(1));
    expect(validateField(multi({ minItems: 1 }), ['a'])).toBeUndefined();
    expect(validateField(multi(), [])).toBeUndefined();
  });

  it('requires a checkbox to be checked when required', () => {
    const checkbox = { type: 'checkbox', name: 't', required: true } as SchemaFieldConfig;
    expect(validateField(checkbox, false)).toBe(m.required);
    expect(validateField(checkbox, true)).toBeUndefined();
    expect(validateField({ type: 'switch', name: 's' }, false)).toBeUndefined();
  });

  it('checks dates against min and max', () => {
    const date = (o = {}) => ({ type: 'date', name: 'd', ...o }) as SchemaFieldConfig;
    const min = new Date(2025, 0, 10);
    const max = new Date(2025, 0, 20);
    expect(validateField(date({ required: true }), null)).toBe(m.required);
    expect(validateField(date({ min }), new Date(2025, 0, 9))).toBe(m.dateMin(min));
    expect(validateField(date({ max }), new Date(2025, 0, 21))).toBe(m.dateMax(max));
    expect(validateField(date({ min, max }), new Date(2025, 0, 15))).toBeUndefined();
  });

  it('checks times against min and max', () => {
    const time = (o = {}) => ({ type: 'time', name: 't', ...o }) as SchemaFieldConfig;
    expect(validateField(time({ min: '09:00' }), '08:30')).toBe(m.timeMin('09:00'));
    expect(validateField(time({ max: '17:00' }), '17:30')).toBe(m.timeMax('17:00'));
    expect(validateField(time({ min: '09:00', max: '17:00' }), '12:00')).toBeUndefined();
    expect(validateField(time({ required: true }), null)).toBe(m.required);
  });

  it('checks the files', () => {
    const file = (o = {}) => ({ type: 'file', name: 'f', ...o }) as SchemaFieldConfig;
    const small = new File(['a'], 'a.txt');
    const big = new File([new Uint8Array(2048)], 'b.bin');
    expect(validateField(file({ required: true }), [])).toBe(m.required);
    expect(validateField(file({ maxFiles: 1 }), [small, small])).toBe(m.maxFiles(1));
    expect(validateField(file({ maxSize: 1024 }), [big])).toBe(m.maxSize(1024));
    expect(validateField(file({ maxSize: 1024 }), [small])).toBeUndefined();
  });

  it('checks that a code is complete', () => {
    const otp = { type: 'otp', name: 'code', length: 6 } as SchemaFieldConfig;
    expect(validateField(otp, '123')).toBe(m.otpLength(6));
    expect(validateField(otp, '123456')).toBeUndefined();
    expect(validateField({ ...otp, required: true }, '')).toBe(m.required);
  });

  it('formats the file size limit', () => {
    expect(m.maxSize(512)).toContain('512 bytes');
    expect(m.maxSize(2048)).toContain('2 KB');
    expect(m.maxSize(5 * 1024 * 1024)).toContain('5 MB');
  });
});

describe('paths', () => {
  it('reads nested values', () => {
    expect(getPath({ a: { b: 1 } }, 'a.b')).toBe(1);
    expect(getPath({ a: 1 }, 'a.b')).toBeUndefined();
    expect(getPath(undefined, 'a')).toBeUndefined();
  });

  it('sets nested values, creating objects', () => {
    const values: Record<string, unknown> = {};
    setPath(values, 'a.b.c', 1);
    setPath(values, 'a.d', 2);
    expect(values).toEqual({ a: { b: { c: 1 }, d: 2 } });
  });
});

describe('fields helpers', () => {
  const fields: SchemaFormField[] = [
    { type: 'text', name: 'first' },
    {
      type: 'section',
      title: 'More',
      fields: [
        { type: 'number', name: 'age' },
        { type: 'checkbox', name: 'terms', defaultValue: true },
      ],
    },
  ];

  it('flattens sections', () => {
    expect(flattenFields(fields).map((f) => f.name)).toEqual(['first', 'age', 'terms']);
  });

  it('builds default values: the field default, or an empty value of the right kind', () => {
    const all: SchemaFormField[] = [
      { type: 'text', name: 'a' },
      { type: 'number', name: 'b' },
      { type: 'select', name: 'c', options: [] },
      { type: 'multiselect', name: 'd', options: [] },
      { type: 'checkbox', name: 'e' },
      { type: 'date', name: 'f' },
      { type: 'file', name: 'g' },
      { type: 'text', name: 'h.i', defaultValue: 'x' },
    ];
    expect(defaultValuesFromFields(all)).toEqual({
      a: '',
      b: null,
      c: null,
      d: [],
      e: false,
      f: null,
      g: [],
      h: { i: 'x' },
    });
    expect(defaultValuesFromFields(fields)).toEqual({ first: '', age: null, terms: true });
  });
});

describe('createSchemaFromFields', () => {
  const fields: SchemaFormField[] = [
    { type: 'text', name: 'name', required: true },
    { type: 'email', name: 'email', required: true },
    { type: 'checkbox', name: 'newsletter' },
    {
      type: 'text',
      name: 'company',
      hidden: (values) => values['newsletter'] !== true,
      required: true,
    },
    {
      type: 'section',
      title: 'Address',
      hidden: (values) => values['name'] === 'skip',
      fields: [{ type: 'text', name: 'address.city', required: true }],
    },
  ];
  const schema = createSchemaFromFields(fields);

  it('reports each field’s problem at the field’s path', () => {
    const result = schema.safeParse({
      name: '',
      email: 'x',
      newsletter: false,
      address: { city: '' },
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const byPath = Object.fromEntries(
      result.error.issues.map((i) => [i.path.join('.'), i.message]),
    );
    expect(byPath).toEqual({
      name: defaultSchemaFormMessages.required,
      email: defaultSchemaFormMessages.email,
      'address.city': defaultSchemaFormMessages.required,
    });
  });

  it('skips a hidden field, and the fields of a hidden section', () => {
    const result = schema.safeParse({ name: 'skip', email: 'a@b.co', newsletter: false });
    expect(result.success).toBe(true);
  });

  it('validates a field once it is shown', () => {
    const result = schema.safeParse({
      name: 'Ada',
      email: 'a@b.co',
      newsletter: true,
      company: '',
      address: { city: 'London' },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]!.path).toEqual(['company']);
  });

  it('leaves hidden fields out of the parsed values, without changing the input', () => {
    const input = {
      name: 'Ada',
      email: 'a@b.co',
      newsletter: false,
      company: 'Analytical Engines',
      address: { city: 'London' },
    };
    const result = schema.parse(input);
    expect(result).toEqual({
      name: 'Ada',
      email: 'a@b.co',
      newsletter: false,
      address: { city: 'London' },
    });
    expect(input.company).toBe('Analytical Engines');
  });

  it('removes the values of a hidden section', () => {
    const result = schema.parse({
      name: 'skip',
      email: 'a@b.co',
      newsletter: false,
      address: { city: 'London' },
    });
    expect(result).toEqual({ name: 'skip', email: 'a@b.co', newsletter: false, address: {} });
  });

  it('uses the messages you give it', () => {
    const custom = createSchemaFromFields([{ type: 'text', name: 'a', required: true }], {
      required: 'Obligatorio.',
    });
    const result = custom.safeParse({ a: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]!.message).toBe('Obligatorio.');
  });

  it('can be extended with your own rules', () => {
    const extended = schema.refine((values) => values['name'] !== 'root', {
      message: 'Reserved name.',
    });
    expect(extended.safeParse({ name: 'root', email: 'a@b.co' }).success).toBe(false);
  });
});
