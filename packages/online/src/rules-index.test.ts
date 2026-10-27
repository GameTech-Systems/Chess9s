// The static rules index (S51) must hold exactly the JSON files in rules/, with their contents.
// When this fails, run `pnpm rules:index` and commit the result.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadRules } from '@chess9s/engine';
import { describe, expect, it } from 'vitest';
import { rulesFiles } from './rules-index';

const rulesDir = new URL('../../../rules/', import.meta.url).pathname;
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const path = join(dir, f);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const onDisk = walk(rulesDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => relative(rulesDir, f))
  .sort();

describe('the rules index', () => {
  it('lists every JSON file in rules/ and nothing else (else run pnpm rules:index)', () => {
    expect(Object.keys(rulesFiles).sort()).toEqual(onDisk);
  });

  it('holds each file as it is on disk', () => {
    for (const path of onDisk) {
      expect(rulesFiles[path], path).toEqual(JSON.parse(readFileSync(rulesDir + path, 'utf8')));
    }
  });

  it('feeds the rules library', () => {
    expect(loadRules(rulesFiles).rules('standard-2p').players).toBe(2);
  });
});
