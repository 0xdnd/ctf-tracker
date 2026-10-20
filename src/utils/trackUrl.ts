/**
 * The `?track=` query parameter: one track id, or several separated by commas (`?track=tjnull-oscp,osep`).
 */

/** Track ids in the parameter, in order, without repeats; ids the catalog does not know are dropped. */
export const parseTrackParam = (value: string | null | undefined, isKnown: (id: string) => boolean): string[] => {
  if (!value) return [];
  const ids: string[] = [];
  for (const part of value.split(',')) {
    const id = part.trim();
    if (id && isKnown(id) && !ids.includes(id)) ids.push(id);
  }
  return ids;
};

/** The parameter value for these ids: a single id stays plain, several are comma-separated, none gives an empty string. */
export const serializeTrackParam = (ids: readonly string[]): string => ids.join(',');
