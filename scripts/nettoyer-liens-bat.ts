/**
 * Step 5 of the v2 import on the PREPROD database: every active automatic BAT
 * link goes through the packaging rules (src/lib/conditionnement/regles-bat.ts).
 * A link that breaks one — a bulk bag printed in-house, another format's label,
 * a face the workbook gives to another reference — is deactivated; so is any
 * file that is not the current version of its face. Nothing is deleted.
 *
 *   DATABASE_URL=…/gaialabel_preprod npx tsx scripts/nettoyer-liens-bat.ts [--appliquer]
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { nomBaseCourante, trouverSignataireId } from "@/db/queries/import-catalogue";
import { chargerLiensBatActifs, desactiverLiens } from "@/db/queries/liens-bat";
import type { Desactivation } from "@/db/queries/liens-bat";
import { lireCodeFichier, verifierCompatibilite, versionsDepassees } from "@/lib/conditionnement/regles-bat";

const RACINE = path.resolve(__dirname, "..");
const SORTIE = "docs/sources/nettoyage-bat.csv";
const SUFFIXE_BASE_AUTORISEE = "_preprod";
const ROLE_SIGNATAIRE = "DIRECTION";
const PREFIXE_TRI_SEPTEMBRE = "ÉTIQUETTES 2026-09/";
const BOM = "﻿";

const csv = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

async function main(): Promise<void> {
  const base = await nomBaseCourante();
  if (!base.endsWith(SUFFIXE_BASE_AUTORISEE)) throw new Error(`Base « ${base} » refusée : préproduction uniquement.`);
  const appliquer = process.argv.includes("--appliquer");

  // A product with several fiches comes back once per fiche: one row per link.
  const liens = [...new Map((await chargerLiensBatActifs()).map((l) => [l.id, l])).values()];
  const desactivations: Desactivation[] = [];
  const aVerifier: Desactivation[] = [];
  const conformes = [];
  const bases = new Map<string, Set<string>>();
  for (const lien of liens) {
    const base = lireCodeFichier(lien.nomFichier)?.base;
    if (base) bases.set(lien.produitId, (bases.get(lien.produitId) ?? new Set()).add(base));
  }
  for (const lien of liens) {
    const verdict = verifierCompatibilite(lien, lien.nomFichier);
    const d = { id: lien.id, codePf: lien.codePf, nomFichier: lien.nomFichier };
    if (verdict.ok) conformes.push(lien);
    // The workbook may carry a typo: the file goes only where the one it names is there.
    else if (verdict.regle === "reference" && !(verdict.attendu && bases.get(lien.produitId)?.has(verdict.attendu))) {
      conformes.push(lien);
      aVerifier.push({ ...d, motif: `${verdict.motif} — gardé, le fichier attendu n'existe pas` });
    } else desactivations.push({ ...d, motif: verdict.motif });
  }
  const parId = new Map(conformes.map((l) => [l.id, l]));
  for (const [id, motif] of versionsDepassees(conformes)) {
    const lien = parId.get(id);
    if (lien) desactivations.push({ id, codePf: lien.codePf, nomFichier: lien.nomFichier, motif });
  }

  const source = (id: string) => { const l = liens.find((x) => x.id === id); return `${l?.cleS3.startsWith(PREFIXE_TRI_SEPTEMBRE) ? "septembre" : "mars"}${l?.type === "SOURCE" ? ", source .ai" : ""}`; };
  writeFileSync(path.join(RACINE, SORTIE), BOM + ["code_pf;fichier;envoi;decision;motif",
    ...desactivations.map((d) => [d.codePf, d.nomFichier, source(d.id), "désactivé", d.motif].map(csv).join(";")),
    ...aVerifier.map((d) => [d.codePf, d.nomFichier, source(d.id), "gardé, à vérifier", d.motif].map(csv).join(";"))].join("\r\n") + "\r\n");

  if (appliquer) {
    const signataire = await trouverSignataireId(ROLE_SIGNATAIRE);
    if (signataire === null) throw new Error(`Aucun compte ${ROLE_SIGNATAIRE} pour signer.`);
    process.stdout.write(`Désactivés : ${await desactiverLiens(desactivations, signataire)}\n`);
  }
  const motifs = new Map<string, number>();
  for (const d of desactivations) {
    const cle = `${d.motif.replace(/ \(.*$| par .*$| de .*$| ET\S+ sur cette face, pas .*$/, "")} [${source(d.id)}]`;
    motifs.set(cle, (motifs.get(cle) ?? 0) + 1);
  }
  process.stdout.write(
    `${appliquer ? "Appliqué" : "Simulation"} sur ${base} : ${liens.length} liens BAT actifs, ${desactivations.length} à désactiver, ` +
      `${aVerifier.length} gardés à vérifier (${SORTIE})\n` +
      [...motifs].sort((a, b) => b[1] - a[1]).map(([m, n]) => `  ${m} : ${n}`).join("\n") + "\n",
  );
}

main()
  .then(() => process.exit(0))
  .catch((erreur: unknown) => {
    process.stderr.write(`${erreur instanceof Error ? erreur.message : String(erreur)}\n`);
    process.exit(1);
  });
