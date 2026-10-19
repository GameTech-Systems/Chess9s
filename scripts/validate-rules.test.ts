import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const run = (...args: string[]) =>
  execFileSync('node', ['scripts/validate-rules.mjs', ...args], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

describe('validate-rules', () => {
  it('passes on the real rules/ data', () => {
    expect(() => run()).not.toThrow();
  });

  it('fails on a registry with a parameter missing its default', () => {
    expect(() => run('--registry', 'scripts/test-fixtures/invalid-parameters.json')).toThrow();
  });
});
