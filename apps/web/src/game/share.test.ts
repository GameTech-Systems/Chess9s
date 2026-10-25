import { describe, expect, it } from 'vitest';
import { builderReducer, customFrom, startBuilder, type BuilderState } from './custom';
import {
  MAX_FILE_BYTES,
  MAX_LINK_CHARS,
  SHARE_PATH,
  exportFile,
  inviteMailto,
  matchingOfficial,
  parseRulesetFile,
  parseShareLink,
  shareLink,
} from './share';
import { rulesetValues } from './rules';

const mine = (): BuilderState => {
  let s = startBuilder('standard-2p');
  s = builderReducer(s, { type: 'name', name: 'Mine' });
  s = builderReducer(s, { type: 'step', id: 'king.range', by: 1 });
  s = builderReducer(s, { type: 'set', id: 'castling.enabled', value: true });
  s = builderReducer(s, { type: 'toggle', id: 'center.passThrough', option: 'bishop' });
  return s;
};

const refused = (r: ReturnType<typeof parseRulesetFile>) => {
  expect(r.ok).toBe(false);
  return r.ok ? '' : r.problem;
};

describe('export and load', () => {
  it('round-trips exactly: name, overrides and values', () => {
    const state = mine();
    const text = exportFile(customFrom(state, 'custom-3'));
    const back = parseRulesetFile(text);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.state.name).toBe('Mine');
    expect(back.state.values).toEqual(state.values);
    expect(exportFile(customFrom(back.state, 'custom-3'))).toBe(text);
  });

  it('writes the ruleset format: proposed, 2 players, nothing else', () => {
    const file = JSON.parse(exportFile(customFrom(mine(), 'custom-1')));
    expect(Object.keys(file).sort()).toEqual(
      ['description', 'id', 'name', 'overrides', 'players', 'status', 'version'].sort(),
    );
    expect(file.status).toBe('proposed');
    expect(file.players).toBe(2);
  });

  it('refuses broken and hostile files with a clear message', () => {
    const good = JSON.parse(exportFile(customFrom(mine(), 'custom-1')));
    const bad = (patch: object) => refused(parseRulesetFile(JSON.stringify({ ...good, ...patch })));
    expect(refused(parseRulesetFile('{nope'))).toMatch(/not a ruleset file/i);
    expect(refused(parseRulesetFile('[]'))).toMatch(/not a ruleset file/i);
    expect(refused(parseRulesetFile('x'.repeat(MAX_FILE_BYTES + 1)))).toMatch(/too large/i);
    expect(bad({ overrides: { 'made.up': true } })).toMatch(/made\.up/);
    expect(bad({ overrides: { 'king.range': 99 } })).toMatch(/king\.range/);
    const raw = exportFile(customFrom(mine(), 'custom-1')).replace(
      '"overrides": {',
      '"overrides": {"__proto__": {"x": 1},',
    );
    expect(refused(parseRulesetFile(raw))).toMatch(/__proto__/);
    expect(bad({ extends: 'standard-2p' })).toMatch(/extends/);
    expect(bad({ extra: 1 })).toMatch(/extra/);
    expect(bad({ players: 3 })).toMatch(/2-player/);
    expect(bad({ name: '' })).toMatch(/name/i);
    expect(bad({ name: 'x'.repeat(200) })).toMatch(/name/i);
    expect(bad({ overrides: [] })).toMatch(/overrides/);
  });

  it('never trusts the file’s own status or id', () => {
    const good = JSON.parse(exportFile(customFrom(mine(), 'custom-1')));
    const r = parseRulesetFile(JSON.stringify({ ...good, status: 'official', id: 'standard-2p' }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.id).toBeUndefined();
  });

  it('reads a bundled ruleset file as a draft', () => {
    const r = parseRulesetFile(
      JSON.stringify({
        id: 'x',
        name: 'Easy',
        version: '1.0.0',
        status: 'official',
        players: 2,
        overrides: { 'king.range': 1 },
      }),
    );
    expect(r.ok).toBe(true);
  });
});

describe('share link', () => {
  it('round-trips through the hash and opens the builder', () => {
    const state = mine();
    const link = shareLink(state);
    expect(link.startsWith(`${SHARE_PATH}#ruleset=`)).toBe(true);
    const back = parseShareLink(link.slice(link.indexOf('#')));
    expect(back?.name).toBe('Mine');
    expect(back?.values).toEqual(state.values);
  });

  it('ignores a missing, oversize or hostile link', () => {
    expect(parseShareLink('')).toBeUndefined();
    expect(parseShareLink('#other=1')).toBeUndefined();
    expect(parseShareLink('#ruleset=@@@')).toBeUndefined();
    expect(parseShareLink(`#ruleset=${'A'.repeat(MAX_LINK_CHARS + 1)}`)).toBeUndefined();
    const evil = btoa(JSON.stringify({ n: 'x', o: { 'made.up': 1 } }));
    expect(parseShareLink(`#ruleset=${evil}`)).toBeUndefined();
  });
});

describe('unofficial until it matches an Official ruleset', () => {
  it('names no Official ruleset for a changed or unchecked set', () => {
    expect(matchingOfficial(mine().values)).toBeUndefined();
    // No bundled ruleset is Official yet (Standard is a Candidate).
    expect(matchingOfficial(rulesetValues('standard-2p'))).toBeUndefined();
  });
});

describe('invitation mail', () => {
  const origin = 'https://chess9s.com';
  it('opens the player’s mail app with subject, link and settings, and no address', () => {
    const url = inviteMailto('game', mine(), origin);
    expect(url.startsWith('mailto:?')).toBe(true);
    const q = new URLSearchParams(url.slice('mailto:?'.length));
    expect(q.get('subject')).toMatch(/game/i);
    const body = q.get('body')!;
    expect(body).toContain(`${origin}${shareLink(mine())}`);
    expect(body).toContain('King range');
    expect(body).toMatch(/unofficial/i);
    expect(body.length).toBeLessThan(1800);
  });

  it('a tournament invitation says the ruleset is not a tournament ruleset yet', () => {
    const q = new URLSearchParams(inviteMailto('tournament', mine(), origin).slice(8));
    expect(q.get('subject')).toMatch(/tournament/i);
    expect(q.get('body')).toMatch(/not a tournament ruleset/i);
  });
});
