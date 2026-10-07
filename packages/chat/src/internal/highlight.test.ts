import { describe, expect, it } from 'vitest';
import { highlightCode, registerCodeLanguage } from './highlight';

describe('highlightCode', () => {
  it('wraps the tokens of a known language in hljs spans', () => {
    const { html, language } = highlightCode('const answer = 42;', 'javascript');
    expect(language).toBe('javascript');
    expect(html).toContain('<span class="hljs-keyword">const</span>');
    expect(html).toContain('<span class="hljs-number">42</span>');
  });

  it.each([
    ['ts', 'typescript'],
    ['tsx', 'typescript'],
    ['js', 'javascript'],
    ['py', 'python'],
    ['sh', 'bash'],
    ['yml', 'yaml'],
    ['html', 'xml'],
    ['rs', 'rust'],
  ])('knows the alias %s', (alias, name) => {
    expect(highlightCode('x', alias).language).toBe(name);
  });

  it('ignores the case and spacing of the language name', () => {
    expect(highlightCode('x', '  Python ').language).toBe('python');
  });

  it('returns plain, escaped text for an unknown language', () => {
    const result = highlightCode('a < b && c > d', 'klingon');
    expect(result.language).toBeUndefined();
    expect(result.html).toBe('a &lt; b &amp;&amp; c &gt; d');
  });

  it('returns plain text when there is no language', () => {
    expect(highlightCode('just text').language).toBeUndefined();
  });

  it('never lets code inject markup, in any language', () => {
    const attack = '<img src=x onerror="alert(1)"><script>steal()</script>';
    for (const language of [undefined, 'html', 'javascript', 'markdown', 'nope']) {
      const { html } = highlightCode(attack, language);
      expect(html).not.toContain('<img');
      expect(html).not.toContain('<script');
      expect(html).toContain('&lt;');
    }
  });

  it('escapes quotes in plain text', () => {
    expect(highlightCode(`"it's"`, 'nope').html).toBe('&quot;it&#x27;s&quot;');
  });

  it('copes with an empty string and with illegal syntax', () => {
    expect(highlightCode('', 'json').html).toBe('');
    expect(() => highlightCode('{ not json ', 'json')).not.toThrow();
  });

  it('can have a language registered', () => {
    expect(highlightCode('x', 'tiny').language).toBeUndefined();
    registerCodeLanguage('tiny', (() => ({ name: 'tiny', keywords: 'go stop' })) as never);
    const result = highlightCode('go now', 'tiny');
    expect(result.language).toBe('tiny');
    expect(result.html).toContain('hljs-keyword');
  });
});
