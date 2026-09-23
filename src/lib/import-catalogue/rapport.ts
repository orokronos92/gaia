/**
 * The import report: a summary Marie can read, and CSV files (Excel-friendly:
 * BOM, semicolons) with every line behind the numbers.
 */
import type { Plan } from "./plan";
import type { Decision, Valeur } from "./types";

export interface ContexteRapport {
  source: string;
  base: string;
  date: string;
  applique: boolean;
  lignesLues: number;
}

const LIBELLE_DECISION: Record<Exclude<Decision, "identique">, string> = {
  prendre: "pris de l'Excel",
  garder: "modifié dans l'app, gardé",
  conflit: "conflit, app gardée",
  vide_excel: "vide dans l'Excel, app gardée",
};

const BOM = "﻿";

function cellule(valeur: Valeur | undefined | number): string {
  if (valeur === undefined) return "(inconnu)";
  if (valeur === null) return "";
  const texte = Array.isArray(valeur) ? valeur.join(", ") : String(valeur);
  return /[";\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

function csv(entetes: readonly string[], lignes: ReadonlyArray<ReadonlyArray<Valeur | undefined | number>>): string {
  return BOM + [entetes.join(";"), ...lignes.map((l) => l.map(cellule).join(";"))].join("\r\n") + "\r\n";
}

export function csvDecisions(plan: Plan): string {
  const lignes = plan.misesAJour.flatMap((m) =>
    [...m.decisionsProduit, ...m.decisionsFiche]
      .filter((d) => d.decision !== "identique")
      .map((d) => [m.codePf, d.champ, LIBELLE_DECISION[d.decision as Exclude<Decision, "identique">], d.ancetre, d.base, d.excel]),
  );
  return csv(["code_pf", "champ", "decision", "valeur_mars", "valeur_app", "valeur_excel"], lignes);
}

export const csvMisDeCote = (plan: Plan): string =>
  csv(["code_pf", "lignes_excel", "motif"], plan.misDeCote.map((m) => [m.codePf, m.lignes.join(" "), m.motif]));

export const csvAnomalies = (plan: Plan): string =>
  csv(["code_pf", "colonne", "valeur", "motif"], plan.anomalies.map((a) => [a.codePf, a.colonne, a.valeur, a.motif]));

function compter<T>(elements: readonly T[], cle: (e: T) => string): Array<[string, number]> {
  const n = new Map<string, number>();
  for (const e of elements) n.set(cle(e), (n.get(cle(e)) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
}

function tableauChamps(plan: Plan): string[] {
  const decisions = plan.misesAJour.flatMap((m) => [...m.decisionsProduit, ...m.decisionsFiche]);
  const champs = [...new Set(decisions.filter((d) => d.decision !== "identique").map((d) => d.champ))].sort();
  const n = (champ: string, decision: Decision) => decisions.filter((d) => d.champ === champ && d.decision === decision).length;
  return [
    "| Champ | Pris de l'Excel | Gardé (Marie) | Conflit | Vide dans l'Excel |",
    "|---|---:|---:|---:|---:|",
    ...champs.map((c) => `| \`${c}\` | ${n(c, "prendre")} | ${n(c, "garder")} | ${n(c, "conflit")} | ${n(c, "vide_excel")} |`),
  ];
}

export function rapportMarkdown(plan: Plan, ctx: ContexteRapport): string {
  const produitsTouches = plan.misesAJour.filter((m) => m.decisionsProduit.some((d) => d.decision === "prendre")).length;
  const fichesTouchees = plan.misesAJour.filter((m) => m.decisionsFiche.some((d) => d.decision === "prendre")).length;
  const fichesIgnorees = plan.misesAJour.filter((m) => m.ficheIgnoree !== null);
  const bloque = plan.libellesInconnus.length > 0;
  return [
    `# Import de la BDD étiquettes v2 — ${ctx.applique ? "appliqué" : "simulation"}`,
    "",
    `Source : \`${ctx.source}\` · base : \`${ctx.base}\` · ${ctx.date}`,
    "",
    bloque
      ? "> ⛔ **Import bloqué** : des gammes ou sous-gammes de l'Excel n'existent pas dans le référentiel (voir plus bas). Rien ne peut être écrit tant qu'elles ne sont pas créées ou corrigées."
      : "> ✅ Aucun blocage : le plan peut être appliqué après relecture.",
    "",
    "## En résumé",
    "",
    "| | Nombre |",
    "|---|---:|",
    `| Lignes lues (onglet JDG) | ${ctx.lignesLues} |`,
    `| Produits à créer | ${plan.creations.length} |`,
    `| Produits déjà en base, comparés | ${plan.misesAJour.length} |`,
    `| — dont produit mis à jour depuis l'Excel | ${produitsTouches} |`,
    `| — dont fiche mise à jour depuis l'Excel | ${fichesTouchees} |`,
    `| — dont fiche non comparée (plusieurs fiches ou aucune) | ${fichesIgnorees.length} |`,
    `| Lignes mises de côté | ${plan.misDeCote.length} |`,
    `| Anomalies signalées | ${plan.anomalies.length} |`,
    `| Libellés de gamme bloquants | ${plan.libellesInconnus.length} |`,
    `| Produits en base absents de l'Excel | ${plan.absentsDeLExcel.length} |`,
    "",
    ...(bloque
      ? ["## ⛔ Gammes et sous-gammes à créer ou corriger", "", "| Type | Libellé Excel | Dans la gamme | Problème | Lignes |", "|---|---|---|---|---:|",
          ...plan.libellesInconnus.map((l) => `| ${l.type} | ${l.libelle} | ${l.gamme ?? "—"} | ${l.motif} | ${l.lignes} |`), ""]
      : []),
    "## Produits existants : champ par champ",
    "",
    "Détail ligne à ligne : `import-v2-decisions.csv`.",
    "",
    ...tableauChamps(plan),
    "",
    "## Lignes mises de côté",
    "",
    "Détail : `import-v2-mis-de-cote.csv`.",
    "",
    "| Motif | Lignes |",
    "|---|---:|",
    ...compter(plan.misDeCote, (m) => m.motif.replace(/ :.*$/, "")).map(([motif, n]) => `| ${motif} | ${n} |`),
    "",
    "## Anomalies",
    "",
    "Détail : `import-v2-anomalies.csv`.",
    "",
    "| Colonne | Motif | Nombre |",
    "|---|---|---:|",
    ...compter(plan.anomalies, (a) => `${a.colonne}|${a.motif}`).map(([cle, n]) => `| ${cle.replace("|", " | ")} | ${n} |`),
    "",
    "## Produits en base absents de l'Excel",
    "",
    plan.absentsDeLExcel.length === 0 ? "Aucun." : plan.absentsDeLExcel.map((c) => `\`${c}\``).join(", "),
    "",
  ].join("\n");
}
