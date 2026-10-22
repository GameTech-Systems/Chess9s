import { describe, expect, it } from 'vitest';
import { checkBoardSchema, checkPieceSchema, checkRegistrySchema, checkRulesetSchema } from './schema-check';
import * as staticChecks from './schema-check.static';

describe('schema checks', () => {
  it('reject data that does not fit the schema', () => {
    for (const check of [checkRegistrySchema, checkRulesetSchema, checkBoardSchema, checkPieceSchema]) {
      expect(check({})).toBe(false);
      expect(check.errors?.length).toBeGreaterThan(0);
    }
  });

  it('have a stand-in with the same names, for the web build that ships no Ajv', () => {
    for (const name of ['checkRegistrySchema', 'checkRulesetSchema', 'checkBoardSchema', 'checkPieceSchema']) {
      expect(typeof (staticChecks as Record<string, unknown>)[name]).toBe('function');
    }
  });
});
