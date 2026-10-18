/** Drops a trailing slash so '/tracker/' and '/tracker' compare equal. '/' stays '/'. */
export function stripTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}
