/**
 * Size limits for user-supplied import files, in one place so every importer and its UI agree.
 * A ZIP is checked on what it unpacks to and how many entries it holds, a JSON file on its size.
 */

const MB = 1024 * 1024;

/** Total uncompressed size of all files in an imported ZIP. */
export const MAX_ZIP_UNCOMPRESSED_BYTES = 200 * MB;
/** Number of entries (files and folders) in an imported ZIP. */
export const MAX_ZIP_ENTRIES = 20_000;
/** Size of an imported JSON file (backup, sync file or notes export). */
export const MAX_JSON_IMPORT_BYTES = 50 * MB;

/** A file went over an import limit. The message is written for the person importing, so show it as is. */
export class ImportLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportLimitError';
  }
}

/** "2 MB", "1.5 MB": bytes as megabytes, one decimal at most. */
export const formatMb = (bytes: number): string => `${Math.round((bytes / MB) * 10) / 10} MB`;

export function zipTooBigMessage(bytes: number): string {
  return `This ZIP unpacks to ${formatMb(bytes)}, which is over the ${formatMb(MAX_ZIP_UNCOMPRESSED_BYTES)} limit. Split the vault into smaller archives and import them one at a time.`;
}

export function zipTooManyEntriesMessage(count: number): string {
  return `This ZIP holds ${count.toLocaleString()} entries, which is over the ${MAX_ZIP_ENTRIES.toLocaleString()} limit. Remove files you do not need, or import a smaller archive.`;
}

function jsonTooBigMessage(bytes: number): string {
  return `This file is ${formatMb(bytes)}, which is over the ${formatMb(MAX_JSON_IMPORT_BYTES)} limit for JSON imports. Export a smaller file and try again.`;
}

/** Throws ImportLimitError when a JSON file is larger than the import limit. Call it before reading the file. */
export function assertJsonFileWithinLimit(file: { size: number }): void {
  if (file.size > MAX_JSON_IMPORT_BYTES) throw new ImportLimitError(jsonTooBigMessage(file.size));
}
