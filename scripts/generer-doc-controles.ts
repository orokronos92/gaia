/**
 * Régénère la section « Les N points » de docs/controles-etiquette.md depuis le
 * registre.
 *
 * Le document affirmait en tête être généré ; il ne l'était pas, et il a dérivé
 * deux fois — 39 points annoncés quand le registre en portait 44, et une
 * répartition par voie qui datait d'un état antérieur. Un document qui se dit
 * généré et ne l'est pas est pire qu'un document daté : on cesse de le vérifier.
 *
 *   npx tsx scripts/generer-doc-controles.ts
 *
 * Seuls les passages mécaniques sont réécrits : les décomptes du §1 et les
 * tableaux du §4. La prose reste écrite à la main — c'est elle qui explique, et
 * aucun registre ne sait l'écrire.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { CONTROL_CHECKLIST, partitionByMode } from "../src/lib/audit/control-checklist";
import { CONTROL_SECTIONS } from "../src/lib/audit/types";
import type { ControlMode, ControlSection } from "../src/lib/audit/types";

const DOC = "docs/controles-etiquette.md";

const TITRE_SECTION: Record<ControlSection, string> = {
  DENOMINATION: "Dénomination de la denrée",
  INGREDIENTS: "Liste des ingrédients",
  QUID: "QUID (pourcentages)",
  NUTRITION: "Déclaration nutritionnelle",
  PARTICULARITES: "Particularités",
  QUANTITE_NETTE: "Quantité nette",
  CONSERVATION: "Conservation et mode d'emploi",
  ORIGINE: "Origine géographique",
  FABRICANT: "Fabricant",
  GENCODE: "Gencode",
  METROLOGIE: "Métrologie",
  PICTOGRAMMES: "Pictogrammes",
  LABELS: "Labels",
  TYPOGRAPHIE: "Typographie",
  CODE_ETIQUETTE: "Code étiquette",
  CODE_ARTICLE: "Code article et Gencode",
};

const VOIE: Record<ControlMode, string> = {
  deterministic: "Code · fiche",
  bat: "Code · BAT",
  llm: "Modèle",
  manual: "Œil",
};

const doc = readFileSync(DOC, "utf8");

/**
 * La colonne « BAT » ne vient pas du registre : elle dit si le contrôle regarde
 * une zone du PDF, et c'est une annotation rédigée. On la relit dans le document
 * existant pour ne pas la perdre, et on ne la devine que pour un point nouveau.
 */
const batExistant = new Map<string, string>();
for (const m of doc.matchAll(/^\| \*\*(\d+\.\d+)\*\*[^|]*\|[^|]*\|[^|]*\|([^|]*)\|/gm)) {
  batExistant.set(m[1], m[2].trim());
}

const par = partitionByMode(CONTROL_CHECKLIST);
const total = CONTROL_CHECKLIST.length;
// Ce que le bouton « Contrôler » exécute réellement : le code, pas l'œil.
const pointsDeCode = par.deterministic.length + par.bat.length;

// ── §1 : les décomptes ──────────────────────────────────────────────────────
let sortie = doc
  .replace(/\*\*\d+ points de contrôle\*\*/g, `**${total} points de contrôle**`)
  .replace(/^\| Voie \| \d+ points \|/m, `| Voie | ${total} points |`)
  .replace(/^(\| \*\*Code · fiche\*\* \| )\d+( \|)/m, `$1${par.deterministic.length}$2`)
  .replace(/^(\| \*\*Code · BAT\*\* \| )\d+( \|)/m, `$1${par.bat.length}$2`)
  .replace(/^(\| \*\*Modèle\*\* \| )\d+( \|)/m, `$1${par.llm.length}$2`)
  .replace(/^(\| \*\*Œil\*\* \| )\d+( \|)/m, `$1${par.manual.length}$2`)
  .replace(/\n\d+ points de code sans consommer un jeton/, `\n${pointsDeCode} points de code sans consommer un jeton`)
  .replace(/n'ajoute que les \d+ points/, `n'ajoute que les ${par.llm.length} points`)
  .replace(/^\*\*Dernière génération\*\* : .*$/m, `**Dernière génération** : ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.`);

// ── §4 : les tableaux, un par section ───────────────────────────────────────
const tableaux = CONTROL_SECTIONS.filter((s) => CONTROL_CHECKLIST.some((c) => c.section === s))
  .map((s) => {
    const lignes = CONTROL_CHECKLIST.filter((c) => c.section === s)
      .sort((a, b) => a.ordre - b.ordre)
      .map((c) => {
        const conditionnel = c.applicableSi ? " †" : "";
        const bat = batExistant.get(c.id) ?? (c.mode === "bat" ? "zone" : "—");
        return `| **${c.id}**${conditionnel} | ${c.libelle} | ${VOIE[c.mode]} | ${bat} | ${c.reference} |`;
      })
      .join("\n");
    return `### ${TITRE_SECTION[s]}\n\n| Point | Ce qui est vérifié | Voie | BAT | Référence |\n|---|---|---|---|---|\n${lignes}`;
  })
  .join("\n\n");

const debut = sortie.indexOf("## 4. Les ");
const fin = sortie.indexOf("\n## 5.");
if (debut < 0 || fin < 0) throw new Error("Sections 4 et 5 introuvables : le document a changé de structure.");
sortie = `${sortie.slice(0, debut)}## 4. Les ${total} points\n\n${tableaux}\n${sortie.slice(fin)}`;

writeFileSync(DOC, sortie);
console.log(`${DOC} régénéré — ${total} points (${par.deterministic.length}/${par.bat.length}/${par.llm.length}/${par.manual.length}).`);
