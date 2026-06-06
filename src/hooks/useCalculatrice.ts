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
} from "@/lib/recette/conversion";
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
    return { masseLotKg: null, unitMode: "pct", pas: 0.5, lignes: [] };
  }
  const masseLotKg = recette.totalKg;
  return {
    masseLotKg,
    unitMode: "pct",
    pas: 0.5,
    lignes: recette.ingredients.map((i) => ({
      id: i.codeArticle || uid(),
      codeArticle: i.codeArticle || null,
      designation: i.designation,
      quantiteKg: i.quantiteKg,
      pourcentageSaisi:
        masseLotKg > 0 ? kgVersPct(i.quantiteKg, masseLotKg) : null,
      overrideEtiquette: null,
      estDemeter: i.estDemeter,
      estEquitable: i.estEquitable,
      provenance: "EXTRAIT",
      incomplet: false,
    })),
  };
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
  totalEtiquette: number | null;
  nbIncomplets: number;
  masseRequise: boolean;
  /** Effective label % (override ?? computed) for the line at `idx`. */
  etiquetteEffective: (idx: number) => number | null;
  setMasseLot: (v: number | null) => void;
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

  const nbIncomplets = useMemo(
    () => etat.lignes.filter((l) => estIncomplete(l, etat.unitMode)).length,
    [etat.lignes, etat.unitMode]
  );

  const masseRequise =
    etat.unitMode === "pct" && (etat.masseLotKg == null || etat.masseLotKg <= 0);

  const peutCalculer =
    etat.lignes.length > 0 && nbIncomplets === 0 && !masseRequise;

  /** Effective label % for a line: Marie's override wins over the computed value. */
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
  const conforme = totalEtiquette != null && Math.abs(totalEtiquette - 100) < 1e-6;
  const peutValider = peutCalculer && conforme;

  // Debounced deterministic compute — computeRecette is the single source of
  // truth (SPEC-02); we never recompute figures by hand.
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

  const setMasseLot = (v: number | null) =>
    setEtat((e) => ({
      ...e,
      masseLotKg: v,
      // In % mode the mass drives the grammages — refresh derived kg.
      lignes:
        e.unitMode === "pct" && v && v > 0
          ? e.lignes.map((l) =>
              l.pourcentageSaisi != null
                ? { ...l, quantiteKg: pctVersKg(l.pourcentageSaisi, v) }
                : l
            )
          : e.lignes,
    }));

  const setUnitMode = (m: UnitMode) => setEtat((e) => ({ ...e, unitMode: m }));
  const setPas = (p: Pas) => setEtat((e) => ({ ...e, pas: p }));

  const setSaisie = (id: string, raw: string) => {
    const val = parseNombre(raw);
    majLignes((lignes) =>
      lignes.map((l) => {
        if (l.id !== id) return l;
        const masse = etat.masseLotKg;
        if (etat.unitMode === "kg") {
          return {
            ...l,
            quantiteKg: val,
            pourcentageSaisi:
              val != null && masse && masse > 0 ? kgVersPct(val, masse) : l.pourcentageSaisi,
            incomplet: val == null,
          };
        }
        return {
          ...l,
          pourcentageSaisi: val,
          quantiteKg:
            val != null && masse && masse > 0 ? pctVersKg(val, masse) : l.quantiteKg,
          incomplet: val == null,
        };
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
    const masse = etat.masseLotKg;
    if (etat.unitMode === "kg") {
      return ligne.quantiteKg != null && masse && masse > 0
        ? kgVersPct(ligne.quantiteKg, masse)
        : null;
    }
    return ligne.pourcentageSaisi != null && masse && masse > 0
      ? pctVersKg(ligne.pourcentageSaisi, masse)
      : null;
  };

  return {
    etat,
    resultat,
    erreur,
    peutCalculer,
    peutValider,
    conforme,
    totalEtiquette,
    nbIncomplets,
    masseRequise,
    etiquetteEffective,
    setMasseLot,
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
