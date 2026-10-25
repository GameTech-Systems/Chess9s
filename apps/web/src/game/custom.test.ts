import { describe, expect, it } from 'vitest';
import { newGame, playMove, toNotation } from '@chess9s/engine';
import {
  CUSTOMS_KEY,
  builderReducer,
  controlKind,
  customFrom,
  differences,
  flaggedInteractions,
  loadCustoms,
  nameProblem,
  newCustomId,
  safeZonesSwitches,
  safeZonesValue,
  saveCustoms,
  startBuilder,
  unbuiltIn,
} from './custom';
import { loadGuest, saveGuest, type Store } from './guest';
import {
  createRulesFor,
  customInfo,
  findRuleset,
  listRulesets,
  rulesetValues,
  settingsFor,
} from './rules';

const memory = (): Store & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

const setting = (values: Record<string, unknown>, id: string) =>
  settingsFor(values as never).find((s) => s.id === id)!;

describe('starting from a preset', () => {
  it('starts from the preset’s own values, with the preset named as the base', () => {
    const s = startBuilder('standard-2p');
    expect(s.base).toBe('standard-2p');
    expect(s.values).toEqual(rulesetValues('standard-2p'));
    expect(s.values['king.range']).toBe(1);
    expect(differences(rulesetValues('standard-2p'), s.values)).toEqual([]);
  });

  it('changing the preset replaces the values and keeps the name', () => {
    let s = startBuilder('standard-2p');
    s = builderReducer(s, { type: 'name', name: 'Mine' });
    s = builderReducer(s, { type: 'base', base: 'draft-2p' });
    expect(s.values['king.range']).toBe(2);
    expect(s.name).toBe('Mine');
    // Unknown or unplayable presets change nothing.
    expect(builderReducer(s, { type: 'base', base: 'draft-3p' })).toBe(s);
    expect(builderReducer(s, { type: 'base', base: 'nope' })).toBe(s);
  });
});

describe('one control per parameter type', () => {
  it('maps every live 2-player parameter to a control kind', () => {
    const kinds = new Set(settingsFor(rulesetValues('standard-2p')).map(controlKind));
    expect(kinds).toEqual(new Set(['switch', 'stepper', 'choice', 'multi', 'fixed', 'safe-zones']));
    const s = (id: string) => setting(rulesetValues('standard-2p'), id);
    expect(controlKind(s('castling.enabled'))).toBe('switch');
    expect(controlKind(s('king.range'))).toBe('stepper');
    expect(controlKind(s('queen.voidCrossings'))).toBe('choice');
    expect(controlKind(s('center.passThrough'))).toBe('multi');
    expect(controlKind(s('dragon.rangeMode'))).toBe('fixed');
    expect(controlKind(s('pawn.safeZones'))).toBe('safe-zones');
  });

  it('a switch sets either option and ignores anything else', () => {
    let s = startBuilder('standard-2p');
    s = builderReducer(s, { type: 'set', id: 'castling.enabled', value: true });
    expect(s.values['castling.enabled']).toBe(true);
    s = builderReducer(s, { type: 'set', id: 'castling.enabled', value: false });
    expect(s.values['castling.enabled']).toBe(false);
    expect(builderReducer(s, { type: 'set', id: 'castling.enabled', value: 'maybe' })).toBe(s);
    expect(builderReducer(s, { type: 'set', id: 'no.such', value: true })).toBe(s);
  });

  it('a choice sets any option of an enum, and nothing outside its options', () => {
    let s = startBuilder('standard-2p');
    for (const value of ['a5-e5-i5', 'e5-only', 'none']) {
      s = builderReducer(s, { type: 'set', id: 'queen.voidCrossings', value });
      expect(s.values['queen.voidCrossings']).toBe(value);
    }
    expect(builderReducer(s, { type: 'set', id: 'queen.voidCrossings', value: 'x' })).toBe(s);
  });

  it('a stepper moves through the options in order and stops at the ends', () => {
    let s = startBuilder('standard-2p');
    expect(s.values['king.range']).toBe(1);
    expect(builderReducer(s, { type: 'step', id: 'king.range', by: -1 })).toBe(s);
    for (const want of [2, 3, 4, 4]) {
      s = builderReducer(s, { type: 'step', id: 'king.range', by: 1 });
      expect(s.values['king.range']).toBe(want);
    }
    s = builderReducer(s, { type: 'step', id: 'king.range', by: -1 });
    expect(s.values['king.range']).toBe(3);
    // Options listed out of order (tail.repeatLimit: 1, 0) still step from low to high.
    s = startBuilder('standard-2p');
    expect(s.values['tail.repeatLimit']).toBe(1);
    s = builderReducer(s, { type: 'step', id: 'tail.repeatLimit', by: -1 });
    expect(s.values['tail.repeatLimit']).toBe(0);
    // A step on something that is not a stepper does nothing.
    expect(builderReducer(s, { type: 'step', id: 'castling.enabled', by: 1 })).toBe(s);
  });

  it('a multi-choice adds and removes members, keeping the registry order', () => {
    let s = startBuilder('standard-2p');
    s = builderReducer(s, { type: 'toggle', id: 'center.passThrough', option: 'bishop' });
    expect(s.values['center.passThrough']).toEqual([
      'dragon-head',
      'queen',
      'king',
      'sun-moon-pawn',
      'knight',
      'bishop',
    ]);
    s = builderReducer(s, { type: 'toggle', id: 'center.passThrough', option: 'queen' });
    expect(s.values['center.passThrough']).not.toContain('queen');
    s = builderReducer(s, { type: 'toggle', id: 'center.passThrough', option: 'queen' });
    expect((s.values['center.passThrough'] as string[]).indexOf('queen')).toBe(1);
    expect(builderReducer(s, { type: 'toggle', id: 'center.passThrough', option: 'dragon' })).toBe(
      s,
    );
    expect(builderReducer(s, { type: 'toggle', id: 'castling.enabled', option: true })).toBe(s);
  });

  it('pawn safe zones are two switches: on or off, and on any colored square', () => {
    expect(safeZonesSwitches('starting-file')).toEqual({ on: true, any: false });
    expect(safeZonesSwitches('any-colored-square')).toEqual({ on: true, any: true });
    expect(safeZonesSwitches('off')).toEqual({ on: false, any: false });
    expect(safeZonesValue({ on: true, any: false })).toBe('starting-file');
    expect(safeZonesValue({ on: true, any: true })).toBe('any-colored-square');
    expect(safeZonesValue({ on: false, any: true })).toBe('off');
    // The two switches reach all three registry options.
    const options = new Set(
      [false, true].flatMap((on) => [false, true].map((any) => safeZonesValue({ on, any }))),
    );
    expect(options).toEqual(
      new Set(setting(rulesetValues('standard-2p'), 'pawn.safeZones').options),
    );
  });
});

describe('what differs from the starting preset', () => {
  it('lists each changed setting with the preset’s value and the new one, as players read them', () => {
    let s = startBuilder('standard-2p');
    s = builderReducer(s, { type: 'step', id: 'king.range', by: 1 });
    s = builderReducer(s, { type: 'set', id: 'queen.canCrossVoid', value: true });
    const diff = differences(rulesetValues('standard-2p'), s.values);
    expect(diff.map((d) => d.id)).toEqual(['king.range', 'queen.canCrossVoid']);
    expect(diff[0]).toMatchObject({ label: 'King range', from: '1 square', to: '2 squares' });
    expect(diff[1]).toMatchObject({
      from: 'Never over a void square',
      to: 'Over empty void squares',
    });
    // Setting a value back removes it from the list.
    s = builderReducer(s, { type: 'step', id: 'king.range', by: -1 });
    expect(differences(rulesetValues('standard-2p'), s.values).map((d) => d.id)).toEqual([
      'queen.canCrossVoid',
    ]);
  });
});

describe('combinations that share systems and are not fairness-checked', () => {
  const set = (base: string, id: string, value: unknown) =>
    builderReducer(startBuilder(base), { type: 'set', id, value: value as never });

  it('flags nothing for a preset as it is', () => {
    for (const id of ['standard-2p', 'draft-2p', 'easy-2p']) {
      expect(flaggedInteractions(rulesetValues(id), rulesetValues(id))).toEqual([]);
    }
  });

  it('flags nothing for one change when no other setting is off its default', () => {
    // Good Practice plays every default, so castling stands alone.
    const s = set('draft-2p', 'castling.enabled', true);
    expect(flaggedInteractions(rulesetValues('draft-2p'), s.values)).toEqual([]);
  });

  it('flags a change that shares systems with a setting the preset already moved off its default', () => {
    // Standard sets king.range = 1; castling also affects movement and check detection.
    const s = set('standard-2p', 'castling.enabled', true);
    const flags = flaggedInteractions(rulesetValues('standard-2p'), s.values);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      a: 'castling.enabled',
      b: 'king.range',
      aLabel: setting(s.values, 'castling.enabled').label,
      bLabel: 'King range',
      shared: ['check-detection', 'movement'],
    });
  });

  it('does not flag a change that shares no system with the settings that are off their default', () => {
    // Easy Start moves several movement settings; the fifty-move rule only affects game-end.
    const s = set('easy-2p', 'draw.fiftyMove', false);
    expect(flaggedInteractions(rulesetValues('easy-2p'), s.values)).toEqual([]);
  });

  it('does not re-flag pairs the preset already had', () => {
    // Easy Start moves king.range and castling together; only the pairs with the new change count.
    const s = set('easy-2p', 'king.canJump', true);
    const flags = flaggedInteractions(rulesetValues('easy-2p'), s.values);
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.every((f) => f.a === 'king.canJump' || f.b === 'king.canJump')).toBe(true);
  });

  it('lists each pair once, in id order', () => {
    let s = startBuilder('draft-2p');
    for (const id of ['castling.enabled', 'king.canJump', 'queen.canCrossVoid']) {
      s = builderReducer(s, { type: 'set', id, value: true });
    }
    const flags = flaggedInteractions(rulesetValues('draft-2p'), s.values);
    expect(flags.map((f) => `${f.a}+${f.b}`)).toEqual([
      'castling.enabled+king.canJump',
      'castling.enabled+queen.canCrossVoid',
      'king.canJump+queen.canCrossVoid',
    ]);
  });
});

describe('naming and saving a custom ruleset', () => {
  it('needs a name of at most 40 characters', () => {
    expect(nameProblem('')).toMatch(/name/i);
    expect(nameProblem('   ')).toMatch(/name/i);
    expect(nameProblem('x'.repeat(41))).toMatch(/40/);
    expect(nameProblem('My rules')).toBeNull();
  });

  it('is a proposed ruleset named by the player, never official, with the full overrides', () => {
    let s = startBuilder('standard-2p');
    s = builderReducer(s, { type: 'name', name: '  Wide King  ' });
    s = builderReducer(s, { type: 'step', id: 'king.range', by: 1 });
    s = builderReducer(s, { type: 'step', id: 'king.range', by: 1 });
    s = builderReducer(s, { type: 'set', id: 'pawn.safeZones', value: 'off' });
    const c = customFrom(s, 'custom-1');
    expect(c).toMatchObject({ id: 'custom-1', name: 'Wide King', base: 'standard-2p' });
    // Overrides are every value that differs from the registry default, not just the changes.
    expect(c.overrides).toEqual({ 'king.range': 3, 'pawn.safeZones': 'off' });
    const info = customInfo(c);
    expect(info).toMatchObject({
      id: 'custom-1',
      name: 'Wide King',
      status: 'proposed',
      players: 2,
      playable: true,
      custom: true,
      isDefault: false,
    });
    expect(info.overrides).toEqual(c.overrides);
  });

  it('refuses a draft with no name', () => {
    expect(() => customFrom(startBuilder('standard-2p'), 'custom-1')).toThrow(/name/i);
  });

  it('plays the values it was built with', () => {
    let s = startBuilder('standard-2p');
    s = builderReducer(s, { type: 'name', name: 'Castles' });
    s = builderReducer(s, { type: 'set', id: 'castling.enabled', value: true });
    s = builderReducer(s, { type: 'set', id: 'queen.canCrossVoid', value: true });
    const info = customInfo(customFrom(s, 'custom-1'));
    const rules = createRulesFor(info);
    expect(rules.values).toEqual(s.values);
    expect(rules.players).toBe(2);
    const game = newGame(rules, info);
    expect(game.ruleset.overrides).toEqual(info.overrides);
  });

  it('a custom ruleset is not in the list of bundled rulesets, and is never the default', () => {
    expect(listRulesets().some((r) => r.custom)).toBe(false);
    expect(findRuleset('custom-1')).toBeUndefined();
  });

  it('picks the lowest unused id', () => {
    expect(newCustomId([])).toBe('custom-1');
    expect(newCustomId(['custom-1', 'custom-3'])).toBe('custom-2');
  });

  it('lists what the build cannot play yet for a draft', () => {
    let s = startBuilder('standard-2p');
    expect(unbuiltIn(s.values)).toEqual([]);
    s = builderReducer(s, { type: 'set', id: 'queen.pawnSwap', value: true });
    expect(unbuiltIn(s.values)).toEqual(['Queen and pawn swap']);
  });
});

describe('custom rulesets kept in the browser', () => {
  const make = (id: string, name: string, edit: Parameters<typeof builderReducer>[1][] = []) => {
    let s = builderReducer(startBuilder('standard-2p'), { type: 'name', name });
    for (const a of edit) s = builderReducer(s, a);
    return customFrom(s, id);
  };

  it('saves and loads the list, and a reload finds it', () => {
    const store = memory();
    const list = [
      make('custom-1', 'One', [{ type: 'set', id: 'castling.enabled', value: true }]),
      make('custom-2', 'Two'),
    ];
    saveCustoms(store, list);
    expect(store.data.has(CUSTOMS_KEY)).toBe(true);
    expect(loadCustoms(store)).toEqual(list);
    // The same data, loaded as a different ruleset, is the same game rules.
    expect(createRulesFor(customInfo(loadCustoms(store)[0]!)).values['castling.enabled']).toBe(
      true,
    );
  });

  it('has an empty list when nothing is saved, the store is missing or it throws', () => {
    expect(loadCustoms(memory())).toEqual([]);
    expect(loadCustoms(null)).toEqual([]);
    const broken: Store = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {},
    };
    expect(loadCustoms(broken)).toEqual([]);
    expect(() => saveCustoms(broken, [make('custom-1', 'x')])).not.toThrow();
    expect(() => saveCustoms(null, [])).not.toThrow();
  });

  it('drops damaged entries, and keeps the good ones', () => {
    const store = memory();
    const good = make('custom-1', 'Good');
    store.setItem(
      CUSTOMS_KEY,
      JSON.stringify({
        v: 1,
        rulesets: [
          good,
          {
            id: 'custom-2',
            name: 'Bad value',
            base: 'standard-2p',
            overrides: { 'king.range': 9 },
          },
          { id: 'custom-3', name: 'Unknown', base: 'standard-2p', overrides: { 'no.such': 1 } },
          { id: 'Not An Id', name: 'x', base: 'standard-2p', overrides: {} },
          { id: 'custom-4', name: '', base: 'standard-2p', overrides: {} },
          { id: 'custom-1', name: 'Dup', base: 'standard-2p', overrides: {} },
          'nope',
          null,
        ],
      }),
    );
    expect(loadCustoms(store)).toEqual([good]);
    for (const bad of ['{', '[]', '{"v":2,"rulesets":[]}', '{"v":1}', '{"v":1,"rulesets":3}']) {
      store.setItem(CUSTOMS_KEY, bad);
      expect(loadCustoms(store)).toEqual([]);
    }
  });

  it('a base that no longer exists falls back to the default preset', () => {
    const store = memory();
    store.setItem(
      CUSTOMS_KEY,
      JSON.stringify({
        v: 1,
        rulesets: [{ id: 'custom-1', name: 'A', base: 'gone-2p', overrides: { 'king.range': 3 } }],
      }),
    );
    expect(loadCustoms(store)[0]!.base).toBe('standard-2p');
  });

  it('editing keeps the id; the draft starts from the saved values', () => {
    const c = make('custom-1', 'One', [{ type: 'step', id: 'king.range', by: 1 }]);
    const s = startBuilder(c.base, c);
    expect(s.id).toBe('custom-1');
    expect(s.name).toBe('One');
    expect(s.values['king.range']).toBe(2);
    expect(customFrom(s, s.id!)).toEqual(c);
  });
});

describe('saved games of a custom ruleset replay', () => {
  it('a game keeps the full overrides in its save and loads only under the same rules', () => {
    let s = builderReducer(startBuilder('standard-2p'), { type: 'name', name: 'Wide' });
    s = builderReducer(s, { type: 'step', id: 'king.range', by: 1 });
    const info = customInfo(customFrom(s, 'custom-1'));
    const rules = createRulesFor(info);
    let game = newGame(rules, info);
    game = playMove(game, game.legal[0]!);
    game = playMove(game, game.legal[0]!);

    const store = memory();
    saveGuest(store, { game, mode: 'computer' });
    const raw = JSON.parse(store.getItem('chess9s.guest')!);
    expect(raw.overrides).toEqual(info.overrides);

    const back = loadGuest(store, rules, info)!;
    expect(back.game.moves.map((m) => toNotation(m))).toEqual(game.moves.map((m) => toNotation(m)));
    expect(back.game.ruleset.overrides).toEqual(info.overrides);

    // The same id with different overrides is a different ruleset: the old game is not loaded.
    const edited = customInfo(
      customFrom(builderReducer(s, { type: 'step', id: 'king.range', by: 1 }), 'custom-1'),
    );
    expect(loadGuest(store, createRulesFor(edited), edited)).toBeNull();
  });

  it('a bundled ruleset’s save is unchanged: no overrides', () => {
    const info = listRulesets().find((r) => r.id === 'standard-2p')!;
    const game = newGame(createRulesFor(info), info);
    const store = memory();
    saveGuest(store, { game, mode: 'hot-seat' });
    expect(JSON.parse(store.getItem('chess9s.guest')!)).not.toHaveProperty('overrides');
  });
});

describe('replacing the draft', () => {
  it('swaps in a loaded draft', () => {
    const loaded = { ...startBuilder('draft-2p'), name: 'Loaded' };
    expect(builderReducer(startBuilder('standard-2p'), { type: 'replace', state: loaded })).toBe(
      loaded,
    );
  });
});
