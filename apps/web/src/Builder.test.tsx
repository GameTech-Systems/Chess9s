import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { newGame, playMove, toNotation } from '@chess9s/engine';
import { App, pageOf } from './App';
import { Builder } from './Builder';
import { RulePicker } from './RulePicker';
import { RulesScreen } from './Rules';
import { computerReply } from './game/bot';
import {
  builderReducer,
  customFrom,
  loadCustoms,
  saveCustoms,
  startBuilder,
  type BuilderAction,
} from './game/custom';
import { loadGuest, saveGuest, type Store } from './game/guest';
import { createRulesFor, customInfo, type CustomRuleset } from './game/rules';
import { PRIVACY_UPDATED } from './Privacy';

const memory = (): Store & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

const draftOf = (base: string, ...actions: BuilderAction[]) =>
  actions.reduce(builderReducer, startBuilder(base));
const render = (draft = startBuilder('standard-2p')) =>
  renderToStaticMarkup(<Builder draft={draft} />);
const control = (html: string, id: string) =>
  new RegExp(`<div class="setting control" data-setting="${id.replace('.', '\\.')}"[^>]*>`).exec(
    html,
  );

describe('Change ruleset page', () => {
  it('is routed at /build', () => {
    expect(pageOf('/build')).toBe('build');
    expect(pageOf('/build/')).toBe('build');
    const html = renderToStaticMarkup(<App path="/build" />);
    expect(html).toContain('Change ruleset');
    expect(html).toContain('Start from');
  });

  it('starts from a preset: the three presets are offered and Standard is chosen', () => {
    const html = render();
    for (const name of ['Standard', 'Good Practice', 'Easy Start']) {
      expect(html).toContain(`>${name}</button>`);
    }
    expect(html).toMatch(/aria-pressed="true">Standard<\/button>/);
    expect(html).toContain('Nothing yet: this is Standard as it is.');
    expect(html).not.toContain('Not fairness-checked together');
  });

  it('has a section per piece group, with the Coast, Center and Turns and draws groups', () => {
    const html = render();
    for (const g of [
      'King',
      'Queen',
      'Pawns',
      'Center',
      'Coast',
      'Dragon Tail',
      'Dragon Heads',
      'Sun and Moon',
      'Turns and draws',
    ]) {
      expect(html).toContain(`<section class="setting-group" aria-label="${g}"><h3>${g}</h3>`);
    }
  });

  it('shows a control for every live 2-player setting, and only 2-player ones', () => {
    const html = render();
    const shown = [...html.matchAll(/data-setting="([^"]+)"/g)].map((m) => m[1]);
    expect(shown).toContain('king.range');
    expect(shown).toContain('coast.2p.initiation');
    expect(shown).not.toContain('coast.3p.exit');
    expect(shown).not.toContain('queen.canEnterVoid');
    expect(new Set(shown).size).toBe(shown.length);
  });

  it('uses a switch for on/off settings, with the option’s label', () => {
    const html = render();
    expect(control(html, 'castling.enabled')![0]).toContain('data-control="switch"');
    expect(html).toMatch(
      /role="switch" class="switch" aria-checked="false" aria-label="Castling[^"]*"/,
    );
    const on = render(
      draftOf('standard-2p', { type: 'set', id: 'queen.canCrossVoid', value: true }),
    );
    expect(on).toMatch(/aria-checked="true" aria-label="Queen crosses the void"/);
    expect(on).toContain('Over empty void squares');
  });

  it('uses a stepper for numbers, disabling the lowest and highest end', () => {
    const html = render();
    expect(control(html, 'king.range')![0]).toContain('data-control="stepper"');
    expect(html).toMatch(/aria-label="Lower King range" disabled=""/);
    expect(html).not.toMatch(/aria-label="Raise King range" disabled/);
    expect(html).toContain('>1 square<');
    const top = render(
      draftOf(
        'standard-2p',
        { type: 'step', id: 'king.range', by: 1 },
        { type: 'step', id: 'king.range', by: 1 },
        { type: 'step', id: 'king.range', by: 1 },
      ),
    );
    expect(top).toMatch(/aria-label="Raise King range" disabled=""/);
    expect(top).toContain('>4 squares<');
  });

  it('uses choices for options, one checked', () => {
    const html = render();
    expect(control(html, 'queen.voidCrossings')![0]).toContain('data-control="choice"');
    expect(html).toMatch(/role="radiogroup" aria-label="Queen void crossings"/);
    expect(html).toMatch(/role="radio" aria-checked="true">A5, E5 and I5</);
    expect(html).toMatch(/role="radio" aria-checked="false">E5 only</);
    expect(html).toMatch(/role="radio" aria-checked="false">Nowhere</);
  });

  it('uses toggles for a set of options, the members pressed', () => {
    const html = render();
    expect(control(html, 'center.passThrough')![0]).toContain('data-control="multi"');
    expect(html).toMatch(/aria-pressed="true">Knight</);
    expect(html).toMatch(/aria-pressed="false">Rook</);
  });

  it('shows pawn safe zones as two switches, the second off while zones are off', () => {
    const html = render();
    expect(control(html, 'pawn.safeZones')![0]).toContain('data-control="safe-zones"');
    expect(html).toMatch(/aria-checked="true" aria-label="Pawn-safe zones"/);
    expect(html).toMatch(/aria-checked="false" aria-label="Safe on any colored square"/);
    const off = render(draftOf('standard-2p', { type: 'set', id: 'pawn.safeZones', value: 'off' }));
    expect(off).toMatch(/aria-checked="false" aria-label="Pawn-safe zones"/);
    expect(off).toMatch(/aria-label="Safe on any colored square" disabled=""/);
    const any = render(
      draftOf('standard-2p', { type: 'set', id: 'pawn.safeZones', value: 'any-colored-square' }),
    );
    expect(any).toMatch(/aria-checked="true" aria-label="Safe on any colored square"/);
  });

  it('puts the two Queen void switches side by side', () => {
    const html = render();
    expect(html).toMatch(
      /class="control-row"><div class="setting control" data-setting="queen.canCrossVoid"[\s\S]*?<div class="setting control" data-setting="queen.canStandOnVoid"/,
    );
  });

  it('shows a one-option setting as fixed text, not a control', () => {
    const html = render();
    expect(control(html, 'dragon.rangeMode')![0]).toContain('data-control="fixed"');
    expect(html).toContain('Fixed: ');
  });

  it('lists what differs from the preset and marks those settings', () => {
    const html = render(
      draftOf(
        'standard-2p',
        { type: 'step', id: 'king.range', by: 1 },
        { type: 'set', id: 'draw.fiftyMove', value: false },
      ),
    );
    expect(html).toContain(
      '<li data-diff="king.range"><strong>King range</strong>: 1 square → 2 squares</li>',
    );
    expect(html).toContain('data-diff="draw.fiftyMove"');
    expect(control(html, 'king.range')![0]).toContain('data-changed=""');
    expect(control(html, 'castling.enabled')![0]).not.toContain('data-changed');
    expect(html).toContain('What differs from Standard');
  });

  it('flags combinations that share systems and are not fairness-checked', () => {
    const html = render(
      draftOf('standard-2p', { type: 'set', id: 'castling.enabled', value: true }),
    );
    expect(html).toContain('Not fairness-checked together');
    expect(html).toContain('data-flag="castling.enabled+king.range"');
    expect(html).toContain('check-detection, movement');
  });

  it('says what the build cannot play yet', () => {
    const html = render(draftOf('standard-2p', { type: 'set', id: 'queen.pawnSwap', value: true }));
    expect(html).toContain('Not in this build yet:');
    expect(html).toContain('Queen and pawn swap');
  });

  it('will not save or play without a name, and says so', () => {
    const html = render();
    expect(html).toMatch(/class="again" disabled="">Save and play</);
    expect(html).toContain('Give the ruleset a name.');
    const named = render({ ...startBuilder('standard-2p'), name: 'Mine' });
    expect(named).not.toMatch(/disabled="">Save and play/);
    expect(named).toContain('value="Mine"');
  });

  it('opens a saved ruleset for editing with its name and values', () => {
    const c: CustomRuleset = {
      id: 'custom-1',
      name: 'Wide',
      base: 'standard-2p',
      overrides: { 'king.range': 3 },
    };
    const html = renderToStaticMarkup(<Builder saved={c} />);
    expect(html).toContain('value="Wide"');
    expect(html).toContain('>3 squares<');
    expect(html).toContain('data-diff="king.range"');
  });
});

describe('the picker with the player’s own rulesets', () => {
  const info = customInfo({ id: 'custom-1', name: 'Wide', overrides: { 'king.range': 3 } });

  it('offers to build one, and says when there are none', () => {
    const html = renderToStaticMarkup(<RulePicker onPick={() => {}} />);
    expect(html).toContain('Build a ruleset');
    expect(html).toContain('None yet');
  });

  it('lists a saved ruleset as proposed, with Play, Rules, Edit and Delete', () => {
    const html = renderToStaticMarkup(<RulePicker onPick={() => {}} customs={[info]} />);
    expect(html).toContain('Your own ruleset');
    expect(html).toMatch(/data-status="proposed">proposed</);
    expect(html).toContain('>Edit<');
    expect(html).toContain('>Delete<');
    expect(html).toContain('href="/rules/custom-1"');
    expect(html).not.toContain('None yet');
  });
});

describe('a ruleset built from Standard, played against the computer, found again after a reload', () => {
  const build = () => {
    let s = startBuilder('standard-2p');
    for (const a of [
      { type: 'name', name: 'Castle Walk' },
      { type: 'set', id: 'castling.enabled', value: true },
      { type: 'set', id: 'queen.canCrossVoid', value: true },
    ] as BuilderAction[]) {
      s = builderReducer(s, a);
    }
    return customFrom(s, 'custom-1');
  };

  it('is saved, then listed on the picker and on its rules page by a new App on the same store', () => {
    const store = memory();
    saveCustoms(store, [build()]);
    // A reload: nothing but the browser's storage carries over.
    const picker = renderToStaticMarkup(<App path="/" store={store} />);
    expect(picker).toContain('Castle Walk');
    expect(picker).toContain('Your own ruleset');
    const page = renderToStaticMarkup(<App path="/rules/custom-1" store={store} />);
    expect(page).toContain('Castle Walk');
    expect(page).toContain('Queen crosses the void');
    expect(page).toMatch(/data-setting="castling.enabled" data-changed=""/);
    expect(page).not.toContain('rules/rulesets/custom-1.json');
    // Another browser has nothing.
    expect(renderToStaticMarkup(<App path="/rules/custom-1" store={memory()} />)).toContain(
      'No ruleset called',
    );
  });

  it('is played by the computer from the overrides alone, and the game replays after a reload', () => {
    const store = memory();
    saveCustoms(store, [build()]);
    const info = customInfo(loadCustoms(store)[0]!);
    const rules = createRulesFor(info);
    expect(rules.values['castling.enabled']).toBe(true);
    let game = newGame(rules, info);
    // Light's side is the player; here the dark side moves first, then the computer answers.
    game = playMove(game, game.legal[0]!);
    const reply = computerReply(
      game.ruleset,
      game.moves.map((m) => m.notation),
      () => 0,
      100,
    );
    expect(game.legal.map(toNotation)).toContain(reply);
    game = playMove(
      game,
      game.legal.find((m) => toNotation(m) === reply)!,
    );
    saveGuest(store, { game, mode: 'computer' });

    const back = loadGuest(store, createRulesFor(info), info)!;
    expect(back.mode).toBe('computer');
    expect(back.game.moves).toHaveLength(2);
  });

  it('the rules dialog of a custom ruleset lists what it changes and links nowhere private', () => {
    const info = customInfo(build());
    const html = renderToStaticMarkup(
      <RulesScreen ruleset={info} missing={[]} onClose={() => {}} />,
    );
    expect(html).toContain('Castle Walk');
    expect(html).toContain('Queen crosses the void');
    expect(html).not.toContain('Full rules for');
  });
});

describe('privacy page covers the saved rulesets', () => {
  it('names the storage key and carries the new date', () => {
    const html = renderToStaticMarkup(<App path="/privacy" />);
    expect(html).toContain('chess9s.rulesets');
    expect(PRIVACY_UPDATED).toBe('25 October 2026');
    expect(html).toContain('Last updated 25 October 2026');
  });
});
