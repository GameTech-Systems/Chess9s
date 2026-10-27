import { describe, expect, it } from 'vitest';
import { builderReducer, customFrom, startBuilder, type BuilderState } from './custom';
import {
  MAX_FILE_BYTES,
  MAX_LINK_CHARS,
  SHARE_PATH,
  exportFile,
  inviteMailto,
  roomInviteMailto,
  matchingOfficial,
  parseRulesetFile,
  parseShareLink,
  shareLink,
  submitUrl,
  SUBMIT_URL_MAX,
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
    expect(bad({ players: 4 })).toMatch(/2-player and 3-player/);
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

  it('a tournament invitation says games can be played online by room code, with the Official ruleset only (S53, D46)', () => {
    const q = new URLSearchParams(inviteMailto('tournament', mine(), origin).slice(8));
    expect(q.get('body')).toMatch(/online by room code/i);
    expect(q.get('body')).toMatch(/Official ruleset only/);
    expect(q.get('body')).not.toMatch(/not played online yet/i);
  });
});

describe('tournament invitation links the tournament rules (S46)', () => {
  const origin = 'https://chess9s.com';
  it('names the /tournament page on this site, and a game invitation does not', () => {
    const t = new URLSearchParams(inviteMailto('tournament', mine(), origin).slice(8));
    expect(t.get('body')).toContain(`Tournament rules: ${origin}/tournament`);
    const g = new URLSearchParams(inviteMailto('game', mine(), origin).slice(8));
    expect(g.get('body')).not.toContain('/tournament');
  });
});

describe('submit for tournament consideration (S43)', () => {
  const origin = 'https://chess9s.com';
  const form = (state: BuilderState) => {
    const url = new URL(submitUrl(state, origin));
    return { url, q: url.searchParams };
  };

  it('opens the Rule proposals Discussion form, prefilled', () => {
    const { url, q } = form(mine());
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://github.com/GameTech-Systems/Chess9s/discussions/new',
    );
    expect(q.get('category')).toBe('rule-proposals');
    expect(q.get('title')).toBe('[Ruleset] Mine');
    expect(q.get('idea')).toContain('King range');
    expect(q.get('idea')).toContain(`${origin}${shareLink(mine())}`);
    expect(q.get('idea')).toContain('pnpm sim --ruleset-file');
  });

  it('carries the ruleset file, exactly as an export, which loads back', () => {
    const { q } = form(mine());
    const json = q.get('ruleset')!;
    expect(json).toBe(exportFile(customFrom(mine(), 'submitted')));
    const back = parseRulesetFile(json);
    expect(back.ok && back.state.values).toEqual(mine().values);
  });

  it('leaves the reasons and the contribution terms to the poster', () => {
    const { q } = form(mine());
    expect(q.get('why')).toBeNull();
    expect(q.get('terms')).toBeNull();
  });

  it('stays under the URL limit, dropping the file (export it instead) when too long', () => {
    let s = mine();
    for (const opt of ['knight', 'rook', 'pawn', 'queen', 'king']) {
      s = builderReducer(s, { type: 'toggle', id: 'center.passThrough', option: opt });
    }
    expect(submitUrl(s, origin).length).toBeLessThanOrEqual(SUBMIT_URL_MAX);
    const long = { ...s, name: 'x'.repeat(40) };
    expect(submitUrl(long, origin, 1500).length).toBeLessThanOrEqual(1500);
    const q = new URL(submitUrl(long, origin, 1500)).searchParams;
    expect(q.get('ruleset')).toBeNull();
    expect(q.get('idea')).toMatch(/paste the exported file/i);
  });
});

describe('invitation to a room (S53)', () => {
  const origin = 'https://chess9s.com';
  const body = (room: Parameters<typeof roomInviteMailto>[0]) => {
    const url = roomInviteMailto(room, origin);
    expect(url.startsWith('mailto:?')).toBe(true);
    const q = new URLSearchParams(url.slice('mailto:?'.length));
    return { subject: q.get('subject')!, text: q.get('body')! };
  };

  it('opens the mail app with the room link and code, and no address', () => {
    const { subject, text } = body({
      code: 'K7RX2M',
      ruleset: { id: 'standard-2p', version: '0.1.0', name: 'Standard' },
    });
    expect(subject).toMatch(/game/i);
    expect(text).toContain(`${origin}/room/K7RX2M`);
    expect(text).toContain('K7RX2M');
    expect(text).toContain('Standard');
  });

  it('says a custom ruleset is unofficial and what differs from Standard', () => {
    const { text } = body({
      code: 'K7RX2M',
      ruleset: { id: 'custom', version: '1.0.0', name: 'Mine', overrides: { 'king.range': 3 } },
    });
    expect(text).toMatch(/unofficial/i);
    expect(text).toContain('King range');
    expect(text).toContain('“Mine”');
    expect(text.length).toBeLessThan(1800);
  });

  it('says a bundled ruleset that is not Official is not yet Official', () => {
    const { text } = body({
      code: 'K7RX2M',
      ruleset: { id: 'draft-2p', version: '0.2.0', name: 'Good Practice' },
    });
    expect(text).toMatch(/not (yet )?official|not fairness-checked/i);
  });
});

describe('3-player rulesets (S64, D64)', () => {
  const three = (): BuilderState => {
    let s = startBuilder('standard-3p');
    s = builderReducer(s, { type: 'name', name: 'Wild Dragon' });
    s = builderReducer(s, { type: 'step', id: 'dragonHead.range', by: -1 });
    s = builderReducer(s, {
      type: 'set',
      id: 'check.3p.exposedKing',
      value: 'counts-as-checkmate',
    });
    return s;
  };

  it('exports as a 3-player file and loads back to the same draft', () => {
    const state = three();
    expect(state.players).toBe(3);
    const text = exportFile(customFrom(state, 'custom-1'));
    expect(JSON.parse(text).players).toBe(3);
    const back = parseRulesetFile(text);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.state.players).toBe(3);
    expect(back.state.base).toBe('standard-3p');
    expect(back.state.values).toEqual(state.values);
    expect(exportFile(customFrom(back.state, 'custom-1'))).toBe(text);
  });

  it('refuses a 3-player file with a 2-player-only key, and a 2-player file with a 3-player key', () => {
    const file = JSON.parse(exportFile(customFrom(three(), 'custom-1')));
    const keys = (players: number, overrides: object) =>
      refused(parseRulesetFile(JSON.stringify({ ...file, players, overrides })));
    // No parameter is 2-player only today, so the crossing is checked from the 3-player side.
    expect(keys(2, { 'dragon.3p.givesCheck': true })).toContain('dragon.3p.givesCheck');
    expect(keys(3, { 'made.up': true })).toContain('made.up');
    expect(keys(3, { 'endings.3p': 'first-checkmate' })).toContain('dragon.3p.givesCheck');
  });

  it('the share link opens a 3-player ruleset', () => {
    const state = three();
    const link = shareLink(state);
    const back = parseShareLink(link.slice(link.indexOf('#')));
    expect(back?.players).toBe(3);
    expect(back?.name).toBe('Wild Dragon');
    expect(back?.values).toEqual(state.values);
    // A 2-player link carries no player count and still opens as 2 players.
    expect(parseShareLink(shareLink(mine()).slice(shareLink(mine()).indexOf('#')))?.players).toBe(
      2,
    );
  });

  it('invitations compare with Standard (3-player)', () => {
    const body = decodeURIComponent(inviteMailto('game', three(), 'https://chess9s.com'));
    expect(body).toContain('Differs from Standard (3-player):');
    expect(body).toContain('A King left in check for an earlier player');
  });
});
