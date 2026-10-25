/** The public repository. */
export const REPO_URL = 'https://github.com/GameTech-Systems/Chess9s';

/** Where players suggest a variant or report a problem. */
export const DISCUSSIONS_URL = `${REPO_URL}/discussions`;

/** How a ruleset becomes a Candidate and then Official, with the checklist for submissions. */
export const GOVERNANCE_URL = `${REPO_URL}/blob/main/docs/GOVERNANCE.md#submitted-rulesets`;

/** The long-form rules guide (docs/RULES.md), which explains the Chess Nines defaults. */
export const RULES_DOC_URL = `${REPO_URL}/blob/main/docs/RULES.md`;

/** A ruleset's data file in the repository. */
export const rulesetDataUrl = (id: string) => `${REPO_URL}/blob/main/rules/rulesets/${id}.json`;

/** The in-app rules page of a ruleset: a live link that always matches the ruleset's data. */
export const rulesPath = (id: string) => `/rules/${id}`;

/**
 * The project's public contact address (a project address, never a personal one). Empty until
 * the owner supplies it (ledger I34); until then the privacy page points to Discussions.
 */
export const CONTACT_ADDRESS: string = '';

/** The licenses of the third-party code in the app, written by the build (vite build.license). */
export const LICENSES_PATH = '/third-party-licenses.txt';

/** The rights holder named in NOTICE and TRADEMARKS.md. */
export const RIGHTS_HOLDER = 'Duke Johnson';
