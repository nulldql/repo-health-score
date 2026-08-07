export function hasPath(tree: string[], patterns: RegExp[]): boolean {
  return tree.some((path) => patterns.some((pattern) => pattern.test(path)));
}

export function findPath(tree: string[], patterns: RegExp[]): string | null {
  for (const path of tree) {
    if (patterns.some((pattern) => pattern.test(path))) return path;
  }
  return null;
}

export function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}
