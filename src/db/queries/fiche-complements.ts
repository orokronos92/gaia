/**
 * What the catalogue workbook brings to a fiche beyond its label text:
 * translations, export, and production tracking (migration 0028). Read-only
 * on the fiche for now (step 3 of the workbook wiring, 2026-09-24).
 */
import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { fichesEtiquettes, produits, suiviFabrication } from "@/db/schema";

export interface TraductionsFiche {
  en: {
    denomination: string | null;
    sousDesignation: string | null;
    typeThe: string | null;
    origine: string | null;
    mentionOrigine: string | null;
    texteCommercial: string | null;
    texteCommercialCourt: string | null;
    ingredients: string | null;
    allegations: string | null;
    phraseWfto: string | null;
    phraseEngages: string | null;
    textePresentation: string | null;
    texteTube: string | null;
    denominationPrecedente: string | null;
  };
  /** German, Italian, Dutch: only the sub-name and the ingredient list exist. */
  autres: Array<{ langue: "DE" | "IT" | "NL"; sousDesignation: string | null; ingredients: string | null }>;
}

export interface ExportFiche {
  exportAnglais: boolean;
  codePfExport: string | null;
  refFacingExport: string | null;
  refContreExport: string | null;
  conditionnementExport: string | null;
  poidsNetOz: string | null;
  gammeExport: string | null;
  prioriteExport: string | null;
}

export type SuiviFiche = Omit<typeof suiviFabrication.$inferSelect, "id" | "ficheEtiquetteId" | "creeLe" | "misAJourLe" | "gammeExport" | "prioriteExport"> & {
  libellePmi: string | null;
  cond: string | null;
  priorite: string | null;
  ancienTexteCommercialFr: string | null;
  refFacingPrecedente: string | null;
};

export interface ComplementsFiche {
  traductions: TraductionsFiche;
  export: ExportFiche;
  suivi: SuiviFiche;
}

export const getComplementsFiche = cache(async (ficheId: string): Promise<ComplementsFiche | null> => {
  const [ligne] = await db
    .select({ fiche: fichesEtiquettes, produit: produits, suivi: suiviFabrication })
    .from(fichesEtiquettes)
    .innerJoin(produits, eq(produits.id, fichesEtiquettes.produitId))
    .leftJoin(suiviFabrication, eq(suiviFabrication.ficheEtiquetteId, fichesEtiquettes.id))
    .where(eq(fichesEtiquettes.id, ficheId));
  if (!ligne) return null;
  const { fiche: f, produit: p, suivi: s } = ligne;

  return {
    traductions: {
      en: {
        denomination: p.denominationEn,
        sousDesignation: p.sousDesignationEn,
        typeThe: p.typeTheEn,
        origine: p.origineEn,
        mentionOrigine: p.mentionEcocertEn,
        texteCommercial: f.texteCommercialEn,
        texteCommercialCourt: f.texteCommercialCourtEn,
        ingredients: f.ingredientsEn,
        allegations: f.allegationsSanteEn,
        phraseWfto: f.phraseWftoEn,
        phraseEngages: f.phraseEngagesEn,
        textePresentation: f.textePresentationEn,
        texteTube: f.texteTubeEn,
        denominationPrecedente: p.denominationEnPrecedente,
      },
      autres: [
        { langue: "DE", sousDesignation: f.sousDesignationDe, ingredients: f.ingredientsDe },
        { langue: "IT", sousDesignation: f.sousDesignationIt, ingredients: f.ingredientsIt },
        { langue: "NL", sousDesignation: f.sousDesignationNl, ingredients: f.ingredientsNl },
      ],
    },
    export: {
      exportAnglais: p.exportAnglais,
      codePfExport: p.codePfExport,
      refFacingExport: f.refFacingExport,
      refContreExport: f.refContreExport,
      conditionnementExport: p.emballage,
      poidsNetOz: p.poidsNetOz,
      gammeExport: s?.gammeExport ?? null,
      prioriteExport: s?.prioriteExport ?? null,
    },
    suivi: {
      pretPourInterne: s?.pretPourInterne ?? null,
      etiquetteFinalisee: s?.etiquetteFinalisee ?? null,
      contreFinalisee: s?.contreFinalisee ?? null,
      imprimeur: s?.imprimeur ?? null,
      dateEnvoiImprimeur: s?.dateEnvoiImprimeur ?? null,
      pmiOkProjetPlantes: s?.pmiOkProjetPlantes ?? null,
      pmiF9TexteCommercial: s?.pmiF9TexteCommercial ?? null,
      dateModificationPmiF9: s?.dateModificationPmiF9 ?? null,
      sonnentor: s?.sonnentor ?? null,
      premierLotV5: s?.premierLotV5 ?? null,
      biocoop: s?.biocoop ?? null,
      action: s?.action ?? null,
      note: s?.note ?? null,
      commentaires: s?.commentaires ?? null,
      historique: s?.historique ?? null,
      switchPmi: s?.switchPmi ?? null,
      majLanguesPmi: s?.majLanguesPmi ?? null,
      libellePmi: p.libellePmi,
      cond: p.cond,
      priorite: p.priorite,
      ancienTexteCommercialFr: f.ancienTexteCommercialFr,
      refFacingPrecedente: f.refFacingPrecedente,
    },
  };
});
