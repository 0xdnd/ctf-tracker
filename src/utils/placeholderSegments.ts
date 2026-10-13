import { GlobalVariables } from '../types';
import { contextFromGlobalVars, resolveTemplate, SubstitutionContext } from './variableSubstitution';

export type PlaceholderSegment =
  | { kind: 'text'; text: string }
  | {
      kind: 'placeholder';
      /** Token exactly as written, e.g. `{TARGET}`. */
      token: string;
      /** Token name without brackets, e.g. `TARGET`. */
      name: string;
      /** What `interpolateCommand` substitutes for this token (a readable default when unresolved). */
      value: string;
      resolved: boolean;
    };

/**
 * Same context and alias table `interpolateCommand` uses, so a chip always
 * shows exactly what Copy puts on the clipboard. The stored placeholder
 * values (`10.10.14.X`, `10.10.10.X`) count as "not set", as in
 * `getUnresolvedTokens`; the engine still renders them as the same readable
 * defaults, so the substituted text is unchanged.
 */
function chipContext(vars: GlobalVariables): SubstitutionContext {
  const ctx = contextFromGlobalVars(vars);
  if (ctx.lhost === '10.10.14.X') ctx.lhost = '';
  if (ctx.rhost === '10.10.10.X') ctx.rhost = '';
  return ctx;
}

/**
 * Split `template` into plain-text and placeholder segments using the
 * `ranges` reported by `resolveTemplate` (no parsing of its own).
 */
export function splitPlaceholderSegments(template: string, vars: GlobalVariables): PlaceholderSegment[] {
  if (!template) return [];
  const ctx = chipContext(vars);
  const { ranges } = resolveTemplate(template, ctx, { legacyAliases: true });
  if (ranges.length === 0) return [{ kind: 'text', text: template }];

  const segments: PlaceholderSegment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) segments.push({ kind: 'text', text: template.slice(cursor, range.start) });
    const token = template.slice(range.start, range.end);
    segments.push({
      kind: 'placeholder',
      token,
      name: range.raw,
      value: resolveTemplate(token, ctx, { legacyAliases: true }).text,
      resolved: range.resolved,
    });
    cursor = range.end;
  }
  if (cursor < template.length) segments.push({ kind: 'text', text: template.slice(cursor) });
  return segments;
}
