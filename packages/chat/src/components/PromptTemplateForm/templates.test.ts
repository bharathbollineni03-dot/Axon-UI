import { describe, expect, it } from 'vitest';
import { extractTemplateVariables, humanizeVariableName, renderPromptTemplate } from './templates';

describe('extractTemplateVariables', () => {
  it('finds each variable once, in the order it first appears', () => {
    expect(extractTemplateVariables('Hi {{name}}, from {{company}}. Bye {{name}}!')).toEqual([
      'name',
      'company',
    ]);
  });

  it('allows spaces inside the braces, and dots, dashes and digits in names', () => {
    expect(extractTemplateVariables('{{ user.name }} {{order-id}} {{item_2}}')).toEqual([
      'user.name',
      'order-id',
      'item_2',
    ]);
  });

  it('ignores anything that is not a variable', () => {
    expect(extractTemplateVariables('{name} {{}} {{ }} {{1abc}} { {x} } {{a b}} plain')).toEqual(
      [],
    );
  });

  it('finds nothing in an empty template', () => {
    expect(extractTemplateVariables('')).toEqual([]);
  });

  it('can be called again and again with the same result', () => {
    const template = '{{a}} {{b}}';
    expect(extractTemplateVariables(template)).toEqual(extractTemplateVariables(template));
  });
});

describe('renderPromptTemplate', () => {
  it('fills every occurrence of a variable', () => {
    expect(renderPromptTemplate('{{a}} and {{ a }} and {{b}}', { a: 'one', b: 'two' })).toBe(
      'one and one and two',
    );
  });

  it('keeps a placeholder with no value, so a preview shows what is missing', () => {
    expect(renderPromptTemplate('Hi {{name}} from {{company}}', { name: 'Ada' })).toBe(
      'Hi Ada from {{company}}',
    );
    expect(renderPromptTemplate('Hi {{name}}', { name: '   ' })).toBe('Hi {{name}}');
  });

  it('can remove placeholders with no value instead', () => {
    expect(
      renderPromptTemplate('Hi {{name}} from {{company}}.', { name: 'Ada' }, { missing: 'empty' }),
    ).toBe('Hi Ada from .');
  });

  it('inserts a value exactly, without treating $ patterns specially', () => {
    expect(renderPromptTemplate('Cost: {{price}}', { price: '$& and $1 and $$' })).toBe(
      'Cost: $& and $1 and $$',
    );
  });

  it('does not re-read braces in a value as variables', () => {
    expect(renderPromptTemplate('{{a}} {{b}}', { a: '{{b}}', b: 'x' })).toBe('{{b}} x');
  });

  it('leaves text with no variables alone', () => {
    expect(renderPromptTemplate('Just text.', { a: 'x' })).toBe('Just text.');
  });
});

describe('humanizeVariableName', () => {
  it('makes names readable', () => {
    expect(humanizeVariableName('customer_name')).toBe('Customer name');
    expect(humanizeVariableName('customerName')).toBe('Customer name');
    expect(humanizeVariableName('user.first-name')).toBe('User first name');
    expect(humanizeVariableName('topic')).toBe('Topic');
    expect(humanizeVariableName('URL')).toBe('Url');
  });
});
