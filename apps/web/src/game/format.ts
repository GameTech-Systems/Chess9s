import type { ParamValue } from '@chess9s/engine';

/** A parameter value as players read it: On/Off for switches, a list for sets. */
export function formatValue(value: ParamValue): string {
  if (value === true) return 'On';
  if (value === false) return 'Off';
  if (value === null) return 'Not set';
  if (Array.isArray(value)) return value.length === 0 ? 'None' : value.join(', ');
  return String(value);
}
