// pnpm lock <command> <ruleset id>: the ruleset lock script (S45), from the repository root.
//
//   write <id>      lock the current version of a Candidate or Official ruleset
//                   (rules/locks/<id>@<version>.json); refuses to overwrite a lock
//   keep <id>       lock the current version of an experimental ruleset that has been played
//                   (games, reports, room records), so it replays once archived; refuses to
//                   overwrite a lock
//   add-keys <id>   record parameters added since the lock was written, at their current value;
//                   refuses if any locked value changed. <id>@<version>: an archived version's
//                   lock, new keys at the archived file's value
//   archive <id>    keep the current file as rules/rulesets/archive/<id>@<version>.json (status
//                   deprecated); run it before bumping the version, then `write` the new one
import { pathToFileURL } from 'node:url';
import { RulesError } from '@chess9s/engine';
import { repoRoot } from './cli';
import { addLockKeys, archiveRuleset, keepLock, writeLock } from './lock';

export function run(args: string[], root: string): string {
  const [command, id] = args;
  if (!id) throw new RulesError('Usage: pnpm lock <write|keep|add-keys|archive> <ruleset id>');
  switch (command) {
    case 'write':
      return `wrote ${writeLock(root, id)}`;
    case 'keep':
      return `wrote ${keepLock(root, id)}`;
    case 'add-keys': {
      const { path, added } = addLockKeys(root, id);
      return added.length > 0
        ? `recorded ${added.join(', ')} in ${path}`
        : `${path} already records every key`;
    }
    case 'archive':
      return `archived to ${archiveRuleset(root, id)}`;
    default:
      throw new RulesError(
        `Unknown command ${command ?? ''}; use write, keep, add-keys or archive`,
      );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    // pnpm runs scripts from the package directory; INIT_CWD is where pnpm was run.
    console.log(run(process.argv.slice(2), repoRoot(process.env['INIT_CWD'] ?? process.cwd())));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
