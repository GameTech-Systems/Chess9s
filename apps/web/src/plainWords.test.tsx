import { describe, expect, it } from 'vitest';
import registry from '../../../rules/parameters.json';
import { listRulesets } from './game/rules';
import { PRESET_SUMMARIES } from './RulePicker';

// What players read must carry no project shorthand: no D/S/I codes, no decision numbers, no
// "provisional", no version strings (S92, D85). The references live in the decision records.
// A lone D1 to D9 or I1 to I9 is also a board square (D5, I5) and cannot be told apart from a
// code, so those are left to review; every code with two digits, and every S code, is caught.
const SHORTHAND = /\b[DI]\d{2,3}\b|\bS\d{1,3}\b|decision \d{4}|provisional|\d+\.\d+\.\d+/i;

type Param = {
  id: string;
  label?: string;
  description?: string;
  optionLabels?: Record<string, string>;
};

const strings: [string, string][] = [
  ...listRulesets().flatMap((r): [string, string][] => [
    [`ruleset ${r.id} name`, r.name],
    [`ruleset ${r.id} description`, r.description],
  ]),
  ...Object.entries(PRESET_SUMMARIES).map(([id, s]): [string, string] => [`summary ${id}`, s]),
  ...(registry.parameters as Param[]).flatMap((p): [string, string][] => [
    [`${p.id} label`, p.label ?? ''],
    [`${p.id} description`, p.description ?? ''],
    ...Object.entries(p.optionLabels ?? {}).map(([k, v]): [string, string] => [
      `${p.id} option ${k}`,
      v,
    ]),
  ]),
];

describe('player-visible text', () => {
  it('has strings to check', () => {
    expect(strings.length).toBeGreaterThan(100);
  });
  it.each(strings)('%s has no project shorthand', (_where, text) => {
    expect(text).not.toMatch(SHORTHAND);
  });
});

describe('pages carry no ids or versions (D85)', () => {
  it('the rules page shows plain status, no id or version, a closed "Every setting"', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { RulesPage } = await import('./RulesPage');
    const html = renderToStaticMarkup(<RulesPage id="heavy-h3-3p" />);
    expect(html).toContain('Balance-tested');
    expect(html).not.toMatch(/heavy-h3-3p v|v0\.1\.0|candidate</);
    expect(html).not.toContain('Not an official tournament ruleset');
    expect(html).not.toContain('/tournament');
    expect(html).not.toContain('rules/rulesets/');
    expect(html).toMatch(/<details class="every-setting">/);
    expect(html).not.toMatch(/<details[^>]*open/);
  });
});
