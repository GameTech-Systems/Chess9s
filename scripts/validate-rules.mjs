// Validate rules/ data against its JSON Schemas (Ajv, draft 2020-12).
// Usage: node scripts/validate-rules.mjs [--registry <file>]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const args = process.argv.slice(2);
const flag = args.indexOf('--registry');
const registryPath = flag >= 0 ? args[flag + 1] : 'rules/parameters.json';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateRegistry = ajv.compile(read('rules/schema/parameters.schema.json'));
const validateRuleset = ajv.compile(read('rules/schema/ruleset.schema.json'));

const targets = [[registryPath, validateRegistry]];
for (const f of readdirSync('rules/rulesets')
  .filter((n) => n.endsWith('.json'))
  .sort()) {
  targets.push([join('rules/rulesets', f), validateRuleset]);
}

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
