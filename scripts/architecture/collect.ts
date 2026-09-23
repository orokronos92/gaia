/**
 * Reads the source tree and resolves every import to a project file.
 *
 * Resolution goes through the TypeScript compiler with the options from
 * tsconfig.json, so `@/...` aliases are resolved exactly as `tsc` resolves them —
 * no string heuristics.
 */
import path from "node:path";
import { Node, Project, ts } from "ts-morph";
import type { SourceFile } from "ts-morph";
import { byText } from "./sort";

/** Directories scanned, relative to the repository root. */
export const SCANNED_ROOTS: readonly string[] = ["src", "scripts", "drizzle"];

const INCLUDE_GLOBS: readonly string[] = SCANNED_ROOTS.flatMap((root) => [
  `${root}/**/*.ts`,
  `${root}/**/*.tsx`,
]);

const EXCLUDE_GLOBS: readonly string[] = [
  "**/node_modules/**",
  "**/.next/**",
  "**/*.d.ts",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.spec.ts",
  "**/*.spec.tsx",
  "**/__tests__/**",
  "src/tests/**",
];

const ROUTE_FILE_NAMES: readonly string[] = ["page", "layout", "route"];
const USE_SERVER_DIRECTIVE = "use server";

export type EntryKind = "page" | "layout" | "route" | "action";

export interface FileInfo {
  /** Repository-relative path with forward slashes. */
  path: string;
  lines: number;
  /** Resolved project files imported by this file, one entry per import statement. */
  imports: string[];
  entryKind: EntryKind | null;
}

function toRelative(rootDir: string, absolutePath: string): string {
  return path.relative(rootDir, absolutePath).split(path.sep).join("/");
}

function countLines(text: string): number {
  if (text.length === 0) return 0;
  const newlines = text.split("\n").length - 1;
  return text.endsWith("\n") ? newlines : newlines + 1;
}

/**
 * Static imports, `export … from`, dynamic `import()` and `import("…").Type`.
 * `preProcessFile` scans tokens without building a program — SourceFile's
 * getImportStringLiterals() does the same job about ten times slower, which
 * matters in a pre-commit hook.
 */
function moduleSpecifiers(sourceFile: SourceFile): string[] {
  const { importedFiles } = ts.preProcessFile(sourceFile.getFullText(), true, true);
  return importedFiles.map((reference) => reference.fileName);
}

function hasUseServerDirective(sourceFile: SourceFile): boolean {
  const [first] = sourceFile.getStatements();
  if (!first || !Node.isExpressionStatement(first)) return false;
  const expression = first.getExpression();
  return Node.isStringLiteral(expression) && expression.getLiteralValue() === USE_SERVER_DIRECTIVE;
}

function entryKindOf(relativePath: string, sourceFile: SourceFile): EntryKind | null {
  if (relativePath.startsWith("src/app/")) {
    const baseName = path.basename(relativePath).replace(/\.tsx?$/, "");
    if (ROUTE_FILE_NAMES.includes(baseName)) return baseName as EntryKind;
  }
  return hasUseServerDirective(sourceFile) ? "action" : null;
}

export function collectFiles(rootDir: string): FileInfo[] {
  const project = new Project({
    tsConfigFilePath: path.join(rootDir, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  });
  project.addSourceFilesAtPaths([
    ...INCLUDE_GLOBS.map((glob) => path.join(rootDir, glob)),
    ...EXCLUDE_GLOBS.map((glob) => `!${path.join(rootDir, glob)}`),
  ]);

  const compilerOptions = project.getCompilerOptions();
  const host = project.getModuleResolutionHost();
  const sourceFiles = project.getSourceFiles();
  const scanned = new Set(sourceFiles.map((file) => file.getFilePath() as string));

  const files = sourceFiles.map((sourceFile): FileInfo => {
    const absolutePath = sourceFile.getFilePath() as string;
    const relativePath = toRelative(rootDir, absolutePath);
    const imports: string[] = [];
    for (const specifier of moduleSpecifiers(sourceFile)) {
      const resolved = ts.resolveModuleName(specifier, absolutePath, compilerOptions, host).resolvedModule;
      if (resolved && scanned.has(resolved.resolvedFileName)) {
        imports.push(toRelative(rootDir, resolved.resolvedFileName));
      }
    }
    return {
      path: relativePath,
      lines: countLines(sourceFile.getFullText()),
      imports: imports.sort(byText),
      entryKind: entryKindOf(relativePath, sourceFile),
    };
  });

  return files.sort((a, b) => byText(a.path, b.path));
}
