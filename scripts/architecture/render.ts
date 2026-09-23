/**
 * Renders docs/ARCHITECTURE.md from the collected files. Pure: the same input
 * always gives the same text, apart from the metadata line (date + commit),
 * which `splitMeta` lets callers set aside when comparing.
 */
import type { FileInfo } from "./collect";
import { fileCycles, inboundCounts, moduleEdges, modules } from "./graph";
import { byText } from "./sort";

/** A file longer than this lands in the debt table (CLAUDE.md §4). */
export const LINE_THRESHOLD = 300;

const APP_ROOT = "src/app";
const META_PREFIX = "> Base : commit";

export interface Meta {
  date: string;
  commit: string;
}

export function renderMeta({ date, commit }: Meta): string {
  return `${META_PREFIX} \`${commit}\` · généré le ${date}`;
}

/** Separates the metadata line from the rest, which is fully deterministic. */
export function splitMeta(document: string): { meta: string | null; body: string } {
  const lines = document.split("\n");
  const at = lines.findIndex((line) => line.startsWith(META_PREFIX));
  if (at === -1) return { meta: null, body: document };
  return { meta: lines[at], body: [...lines.slice(0, at), ...lines.slice(at + 1)].join("\n") };
}

const code = (value: string): string => `\`${value}\``;
const list = (values: readonly string[]): string => (values.length === 0 ? "—" : values.map(code).join(", "));

function header(files: readonly FileInfo[], meta: string): string[] {
  const total = files.reduce((sum, file) => sum + file.lines, 0);
  return [
    "# Architecture — GaïaLabel",
    "",
    "> **Fichier généré par `npm run arch:build` — ne pas modifier à la main.**",
    "> Toute modification manuelle est écrasée à la prochaine génération et fait échouer `npm run arch:check`.",
    "> La prose (rôle des modules, intentions) vit dans `docs/INTENTION.md`.",
    meta,
    "",
    `**${files.length} fichiers · ${total} lignes** (src/, scripts/, drizzle/ — hors tests et fichiers de déclaration)`,
    "",
  ];
}

function diagram(files: readonly FileInfo[]): string[] {
  const edges = moduleEdges(files);
  const ids = new Map(modules(files, edges).map((module, i) => [module.path, `m${i}`]));
  return [
    "## Dépendances entre dossiers",
    "",
    "Une flèche A → B : au moins un fichier de A importe un fichier de B. L'étiquette compte les imports.",
    "",
    "```mermaid",
    "graph LR",
    ...[...ids].map(([path, id]) => `  ${id}["${path}"]`),
    ...edges.map((edge) => `  ${ids.get(edge.from)} -->|${edge.imports}| ${ids.get(edge.to)}`),
    "```",
    "",
  ];
}

function moduleTable(files: readonly FileInfo[]): string[] {
  const rows = modules(files, moduleEdges(files)).map(
    (module) =>
      `| ${code(module.path)} | ${module.files} | ${module.lines} | ${list(module.dependsOn)} | ${list(module.usedBy)} |`,
  );
  return [
    "## Modules",
    "",
    "| Module | Fichiers | Lignes | Dépend de | Utilisé par |",
    "|---|---:|---:|---|---|",
    ...rows,
    "",
  ];
}

function debtTable(files: readonly FileInfo[]): string[] {
  const inbound = inboundCounts(files);
  const long = files
    .filter((file) => file.lines > LINE_THRESHOLD)
    .sort((a, b) => b.lines - a.lines || byText(a.path, b.path));
  const intro = `Fichiers de plus de ${LINE_THRESHOLD} lignes. « Importé par » = nombre de fichiers qui l'importent.`;
  if (long.length === 0) return [`## Fichiers au-delà du seuil`, "", intro, "", "Aucun.", ""];
  return [
    "## Fichiers au-delà du seuil",
    "",
    intro,
    "",
    "| Fichier | Lignes | Importé par |",
    "|---|---:|---:|",
    ...long.map((file) => `| ${code(file.path)} | ${file.lines} | ${inbound.get(file.path) ?? 0} |`),
    "",
  ];
}

function cycleSection(files: readonly FileInfo[]): string[] {
  const cycles = fileCycles(files);
  if (cycles.length === 0) return [];
  return [
    "## Dépendances circulaires",
    "",
    "Chaque groupe est un ensemble de fichiers qui s'importent mutuellement, directement ou non.",
    "",
    ...cycles.flatMap((cycle, i) => [`${i + 1}. ${list(cycle)}`]),
    "",
  ];
}

/** URL served by a route file: route groups `(x)` are dropped, as Next.js does. */
function urlOf(filePath: string): string {
  const segments = filePath
    .slice(APP_ROOT.length + 1)
    .split("/")
    .slice(0, -1)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));
  return `/${segments.join("/")}`;
}

function entryPoints(files: readonly FileInfo[]): string[] {
  const routes = files.filter((file) => file.entryKind !== null && file.entryKind !== "action");
  const actions = files.filter((file) => file.entryKind === "action");
  return [
    "## Points d'entrée",
    "",
    "### Routes Next.js",
    "",
    "| URL | Type | Fichier |",
    "|---|---|---|",
    ...routes.map((file) => `| ${code(urlOf(file.path))} | ${file.entryKind} | ${code(file.path)} |`),
    "",
    '### Server Actions (fichiers `"use server"`)',
    "",
    ...(actions.length === 0 ? ["Aucune."] : actions.map((file) => `- ${code(file.path)}`)),
    "",
  ];
}

export function renderDocument(files: readonly FileInfo[], meta: string): string {
  return [
    ...header(files, meta),
    ...diagram(files),
    ...moduleTable(files),
    ...debtTable(files),
    ...cycleSection(files),
    ...entryPoints(files),
  ]
    .join("\n")
    .replace(/\n+$/, "\n");
}
