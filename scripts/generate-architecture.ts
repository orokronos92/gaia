/**
 * Generates docs/ARCHITECTURE.md from the source tree. Deterministic, no LLM.
 *
 *   npx tsx scripts/generate-architecture.ts           # npm run arch:build
 *   npx tsx scripts/generate-architecture.ts --check   # npm run arch:check
 *
 * The metadata line (date + commit) is the only part that changes without the
 * code changing. It is left out of every comparison: `build` rewrites the file
 * only when the structure moved, and `check` fails only on a structural gap —
 * otherwise every commit would dirty the file and the check would never pass.
 * The commit shown is therefore the one the last structural change was built on.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { collectFiles } from "./architecture/collect";
import { renderDocument, renderMeta, splitMeta } from "./architecture/render";

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT_DIR, "docs", "ARCHITECTURE.md");
const CHECK_FLAG = "--check";
const UNKNOWN_COMMIT = "inconnu";

function currentCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT_DIR, encoding: "utf8" }).trim();
  } catch {
    return UNKNOWN_COMMIT;
  }
}

function main(): void {
  const files = collectFiles(ROOT_DIR);
  const fresh = renderDocument(files, renderMeta({ date: new Date().toISOString().slice(0, 10), commit: currentCommit() }));
  const existing = existsSync(OUTPUT) ? readFileSync(OUTPUT, "utf8") : null;
  const upToDate = existing !== null && splitMeta(existing).body === splitMeta(fresh).body;
  const relativeOutput = path.relative(ROOT_DIR, OUTPUT);

  if (process.argv.includes(CHECK_FLAG)) {
    if (upToDate) return;
    process.stderr.write(`${relativeOutput} n'est pas à jour. Lancer : npm run arch:build\n`);
    process.exitCode = 1;
    return;
  }

  if (upToDate) {
    process.stdout.write(`${relativeOutput} déjà à jour (${files.length} fichiers).\n`);
    return;
  }
  writeFileSync(OUTPUT, fresh);
  process.stdout.write(`${relativeOutput} régénéré (${files.length} fichiers).\n`);
}

main();
