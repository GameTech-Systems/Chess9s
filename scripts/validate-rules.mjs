// Validate rules/ data against its JSON Schemas (Ajv, draft 2020-12).
// Usage: node scripts/validate-rules.mjs [--registry <file>] [--boards <dir>] [--pieces <dir>]
// Boards and pieces default to rules/boards/ and rules/pieces/, skipped while absent.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const registryPath = option('--registry', 'rules/parameters.json');
const boardsDir = option('--boards', 'rules/boards');
const piecesDir = option('--pieces', 'rules/pieces');

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateRegistry = ajv.compile(read('rules/schema/parameters.schema.json'));
const validateRuleset = ajv.compile(read('rules/schema/ruleset.schema.json'));
const validateLock = ajv.compile(read('rules/schema/lock.schema.json'));
const validateBoard = ajv.compile(read('rules/schema/board.schema.json'));
const validatePiece = ajv.compile(read('rules/schema/piece.schema.json'));
const validateTimeControls = ajv.compile(read('rules/schema/timeControls.schema.json'));

for (const name of ['--boards', '--pieces']) {
  const dir = option(name);
  if (dir !== undefined && !existsSync(dir)) {
    console.error(`FAIL ${name} ${dir}: no such directory`);
    process.exit(1);
  }
}

const jsonFiles = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((n) => n.endsWith('.json'))
        .sort()
        .map((n) => join(dir, n))
    : [];

const targets = [
  [registryPath, validateRegistry],
  ...jsonFiles('rules/rulesets').map((f) => [f, validateRuleset]),
  ...jsonFiles('rules/rulesets/archive').map((f) => [f, validateRuleset]),
  ...jsonFiles('rules/locks').map((f) => [f, validateLock]),
  ...jsonFiles(boardsDir).map((f) => [f, validateBoard]),
  ...jsonFiles(piecesDir).map((f) => [f, validatePiece]),
  ...(existsSync('rules/timeControls.json')
    ? [['rules/timeControls.json', validateTimeControls]]
    : []),
];

let failed = false;
for (const [path, validate] of targets) {
  if (validate(read(path))) {
    console.log(`ok   ${path}`);
  } else {
    failed = true;
    console.error(`FAIL ${path}`);
    for (const e of validate.errors ?? []) console.error(`  ${e.instancePath || '/'} ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
