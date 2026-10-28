// The command line's options (S24): defaults come from decision 0008.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { addRulesetFile, options, planJobs, repoRoot } from './cli';
import { planJobs3, runReports3 } from './cli3';
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

describe('3 players (S58, S59)', () => {
  const source = () => loadSource(repoRoot(fileURLToPath(new URL('.', import.meta.url))));
  const three = (...args: string[]) => options(['--players', '3', ...args], 1);

  it('--players 3 plays standard-3p with the search at depths 1 and 2, 2,000 games', () => {
    expect(options(['--players', '3'], 2)).toMatchObject({
      players: 3,
      ruleset: 'standard-3p',
      games: 2000,
      depths: [1, 2],
      name: 'standard-3p',
    });
    expect(options(['--players', '3'], 2)).not.toHaveProperty('mode');
  });

  it('keeps the 2-player defaults without --players, and takes --games as given', () => {
    expect(options([], 2)).not.toHaveProperty('players');
    expect(three('--games', '7').games).toBe(7);
    expect(options(['--players', '2'], 2)).toMatchObject({
      players: 2,
      ruleset: 'draft-2p',
      games: 2000,
    });
  });

  it('refuses a player count that is not 2 or 3, and a ruleset file for 3 players', () => {
    expect(() => options(['--players', '4'], 1)).toThrow(/--players needs 2 or 3/);
    expect(() => three('--ruleset-file', 'x.json')).toThrow(/2-player/);
  });

  it('plans a search run per depth with a seed per game, under decision 0015', () => {
    const o = three('--ruleset', 'easy-3p', '--games', '3', '--seed', '10', '--nodes', '500');
    const plan = planJobs3(o, source());
    expect(plan).toMatchObject({ players: 3, mode: 'search', ruleset: { id: 'easy-3p' } });
    expect(plan.jobs.map((j) => [j.combination, j.depth, j.seeds])).toEqual([
      ['default', 1, [10, 11, 12]],
      ['default', 2, [10, 11, 12]],
    ]);
    expect(plan.jobs[1]!.options).toEqual({
      openingPlies: 6,
      maxPlies: 2000,
      search: { depth: 2, nodes: 500 },
    });
  });

  it('--greedy-dragon and --greedy name their reports and say who plays', () => {
    const mixed = three('--greedy-dragon', '--depths', '1');
    expect(mixed).toMatchObject({ mode: 'greedy-dragon', name: 'standard-3p.greedy-dragon' });
    const plan = planJobs3(mixed, source());
    expect(plan.jobs.map((j) => j.options)).toEqual([
      { openingPlies: 6, maxPlies: 2000, search: { depth: 1, nodes: 100000 }, greedyDragon: true },
    ]);
    const greedy = three('--greedy');
    expect(greedy).toMatchObject({ mode: 'greedy', name: 'standard-3p.greedy' });
    expect(planJobs3(greedy, source()).jobs.map((j) => [j.depth, j.options])).toEqual([
      [0, { openingPlies: 6, maxPlies: 2000 }],
    ]);
    expect(() => three('--greedy', '--greedy-dragon')).toThrow(/not both/);
    expect(() => options(['--players', '2', '--greedy'], 1)).toThrow(/3-player option/);
  });

  it('sweeps every 3-player parameter and shards the seeds as for 2 players', () => {
    const o = three('--sweep', '--depths', '1', '--games', '5', '--shard', '2/2');
    const plan = planJobs3(o, source());
    const ids = plan.jobs.map((j) => j.combination);
    expect(ids[0]).toBe('default');
    expect(ids).toContain('dragonHead.range=3');
    expect(ids).toContain('endings.3p=first-checkmate');
    expect(plan.jobs.find((j) => j.combination === 'endings.3p=first-checkmate')!.own).toEqual({
      'endings.3p': 'first-checkmate',
      'dragon.3p.givesCheck': true,
    });
    expect(plan.jobs[0]!.seeds).toEqual([2, 4]);
    expect(plan.skipped.map((s) => s.combination)).toEqual([
      'queen.pawnSwap=true',
      'coast.3p.exit=a5-always',
      'setup.swapKingQueen=true',
    ]);
    for (const s of plan.skipped) expect(s.reason).toMatch(/not built yet/);
  });

  it('refuses a 2-player ruleset', () => {
    expect(() => planJobs3(three('--ruleset', 'draft-2p'), source())).toThrow(/2-player ruleset/);
  });

  it('reports the games in seed order', () => {
    const o = three('--games', '2', '--depths', '1');
    const plan = planJobs3(o, source());
    const game = (seed: number) => ({
      seed,
      order: ['dark', 'light', 'dragon'],
      dragon: 'dragon',
      outcome: 'draw' as const,
      winner: null,
      loser: null,
      reason: 'stalemate' as const,
      between: ['dark', 'light'],
      events: [],
      plies: seed,
      key: String(seed),
    });
    const [run] = runReports3(o, plan, [[game(2), game(1)]], [1500]);
    expect(run).toMatchObject({ combination: 'default', depth: 1, seconds: 2 });
    expect(run!.summary).toMatchObject({ games: 2, draws: 2, plies: { min: 1, max: 2 } });
  });
});
