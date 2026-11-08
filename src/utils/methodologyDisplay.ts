/** Frozen branch-prefixed strings look like "Branch A: Title text". */
const BRANCH_PREFIX_RE = /^Branch ([A-Z]):\s*(.*)$/;

export interface BranchTitleParts {
  letter: string | null;
  label: string;
}

/** Splits a frozen "Branch X: label" string into its muted letter and the remaining label. */
export function splitBranchTitle(title: string): BranchTitleParts {
  const match = BRANCH_PREFIX_RE.exec(title);
  if (!match) return { letter: null, label: title };
  return { letter: match[1], label: match[2] };
}

/** Shortens a branch label to the text before " (" when present, for compact chip display. */
export function shortenBranchLabel(label: string): string {
  const idx = label.indexOf(' (');
  return idx === -1 ? label : label.slice(0, idx);
}
