import { describe, expect, it } from 'vitest';
import registry from '../../../rules/parameters.json';
import { listRulesets } from './game/rules';
import { PRESET_SUMMARIES } from './RulePicker';

// What players read must carry no project shorthand: no D/S/I codes, no decision numbers, no
// "provisional", no version strings (S92, D85, D5). The references live in the decision records.
// A lone D1 to D9 or I1 to I9 is also a board square (D5, I5), so it is caught by where it sits:
// in a bracket holding only codes "(D5)" or "(S7, D5)", after "decision" or "default" ("default
// D5"), or with a sub-number ("D5.2"). Every S code and every code with two digits is caught
// wherever it is. A bare D5 in a list of squares passes, as it should.
const CODE =
  /\b[DI]\d{2,3}\b|\bS\d{1,3}\b|\((?:[DIS]\d{1,3}(?:\.\d+)?(?:,\s*)?)+\)|\b(?:decision|default|ledger)\s+[DI]\d\b|\b[DI]\d\.\d+\b/i;
const SHORTHAND = /decision \d{4}|provisional|\d+\.\d+\.\d+/i;

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
    expect(text).not.toMatch(CODE);
    expect(text).not.toMatch(SHORTHAND);
  });
  it('names no setting id in a description', () => {
    for (const p of registry.parameters as Param[]) {
      expect(p.description ?? '').not.toMatch(/\([a-z]+(\.[A-Za-z0-9]+)+\)/);
    }
  });
  it('tells a code from a board square', () => {
    for (const code of ['(D5)', '(S7, I9)', 'default D5', 'D5.2', 'D85', 'S92', 'decision I3'])
      expect(code).toMatch(CODE);
    for (const square of ['D5', 'I5', 'squares B5, C5, D5, F5', 'A5 and I5 (may stop)', 'a5-e5-i5'])
      expect(square).not.toMatch(CODE);
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
