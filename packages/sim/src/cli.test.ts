// The command line's options (S24): defaults come from decision 0008.
import { describe, expect, it } from 'vitest';
import { options } from './cli';

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
    });
  });

  it('reads every option', () => {
    const o = options(
      ['--ruleset', 'draft-2p', '--games', '50', '--depths', '1', '--nodes', '300', '--seed', '7',
        '--workers', '2', '--sweep', '--set', 'king.range=1', '--set', 'pawn.safeZones="off"',
        '--out', 'x', '--name', 'y'],
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
    });
  });

  it('reads a bare word as a string value', () => {
    expect(options(['--set', 'pawn.safeZones=off'], 1).overrides).toEqual({ 'pawn.safeZones': 'off' });
  });

  it('refuses a malformed number', () => {
    expect(() => options(['--games', 'lots'], 1)).toThrow(/--games/);
    expect(() => options(['--set', 'nothing'], 1)).toThrow(/--set/);
  });
});
