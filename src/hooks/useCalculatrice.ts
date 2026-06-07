"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  computeRecette,
  controleTotal,
  type RecetteCalculee,
} from "@/lib/business-rules/recette";
import {
  kgVersPct,
  pctVersKg,
  normaliserVersKg,
  masseLotDe,
} from "@/lib/recette/conversion";
import { parseIngredientsTexte } from "@/lib/recette/parse-ingredients";
import type {
  EtatCalculatrice,
  LigneIngredient,
  Pas,
  UnitMode,
} from "@/lib/recette/types";
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";

const DEBOUNCE_MS = 300;

const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `loc-${Math.round(Math.random() * 1e9)}`;

const arrondi2 = (v: number) => Math.round(v * 100) / 100;
const estCent = (v: number | null) => v != null && arrondi2(v) === 100;

/** Parse a free-typed number (accepts comma) → number | null. */
export function parseNombre(raw: string): number | null {
  const clean = raw.trim().replace(",", ".");
  if (clean === "") return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

/** Build the initial editable state from an already-computed recette (SPEC-02/03). */
export function etatDepuisRecette(
  recette: RecetteAgentOutput | null
): EtatCalculatrice {
  if (!recette || recette.ingredients.length === 0) {
    return { massePrincipaleKg: null, unitMode: "pct", pas: 0.5, lignes: [] };
  }
  const totalKg = recette.totalKg;
  // Principal = heaviest ingredient; its mass anchors the derived lot.
  const massePrincipaleKg = recette.ingredients.reduce(
    (m, i) => (i.quantiteKg > m ? i.quantiteKg : m),
    0
  );
  return {
    massePrincipaleKg: massePrincipaleKg > 0 ? massePrincipaleKg : null,
    unitMode: "pct",
    pas: 0.5,
    lignes: recette.ingredients.map((i) => ({
      id: i.codeArticle || uid(),
      codeArticle: i.codeArticle || null,
      designation: i.designation,
      quantiteKg: i.quantiteKg,
      pourcentageSaisi: totalKg > 0 ? kgVersPct(i.quantiteKg, totalKg) : null,
      overrideEtiquette: null,
      estDemeter: i.estDemeter,
      estEquitable: i.estEquitable,
      provenance: "EXTRAIT",
      incomplet: false,
    })),
  };
}

/**
 * Build the initial state from extracted ingredient text (SPEC-03b §2). The
 * principal mass is unknown (the dégustation sheet carries none) → starts in %
 * mode; lines without a % are `incomplet` for Marie. No quantity is ever guessed.
 */
export function etatDepuisExtraction(
  texte: string | null | undefined
): EtatCalculatrice {
  const items = parseIngredientsTexte(texte);
  if (items.length === 0) {
    return { massePrincipaleKg: null, unitMode: "pct", pas: 0.5, lignes: [] };
  }
  return {
    massePrincipaleKg: null,
    unitMode: "pct",
    pas: 0.5,
    lignes: items.map((it) => ({
      id: uid(),
      codeArticle: null,
      designation: it.designation,
      quantiteKg: null,
      pourcentageSaisi: it.pourcentage,
      overrideEtiquette: null,
      estDemeter: false,
      estEquitable: false,
      provenance: "EXTRAIT",
      incomplet: it.pourcentage == null,
    })),
  };
}

/**
 * Initial state resolution: a persisted recette wins; otherwise pre-fill from
 * extracted text; otherwise empty.
 */
export function etatInitial(
  recette: RecetteAgentOutput | null,
  texteExtraction?: string | null
): EtatCalculatrice {
  if (recette && recette.ingredients.length > 0) {
    return etatDepuisRecette(recette);
  }
  return etatDepuisExtraction(texteExtraction);
}

/** A line is incomplete when its source value (per active unit) is missing. */
function estIncomplete(ligne: LigneIngredient, mode: UnitMode): boolean {
  return mode === "kg"
    ? ligne.quantiteKg == null
    : ligne.pourcentageSaisi == null;
}

export interface UseCalculatriceResult {
  etat: EtatCalculatrice;
  resultat: RecetteCalculee | null;
  erreur: string | null;
  peutCalculer: boolean;
  peutValider: boolean;
  conforme: boolean;
  /** Derived total lot mass (kg) — computed, never entered. */
  masseLot: number | null;
  /** The control total shown bottom-right: Σ% saisis (% mode) or Σ% étiquette (kg mode). */
  totalControle: number | null;
  totalEtiquette: number | null;
  nbIncomplets: number;
  masseRequise: boolean;
  /** Effective label % (override ?? computed) for the line at `idx`. */
  etiquetteEffective: (idx: number) => number | null;
  setMassePrincipale: (v: number | null) => void;
  setUnitMode: (m: UnitMode) => void;
  setPas: (p: Pas) => void;
  setSaisie: (id: string, raw: string) => void;
  setOverride: (id: string, raw: string) => void;
  setDesignation: (id: string, v: string) => void;
  setCodeArticle: (id: string, v: string) => void;
  toggleDemeter: (id: string) => void;
  toggleEquitable: (id: string) => void;
  ajouterLigne: () => void;
  supprimerLigne: (id: string) => void;
  /** Display equivalent (the non-active unit) for a line, or null if unknown. */
  equivalent: (ligne: LigneIngredient) => number | null;
}

export function useCalculatrice(
  initial: EtatCalculatrice
): UseCalculatriceResult {
  const [etat, setEtat] = useState<EtatCalculatrice>(initial);
  const [resultat, setResultat] = useState<RecetteCalculee | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const majLignes = (fn: (l: LigneIngredient[]) => LigneIngredient[]) =>
    setEtat((e) => ({ ...e, lignes: fn(e.lignes) }));

  const masseLot = useMemo(() => masseLotDe(etat), [etat]);

  const nbIncomplets = useMemo(
    () => etat.lignes.filter((l) => estIncomplete(l, etat.unitMode)).length,
    [etat.lignes, etat.unitMode]
  );

  const masseRequise =
    etat.unitMode === "pct" &&
    (etat.massePrincipaleKg == null || etat.massePrincipaleKg <= 0);

  const peutCalculer =
    etat.lignes.length > 0 &&
    nbIncomplets === 0 &&
    !masseRequise &&
    masseLot != null &&
    masseLot > 0;

  const etiquetteEffective = (idx: number): number | null => {
    const ov = etat.lignes[idx]?.overrideEtiquette;
    if (ov != null) return ov;
    return resultat?.ingredients[idx]?.pourcentageEtiquette ?? null;
  };

  // Effective label total (overrides layered on the computed values).
  const totalEtiquette = useMemo(() => {
    if (!resultat) return null;
    const vals = etat.lignes.map(
      (l, i) => l.overrideEtiquette ?? resultat.ingredients[i]?.pourcentageEtiquette ?? 0
    );
    return controleTotal(vals).total;
  }, [resultat, etat.lignes]);

  // Sum of the % Marie typed (% mode) — the figure that must hit 100 (SPEC-03b
  // verrou). The engine always normalises kg→100, so this is the only place an
  // input error (Σ ≠ 100) is visible. In kg mode the kg define the composition,
  // so the control falls back to the computed label total.
  const totalSaisiPct = useMemo(() => {
    if (etat.unitMode !== "pct") return null;
    return arrondi2(
      etat.lignes.reduce((s, l) => s + (l.pourcentageSaisi ?? 0), 0)
    );
  }, [etat.lignes, etat.unitMode]);

  const totalControle = etat.unitMode === "pct" ? totalSaisiPct : totalEtiquette;
  const conforme =
    (etat.unitMode === "pct" ? estCent(totalSaisiPct) : true) &&
    estCent(totalEtiquette);
  const peutValider = peutCalculer && conforme;

  // Debounced deterministic compute — computeRecette is the single source of truth.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!peutCalculer) {
      setResultat(null);
      setErreur(null);
      return;
    }
    timer.current = setTimeout(() => {
      try {
        const r = computeRecette({
          ingredients: normaliserVersKg(etat),
          precisionArrondi: etat.pas,
        });
        setResultat(r);
        setErreur(null);
      } catch (e) {
        setResultat(null);
        setErreur(e instanceof Error ? e.message : "Erreur de calcul");
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [etat, peutCalculer]);

  const setMassePrincipale = (v: number | null) =>
    setEtat((e) => ({ ...e, massePrincipaleKg: v }));

  // Switch unit without losing values: mirror the source field into the target
  // unit using the current derived lot.
  const setUnitMode = (m: UnitMode) =>
    setEtat((e) => {
      if (m === e.unitMode) return e;
      const lot = masseLotDe(e);
      if (m === "kg") {
        return {
          ...e,
          unitMode: "kg",
          lignes: e.lignes.map((l) =>
            l.pourcentageSaisi != null && lot
              ? { ...l, quantiteKg: pctVersKg(l.pourcentageSaisi, lot), incomplet: false }
              : l
          ),
        };
      }
      // → pct : anchor the principal mass (heaviest line) if not set yet.
      const principalKg = e.lignes.reduce(
        (mx, l) => (l.quantiteKg != null && l.quantiteKg > mx ? l.quantiteKg : mx),
        0
      );
      return {
        ...e,
        unitMode: "pct",
        massePrincipaleKg:
          e.massePrincipaleKg ?? (principalKg > 0 ? principalKg : null),
        lignes: e.lignes.map((l) =>
          l.quantiteKg != null && lot
            ? { ...l, pourcentageSaisi: kgVersPct(l.quantiteKg, lot), incomplet: false }
            : l
        ),
      };
    });

  const setPas = (p: Pas) => setEtat((e) => ({ ...e, pas: p }));

  const setSaisie = (id: string, raw: string) => {
    const val = parseNombre(raw);
    majLignes((lignes) =>
      lignes.map((l) => {
        if (l.id !== id) return l;
        return etat.unitMode === "kg"
          ? { ...l, quantiteKg: val, incomplet: val == null }
          : { ...l, pourcentageSaisi: val, incomplet: val == null };
      })
    );
  };

  const setOverride = (id: string, raw: string) =>
    majLignes((l) =>
      l.map((x) =>
        x.id === id ? { ...x, overrideEtiquette: parseNombre(raw) } : x
      )
    );

  const setDesignation = (id: string, v: string) =>
    majLignes((l) => l.map((x) => (x.id === id ? { ...x, designation: v } : x)));
  const setCodeArticle = (id: string, v: string) =>
    majLignes((l) =>
      l.map((x) => (x.id === id ? { ...x, codeArticle: v.trim() || null } : x))
    );
  const toggleDemeter = (id: string) =>
    majLignes((l) =>
      l.map((x) => (x.id === id ? { ...x, estDemeter: !x.estDemeter } : x))
    );
  const toggleEquitable = (id: string) =>
    majLignes((l) =>
      l.map((x) => (x.id === id ? { ...x, estEquitable: !x.estEquitable } : x))
    );

  const ajouterLigne = () =>
    majLignes((l) => [
      ...l,
      {
        id: uid(),
        codeArticle: null,
        designation: "",
        quantiteKg: null,
        pourcentageSaisi: null,
        overrideEtiquette: null,
        estDemeter: false,
        estEquitable: false,
        provenance: "AJOUTE_MARIE",
        incomplet: true,
      },
    ]);
  const supprimerLigne = (id: string) =>
    majLignes((l) => l.filter((x) => x.id !== id));

  const equivalent = (ligne: LigneIngredient): number | null => {
    if (masseLot == null || masseLot <= 0) return null;
    if (etat.unitMode === "kg") {
      return ligne.quantiteKg != null ? kgVersPct(ligne.quantiteKg, masseLot) : null;
    }
    return ligne.pourcentageSaisi != null
      ? pctVersKg(ligne.pourcentageSaisi, masseLot)
      : null;
  };

  return {
    etat,
    resultat,
    erreur,
    peutCalculer,
    peutValider,
    conforme,
    masseLot,
    totalControle,
    totalEtiquette,
    nbIncomplets,
    masseRequise,
    etiquetteEffective,
    setMassePrincipale,
    setUnitMode,
    setPas,
    setSaisie,
    setOverride,
    setDesignation,
    setCodeArticle,
    toggleDemeter,
    toggleEquitable,
    ajouterLigne,
    supprimerLigne,
    equivalent,
  };
}
