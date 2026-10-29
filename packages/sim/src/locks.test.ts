// The lock rules of S45 against the real rules/ directory, and the lock script against a copy.
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  describeProblem,
  diffLock,
  gameRecord,
  isLocked,
  newGame,
  playMove,
  resolveRuleset,
  toNotation,
  type Lock,
  type Registry,
  type Ruleset,
} from '@chess9s/engine';
import { UNLOCKED_NOTE, addLockKeys, archiveRuleset, keepLock, writeLock } from './lock';
import { loadLibrary, loadSource, rulesFor } from './load';
import { seeded } from './play';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const { registry, library } = loadLibrary(ROOT);
const lockFor = (id: string, version: string) =>
  library.locks.find((l) => l.id === id && l.version === version);
const names = (r: { id: string; version: string }) => `${r.id}@${r.version}`;
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const withDefault = (reg: Registry, id: string, value: unknown): Registry => ({
  ...reg,
  parameters: reg.parameters.map((p) =>
    p.id === id ? { ...p, default: value } : p,
  ) as Registry['parameters'],
});

describe('locks in rules/locks', () => {
  const locked = library.current.filter(isLocked);

  it('locks the Candidate rulesets that exist today', () => {
    expect(locked.map(names).sort()).toEqual(['draft-2p@0.2.0', 'standard-2p@0.1.0']);
  });

  it.each(locked.map((r) => [names(r), r] as const))(
    '%s has a lock that it still resolves to',
    (_n, r) => {
      const lock = lockFor(r.id, r.version);
      expect(lock, `no lock rules/locks/${names(r)}.json for ${names(r)}`).toBeDefined();
      const known = Object.fromEntries(library.current.map((c) => [c.id, c]));
      const problems = diffLock(lock!, resolveRuleset(registry, r, known)).map((p) =>
        describeProblem(lock!, p),
      );
      expect(problems).toEqual([]);
    },
  );

  it('has one lock per file name, for a ruleset that exists', () => {
    const files = readdirSync(join(ROOT, 'rules/locks')).filter((f) => f.endsWith('.json'));
    expect(files.length).toBe(library.locks.length);
    for (const f of files) {
      const lock = readJson<Lock>(join(ROOT, 'rules/locks', f));
      expect(f).toBe(`${names(lock)}.json`);
      const exists = [...library.current, ...library.archived].some(
        (r) => r.id === lock.id && r.version === lock.version,
      );
      expect(exists, `${f} names no ruleset in rules/rulesets`).toBe(true);
    }
  });

  it('fails a registry default edit, naming the ruleset and version it changes', () => {
    // standard-2p sets king.range itself, so king.range only moves rulesets that inherit it;
    // king.canJump moves both Candidates.
    const edits: [string, unknown, string[]][] = [
      ['king.range', 3, ['draft-2p 0.2.0: king.range was 2, now 3']],
      [
        'king.canJump',
        true,
        [
          'draft-2p 0.2.0: king.canJump was false, now true',
          'standard-2p 0.1.0: king.canJump was false, now true',
        ],
      ],
    ];
    for (const [key, value, expected] of edits) {
      const edited = withDefault(registry, key, value);
      const problems = locked.flatMap((r) => {
        const lock = lockFor(r.id, r.version)!;
        return diffLock(lock, resolveRuleset(edited, r)).map((p) => describeProblem(lock, p));
      });
      expect(problems.sort()).toEqual(expected);
    }
  });
});

describe('archived versions in rules/rulesets/archive', () => {
  it.each(library.archived.map((r) => [names(r), r] as const))('%s is kept correctly', (_n, r) => {
    expect(r.status).toBe('deprecated');
    expect(existsSync(join(ROOT, 'rules/rulesets/archive', `${names(r)}.json`))).toBe(true);
    // A version that was never a Candidate or Official is kept without a lock, and says so.
    if (r.notes !== UNLOCKED_NOTE) {
      expect(lockFor(r.id, r.version), `${names(r)} has no lock`).toBeDefined();
    } else expect(lockFor(r.id, r.version)).toBeUndefined();
    const current = library.current.find((c) => c.id === r.id);
    expect(current?.version, `${names(r)} is also the current version`).not.toBe(r.version);
  });

  it('file names match the ruleset inside', () => {
    const dir = join(ROOT, 'rules/rulesets/archive');
    if (!existsSync(dir)) return;
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
      expect(f).toBe(`${names(readJson<Ruleset>(join(dir, f)))}.json`);
    }
  });
});

describe('fairness reports', () => {
  const dir = join(ROOT, 'docs/fairness');
  const reports = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f, readJson<{ ruleset: { id: string; version: string } }>(join(dir, f))] as const);

  it('has reports', () => {
    expect(reports.length).toBeGreaterThan(0);
  });

  it.each(reports)(
    '%s names a ruleset version that exists, with a lock once it is a Candidate',
    (_f, report) => {
      const { id, version } = report.ruleset;
      const file = [...library.current, ...library.archived].find(
        (r) => r.id === id && r.version === version,
      );
      // easy-2p 0.1.0 is an older Experimental version that was never locked or kept; its report
      // predates S45, so only a version that is in rules/ is held to the lock.
      if (!file && id === 'easy-2p') return;
      expect(file, `${id}@${version} is not in rules/rulesets`).toBeDefined();
      if (isLocked(file!) || file!.status === 'deprecated') {
        expect(
          lockFor(id, version),
          `no lock for the fairness report of ${id}@${version}`,
        ).toBeDefined();
      }
    },
  );
});

describe('a game recorded under an archived version', () => {
  // A made-up earlier Standard whose lock (a King that moves 3) differs from its file's overrides,
  // from today's Standard and from the registry, which moves on below.
  const old: Ruleset = {
    id: 'standard-2p',
    name: 'Standard',
    version: '0.0.9',
    status: 'deprecated',
    players: 2,
    overrides: { 'king.range': 4 },
  };
  const oldLock: Lock = {
    id: 'standard-2p',
    version: '0.0.9',
    values: { ...lockFor('standard-2p', '0.1.0')!.values, 'king.range': 3 },
  };
  const source = loadSource(ROOT);
  const archived = {
    ...source,
    archived: [...source.archived, old],
    locks: [...source.locks, oldLock],
  };

  function record(src: typeof archived, moves: string[] | null) {
    const { rules, ruleset } = rulesFor(src, 'standard-2p', {}, '0.0.9');
    let game = newGame(rules, ruleset);
    const next = seeded(7);
    for (let i = 0; i < (moves?.length ?? 80) && game.result.status === 'ongoing'; i++) {
      const move = moves
        ? game.legal.find((m) => toNotation(m) === moves[i])
        : game.legal[Math.floor(next() * game.legal.length)];
      if (!move) throw new Error(`move ${i} (${moves?.[i]}) is not legal`);
      game = playMove(game, move);
    }
    return { game, rules, record: gameRecord(game) };
  }

  it('plays from the lock', () => {
    const { rules, record: rec } = record(archived, null);
    expect(rules.values['king.range']).toBe(3);
    expect(rec.ruleset).toEqual({ id: 'standard-2p', version: '0.0.9' });
    expect(rec.moves.length).toBeGreaterThan(20);
  });

  it('replays move for move after the registry and the current file have moved on', () => {
    const first = record(archived, null);
    const moved = {
      ...archived,
      registry: withDefault(withDefault(archived.registry, 'king.range', 4), 'king.canJump', true),
      rulesets: {
        ...archived.rulesets,
        'standard-2p': { ...archived.rulesets['standard-2p']!, version: '0.2.0' },
      },
    };
    const again = record(moved, first.record.moves);
    expect(again.record.moves).toEqual(first.record.moves);
    expect(again.record.result).toEqual(first.record.result);
    expect(again.game.rules.values['king.range']).toBe(3);
  });

  it('refuses an archived version with overrides or without a lock', () => {
    expect(() => rulesFor(archived, 'standard-2p', { 'king.range': 2 }, '0.0.9')).toThrow(/locked/);
    expect(() =>
      rulesFor({ ...archived, locks: source.locks }, 'standard-2p', {}, '0.0.9'),
    ).toThrow(/no lock/);
    expect(() => rulesFor(archived, 'standard-2p', {}, '9.9.9')).toThrow(/9\.9\.9/);
  });
});

describe('the lock script', () => {
  function copyRules(): string {
    const root = mkdtempSync(join(tmpdir(), 'chess9s-locks-'));
    mkdirSync(join(root, 'rules'));
    cpSync(join(ROOT, 'rules/parameters.json'), join(root, 'rules/parameters.json'));
    cpSync(join(ROOT, 'rules/rulesets'), join(root, 'rules/rulesets'), { recursive: true });
    return root;
  }
  const lockPath = (root: string, name: string) => join(root, 'rules/locks', `${name}.json`);

  it('writes a lock for a Candidate and refuses to overwrite it', () => {
    const root = copyRules();
    const path = writeLock(root, 'standard-2p');
    expect(path).toBe(lockPath(root, 'standard-2p@0.1.0'));
    const written = readJson<Lock>(path);
    expect(written).toEqual({ ...lockFor('standard-2p', '0.1.0')! });
    expect(() => writeLock(root, 'standard-2p')).toThrow(/already exists/);
    expect(readJson<Lock>(path)).toEqual(written);
  });

  it('writes nothing for a ruleset that is not yet a Candidate, or does not exist', () => {
    const root = copyRules();
    expect(() => writeLock(root, 'easy-2p')).toThrow(/candidate or official/);
    expect(() => writeLock(root, 'nope')).toThrow(/No ruleset nope/);
    expect(existsSync(join(root, 'rules/locks'))).toBe(false);
  });

  it('adds only the new keys to a lock, at their current value', () => {
    const root = copyRules();
    const path = writeLock(root, 'standard-2p');
    const before = readJson<Lock>(path);
    const rest = { ...before.values };
    delete rest['king.canJump'];
    delete rest['pawn.promotion.targets'];
    writeFileSync(path, JSON.stringify({ ...before, values: rest }));
    const out = addLockKeys(root, 'standard-2p');
    expect(out.added.sort()).toEqual(['king.canJump', 'pawn.promotion.targets']);
    expect(readJson<Lock>(path)).toEqual(before);
    expect(addLockKeys(root, 'standard-2p').added).toEqual([]);
  });

  it('refuses to add keys while a locked value has changed', () => {
    const root = copyRules();
    const path = writeLock(root, 'standard-2p');
    const lock = readJson<Lock>(path);
    writeFileSync(path, JSON.stringify({ ...lock, values: { ...lock.values, 'king.range': 3 } }));
    expect(() => addLockKeys(root, 'standard-2p')).toThrow(/king\.range was 3, now 1/);
    expect(readJson<Lock>(path).values['king.range']).toBe(3);
  });

  it('archives the current file as deprecated, once, and only once it is locked', () => {
    const root = copyRules();
    expect(() => archiveRuleset(root, 'standard-2p')).toThrow(/no lock/);
    writeLock(root, 'standard-2p');
    const path = archiveRuleset(root, 'standard-2p');
    expect(path).toBe(join(root, 'rules/rulesets/archive/standard-2p@0.1.0.json'));
    expect(readJson<Ruleset>(path)).toEqual({
      ...readJson<Ruleset>(join(root, 'rules/rulesets/standard-2p.json')),
      $schema: '../../schema/ruleset.schema.json',
      status: 'deprecated',
    });
    expect(() => archiveRuleset(root, 'standard-2p')).toThrow(/already exists/);
  });

  it('archives a version that was never locked (experimental) without a lock, and says so', () => {
    const root = copyRules();
    const path = archiveRuleset(root, 'easy-2p');
    expect(readJson<Ruleset>(path)).toEqual({
      ...readJson<Ruleset>(join(root, 'rules/rulesets/easy-2p.json')),
      $schema: '../../schema/ruleset.schema.json',
      status: 'deprecated',
      notes: UNLOCKED_NOTE,
    });
    expect(existsSync(join(root, 'rules/locks'))).toBe(false);
  });

  it('keeps a played experimental version: locks it, then archives it with the lock (S71)', () => {
    const root = copyRules();
    const r = readJson<Ruleset>(join(root, 'rules/rulesets/easy-2p.json'));
    const path = keepLock(root, 'easy-2p');
    expect(path).toBe(lockPath(root, `easy-2p@${r.version}`));
    const known = Object.fromEntries(library.current.map((c) => [c.id, c]));
    expect(readJson<Lock>(path).values).toEqual(resolveRuleset(registry, r, known).values);
    expect(() => keepLock(root, 'easy-2p')).toThrow(/already exists/);
    const archived = readJson<Ruleset>(archiveRuleset(root, 'easy-2p'));
    expect(archived.status).toBe('deprecated');
    expect(archived.notes).toBe(r.notes);
  });

  it('keep is for versions that are not locked yet: a Candidate takes write', () => {
    expect(() => keepLock(copyRules(), 'standard-2p')).toThrow(/write/);
  });

  it("adds new keys to an archived version's lock at the archived file's value, keeping the rest", () => {
    const root = copyRules();
    cpSync(join(ROOT, 'rules/locks'), join(root, 'rules/locks'), { recursive: true });
    const path = lockPath(root, 'standard-3p@0.1.0');
    const before = readJson<Lock>(path);
    const rest = { ...before.values };
    delete rest['turn.3p.order'];
    writeFileSync(path, JSON.stringify({ ...before, values: rest }));
    expect(addLockKeys(root, 'standard-3p@0.1.0').added).toEqual(['turn.3p.order']);
    const after = readJson<Lock>(path);
    expect(after.values['turn.3p.order']).toBe('dark-light-dragon');
    // The lock, not the archived file, says how it played: any legal move off the Coast.
    expect(after.values['coast.3p.exit']).toBe('any-legal-move');
    expect(after).toEqual(before);
    expect(() => addLockKeys(root, 'standard-3p@9.9.9')).toThrow(/No archived/);
  });
});
