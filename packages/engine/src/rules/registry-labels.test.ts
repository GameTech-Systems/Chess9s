import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Registry } from './loader';

const registry = JSON.parse(
  readFileSync(new URL('../../../../rules/parameters.json', import.meta.url), 'utf8'),
) as Registry;

const GROUPS = [
  'King',
  'Queen',
  'Pawns',
  'Center',
  'Coast',
  'Dragon Tail',
  'Dragon Heads',
  'Sun and Moon',
  'Turns and draws',
  'Setup',
];

const live = registry.parameters.filter((p) => p.status !== 'deprecated');

describe('parameter groups and option labels (presentation only)', () => {
  it('puts every live parameter in one of the known groups', () => {
    for (const p of live) expect(GROUPS, `${p.id} group`).toContain(p.group);
  });

  it('labels every option of every live parameter, and nothing else', () => {
    for (const p of live) {
      const labels = p.optionLabels ?? {};
      expect(Object.keys(labels).sort(), `${p.id} optionLabels`).toEqual(
        p.options.map(String).sort(),
      );
      for (const text of Object.values(labels)) expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  it('uses no group that no parameter belongs to', () => {
    const used = new Set(live.map((p) => p.group));
    for (const g of GROUPS) expect(used.has(g), g).toBe(true);
  });
});
