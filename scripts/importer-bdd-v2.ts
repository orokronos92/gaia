/**
 * Imports the JDG sheet of the v2 catalogue workbook into the PREPROD database.
 * Spec: docs/decisions/2026-09-23-import-bdd-v2-preprod.md.
 *
 *   DATABASE_URL=…/gaialabel_preprod npx tsx scripts/importer-bdd-v2.ts              # simulation
 *   DATABASE_URL=…/gaialabel_preprod npx tsx scripts/importer-bdd-v2.ts --appliquer  # writes
 *   … --appliquer --creer-gammes   # first creates the ranges the referential lacks
 *
 * Simulation is the default: it only writes the report next to the workbook
 * (docs/sources/, not versioned — client data). The script refuses any database
 * whose name does not end in `_preprod`.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import {
  appliquerPlan, chargerEtatCatalogue, chargerReferentielGammes, creerLibellesManquants, nomBaseCourante,
  trouverSignataireId,
} from "@/db/queries/import-catalogue";
import { ancetreDepuisSeed } from "@/lib/import-catalogue/ancetre-seed";
import type { Ancetre, LigneObjet } from "@/lib/import-catalogue/ancetre-seed";
import type { Ligne } from "@/lib/import-catalogue/cellules";
import { creerResolveurGammes } from "@/lib/import-catalogue/gammes";
import { indexerJdg, lireLigneJdg } from "@/lib/import-catalogue/ligne-jdg";
import { construirePlan } from "@/lib/import-catalogue/plan";
import type { Plan } from "@/lib/import-catalogue/plan";
import { csvAnomalies, csvDecisions, csvMisDeCote, rapportMarkdown } from "@/lib/import-catalogue/rapport";

const RACINE = path.resolve(__dirname, "..");
const SOURCE = "docs/sources/BDD étiquettes 2025 v2.xlsx";
const ANCIEN_EXTRAIT = "docs/BDD étiquettes 2025 extrait dec 2025.xlsx";
const ONGLET_JDG = "JDG";
const SORTIE = "docs/sources";
const SUFFIXE_BASE_AUTORISEE = "_preprod";
const DRAPEAU_APPLIQUER = "--appliquer";
const DRAPEAU_CREER_GAMMES = "--creer-gammes";
/** Who signs the import in audit_logs — Ouro's decision of 2026-09-23. */
const ROLE_SIGNATAIRE = "DIRECTION";
/** A new range can reveal an unknown sub-range under it: one more pass is enough. */
const PASSES_CREATION_GAMMES = 3;

function lireOnglet(fichier: string, onglet: string): Ligne[] {
  const feuille = XLSX.readFile(path.join(RACINE, fichier)).Sheets[onglet];
  if (!feuille) throw new Error(`Onglet « ${onglet} » absent de ${fichier}`);
  return XLSX.utils.sheet_to_json<Ligne>(feuille, { header: 1, defval: "" });
}

/** The March seed read the first sheet as objects; so does its reconstruction. */
function lireAncetres(): Map<string, Ancetre> {
  const classeur = XLSX.readFile(path.join(RACINE, ANCIEN_EXTRAIT));
  const lignes = XLSX.utils.sheet_to_json<LigneObjet>(classeur.Sheets[classeur.SheetNames[0]], { defval: "" });
  const ancetres = new Map<string, Ancetre>();
  for (const ligne of lignes) {
    const lu = ancetreDepuisSeed(ligne);
    // The seed skipped a code it had already inserted: the first row won.
    if (lu && !ancetres.has(lu.codePf)) ancetres.set(lu.codePf, lu.ancetre);
  }
  return ancetres;
}

function ecrire(nom: string, contenu: string): void {
  writeFileSync(path.join(RACINE, SORTIE, nom), contenu);
}

async function main(): Promise<void> {
  const base = await nomBaseCourante();
  if (!base.endsWith(SUFFIXE_BASE_AUTORISEE)) {
    throw new Error(`Base « ${base} » refusée : cet import ne vise que la préproduction (*${SUFFIXE_BASE_AUTORISEE}).`);
  }
  const appliquer = process.argv.includes(DRAPEAU_APPLIQUER);

  const [entetes, ...lignes] = lireOnglet(SOURCE, ONGLET_JDG);
  const index = indexerJdg(entetes);
  const remplies = lignes
    .map((ligne, i) => ({ ligne, numero: i + 2 }))
    .filter(({ ligne }) => ligne.some((c) => String(c ?? "").trim() !== ""));
  const resultats = remplies.map(({ ligne, numero }) => lireLigneJdg(ligne, index, numero));

  const ancetres = lireAncetres();
  const planifier = async (): Promise<Plan> => {
    const referentiel = await chargerReferentielGammes();
    return construirePlan(resultats, ancetres, await chargerEtatCatalogue(), creerResolveurGammes(referentiel.gammes, referentiel.sousGammes));
  };
  let plan = await planifier();
  const gammesCreees: string[] = [];
  if (appliquer && process.argv.includes(DRAPEAU_CREER_GAMMES)) {
    for (let passe = 0; passe < PASSES_CREATION_GAMMES && plan.libellesInconnus.length > 0; passe += 1) {
      const crees = await creerLibellesManquants(plan.libellesInconnus);
      if (crees.length === 0) break;
      gammesCreees.push(...crees);
      plan = await planifier();
    }
    process.stdout.write(`Créés dans le référentiel : ${gammesCreees.length}\n${gammesCreees.map((g) => `  ${g}\n`).join("")}`);
  }

  let applique = false;
  if (appliquer) {
    if (plan.libellesInconnus.length > 0) throw new Error("Import bloqué : gammes inconnues, voir le rapport. Rien n'a été écrit.");
    const signataire = await trouverSignataireId(ROLE_SIGNATAIRE);
    if (signataire === null) throw new Error(`Aucun compte ${ROLE_SIGNATAIRE} pour signer l'import dans audit_logs.`);
    const bilan = await appliquerPlan(plan, SOURCE, signataire);
    process.stdout.write(`Appliqué : ${JSON.stringify(bilan)}\n`);
    applique = true;
  }

  const date = new Date().toISOString().slice(0, 10);
  ecrire("import-v2-rapport.md", rapportMarkdown(plan, { source: SOURCE, base, date, applique, lignesLues: remplies.length, gammesCreees }));
  ecrire("import-v2-decisions.csv", csvDecisions(plan));
  ecrire("import-v2-mis-de-cote.csv", csvMisDeCote(plan));
  ecrire("import-v2-anomalies.csv", csvAnomalies(plan));
  process.stdout.write(
    `${applique ? "Appliqué" : "Simulation"} sur ${base} : ${plan.creations.length} créations, ${plan.misesAJour.length} comparés, ` +
      `${plan.misDeCote.length} mis de côté, ${plan.libellesInconnus.length} libellés bloquants. Rapport : ${SORTIE}/import-v2-rapport.md\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((erreur: unknown) => {
    process.stderr.write(`${erreur instanceof Error ? erreur.message : String(erreur)}\n`);
    process.exit(1);
  });
