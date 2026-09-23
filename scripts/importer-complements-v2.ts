/**
 * Step 2 of the v2 import on the PREPROD database (JDG sheet): fills the
 * fields migration 0028 added, one production-tracking row per label sheet,
 * and every workbook row kept verbatim. Also checks that the PMI text pieces
 * ("1-4 …", "2-4 …") glue back into the label text.
 * Mapping: docs/decisions/2026-09-23-mapping-exhaustif-bdd-v2.md §2.
 *
 *   DATABASE_URL=…/gaialabel_preprod npx tsx scripts/importer-complements-v2.ts [--appliquer]
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { chargerCibles, ecrireComplements } from "@/db/queries/complements-import";
import type { ComplementAEcrire, LigneSourceAEcrire } from "@/db/queries/complements-import";
import { nomBaseCourante } from "@/db/queries/import-catalogue";
import type { Ligne } from "@/lib/import-catalogue/cellules";
import { texte } from "@/lib/import-catalogue/cellules";
import { indexerComplementsJdg, lireComplementsJdg } from "@/lib/import-catalogue/complements-jdg";
import { ecartsDecoupagePmi, ligneEnObjet } from "@/lib/import-catalogue/ligne-source";

const RACINE = path.resolve(__dirname, "..");
const FICHIER = "BDD étiquettes 2025 v2.xlsx";
const SOURCE = `docs/sources/${FICHIER}`;
const ONGLET = "JDG";
const SORTIE = "docs/sources/complements-v2-ecarts-pmi.csv";
const SUFFIXE_BASE_AUTORISEE = "_preprod";
const DRAPEAU_APPLIQUER = "--appliquer";
const BOM = "﻿";

const cellule = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

async function main(): Promise<void> {
  const base = await nomBaseCourante();
  if (!base.endsWith(SUFFIXE_BASE_AUTORISEE)) throw new Error(`Base « ${base} » refusée : préproduction uniquement.`);
  const appliquer = process.argv.includes(DRAPEAU_APPLIQUER);

  const feuille = XLSX.readFile(path.join(RACINE, SOURCE)).Sheets[ONGLET];
  const [entetes, ...lignes] = XLSX.utils.sheet_to_json<Ligne>(feuille, { header: 1, defval: "" });
  const index = indexerComplementsJdg(entetes);
  const cibles = await chargerCibles();

  const remplies = lignes.map((ligne, i) => ({ ligne, numero: i + 2 })).filter(({ ligne }) => ligne.some((c) => texte(c) !== null));
  const occurrences = new Map<string, number>();
  for (const { ligne } of remplies) {
    const code = texte(ligne[0]);
    if (code) occurrences.set(code, (occurrences.get(code) ?? 0) + 1);
  }

  const aEcrire: ComplementAEcrire[] = [];
  const sources: LigneSourceAEcrire[] = [];
  const ecarts: string[] = [];
  const remplis = new Map<string, number>();
  for (const { ligne, numero } of remplies) {
    const codePf = texte(ligne[0]);
    const cible = codePf ? cibles.get(codePf) : undefined;
    const donnees = ligneEnObjet(entetes, ligne);
    sources.push({ fichier: FICHIER, onglet: ONGLET, numeroLigne: numero, codePf, produitId: cible?.produitId ?? null, donnees });
    for (const e of ecartsDecoupagePmi(donnees)) ecarts.push([codePf ?? "", String(numero), e.texte, e.complet, e.recolle].map(cellule).join(";"));
    // A code the workbook lists twice waits for JDG (question C1): its row is kept, not read.
    if (!cible || !codePf || occurrences.get(codePf) !== 1) continue;
    const complements = lireComplementsJdg(ligne, index);
    aEcrire.push({ cible, complements });
    for (const [champ, valeur] of Object.entries({ ...complements.produit, ...complements.fiche, ...complements.suivi })) {
      if (valeur !== null && valeur !== false) remplis.set(champ, (remplis.get(champ) ?? 0) + 1);
    }
  }

  writeFileSync(path.join(RACINE, SORTIE), BOM + ["code_pf;ligne_excel;texte;texte_etiquette;morceaux_pmi_recolles", ...ecarts].join("\r\n") + "\r\n");
  if (appliquer) {
    const bilan = await ecrireComplements(aEcrire, sources);
    process.stdout.write(`Écrit : ${JSON.stringify(bilan)}\n`);
  }
  process.stdout.write(
    `${appliquer ? "Appliqué" : "Simulation"} sur ${base}\n` +
      `Lignes brutes gardées : ${sources.length} · produits complétés : ${aEcrire.length} · ` +
      `fiches avec suivi : ${aEcrire.filter((a) => a.cible.ficheId !== null).length}\n` +
      `Écarts texte ↔ morceaux PMI : ${ecarts.length} (${SORTIE})\n` +
      `Champs renseignés :\n${[...remplis].sort((a, b) => b[1] - a[1]).map(([c, n]) => `  ${c} : ${n}`).join("\n")}\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((erreur: unknown) => {
    process.stderr.write(`${erreur instanceof Error ? erreur.message : String(erreur)}\n`);
    process.exit(1);
  });
