// The command line's options (S24): defaults come from decision 0008.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { addRulesetFile, options, planJobs, repoRoot } from './cli';
import { plan3, report3 } from './cli3';
import { loadSource, rulesFor } from './load';

describe('options', () => {
  it('defaults to the D12 measures for the draft 2-player ruleset', () => {
    expect(options([], 4)).toEqual({
      ruleset: 'draft-2p',
      games: 2000,
      depths: [1, 2],
      nodes: 100000,
      seed: 1,
      workers: 4,
      sweep: false,
      overrides: {},
      out: 'docs/fairness',
      name: 'draft-2p',
      report: undefined,
    });
  });

  it('reads every option', () => {
    const o = options(
      [
        '--ruleset',
        'draft-2p',
        '--games',
        '50',
        '--depths',
        '1',
        '--nodes',
        '300',
        '--seed',
        '7',
        '--workers',
        '2',
        '--sweep',
        '--set',
        'king.range=1',
        '--set',
        'pawn.safeZones="off"',
        '--out',
        'x',
        '--name',
        'y',
        '--report',
        'r.json',
      ],
      4,
    );
    expect(o).toEqual({
      ruleset: 'draft-2p',
      games: 50,
      depths: [1],
      nodes: 300,
      seed: 7,
      workers: 2,
      sweep: true,
      overrides: { 'king.range': 1, 'pawn.safeZones': 'off' },
      out: 'x',
      name: 'y',
      report: 'r.json',
    });
  });

  it('reads a shard as K/N', () => {
    expect(options(['--shard', '3/20'], 1).shard).toEqual({ index: 3, count: 20 });
    expect(options([], 1).shard).toBeUndefined();
    for (const bad of ['0/4', '5/4', '1', 'a/b', '1/0']) {
      expect(() => options(['--shard', bad], 1)).toThrow(/--shard/);
    }
  });

  it('reads a bare word as a string value', () => {
    expect(options(['--set', 'pawn.safeZones=off'], 1).overrides).toEqual({
      'pawn.safeZones': 'off',
    });
  });

  it('refuses a malformed number', () => {
    expect(() => options(['--games', 'lots'], 1)).toThrow(/--games/);
    expect(() => options(['--set', 'nothing'], 1)).toThrow(/--set/);
  });
});

describe('--ruleset-file (S43)', () => {
  const source = () => loadSource(repoRoot(fileURLToPath(new URL('.', import.meta.url))));
  const file = (patch: object = {}) =>
    JSON.stringify({
      id: 'custom-1',
      name: 'My Rules',
      version: '1.0.0',
      status: 'official',
      players: 2,
      overrides: { 'king.range': 1, 'castling.enabled': true },
      ...patch,
    });

  it('reads the path, and refuses it with --ruleset', () => {
    const o = options(['--ruleset-file', 'mine.json'], 1);
    expect(o.rulesetFile).toBe('mine.json');
    expect(() => options(['--ruleset-file', 'a.json', '--ruleset', 'draft-2p'], 1)).toThrow(
      /--ruleset-file/,
    );
  });

  it('plays the file as a proposed ruleset under its own id, never a bundled one', () => {
    const src = source();
    const o = addRulesetFile(options(['--ruleset-file', 'x.json', '--games', '2'], 1), src, file());
    expect(o.ruleset).toBe('submitted-my-rules');
    expect(o.name).toBe('submitted-my-rules');
    const { rules, ruleset } = rulesFor(src, o.ruleset);
    expect(ruleset).toEqual({ id: 'submitted-my-rules', version: '1.0.0' });
    expect(rules.values['king.range']).toBe(1);
    expect(rules.values['castling.enabled']).toBe(true);
    expect(src.rulesets[o.ruleset]!.status).toBe('proposed');
    // Workers load their own rules, so each job carries the file's ruleset.
    const plan = planJobs(o, src);
    expect(plan.jobs.length).toBe(2);
    for (const j of plan.jobs) expect(j.ruleset).toEqual(src.rulesets[o.ruleset]);
  });

  it('keeps --name, and never collides with a bundled ruleset', () => {
    const src = source();
    const o = addRulesetFile(
      options(['--ruleset-file', 'x.json', '--name', 'report'], 1),
      src,
      file({ name: 'Standard 2P' }),
    );
    expect(o.name).toBe('report');
    expect(o.ruleset).toBe('submitted-standard-2p');
    expect(src.rulesets['standard-2p']!.status).toBe('candidate');
  });

  it('refuses a file the builder would refuse, with the same message', () => {
    const o = options(['--ruleset-file', 'x.json'], 1);
    expect(() => addRulesetFile(o, source(), file({ overrides: { 'made.up': 1 } }))).toThrow(
      /made\.up/,
    );
    expect(() => addRulesetFile(o, source(), file({ extends: 'standard-2p' }))).toThrow(/extends/);
    expect(() => addRulesetFile(o, source(), '{nope')).toThrow(/not a ruleset file/i);
  });

  it('refuses a file the engine cannot play yet', () => {
    const o = options(['--ruleset-file', 'x.json'], 1);
    expect(() =>
      addRulesetFile(o, source(), file({ overrides: { 'queen.pawnSwap': true } })),
    ).toThrow(/not built yet/);
  });
});

describe('3 players (S58)', () => {
  const source = () => loadSource(repoRoot(fileURLToPath(new URL('.', import.meta.url))));

  it('--players 3 plays standard-3p, 100 greedy games by default', () => {
    expect(options(['--players', '3'], 2)).toMatchObject({
      players: 3,
      ruleset: 'standard-3p',
      games: 100,
      name: 'standard-3p',
    });
  });

  it('keeps the 2-player defaults without --players, and takes --games as given', () => {
    expect(options([], 2)).not.toHaveProperty('players');
    expect(options(['--players', '3', '--games', '7'], 2).games).toBe(7);
    expect(options(['--players', '2'], 2)).toMatchObject({
      players: 2,
      ruleset: 'draft-2p',
      games: 2000,
    });
  });

  it('refuses a player count that is not 2 or 3, and a ruleset file for 3 players', () => {
    expect(() => options(['--players', '4'], 1)).toThrow(/--players needs 2 or 3/);
    expect(() => options(['--players', '3', '--ruleset-file', 'x.json'], 1)).toThrow(/2-player/);
  });

  it('plans one run with a seed per game', () => {
    const o = options(
      ['--players', '3', '--ruleset', 'easy-3p', '--games', '3', '--seed', '10'],
      2,
    );
    const { job, ruleset } = plan3(o, source());
    expect(ruleset.id).toBe('easy-3p');
    expect(job).toMatchObject({ players: 3, rulesetId: 'easy-3p', seeds: [10, 11, 12] });
  });

  it('refuses 2-player options and a 2-player ruleset', () => {
    const src = source();
    const three = (...args: string[]) => options(['--players', '3', ...args], 1);
    expect(() => plan3(three('--sweep'), src)).toThrow(/2-player/);
    expect(() => plan3(three('--shard', '1/2'), src)).toThrow(/2-player/);
    expect(() => plan3(three('--ruleset', 'draft-2p'), src)).toThrow(/2-player ruleset/);
  });

  it('reports the games in seed order', () => {
    const o = options(['--players', '3', '--games', '2'], 1);
    const plan = plan3(o, source());
    const game = (seed: number) => ({
      seed,
      order: ['dark', 'light', 'dragon'],
      outcome: 'draw' as const,
      winner: null,
      loser: null,
      reason: 'stalemate' as const,
      plies: seed,
      key: String(seed),
    });
    const report = report3(plan, '2026-10-27', [game(2), game(1)]);
    expect(report).toMatchObject({ date: '2026-10-27', games: 2, draws: 2 });
    expect(report.ruleset.id).toBe('standard-3p');
  });
});
