/**
 * Links the sorted label PDFs (the archive's manifest: one row per PDF) to
 * the PREPROD products, then — with --appliquer — uploads them to the preprod
 * bucket and writes the links. Spec: docs/decisions/2026-09-23-import-bdd-v2-preprod.md, lot 4.
 *
 *   DATABASE_URL=…/gaialabel_preprod npx tsx scripts/rattacher-etiquettes-v2.ts              # simulation
 *   DATABASE_URL=…/gaialabel_preprod npx tsx scripts/rattacher-etiquettes-v2.ts --appliquer  # upload + links
 *
 * The PDFs are read from DOSSIER_FICHIERS (the extracted archive), never from git.
 * --appliquer also needs MINIO_BUCKET_NAME=label-assets-preprod: .env names the
 * production bucket, and the script refuses anything but a *-preprod one.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ajouterLiensAuto } from "@/db/queries/fichiers-etiquettes";
import { chargerReferencesProduits, nomBaseCourante } from "@/db/queries/import-catalogue";
import { lireCsv } from "@/lib/import-catalogue/csv";
import { rattacher } from "@/lib/import-catalogue/rattachement";
import type { FichierTrie, Lien } from "@/lib/import-catalogue/rattachement";
import { BUCKET_NAME, uploadFileToS3 } from "@/lib/utils/s3-client";

const RACINE = path.resolve(__dirname, "..");
/** Written by the file sort alongside the archive; lists exactly its 1 100 PDFs. */
const MANIFESTE = "/docker/gaialabel/imports/etiquettes-pdf.manifeste.csv";
const SORTIE = "docs/sources";
const DOSSIER_FICHIERS = "/docker/gaialabel/imports/etiquettes-pdf";
/** Where the sort lands in the bucket, beside the March "RÉFÉRENCES ÉTIQUETTES/". */
const PREFIXE_S3 = "ÉTIQUETTES 2026-09";
const SUFFIXE_BASE_AUTORISEE = "_preprod";
/** The bucket comes from MINIO_BUCKET_NAME, which .env points at production. */
const SUFFIXE_BUCKET_AUTORISE = "-preprod";
const DRAPEAU_APPLIQUER = "--appliquer";
const TYPE_PDF = "application/pdf";
const BOM = "﻿";

const LIBELLE_METHODE: Record<Lien["methode"], string> = {
  reference_exacte: "référence exacte de l'Excel",
  reference_autre_version: "référence de l'Excel, autre version",
  code_produit: "code produit dans le nom",
  dossier: "dossier produit",
};

function lireManifeste(): FichierTrie[] {
  return lireCsv(readFileSync(MANIFESTE, "utf8")).map((l) => ({
    chemin: l.chemin_dans_archive, codeEtiquette: l.code_etiquette, version: l.version, role: l.role, codePf: l.code_pf,
  }));
}

const csvCellule = (v: string | number | boolean | null) => {
  const t = v === null ? "" : String(v);
  return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const csv = (entetes: string[], lignes: Array<Array<string | number | boolean | null>>) =>
  BOM + [entetes.join(";"), ...lignes.map((l) => l.map(csvCellule).join(";"))].join("\r\n") + "\r\n";

async function main(): Promise<void> {
  const base = await nomBaseCourante();
  if (!base.endsWith(SUFFIXE_BASE_AUTORISEE)) throw new Error(`Base « ${base} » refusée : préproduction uniquement.`);
  const appliquer = process.argv.includes(DRAPEAU_APPLIQUER);

  const fichiers = lireManifeste();
  const produits = await chargerReferencesProduits();
  const { liens, nonRattaches } = rattacher(fichiers, produits, PREFIXE_S3);

  if (appliquer) {
    if (!BUCKET_NAME.endsWith(SUFFIXE_BUCKET_AUTORISE)) {
      throw new Error(`Bucket « ${BUCKET_NAME} » refusé : MINIO_BUCKET_NAME doit viser la préproduction (*${SUFFIXE_BUCKET_AUTORISE}).`);
    }
    if (!existsSync(DOSSIER_FICHIERS)) throw new Error(`Archive non extraite : ${DOSSIER_FICHIERS} introuvable.`);
    const manquants = fichiers.filter((f) => !existsSync(path.join(DOSSIER_FICHIERS, f.chemin.replace(/\\/g, "/").normalize("NFC"))));
    if (manquants.length > 0) throw new Error(`${manquants.length} PDF absents de l'archive, ex. ${manquants[0].chemin}. Rien n'a été envoyé.`);
    const cles = new Set(liens.map((l) => l.cleS3));
    for (const f of fichiers) {
      const relatif = f.chemin.replace(/\\/g, "/").normalize("NFC");
      const cle = `${PREFIXE_S3}/${relatif}`;
      if (cles.has(cle)) await uploadFileToS3(readFileSync(path.join(DOSSIER_FICHIERS, relatif)), cle, TYPE_PDF);
    }
    const ajoutes = await ajouterLiensAuto(liens.map((l) => ({
      produitId: l.produitId, cleS3: l.cleS3, dossier: l.dossier, nomFichier: l.nomFichier, type: "BAT", version: l.version, actif: l.actif,
    })));
    process.stdout.write(`Envoyés : ${cles.size} PDF · liens ajoutés : ${ajoutes}\n`);
  }

  const produitsAvecBat = new Set(liens.filter((l) => l.actif).map((l) => l.produitId));
  const sansBat = [...new Map(produits.map((p) => [p.id, p])).values()].filter((p) => !produitsAvecBat.has(p.id));
  writeFileSync(path.join(RACINE, SORTIE, "rattachement-v2-liens.csv"), csv(
    ["code_pf", "fichier", "dossier", "role", "version", "methode", "actif"],
    liens.map((l) => [l.codePf, l.nomFichier, l.dossier, l.role, l.version, LIBELLE_METHODE[l.methode], l.actif]),
  ));
  writeFileSync(path.join(RACINE, SORTIE, "rattachement-v2-non-rattaches.csv"), csv(
    ["chemin", "code_etiquette", "code_pf_decode", "role"], nonRattaches.map((f) => [f.chemin, f.codeEtiquette, f.codePf, f.role]),
  ));
  writeFileSync(path.join(RACINE, SORTIE, "rattachement-v2-produits-sans-bat.csv"), csv(
    ["code_pf", "ref_facing", "ref_contre"], sansBat.map((p) => [p.codePf, p.refFacing, p.refContre]).sort(),
  ));
  const parMethode = Object.entries(LIBELLE_METHODE)
    .map(([m, libelle]) => `  ${libelle} : ${new Set(liens.filter((l) => l.methode === m).map((l) => l.cleS3)).size} PDF`)
    .join("\n");
  process.stdout.write(
    `${appliquer ? "Appliqué" : "Simulation"} sur ${base}\n` +
      `PDF du manifeste : ${fichiers.length} · rattachés : ${fichiers.length - nonRattaches.length} · non rattachés : ${nonRattaches.length}\n${parMethode}\n` +
      `Liens : ${liens.length} (dont ${liens.filter((l) => !l.actif).length} anciennes versions désactivées)\n` +
      `Produits actifs : ${sansBat.length + produitsAvecBat.size} · avec au moins un BAT : ${produitsAvecBat.size} · sans : ${sansBat.length}\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((erreur: unknown) => {
    process.stderr.write(`${erreur instanceof Error ? erreur.message : String(erreur)}\n`);
    process.exit(1);
  });
