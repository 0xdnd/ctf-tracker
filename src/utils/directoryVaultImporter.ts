import { parseObsidianRawItems, isIgnoredVaultPath, VaultZipImportProgress, VaultZipImportResult } from './zipVaultImporter';

export { isIgnoredVaultPath };

/**
 * Recursively traverses a FileSystemEntry (standard HTML5 directory drag-and-drop entry)
 */
export async function traverseFileSystemEntry(
  entry: any,
  currentPath = ''
): Promise<{ path: string; file: File }[]> {
  const results: { path: string; file: File }[] = [];

  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      entry.file(resolve, reject);
    });
    const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    if (!isIgnoredVaultPath(relativePath) && /\.(md|markdown)$/i.test(entry.name)) {
      results.push({ path: relativePath, file });
    }
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const readEntries = async (): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        dirReader.readEntries(resolve, reject);
      });
    };

    let entries: any[] = [];
    let batch: any[] = await readEntries();
    while (batch.length > 0) {
      entries = entries.concat(batch);
      batch = await readEntries();
    }

    const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    if (!isIgnoredVaultPath(nextPath)) {
      for (const child of entries) {
        const childResults = await traverseFileSystemEntry(child, nextPath);
        results.push(...childResults);
      }
    }
  }

  return results;
}

/**
 * Extract files and their relative paths from a drag and drop DataTransfer object
 */
export async function extractFilesFromDataTransfer(
  dataTransfer: DataTransfer
): Promise<{ path: string; file: File }[]> {
  const items = dataTransfer.items;
  const collected: { path: string; file: File }[] = [];

  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        // Modern webkitGetAsEntry handles folders
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
          const files = await traverseFileSystemEntry(entry);
          collected.push(...files);
        } else {
          const file = item.getAsFile();
          if (file && /\.(md|markdown)$/i.test(file.name)) {
            collected.push({ path: file.name, file });
          }
        }
      }
    }
  } else if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i];
      const relPath = (file as any).webkitRelativePath || file.name;
      if (!isIgnoredVaultPath(relPath) && /\.(md|markdown)$/i.test(file.name)) {
        collected.push({ path: relPath, file });
      }
    }
  }

  return collected;
}

/**
 * Parse an uploaded folder / directory of markdown notes into ZeroBox CptsNoteEntry[] format
 * Supports standard browser directory inputs (<input webkitdirectory directory multiple />)
 */
export async function parseObsidianVaultDirectory(
  fileSource: FileList | File[] | { path: string; file: File }[],
  onProgress?: (progress: VaultZipImportProgress) => void
): Promise<VaultZipImportResult> {
  onProgress?.({
    current: 0,
    total: 0,
    currentFile: 'Scanning directory files...',
    phase: 'unzipping',
  });

  const rawItems: { path: string; getText: () => Promise<string> }[] = [];
  const fileArray: { path: string; file: File }[] = [];

  // Normalize inputs to { path, file }
  if (Array.isArray(fileSource)) {
    for (const item of fileSource) {
      if ('file' in item && 'path' in item) {
        fileArray.push(item);
      } else {
        const file = item as File;
        const path = (file as any).webkitRelativePath || file.name;
        fileArray.push({ path, file });
      }
    }
  } else {
    for (let i = 0; i < fileSource.length; i++) {
      const file = fileSource[i];
      const path = (file as any).webkitRelativePath || file.name;
      fileArray.push({ path, file });
    }
  }

  // Filter markdown files and ignore system folders
  for (const { path, file } of fileArray) {
    const normalizedPath = path.replace(/\\/g, '/');
    if (isIgnoredVaultPath(normalizedPath)) {
      continue;
    }

    if (/\.(md|markdown)$/i.test(file.name) || /\.(md|markdown)$/i.test(normalizedPath)) {
      rawItems.push({
        path: normalizedPath,
        getText: () => file.text(),
      });
    }
  }

  if (rawItems.length === 0) {
    throw new Error('No markdown (.md or .markdown) notes were found in the selected directory.');
  }

  return parseObsidianRawItems(rawItems, onProgress);
}
