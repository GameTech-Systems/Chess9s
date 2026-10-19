// Parameter interactions (S16): pairs of parameters whose `affects` overlap are
// flagged so the simulation harness can test them together later.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parameterInteractions } from './interactions';
import { RulesError, type Registry } from './loader';

const root = new URL('../../../../', import.meta.url).pathname;
const registry = () => JSON.parse(readFileSync(root + 'rules/parameters.json', 'utf8')) as Registry;
const pair = (list: ReturnType<typeof parameterInteractions>, a: string, b: string) =>
  list.find((x) => x.a === a && x.b === b);

describe('parameterInteractions', () => {
  const two = parameterInteractions(registry(), 2);
  const three = parameterInteractions(registry(), 3);

  it('flags king.range with king.canJump on movement and check detection', () => {
    expect(pair(two, 'king.canJump', 'king.range')?.shared).toEqual(['check-detection', 'movement']);
  });

  it('flags the check flags with the movement that decides what attacks', () => {
    expect(pair(two, 'coastPieces.2p.giveCheck', 'dragonHead.range')?.shared).toEqual(['check-detection']);
    expect(pair(two, 'tail.2p.canCapture', 'tail.canCheck')?.shared).toEqual(['check-detection']);
  });

  it('lists each pair once, ordered, with at least one shared system', () => {
    const keys = two.map((x) => `${x.a}|${x.b}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual([...keys].sort());
    for (const x of two) {
      expect(x.a < x.b).toBe(true);
      expect(x.shared.length).toBeGreaterThan(0);
    }
  });

  it('flags only parameters that can change in a game of that player count', () => {
    const ids = (list: typeof two) => new Set(list.flatMap((x) => [x.a, x.b]));
    const reg = registry().parameters;
    for (const [players, list] of [
      [2, two],
      [3, three],
    ] as const) {
      for (const id of ids(list)) {
        const p = reg.find((x) => x.id === id)!;
        expect(p.status, id).not.toBe('deprecated');
        expect(p.players, id).toContain(players);
        expect(p.options.length, id).toBeGreaterThan(1);
      }
    }
    expect(ids(two).has('dragon.rangeMode')).toBe(false); // one option only
    expect(ids(two).has('dragon.range')).toBe(false); // deprecated
    expect(ids(three).has('coastPieces.2p.giveCheck')).toBe(false); // 2-player only
    expect(ids(three).has('dragon.3p.givesCheck')).toBe(true);
  });

  it('validates the registry first', () => {
    expect(() => parameterInteractions({ version: '1' } as unknown as Registry, 2)).toThrow(RulesError);
  });
});
