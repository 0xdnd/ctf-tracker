/**
 * Markdown frontmatter / command parsing shared by the vault importers and
 * note editing. Kept free of JSZip so non-import code can use it cheaply.
 */

/**
 * Normalizes text to extract title, slug, and clean tokens
 */
function cleanText(text: string): string {
  return text.trim().replace(/^["']|["']$/g, '');
}

/**
 * Extracts YAML frontmatter, body, and metadata from raw markdown content
 */
export function parseFrontmatterAndBody(raw: string): {
  frontmatter: Record<string, string>;
  tags: string[];
  tools: string[];
  aliases: string[];
  body: string;
} {
  const frontmatter: Record<string, string> = {};
  const tags: string[] = [];
  const tools: string[] = [];
  const aliases: string[] = [];
  
  // Strip UTF-8 BOM if present (common in Windows-authored files)
  const normalizedRaw = raw.replace(/^\uFEFF/, '');
  let body = normalizedRaw;

  const fmMatch = normalizedRaw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fmMatch) {
    body = normalizedRaw.slice(fmMatch[0].length);
    const lines = fmMatch[1].split(/\r?\n/);
    let currentKey = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('- ') && currentKey) {
        const val = cleanText(trimmed.slice(2));
        if (currentKey === 'tags') tags.push(val);
        else if (currentKey === 'tools') tools.push(val);
        else if (currentKey === 'aliases' || currentKey === 'alias') aliases.push(val);
        continue;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        currentKey = line.slice(0, colonIdx).trim().toLowerCase();
        const value = line.slice(colonIdx + 1).trim();
        if (value.startsWith('[') && value.endsWith(']')) {
          const listItems = value
            .slice(1, -1)
            .split(',')
            .map((s) => cleanText(s))
            .filter(Boolean);
          if (currentKey === 'tags') tags.push(...listItems);
          else if (currentKey === 'tools') tools.push(...listItems);
          else if (currentKey === 'aliases' || currentKey === 'alias') aliases.push(...listItems);
        } else if (value) {
          frontmatter[currentKey] = cleanText(value);
          if (currentKey === 'alias' || currentKey === 'aliases') {
            aliases.push(cleanText(value));
          }
        }
      }
    }
  }

  // Also harvest any inline hashtags (#active-directory, #smb, etc.)
  const inlineTags = body.match(/(?:^|\s)#([a-zA-Z0-9_-]{2,30})/g);
  if (inlineTags) {
    for (const t of inlineTags) {
      const cleaned = t.trim().replace(/^#/, '');
      if (cleaned && !tags.includes(cleaned)) {
        tags.push(cleaned);
      }
    }
  }

  return { frontmatter, tags, tools, aliases, body };
}

/**
 * Extracts executable commands from code blocks in markdown body
 */
export function extractCommands(body: string): string[] {
  const commands: string[] = [];
  const codeBlockRegex = /```(?:bash|sh|cmd|powershell|ps1|zsh|shell)?[ \t]*\r?\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(body)) !== null) {
    const lines = match[1].split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('::')) {
        continue;
      }
      if (trimmed.length > 3 && !commands.includes(trimmed)) {
        commands.push(trimmed);
      }
    }
  }

  return commands;
}
