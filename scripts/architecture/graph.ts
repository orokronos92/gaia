/**
 * Turns the file-level import list into the views the document needs: modules
 * (folders), module-to-module edges, inbound import counts and file cycles.
 */
import type { FileInfo } from "./collect";
import { byText } from "./sort";

/** How many folder levels under `src/` make a module (src/app/(dashboard) = 2). */
const SRC_MODULE_DEPTH = 2;
/** Other scanned roots (scripts/, drizzle/) are split one level deep. */
const OTHER_MODULE_DEPTH = 1;

export interface ModuleInfo {
  path: string;
  files: number;
  lines: number;
  dependsOn: string[];
  usedBy: string[];
}

export interface ModuleEdge {
  from: string;
  to: string;
  imports: number;
}

/** Folder a file belongs to, truncated at the module depth of its root. */
export function moduleOf(filePath: string): string {
  const folders = filePath.split("/").slice(0, -1);
  const depth = folders[0] === "src" ? SRC_MODULE_DEPTH : OTHER_MODULE_DEPTH;
  return folders.slice(0, depth + 1).join("/");
}

export function moduleEdges(files: readonly FileInfo[]): ModuleEdge[] {
  const counts = new Map<string, ModuleEdge>();
  for (const file of files) {
    const from = moduleOf(file.path);
    for (const target of file.imports) {
      const to = moduleOf(target);
      if (to === from) continue;
      const key = `${from}\u0000${to}`;
      const edge = counts.get(key) ?? { from, to, imports: 0 };
      edge.imports += 1;
      counts.set(key, edge);
    }
  }
  return [...counts.values()].sort((a, b) => byText(a.from, b.from) || byText(a.to, b.to));
}

export function modules(files: readonly FileInfo[], edges: readonly ModuleEdge[]): ModuleInfo[] {
  const byPath = new Map<string, ModuleInfo>();
  for (const file of files) {
    const key = moduleOf(file.path);
    const info = byPath.get(key) ?? { path: key, files: 0, lines: 0, dependsOn: [], usedBy: [] };
    info.files += 1;
    info.lines += file.lines;
    byPath.set(key, info);
  }
  for (const edge of edges) {
    byPath.get(edge.from)?.dependsOn.push(edge.to);
    byPath.get(edge.to)?.usedBy.push(edge.from);
  }
  return [...byPath.values()]
    .map((info) => ({ ...info, dependsOn: info.dependsOn.sort(byText), usedBy: info.usedBy.sort(byText) }))
    .sort((a, b) => byText(a.path, b.path));
}

/** Number of distinct files importing each file. */
export function inboundCounts(files: readonly FileInfo[]): Map<string, number> {
  const importers = new Map<string, Set<string>>();
  for (const file of files) {
    for (const target of file.imports) {
      const set = importers.get(target) ?? new Set<string>();
      set.add(file.path);
      importers.set(target, set);
    }
  }
  return new Map([...importers].map(([target, set]) => [target, set.size]));
}

/**
 * Strongly connected components with more than one file (or a file importing
 * itself), via Tarjan's algorithm. Each cycle is sorted, and cycles are sorted
 * by their first file.
 */
export function fileCycles(files: readonly FileInfo[]): string[][] {
  const adjacency = new Map(files.map((file) => [file.path, [...new Set(file.imports)]]));
  const index = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycles: string[][] = [];
  let counter = 0;

  const visit = (node: string): void => {
    index.set(node, counter);
    lowLink.set(node, counter);
    counter += 1;
    stack.push(node);
    onStack.add(node);
    for (const next of adjacency.get(node) ?? []) {
      if (!index.has(next)) {
        visit(next);
        lowLink.set(node, Math.min(lowLink.get(node)!, lowLink.get(next)!));
      } else if (onStack.has(next)) {
        lowLink.set(node, Math.min(lowLink.get(node)!, index.get(next)!));
      }
    }
    if (lowLink.get(node) !== index.get(node)) return;
    const component: string[] = [];
    let member: string | undefined;
    do {
      member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    const selfImport = adjacency.get(node)?.includes(node) ?? false;
    if (component.length > 1 || selfImport) cycles.push(component.sort(byText));
  };

  for (const file of files) {
    if (!index.has(file.path)) visit(file.path);
  }
  return cycles.sort((a, b) => byText(a[0], b[0]));
}
