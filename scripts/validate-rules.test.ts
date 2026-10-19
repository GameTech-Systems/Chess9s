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

  it('validates boards and pieces in the directories it is given', () => {
    const out = run(
      '--boards',
      'packages/engine/test/fixtures/boards',
      '--pieces',
      'packages/engine/test/fixtures/pieces',
    );
    expect(out).toContain('ok   packages/engine/test/fixtures/boards/neutral.json');
    expect(out).toContain('ok   packages/engine/test/fixtures/pieces/stepper.json');
  });

  it('fails on a board with a square off the 9x9 board', () => {
    expect(() => run('--boards', 'scripts/test-fixtures/invalid-boards')).toThrow();
  });
});
