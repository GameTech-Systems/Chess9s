// S65: the time controls of rules/timeControls.json (decision 0017): the presets, the default,
// the controls an online room alone offers, and the checks that refuse a broken file.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RulesError } from './loader';
import { checkTimeControlsSchema } from './schema-check';
import * as staticChecks from './schema-check.static';
import { findControl, hotSeatControls, loadTimeControls, isClocked } from './time-controls';

const root = new URL('../../../../', import.meta.url).pathname;
const file: unknown = JSON.parse(readFileSync(root + 'rules/timeControls.json', 'utf8'));
const tc = loadTimeControls(file);
const broken = (change: (f: Record<string, unknown>) => void) => {
  const copy = structuredClone(file) as Record<string, unknown>;
  change(copy);
  return copy;
};

describe('rules/timeControls.json', () => {
  it('fits its schema, and the static build has the same check', () => {
    expect(checkTimeControlsSchema(file)).toBe(true);
    expect(checkTimeControlsSchema({})).toBe(false);
    expect(typeof staticChecks.checkTimeControlsSchema).toBe('function');
  });

  it('keeps untimed as the default (D58)', () => {
    expect(tc.default).toBe('untimed');
    expect(findControl(tc, tc.default)?.kind).toBe('untimed');
  });

  it('has the presets of decision 0017', () => {
    const ids = tc.controls.map((c) => c.id);
    expect(ids).toEqual([
      'untimed',
      '1+0', '2+1', '3+0', '3+2', '5+0', '5+3', '10+0', '10+5', '15+10', '30+0', '30+20',
      'move30s', 'move1m', 'move1d', 'move3d', 'away5m',
    ]);
    expect(findControl(tc, '3+2')).toMatchObject({ kind: 'fischer', minutes: 3, increment: 2 });
    expect(findControl(tc, 'move30s')).toMatchObject({ kind: 'perMove', seconds: 30 });
    expect(findControl(tc, 'move1m')).toMatchObject({ kind: 'perMove', seconds: 60 });
  });

  it('marks the online-only controls, which the hot-seat picker leaves out', () => {
    const online = tc.controls.filter((c) => c.onlineOnly).map((c) => c.id);
    expect(online).toEqual(['move1d', 'move3d', 'away5m']);
    const hot = hotSeatControls(tc).map((c) => c.id);
    expect(hot).toContain('untimed');
    expect(hot).toContain('3+2');
    expect(hot).not.toContain('move1d');
    expect(hot).not.toContain('away5m');
  });

  it('says which controls run a clock', () => {
    expect(tc.controls.filter(isClocked).map((c) => c.kind)).not.toContain('untimed');
    expect(isClocked(findControl(tc, 'untimed')!)).toBe(false);
    expect(isClocked(findControl(tc, 'away5m')!)).toBe(false);
    expect(isClocked(findControl(tc, '5+3')!)).toBe(true);
    expect(isClocked(findControl(tc, 'move30s')!)).toBe(true);
  });
});

describe('loadTimeControls', () => {
  it('refuses a default that is not one of the controls', () => {
    expect(() => loadTimeControls(broken((f) => (f.default = 'nope')))).toThrow(RulesError);
  });

  it('refuses a repeated id', () => {
    expect(() =>
      loadTimeControls(
        broken((f) => {
          const c = f.controls as { id: string }[];
          c[2]!.id = c[1]!.id;
        }),
      ),
    ).toThrow(/twice|repeated/i);
  });

  it('refuses a default that is online only', () => {
    expect(() => loadTimeControls(broken((f) => (f.default = 'move1d')))).toThrow(RulesError);
  });

  it('refuses a control missing what its kind needs', () => {
    expect(() =>
      loadTimeControls(
        broken((f) => {
          const c = f.controls as Record<string, unknown>[];
          delete c.find((x) => x.id === '3+2')!.increment;
        }),
      ),
    ).toThrow(RulesError);
  });
});
