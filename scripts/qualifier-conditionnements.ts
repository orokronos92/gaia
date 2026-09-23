/**
 * Fills the packaging notions of migration 0027 on the PREPROD catalogue:
 * - the sales format of every product, from the 4th digit of its code;
 * - its pack, from the workbook's CONDITIONNEMENT EXPORT column, where empty;
 * - the real size and template of every label PDF, measured with `pdfinfo -box`.
 * Spec: docs/decisions/2026-09-23-constat-conditionnements.md.
 *
 *   DATABASE_URL=…/gaialabel_preprod MINIO_BUCKET_NAME=label-assets-preprod \
 *     npx tsx scripts/qualifier-conditionnements.ts [--appliquer]
 *
 * Files of the September sort are read from the extracted archive; older ones
 * are fetched from the bucket's public URL, measured, and deleted.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import XLSX from "xlsx";
import {
  chargerFichiersAMesurer, chargerFormatsVente, chargerGabarits, chargerProduitsAQualifier, enregistrerQualification,
} from "@/db/queries/conditionnements";
import type { MesureFichier, QualificationProduit } from "@/db/queries/conditionnements";
import { nomBaseCourante } from "@/db/queries/import-catalogue";
import { indexerColonnes, texte } from "@/lib/import-catalogue/cellules";
import type { Ligne } from "@/lib/import-catalogue/cellules";
import { chiffreDeFormat } from "@/lib/conditionnement/format-vente";
import { reconnaitreGabarit } from "@/lib/conditionnement/gabarit";
import { lireMesurePdf } from "@/lib/conditionnement/mesure-pdf";
import { BUCKET_NAME } from "@/lib/utils/s3-client";

const RACINE = path.resolve(__dirname, "..");
const SOURCE = "docs/sources/BDD étiquettes 2025 v2.xlsx";
const COLONNE_EMBALLAGE = "CONDITIONNEMENT EXPORT";
const PREFIXE_TRI = "ÉTIQUETTES 2026-09/";
const DOSSIER_TRI = "/docker/gaialabel/imports/etiquettes-pdf";
const SUFFIXE_BASE_AUTORISEE = "_preprod";
const SUFFIXE_BUCKET_AUTORISE = "-preprod";
const DRAPEAU_APPLIQUER = "--appliquer";

function emballagesExcel(): Map<string, string> {
  const feuille = XLSX.readFile(path.join(RACINE, SOURCE)).Sheets.JDG;
  const [entetes, ...lignes] = XLSX.utils.sheet_to_json<Ligne>(feuille, { header: 1, defval: "" });
  const index = indexerColonnes(entetes, ["CODE PF", COLONNE_EMBALLAGE]);
  const emballages = new Map<string, string>();
  for (const ligne of lignes) {
    const code = texte(ligne[index["CODE PF"]]);
    const emballage = texte(ligne[index[COLONNE_EMBALLAGE]]);
    if (code && emballage) emballages.set(code, emballage.replace(/\s+/g, " "));
  }
  return emballages;
}

async function mesurer(cleS3: string, temporaire: string): Promise<string | null> {
  let chemin = path.join(DOSSIER_TRI, cleS3.slice(PREFIXE_TRI.length));
  if (!cleS3.startsWith(PREFIXE_TRI) || !existsSync(chemin)) {
    const url = `${process.env.MINIO_ENDPOINT}/${BUCKET_NAME}/${cleS3.split("/").map(encodeURIComponent).join("/")}`;
    const reponse = await fetch(url);
    if (!reponse.ok) return null;
    chemin = path.join(temporaire, "fichier.pdf");
    writeFileSync(chemin, Buffer.from(await reponse.arrayBuffer()));
  }
  try {
    return execFileSync("pdfinfo", ["-box", chemin], { encoding: "utf8" });
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const base = await nomBaseCourante();
  if (!base.endsWith(SUFFIXE_BASE_AUTORISEE)) throw new Error(`Base « ${base} » refusée : préproduction uniquement.`);
  if (!BUCKET_NAME.endsWith(SUFFIXE_BUCKET_AUTORISE)) throw new Error(`Bucket « ${BUCKET_NAME} » refusé : préproduction uniquement.`);
  const appliquer = process.argv.includes(DRAPEAU_APPLIQUER);

  const formats = new Map((await chargerFormatsVente()).filter((f) => f.chiffre).map((f) => [f.chiffre as string, f]));
  const emballages = emballagesExcel();
  const qualifications: QualificationProduit[] = [];
  const parFormat = new Map<string, number>();
  for (const produit of await chargerProduitsAQualifier()) {
    const format = formats.get(chiffreDeFormat(produit.codePf) ?? "") ?? null;
    parFormat.set(format?.cle ?? "sans format", (parFormat.get(format?.cle ?? "sans format") ?? 0) + 1);
    const emballage = produit.emballage === null ? emballages.get(produit.codePf) : undefined;
    const q: QualificationProduit = { id: produit.id };
    if ((format?.id ?? null) !== produit.formatVenteId) q.formatVenteId = format?.id ?? null;
    if (emballage) q.emballage = emballage;
    if (Object.keys(q).length > 1) qualifications.push(q);
  }

  const gabarits = await chargerGabarits();
  const cles = [...new Set((await chargerFichiersAMesurer()).map((f) => f.cleS3))];
  const temporaire = mkdtempSync(path.join(os.tmpdir(), "mesure-"));
  const mesures: MesureFichier[] = [];
  const illisibles: string[] = [];
  const parGabarit = new Map<string, number>();
  try {
    for (const cleS3 of cles) {
      const sortie = await mesurer(cleS3, temporaire);
      const mesure = sortie ? lireMesurePdf(sortie) : null;
      if (!mesure) {
        illisibles.push(cleS3);
        continue;
      }
      const gabarit = reconnaitreGabarit(mesure.largeurMm, mesure.hauteurMm, gabarits);
      const cle = gabarit ? (gabarits.find((g) => g.id === gabarit.id)?.cle ?? "?") : `sans gabarit ${Math.min(mesure.largeurMm, mesure.hauteurMm)}×${Math.max(mesure.largeurMm, mesure.hauteurMm)} (${mesure.source})`;
      parGabarit.set(cle, (parGabarit.get(cle) ?? 0) + 1);
      mesures.push({ cleS3, largeurMm: mesure.largeurMm, hauteurMm: mesure.hauteurMm, mesureSource: mesure.source, gabaritId: gabarit?.id ?? null });
    }
  } finally {
    rmSync(temporaire, { recursive: true, force: true });
  }

  if (appliquer) {
    const bilan = await enregistrerQualification(qualifications, mesures);
    process.stdout.write(`Écrit : ${bilan.produits} produits, ${bilan.fichiers} fichiers mesurés\n`);
  }
  const lignes = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `  ${k} : ${n}`).join("\n");
  process.stdout.write(
    `${appliquer ? "Appliqué" : "Simulation"} sur ${base}\n` +
      `Formats de vente (produits actifs) :\n${lignes(parFormat)}\n` +
      `Produits à mettre à jour : ${qualifications.length} (dont emballage renseigné : ${qualifications.filter((q) => q.emballage).length})\n` +
      `Fichiers mesurés : ${mesures.length} · illisibles : ${illisibles.length}\n${lignes(parGabarit)}\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((erreur: unknown) => {
    process.stderr.write(`${erreur instanceof Error ? erreur.message : String(erreur)}\n`);
    process.exit(1);
  });
