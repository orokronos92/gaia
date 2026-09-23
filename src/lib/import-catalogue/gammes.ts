/**
 * Workbook range labels → referential ids. Accents, case and spacing are
 * ignored; nothing is ever created here. An unknown or ambiguous label stops
 * the import (spec §7): a range decides which mentions the audit demands.
 */
import { normaliserLibelle } from "./cellules";

export interface GammeRef {
  id: string;
  nom: string;
}

export interface SousGammeRef {
  id: string;
  gammeId: string;
  nom: string;
}

export type Resolution =
  | { ok: true; gammeId: string; gammeNom: string; sousGammeId: string | null }
  | { ok: false; type: "gamme" | "sous-gamme"; libelle: string; gamme: string | null; motif: "vide" | "inconnue" | "ambiguë" };

export function creerResolveurGammes(gammes: readonly GammeRef[], sousGammes: readonly SousGammeRef[]) {
  const parNom = new Map<string, GammeRef[]>();
  for (const gamme of gammes) {
    const cle = normaliserLibelle(gamme.nom);
    parNom.set(cle, [...(parNom.get(cle) ?? []), gamme]);
  }

  return function resoudre(gamme: string | null, sousGamme: string | null): Resolution {
    if (gamme === null) return { ok: false, type: "gamme", libelle: "", gamme: null, motif: "vide" };
    const candidats = parNom.get(normaliserLibelle(gamme)) ?? [];
    if (candidats.length !== 1) {
      return { ok: false, type: "gamme", libelle: gamme, gamme: null, motif: candidats.length === 0 ? "inconnue" : "ambiguë" };
    }
    const [trouvee] = candidats;
    if (sousGamme === null) return { ok: true, gammeId: trouvee.id, gammeNom: trouvee.nom, sousGammeId: null };
    const cle = normaliserLibelle(sousGamme);
    const sous = sousGammes.filter((s) => s.gammeId === trouvee.id && normaliserLibelle(s.nom) === cle);
    if (sous.length !== 1) {
      return { ok: false, type: "sous-gamme", libelle: sousGamme, gamme: trouvee.nom, motif: sous.length === 0 ? "inconnue" : "ambiguë" };
    }
    return { ok: true, gammeId: trouvee.id, gammeNom: trouvee.nom, sousGammeId: sous[0].id };
  };
}

export type ResolveurGammes = ReturnType<typeof creerResolveurGammes>;
