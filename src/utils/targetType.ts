import type { Machine } from '../types';
import { isGenuineCustom } from '../store/machineNormalization';

/**
 * Personal target types. Pro Labs and exams are stored as ordinary custom machines carrying a
 * marker tag, so the persisted Machine shape and the sync fingerprint stay unchanged.
 * ZeroBox ships no Pro Lab or exam names or content: the user types their own.
 */
export type TargetType = 'machine' | 'pro-lab' | 'exam';

export const TARGET_TYPE_TAGS: Record<Exclude<TargetType, 'machine'>, string> = {
  'pro-lab': 'pro-lab',
  exam: 'exam',
};

export const TARGET_TYPE_LABELS: Record<TargetType, string> = {
  machine: 'Machine',
  'pro-lab': 'Pro Lab',
  exam: 'Exam',
};

/** Only the operator's own custom targets can be a Pro Lab or exam; catalog rows are always machines. */
export function getTargetType(m: Pick<Machine, 'id' | 'platform' | 'tags'>): TargetType {
  if (!isGenuineCustom(m)) return 'machine';
  const tags = (m.tags || []).map((t) => t.toLowerCase());
  if (tags.includes(TARGET_TYPE_TAGS['pro-lab'])) return 'pro-lab';
  if (tags.includes(TARGET_TYPE_TAGS.exam)) return 'exam';
  return 'machine';
}

/** True for the marker tag of the machine's own target type (hidden from tag chips next to the badge). */
export function isTargetTypeTag(m: Pick<Machine, 'id' | 'platform' | 'tags'>, tag: string): boolean {
  const type = getTargetType(m);
  return type !== 'machine' && tag.toLowerCase() === TARGET_TYPE_TAGS[type];
}
