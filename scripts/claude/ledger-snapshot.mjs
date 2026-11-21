#!/usr/bin/env node
// Writes docs/decisions/LEDGER-SNAPSHOT.md from an export of the owner's ledger.
// Usage: node scripts/claude/ledger-snapshot.mjs <dir of exported item JSON files> [out file]
// Export first with ArtifactData: action "list", collection "items", query {limit:1000}, out_dir <dir>.
// Items flagged private are skipped, never copied into the repo.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const out = process.argv[3] ?? 'docs/decisions/LEDGER-SNAPSHOT.md';
if (!dir) {
  console.error('usage: ledger-snapshot.mjs <export dir> [out file]');
  process.exit(1);
}
const num = (id) => parseInt(id.slice(1), 10);
const items = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const x = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    return x.data ?? x;
  })
  .filter((x) => x && x.kind && !x.private);
const one = (s) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const decisions = items.filter((x) => x.kind === 'decision').sort((a, b) => num(a.id) - num(b.id));
const issues = items
  .filter((x) => x.kind === 'issue' && x.status !== 'resolved')
  .sort((a, b) => num(a.id) - num(b.id));

const lines = [
  '# Ledger snapshot',
  '',
  "Generated from the owner's ledger by `scripts/claude/ledger-snapshot.mjs`. Do not edit by hand; regenerate it.",
  'Private items are left out. **This file overrides the "Decision defaults" table in `docs/BUILD-PLAN.md`** wherever the two differ. Rows marked CHANGED are owner choices that are not the default.',
  '',
  `## Decisions (${decisions.length})`,
  '',
  '| Id | Decision | Choice in effect | Status | Needed by |',
  '| --- | --- | --- | --- | --- |',
];
for (const d of decisions) {
  const decided = d.choice !== null && d.choice !== undefined;
  const i = decided ? d.choice : (d.defaultIndex ?? 0);
  const o = (d.options ?? [])[i];
  const choice = o
    ? one(o.label) + (o.detail && o.detail !== o.label ? ': ' + one(o.detail) : '')
    : '(no option)';
  const status = !decided
    ? 'OPEN, default applies'
    : i === (d.defaultIndex ?? 0)
      ? 'decided, default'
      : 'decided, CHANGED';
  const note = one(d.notes) ? ` Owner note: ${one(d.notes)}` : '';
  lines.push(
    `| ${d.id} | ${one(d.title).replace(/\|/g, '/')} | ${(choice + note).replace(/\|/g, '/')} | ${status} | ${d.neededBy ?? ''} |`,
  );
}
lines.push('', `## Open issues (${issues.length})`, '');
for (const i of issues) {
  lines.push(
    `- ${i.id} (${i.severity ?? '?'}): ${one(i.title)}${one(i.notes) ? ` Owner note: ${one(i.notes)}` : ''}`,
  );
}
lines.push('');
writeFileSync(out, lines.join('\n'));
console.log(`wrote ${out}: ${decisions.length} decisions, ${issues.length} open issues`);
