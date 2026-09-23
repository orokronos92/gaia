/**
 * Step 3 of the v2 import on the PREPROD database: the "FR et EN" and
 * "CODE ARTI EXPORT" sheets complete JDG products (English, export codes,
 * PMI tracking) and every one of their rows is kept verbatim.
 * Rules and mapping: src/lib/import-catalogue/onglets-complementaires.ts,
 * docs/decisions/2026-09-23-mapping-exhaustif-bdd-v2.md §5.
 *
 *   DATABASE_URL=…/gaialabel_preprod npx tsx scripts/importer-onglets-complementaires-v2.ts [--appliquer]
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { chargerCibles, ecrireOngletComplementaire } from "@/db/queries/complements-import";
import type { LigneSourceAEcrire, ValeursAEcrire } from "@/db/queries/complements-import";
import { nomBaseCourante } from "@/db/queries/import-catalogue";
import { texte } from "@/lib/import-catalogue/cellules";
import type { Ligne } from "@/lib/import-catalogue/cellules";
import { ligneEnObjet } from "@/lib/import-catalogue/ligne-source";
import { CODE_ARTI_EXPORT, FR_ET_EN, lireLigneComplementaire, position } from "@/lib/import-catalogue/onglets-complementaires";
import type { ColonneComplementaire, OngletComplementaire } from "@/lib/import-catalogue/onglets-complementaires";

const RACINE = path.resolve(__dirname, "..");
const FICHIER = "BDD étiquettes 2025 v2.xlsx";
const SOURCE = `docs/sources/${FICHIER}`;
const SORTIE_ECARTS = "docs/sources/complementaires-v2-ecarts-jdg.csv";
const SUFFIXE_BASE_AUTORISEE = "_preprod";
const DRAPEAU_APPLIQUER = "--appliquer";
const BOM = "﻿";

const csv = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function compterCodes(lignes: readonly Ligne[]): Map<string, number> {
  const n = new Map<string, number>();
  for (const l of lignes) {
    const code = texte(l[0]);
    if (code) n.set(code, (n.get(code) ?? 0) + 1);
  }
  return n;
}

async function main(): Promise<void> {
  const base = await nomBaseCourante();
  if (!base.endsWith(SUFFIXE_BASE_AUTORISEE)) throw new Error(`Base « ${base} » refusée : préproduction uniquement.`);
  const appliquer = process.argv.includes(DRAPEAU_APPLIQUER);
  const classeur = XLSX.readFile(path.join(RACINE, SOURCE));
  const lireOnglet = (nom: string) => XLSX.utils.sheet_to_json<Ligne>(classeur.Sheets[nom], { header: 1, defval: "" });

  const [entetesJdg, ...lignesJdg] = lireOnglet("JDG");
  const doublesJdg = compterCodes(lignesJdg);
  const parCodeJdg = new Map(lignesJdg.filter((l) => texte(l[0])).map((l) => [texte(l[0]) as string, l]));
  const cibles = await chargerCibles();
  const ecarts: string[] = [];

  for (const config of [FR_ET_EN, CODE_ARTI_EXPORT] satisfies OngletComplementaire[]) {
    const toutes = lireOnglet(config.onglet);
    const entetes = toutes[config.ligneEntete];
    const positions = new Map<ColonneComplementaire, number>();
    for (const colonne of config.colonnes) {
      const i = position(entetes, colonne.entete);
      if (i < 0) throw new Error(`« ${config.onglet} » : colonne « ${colonne.entete} » introuvable.`);
      positions.set(colonne, i);
    }
    const positionsJdg = new Map(config.colonnes.filter((c) => c.enteteJdg).map((c) => [c.enteteJdg as string, position(entetesJdg, c.enteteJdg as string)]));
    const lignes = toutes.slice(config.ligneEntete + 1).map((ligne, i) => ({ ligne, numero: config.ligneEntete + i + 2 }))
      .filter(({ ligne }) => ligne.some((c) => texte(c) !== null));
    const doubles = compterCodes(lignes.map((l) => l.ligne));

    const items: ValeursAEcrire[] = [];
    const sources: LigneSourceAEcrire[] = [];
    const ignores = { inconnu: 0, double: 0, tropLong: 0 };
    for (const { ligne, numero } of lignes) {
      const codePf = texte(ligne[0]);
      const cible = codePf ? cibles.get(codePf) : undefined;
      sources.push({ fichier: FICHIER, onglet: config.onglet, numeroLigne: numero, codePf, produitId: cible?.produitId ?? null, donnees: ligneEnObjet(entetes, ligne) });
      if (!codePf || !cible) { ignores.inconnu += 1; continue; }
      // Listed twice here or in the JDG sheet: waits for JDG (question C1).
      if (doubles.get(codePf) !== 1 || (doublesJdg.get(codePf) ?? 0) > 1) { ignores.double += 1; continue; }
      const { valeurs, ecarts: e, tropLongs } = lireLigneComplementaire(ligne, positions, parCodeJdg.get(codePf), positionsJdg);
      ignores.tropLong += tropLongs.length;
      for (const t of tropLongs) ecarts.push([config.onglet, codePf, t.champ, `trop long (${t.longueur} > ${t.max}), non écrit`, ""].map(csv).join(";"));
      for (const x of e) ecarts.push([config.onglet, codePf, x.champ, x.jdg, x.retenu].map(csv).join(";"));
      items.push({ cible, ...valeurs });
    }

    const bilan = appliquer ? await ecrireOngletComplementaire(items, sources) : null;
    process.stdout.write(
      `« ${config.onglet} » : ${lignes.length} lignes · ${items.length} produits complétés · ` +
        `ignorées : ${ignores.inconnu} sans produit en base, ${ignores.double} en double · ${ignores.tropLong} valeurs trop longues` +
        `${bilan ? ` · écrit ${JSON.stringify(bilan)}` : ""}\n`,
    );
  }

  writeFileSync(path.join(RACINE, SORTIE_ECARTS), BOM + ["onglet;code_pf;champ;valeur_onglet_jdg;valeur_retenue", ...ecarts].join("\r\n") + "\r\n");
  process.stdout.write(`${appliquer ? "Appliqué" : "Simulation"} sur ${base} · écarts avec l'onglet JDG : ${ecarts.length} (${SORTIE_ECARTS})\n`);
}

main()
  .then(() => process.exit(0))
  .catch((erreur: unknown) => {
    process.stderr.write(`${erreur instanceof Error ? erreur.message : String(erreur)}\n`);
    process.exit(1);
  });
