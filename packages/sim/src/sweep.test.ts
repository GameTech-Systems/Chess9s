// Parameter combinations (decision 0008): one 2-player parameter changed at a time from the
// ruleset's values, each other option of it; enumSets add or remove one option.
import { describe, expect, it } from 'vitest';
import type { Registry } from '@chess9s/engine';
import { loadSource, rulesFor } from './load';
import { combinations, playable } from './sweep';

const registry: Registry = {
  version: '1',
  parameters: [
    {
      id: 'a.n',
      label: 'n',
      piece: null,
      players: [2, 3],
      type: 'integer',
      default: 2,
      options: [1, 2, 3],
      status: 'proposed',
    },
    {
      id: 'a.flag',
      label: 'f',
      piece: null,
      players: [2],
      type: 'boolean',
      default: false,
      options: [false, true],
      status: 'proposed',
    },
    {
      id: 'a.set',
      label: 's',
      piece: null,
      players: [2],
      type: 'enumSet',
      default: ['x'],
      options: ['x', 'y'],
      status: 'proposed',
    },
    {
      id: 'a.3p',
      label: 't',
      piece: null,
      players: [3],
      type: 'enum',
      default: 'p',
      options: ['p', 'q'],
      status: 'proposed',
    },
    {
      id: 'a.old',
      label: 'o',
      piece: null,
      players: [2],
      type: 'boolean',
      default: false,
      options: [false, true],
      status: 'deprecated',
    },
  ],
};

describe('combinations', () => {
  it('starts with the ruleset as it is, then changes one 2-player parameter at a time', () => {
    const values = { 'a.n': 2, 'a.flag': true, 'a.set': ['x'] };
    expect(combinations(registry, values).map((c) => [c.id, c.overrides])).toEqual([
      ['default', {}],
      ['a.n=1', { 'a.n': 1 }],
      ['a.n=3', { 'a.n': 3 }],
      ['a.flag=false', { 'a.flag': false }],
      ['a.set-x', { 'a.set': [] }],
      ['a.set+y', { 'a.set': ['x', 'y'] }],
    ]);
  });
});

describe('playable', () => {
  const source = loadSource(new URL('../../../', import.meta.url).pathname);

  it('accepts the draft 2-player ruleset', () => {
    expect(playable(source, 'draft-2p', {})).toBeUndefined();
  });

  it('names an unbuilt feature', () => {
    expect(playable(source, 'draft-2p', { 'queen.pawnSwap': true })).toMatch(/queen\.pawnSwap/);
  });

  it('names an invalid value', () => {
    expect(playable(source, 'draft-2p', { 'king.range': 9 })).toMatch(/king\.range/);
  });

  it('sweeps the S40 piece options, each playable, and no longer queen.canEnterVoid', () => {
    const { values } = rulesFor(source, 'standard-2p').rules;
    const ids = combinations(source.registry, values).map((c) => c.id);
    const added = [
      'queen.canCrossVoid=true',
      'queen.canStandOnVoid=true',
      'pawn.canEnterCoast=true',
      'coast.openToAll=true',
    ];
    for (const id of added) expect(ids).toContain(id);
    expect(ids.filter((id) => id.startsWith('queen.canEnterVoid'))).toEqual([]);
    for (const c of combinations(source.registry, values).filter((x) => added.includes(x.id))) {
      expect(playable(source, 'standard-2p', c.overrides), c.id).toBeUndefined();
    }
  });

  it('every real combination is either playable or skipped with a reason', () => {
    const { values } = rulesFor(source, 'draft-2p').rules;
    const all = combinations(source.registry, values);
    expect(all.length).toBeGreaterThan(40);
    for (const c of all) {
      const why = playable(source, 'draft-2p', c.overrides);
      if (why !== undefined) expect(why.length).toBeGreaterThan(0);
    }
  });
});
