// Schema checks for the registry, rulesets, boards and pieces. Compiled with Ajv, which builds its
// validators with `new Function`. The web app swaps this module for schema-check.static.ts at build
// time (apps/web/vite.config.ts), so a strict Content-Security-Policy works there; the build first
// runs `pnpm validate:rules`, which checks the same data against the same schemas. The Worker
// (apps/worker), where `new Function` is forbidden, gets the same stand-in through the `workerd`
// condition of `#schema-check` in this package's package.json.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import boardSchema from '../../../../rules/schema/board.schema.json';
import lockSchema from '../../../../rules/schema/lock.schema.json';
import parametersSchema from '../../../../rules/schema/parameters.schema.json';
import pieceSchema from '../../../../rules/schema/piece.schema.json';
import rulesetSchema from '../../../../rules/schema/ruleset.schema.json';
import timeControlsSchema from '../../../../rules/schema/timeControls.schema.json';

export interface SchemaError {
  instancePath: string;
  message?: string;
}

/** A schema check: true when the data fits; otherwise `errors` says why. */
export interface SchemaCheck {
  (data: unknown): boolean;
  errors?: SchemaError[] | null;
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

export const checkRegistrySchema: SchemaCheck = ajv.compile(parametersSchema);
export const checkRulesetSchema: SchemaCheck = ajv.compile(rulesetSchema);
export const checkBoardSchema: SchemaCheck = ajv.compile(boardSchema);
export const checkPieceSchema: SchemaCheck = ajv.compile(pieceSchema);
export const checkLockSchema: SchemaCheck = ajv.compile(lockSchema);
export const checkTimeControlsSchema: SchemaCheck = ajv.compile(timeControlsSchema);
