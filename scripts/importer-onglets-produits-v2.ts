/**
 * Step 4 of the v2 import on the PREPROD database: Terra Madre (its own brand)
 * and the two infusette sheets create their products, through the same
 * validation, plan and report as the JDG sheet, then get the fields migration
 * 0028 added and their rows kept verbatim.
 * Maps: src/lib/import-catalogue/cartes-onglets.ts.
 *
 *   DATABASE_URL=…/gaialabel_preprod npx tsx scripts/importer-onglets-produits-v2.ts [--appliquer [--creer-gammes]]
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { chargerCibles, ecrireOngletComplementaire } from "@/db/queries/complements-import";
import type { LigneSourceAEcrire, ValeursAEcrire } from "@/db/queries/complements-import";
import {
  appliquerPlan, chargerEtatCatalogue, chargerReferentielGammes, creerLibellesManquants, nomBaseCourante, trouverSignataireId,
} from "@/db/queries/import-catalogue";
import { texte } from "@/lib/import-catalogue/cellules";
import type { Ligne } from "@/lib/import-catalogue/cellules";
import { ONGLETS_PRODUITS } from "@/lib/import-catalogue/cartes-onglets";
import { creerResolveurGammes } from "@/lib/import-catalogue/gammes";
import { ligneEnObjet } from "@/lib/import-catalogue/ligne-source";
import type { LigneOngletLue } from "@/lib/import-catalogue/onglets-produits";
import { indexerOnglet, lireLigneOnglet } from "@/lib/import-catalogue/onglets-produits";
import { construirePlan } from "@/lib/import-catalogue/plan";
import type { Plan } from "@/lib/import-catalogue/plan";
import { csvAnomalies, csvDecisions, csvMisDeCote, rapportMarkdown } from "@/lib/import-catalogue/rapport";

const RACINE = path.resolve(__dirname, "..");
const FICHIER = "BDD étiquettes 2025 v2.xlsx";
const SOURCE = `docs/sources/${FICHIER}`;
const SORTIE = "docs/sources";
const SUFFIXE_BASE_AUTORISEE = "_preprod";
const ROLE_SIGNATAIRE = "DIRECTION";
const PASSES_CREATION_GAMMES = 3;

const slug = (onglet: string) => onglet.toLowerCase().replace(/[^a-z0-9]+/g, "-");

async function main(): Promise<void> {
  const base = await nomBaseCourante();
  if (!base.endsWith(SUFFIXE_BASE_AUTORISEE)) throw new Error(`Base « ${base} » refusée : préproduction uniquement.`);
  const appliquer = process.argv.includes("--appliquer");
  const creerGammes = appliquer && process.argv.includes("--creer-gammes");
  const classeur = XLSX.readFile(path.join(RACINE, SOURCE));
  const signataire = appliquer ? await trouverSignataireId(ROLE_SIGNATAIRE) : null;
  if (appliquer && signataire === null) throw new Error(`Aucun compte ${ROLE_SIGNATAIRE} pour signer l'import.`);

  for (const carte of ONGLETS_PRODUITS) {
    const [entetes, ...lignes] = XLSX.utils.sheet_to_json<Ligne>(classeur.Sheets[carte.onglet], { header: 1, defval: "" });
    const index = indexerOnglet(carte, entetes);
    const remplies = lignes.map((ligne, i) => ({ ligne, numero: i + 2 })).filter(({ ligne }) => ligne.some((c) => texte(c) !== null));
    const lues: Array<LigneOngletLue & { ligne: Ligne; numero: number }> = remplies.map(({ ligne, numero }) => ({ ligne, numero, ...lireLigneOnglet(carte, ligne, index, numero) }));

    const planifier = async (): Promise<Plan> => {
      const referentiel = await chargerReferentielGammes();
      return construirePlan(lues.map((l) => l.resultat), new Map(), await chargerEtatCatalogue(), creerResolveurGammes(referentiel.gammes, referentiel.sousGammes), carte.formatCode);
    };
    let plan = await planifier();
    const gammesCreees: string[] = [];
    for (let passe = 0; creerGammes && passe < PASSES_CREATION_GAMMES && plan.libellesInconnus.length > 0; passe += 1) {
      const crees = await creerLibellesManquants(plan.libellesInconnus, carte.marque);
      if (crees.length === 0) break;
      gammesCreees.push(...crees);
      plan = await planifier();
    }

    let bilan = "";
    if (appliquer) {
      if (plan.libellesInconnus.length > 0) throw new Error(`« ${carte.onglet} » bloqué : gammes inconnues. Relancer avec --creer-gammes.`);
      const ecrit = await appliquerPlan(plan, `${SOURCE} / ${carte.onglet}`, signataire as string, carte.marque);
      const retenus = new Set([...plan.creations, ...plan.misesAJour].map((x) => x.codePf));
      const cibles = await chargerCibles();
      const items: ValeursAEcrire[] = [];
      const sources: LigneSourceAEcrire[] = [];
      for (const l of lues) {
        const codePf = texte(l.ligne[0]);
        const cible = codePf ? cibles.get(codePf) : undefined;
        sources.push({ fichier: FICHIER, onglet: carte.onglet, numeroLigne: l.numero, codePf, produitId: cible?.produitId ?? null, donnees: ligneEnObjet(entetes, l.ligne) });
        if (cible && codePf && retenus.has(codePf)) items.push({ cible, ...l.extras });
      }
      const complements = await ecrireOngletComplementaire(items, sources);
      bilan = ` · écrit ${JSON.stringify(ecrit)} · compléments ${JSON.stringify(complements)}`;
    }

    plan.absentsDeLExcel = [];
    const date = new Date().toISOString().slice(0, 10);
    const nom = slug(carte.onglet);
    writeFileSync(path.join(RACINE, SORTIE, `import-v2-${nom}-rapport.md`), rapportMarkdown(plan, { source: `${SOURCE} / ${carte.onglet}`, base, date, applique: appliquer, lignesLues: remplies.length, gammesCreees }));
    writeFileSync(path.join(RACINE, SORTIE, `import-v2-${nom}-decisions.csv`), csvDecisions(plan));
    writeFileSync(path.join(RACINE, SORTIE, `import-v2-${nom}-mis-de-cote.csv`), csvMisDeCote(plan));
    writeFileSync(path.join(RACINE, SORTIE, `import-v2-${nom}-anomalies.csv`), csvAnomalies(plan));
    process.stdout.write(
      `« ${carte.onglet} » : ${remplies.length} lignes · ${plan.creations.length} créations · ${plan.misesAJour.length} comparés · ` +
        `${plan.misDeCote.length} mis de côté · ${plan.libellesInconnus.length} libellés inconnus · ${gammesCreees.length} créés${bilan}\n`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((erreur: unknown) => {
    process.stderr.write(`${erreur instanceof Error ? erreur.message : String(erreur)}\n`);
    process.exit(1);
  });
