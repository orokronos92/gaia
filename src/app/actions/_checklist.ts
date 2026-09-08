/**
 * Construction de la checklist d'une fiche, côté serveur.
 *
 * Ce module n'est pas un point d'entrée client (`"use server"` absent) : il est
 * partagé par l'action qui affiche la checklist et par celle qui enregistre une
 * décision de la Qualité. Les deux doivent voir **exactement le même constat**,
 * sinon une décision porterait sur autre chose que ce qui est à l'écran.
 *
 * Elle inclut la lecture déterministe des BAT — texte, tailles, styles,
 * positions, Eurofeuille — mais **aucun appel de modèle**. Deux raisons :
 *
 *   - le coût : enregistrer une coche ne doit rien facturer ;
 *   - la stabilité : l'empreinte qui décide de la péremption d'une décision doit
 *     reposer sur du mesuré. Attacher la coche de Marie à l'avis d'un modèle la
 *     ferait se rouvrir au gré des variations de celui-ci.
 */

import { getAuditInputForFiche, getBatTextInputForFiche } from "@/db/queries/audit";
import { getBatsActifsProduit } from "@/db/queries/fichiers-etiquettes";
import { getValidationsFiche } from "@/db/queries/validations-controle";
import { construireChecklist } from "@/lib/audit/checklist-complete";
import { fusionner } from "@/lib/audit/fusion-bat";
import { controlerBat, type FaceBat } from "@/lib/audit/visual/controles-bat";
import { runTextRobot, type BatTextCheck } from "@/lib/audit/visual/text-robot";
import type { ControlResult } from "@/lib/audit/types";
import { appliquerValidations } from "@/lib/audit/validation";
import { analyserBat } from "@/lib/utils/pdf-bat";
import { extractPdfText } from "@/lib/utils/pdf-text";
import { getObjectBuffer } from "@/lib/utils/s3-client";

/** Les constats déterministes que les BAT du produit apportent, et d'où. */
async function preuvesDesBat(ficheId: string) {
  const data = await getBatTextInputForFiche(ficheId);
  if (!data) return { checks: [], faces: [], dossiers: [] };

  const tous = await getBatsActifsProduit(data.produitId);
  const pdfs = tous.filter((f) => f.cleS3.toLowerCase().endsWith(".pdf"));
  const bats = pdfs.length > 0 ? pdfs : tous;

  const faces: FaceBat[] = [];
  const textes: string[] = [];
  for (const bat of bats) {
    try {
      const buffer = await getObjectBuffer(bat.cleS3);
      textes.push(await extractPdfText(buffer));
      faces.push({ nom: bat.cleS3.split("/").pop() ?? bat.cleS3, analyse: await analyserBat(buffer) });
    } catch {
      // Face illisible : elle ne produit aucun constat, et surtout aucun verdict
      // inventé. Son absence se voit dans les points restés « à vérifier ».
    }
  }
  if (faces.length === 0) return { checks: [], faces: [], dossiers: [] };

  return {
    checks: [
      ...runTextRobot(textes.join("\n\n"), data.input),
      ...controlerBat(faces, { ...data.input, estDemeter: data.estDemeter, codePf: data.codePf }),
    ],
    faces: faces.map((f) => f.nom),
    dossiers: [...new Set(bats.map((b) => b.dossier))],
  };
}

/**
 * La checklist telle que la Qualité doit la voir : les 39 points, enrichis de ce
 * que les BAT montrent, et refermés là où elle a déjà tranché.
 */
export interface ChecklistChargee {
  resultats: ControlResult[];
  /**
   * Ce que la lecture des BAT a trouvé sans qu'aucun point du registre ne le
   * porte — la divergence « miel bio » / « miel » en est l'exemple. Rendu ici
   * pour que le contrôle gratuit le montre déjà, sans attendre l'IA.
   */
  horsChecklist: BatTextCheck[];
  faces: string[];
  dossiers: string[];
}

export async function chargerChecklist(ficheId: string): Promise<ChecklistChargee | null> {
  const input = await getAuditInputForFiche(ficheId);
  if (!input) return null;

  const base = construireChecklist(input);
  const preuves = await preuvesDesBat(ficheId);
  const fusionnee = preuves.checks.length > 0 ? fusionner(base, preuves.checks) : base;

  return {
    resultats: appliquerValidations(fusionnee, await getValidationsFiche(ficheId)),
    horsChecklist: preuves.checks.filter((c) => !c.checklistId),
    faces: preuves.faces,
    dossiers: preuves.dossiers,
  };
}
