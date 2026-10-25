/** The public repository. */
export const REPO_URL = 'https://github.com/GameTech-Systems/Chess9s';

/** Where players suggest a variant or report a problem. */
export const DISCUSSIONS_URL = `${REPO_URL}/discussions`;

/** The long-form rules guide (docs/RULES.md), which explains the Chess Nines defaults. */
export const RULES_DOC_URL = `${REPO_URL}/blob/main/docs/RULES.md`;

/** A ruleset's data file in the repository. */
export const rulesetDataUrl = (id: string) => `${REPO_URL}/blob/main/rules/rulesets/${id}.json`;

/** The in-app rules page of a ruleset: a live link that always matches the ruleset's data. */
export const rulesPath = (id: string) => `/rules/${id}`;

/** The project's contact address for privacy questions. Placeholder until the owner supplies it. */
export const CONTACT_ADDRESS = 'PROJECT_CONTACT_ADDRESS';
