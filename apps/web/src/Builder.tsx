import { useMemo, useReducer, useState } from 'react';
import { grouped } from './RulesPage';
import {
  MAX_NAME,
  builderReducer,
  controlKind,
  customFrom,
  differences,
  flaggedInteractions,
  nameProblem,
  newCustomId,
  presets,
  safeZonesSwitches,
  safeZonesValue,
  startBuilder,
  stepOptions,
  unbuiltIn,
  type BuilderAction,
  type BuilderState,
} from './game/custom';
import { rulesetValues, settingsFor, type CustomRuleset, type Setting } from './game/rules';
import { DISCUSSIONS_URL } from './links';

type Dispatch = (action: BuilderAction) => void;

/** A switch: one on/off option. */
function Switch({
  label,
  on,
  text,
  disabled,
  onChange,
}: {
  label: string;
  on: boolean;
  /** What the current position means, as players read it. */
  text: string;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
    >
      <span className="switch-track" aria-hidden="true" />
      <span className="switch-text">{text}</span>
    </button>
  );
}

const nameOf = (s: Setting, option: string | number | boolean) =>
  s.optionLabels[String(option)] ?? String(option);

/** The control for one setting, by the kind of parameter it is. */
function Control({ s, dispatch }: { s: Setting; dispatch: Dispatch }) {
  switch (controlKind(s)) {
    case 'switch':
      return (
        <Switch
          label={s.label}
          on={s.value === true}
          text={s.valueLabel}
          onChange={(value) => dispatch({ type: 'set', id: s.id, value })}
        />
      );
    case 'stepper': {
      const options = stepOptions(s);
      const at = options.indexOf(s.value as number);
      return (
        <div className="stepper" role="group" aria-label={s.label}>
          <button
            type="button"
            aria-label={`Lower ${s.label}`}
            disabled={at <= 0}
            onClick={() => dispatch({ type: 'step', id: s.id, by: -1 })}
          >
            −
          </button>
          <span className="stepper-value" aria-live="polite">
            {s.valueLabel}
          </span>
          <button
            type="button"
            aria-label={`Raise ${s.label}`}
            disabled={at >= options.length - 1}
            onClick={() => dispatch({ type: 'step', id: s.id, by: 1 })}
          >
            +
          </button>
        </div>
      );
    }
    case 'choice':
      return (
        <div className="choices" role="radiogroup" aria-label={s.label}>
          {s.options.map((o) => (
            <button
              key={String(o)}
              type="button"
              role="radio"
              aria-checked={s.value === o}
              onClick={() => dispatch({ type: 'set', id: s.id, value: o })}
            >
              {nameOf(s, o)}
            </button>
          ))}
        </div>
      );
    case 'multi': {
      const members = (s.value as (string | number | boolean)[]) ?? [];
      return (
        <div className="choices" role="group" aria-label={s.label}>
          {s.options.map((o) => (
            <button
              key={String(o)}
              type="button"
              aria-pressed={members.includes(o)}
              onClick={() => dispatch({ type: 'toggle', id: s.id, option: o })}
            >
              {nameOf(s, o)}
            </button>
          ))}
        </div>
      );
    }
    case 'safe-zones': {
      const zones = safeZonesSwitches(s.value);
      return (
        <div className="switch-pair">
          <Switch
            label="Pawn-safe zones"
            on={zones.on}
            text={zones.on ? 'Safe zones on' : 'No safe zones'}
            onChange={(on) =>
              dispatch({ type: 'set', id: s.id, value: safeZonesValue({ ...zones, on }) })
            }
          />
          <Switch
            label="Safe on any colored square"
            on={zones.any}
            text={zones.any ? 'Any colored square' : 'Its starting file’s square'}
            disabled={!zones.on}
            onChange={(any) =>
              dispatch({ type: 'set', id: s.id, value: safeZonesValue({ ...zones, any }) })
            }
          />
        </div>
      );
    }
    case 'fixed':
      return <span className="fixed">Fixed: {s.valueLabel}</span>;
  }
}

/** The settings of a group; the two Queen void switches share a row. */
function rowsOf(settings: Setting[]): Setting[][] {
  const rows: Setting[][] = [];
  for (const s of settings) {
    if (s.id === 'queen.canStandOnVoid' && rows.some((r) => r[0]!.id === 'queen.canCrossVoid')) {
      rows.find((r) => r[0]!.id === 'queen.canCrossVoid')!.push(s);
    } else rows.push([s]);
  }
  return rows;
}

/**
 * Change ruleset (S41): start from a preset, change any setting, see what differs, and save or
 * play the result. A custom ruleset is proposed, named by the player, saved in this browser only.
 */
export function Builder({
  saved,
  taken = [],
  draft,
  onSave,
  onPlay,
}: {
  /** An already saved ruleset being edited. */
  saved?: CustomRuleset | undefined;
  /** Ids of the saved rulesets, so a new one gets a free id. */
  taken?: string[];
  /** Start from this draft (tests). */
  draft?: BuilderState;
  onSave?: (c: CustomRuleset) => void;
  /** Called after onSave with the same ruleset. */
  onPlay?: (c: CustomRuleset) => void;
}) {
  const [state, dispatch] = useReducer(
    builderReducer,
    undefined,
    () => draft ?? startBuilder(undefined, saved),
  );
  const [id, setId] = useState(state.id);
  const [kept, setKept] = useState<string | null>(null);
  const settings = useMemo(() => settingsFor(state.values), [state.values]);
  const base = presets().find((r) => r.id === state.base);
  const baseValues = useMemo(() => rulesetValues(state.base), [state.base]);
  const diff = useMemo(() => differences(baseValues, state.values), [baseValues, state.values]);
  const flags = useMemo(
    () => flaggedInteractions(baseValues, state.values),
    [baseValues, state.values],
  );
  const unbuilt = useMemo(() => unbuiltIn(state.values), [state.values]);
  const changed = new Set(diff.map((d) => d.id));
  const problem = nameProblem(state.name);
  const fingerprint = JSON.stringify([state.name.trim(), state.base, state.values]);
  const isSaved = kept === fingerprint;
  const keep = (): CustomRuleset => {
    const c = customFrom(state, id ?? newCustomId(taken));
    setId(c.id);
    setKept(fingerprint);
    onSave?.(c);
    return c;
  };

  return (
    <article className="builder" aria-labelledby="builder-title">
      <h2 id="builder-title">Change ruleset</h2>
      <p className="facts">
        Start from a preset, change what you like, then play it. Your ruleset is saved in this
        browser only, as <em>proposed</em>: it is not fairness-checked and is never a tournament
        ruleset. To suggest it as a real variant, <a href={DISCUSSIONS_URL}>start a discussion</a>.
      </p>

      <section aria-labelledby="builder-start">
        <h3 id="builder-start">Start from</h3>
        <div className="segmented" role="group" aria-label="Starting preset">
          {presets().map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={state.base === r.id}
              onClick={() => dispatch({ type: 'base', base: r.id })}
            >
              {r.name}
            </button>
          ))}
        </div>
        <p className="meta">
          Choosing another preset replaces your changes.{' '}
          {base?.description && <span>{base.description}</span>}
        </p>
      </section>

      <section aria-labelledby="builder-name">
        <h3 id="builder-name">Name</h3>
        <input
          type="text"
          className="name-input"
          aria-label="Ruleset name"
          aria-invalid={problem !== null && state.name !== ''}
          maxLength={MAX_NAME}
          placeholder="Your name for this ruleset"
          value={state.name}
          onChange={(e) => dispatch({ type: 'name', name: e.target.value })}
        />
        {problem && <p className="meta">{problem}</p>}
      </section>

      <section aria-labelledby="builder-diff">
        <h3 id="builder-diff">What differs from {base?.name ?? 'the preset'}</h3>
        {diff.length === 0 ? (
          <p className="facts">Nothing yet: this is {base?.name ?? 'the preset'} as it is.</p>
        ) : (
          <ul className="diff">
            {diff.map((d) => (
              <li key={d.id} data-diff={d.id}>
                <strong>{d.label}</strong>: {d.from} → {d.to}
              </li>
            ))}
          </ul>
        )}
        {flags.length > 0 && (
          <div className="flags" role="note">
            <p>
              <strong>Not fairness-checked together.</strong> These settings change the same
              systems, so their combination may favor one side:
            </p>
            <ul>
              {flags.map((f) => (
                <li key={`${f.a}+${f.b}`} data-flag={`${f.a}+${f.b}`}>
                  {f.aLabel} and {f.bLabel} <span className="meta">({f.shared.join(', ')})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {unbuilt.length > 0 && (
          <p className="flags" role="note">
            <strong>Not in this build yet:</strong> {unbuilt.join(', ')}. The game plays without
            {unbuilt.length > 1 ? ' them' : ' it'}.
          </p>
        )}
      </section>

      <div className="builder-actions">
        <button
          type="button"
          className="again"
          disabled={problem !== null}
          onClick={() => onPlay?.(keep())}
        >
          Save and play
        </button>
        <button type="button" className="again" disabled={problem !== null} onClick={keep}>
          Save
        </button>
        {isSaved && (
          <span className="meta" role="status">
            Saved in this browser.
          </span>
        )}
      </div>

      {grouped(settings).map((g) => (
        <section key={g.title} className="setting-group" aria-label={g.title}>
          <h3>{g.title}</h3>
          {rowsOf(g.settings).map((row) => (
            <div key={row[0]!.id} className={row.length > 1 ? 'control-row' : undefined}>
              {row.map((s) => (
                <div
                  key={s.id}
                  className="setting control"
                  data-setting={s.id}
                  data-control={controlKind(s)}
                  data-changed={changed.has(s.id) ? '' : undefined}
                >
                  <div className="control-label">{s.label}</div>
                  {s.description && <div className="desc">{s.description}</div>}
                  <Control s={s} dispatch={dispatch} />
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
    </article>
  );
}
