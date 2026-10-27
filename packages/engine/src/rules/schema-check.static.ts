// Stand-in for schema-check.ts in the web build: no Ajv, no runtime schema compilation. The build
// validates every file in rules/ first (`pnpm validate:rules`), and the bundled data is static, so
// the schema check has already passed. The loader's own checks (ids, defaults, references) still run.
import type { SchemaCheck } from './schema-check';

const passed: SchemaCheck = () => true;

export const checkRegistrySchema = passed;
export const checkRulesetSchema = passed;
export const checkBoardSchema = passed;
export const checkPieceSchema = passed;
export const checkLockSchema = passed;
export const checkTimeControlsSchema = passed;
