/**
 * Deterministic reader for a JDG recette workbook (ENR-PRO-023 / ENR-PRO-024).
 *
 * The recette sheet is the authoritative composition — it decides the ingredient
 * list, the QUID figures and the Demeter / fair-trade claims. It used to be
 * handed to the LLM as tab-separated text, and the header did not survive the
 * flattening: "COMMERCE\nEQUITABLE" became three lines and "QTÉ\t EN KG" split in
 * two, so the model had to guess the column grid. It guessed wrong roughly one
 * import in three — TA602's three fair-trade ticks came back as Demeter ticks,
 * which is a certification claim on an ingredient that carries none.
 *
 * So the grid is read here, by cell address. The forms are normalised documents:
 * the header row always starts with CODE ARTICLE / DESIGNATION, which is enough
 * to anchor every other column by its printed label. Nothing is inferred; a
 * layout this module does not recognise yields null and the caller degrades
 * loudly rather than silently.
 */

import * as xlsx from "xlsx";
import { etendue, normaliser, texteCellule } from "./xlsx-cellules";
import { lireCasesACocher, reponseCase, type CaseACocher } from "./xlsx-cases";
import {
  colonnesDEntete,
  lireTableau,
  numeroVersion,
  type TableauRecetteLu,
} from "./xlsx-tableau";

export type { LigneRecetteLue, TableauRecetteLu } from "./xlsx-tableau";

/**
 * Header fields, by the printed label sitting in column A. An exact match where
 * the label is a common word ("VERSION" also opens a table intitulé), a prefix
 * where JDG spells the question out.
 */
const CHAMPS_ENTETE = [
  { champ: "version", exact: ["VERSION"] },
  { champ: "developpeur", exact: ["DEVELOPPEUR"] },
  { champ: "date", exact: ["DATE"] },
  { champ: "designation", exact: ["DESIGNATION"], prefixe: "DESIGNATION DE LA NOUVELLE RECETTE" },
  { champ: "codeArticle", exact: ["CODE ARTICLE"] },
  { champ: "saveurOrigine", exact: [], prefixe: "SAVEUR" },
  { champ: "marque", exact: ["MARQUE", "CLIENT"] },
  { champ: "descriptifModification", exact: [], prefixe: "DESCRIPTIF DE LA MODIFICATION" },
  { champ: "raisonModification", exact: [], prefixe: "RAISON DE LA MODIFICATION" },
] as const;

const QUESTION_INCIDENCE = "LA MODIFICATION A UNE INCIDENCE SUR";
const OPTION_ETIQUETAGE = "ETIQUETAGE";

export interface EnteteFicheRecette {
  version: string | null;
  developpeur: string | null;
  date: Date | null;
  dateTexte: string | null;
  designation: string | null;
  codeArticle: string | null;
  saveurOrigine: string | null;
  marque: string | null;
  descriptifModification: string | null;
  raisonModification: string | null;
}

export interface FicheRecetteLue {
  /** Form reference printed on the sheet, e.g. "ENR-PRO-023". */
  reference: string | null;
  /** Short version label of the retained table, e.g. "V.2". */
  versionRetenue: string | null;
  entete: EnteteFicheRecette;
  /** The table in force — a modification form's NEW version, newest sheet. */
  tableau: TableauRecetteLu;
  tousTableaux: TableauRecetteLu[];
  cases: CaseACocher[];
  /** null = the form carries no answer, which is not the same as "non". */
  incidenceEtiquetage: boolean | null;
  /** Anything read that deserves a human eye rather than a silent default. */
  anomalies: string[];
}

/**
 * Short version label. JDG writes free text around it — "V.0 (NON FINALISE - vu
 * avec Cassandre…)" — and `recettes.version` holds 50 characters, so only the
 * label itself is kept; the full wording stays in `entete.version`.
 */
function etiquetteVersion(...sources: (string | null)[]): string | null {
  for (const source of sources) {
    const trouve = source ? /V\.?\s*\d+(?:\s*\(?\s*bis\s*\)?)?/i.exec(source) : null;
    if (trouve) return trouve[0].replace(/\s+/g, " ").trim().toUpperCase();
  }
  return null;
}

/** "le 12/09/2025", "LE 31.07.2025" → a Date. Anything else stays null. */
function lireDate(texte: string | null): Date | null {
  if (!texte) return null;
  const trouve = /(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/.exec(texte);
  if (!trouve) return null;
  const [, j, m, a] = trouve;
  const annee = a.length === 2 ? 2000 + Number(a) : Number(a);
  const date = new Date(Date.UTC(annee, Number(m) - 1, Number(j)));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** First non-empty cell to the right of `colonne` on that row. */
function valeurADroite(
  feuille: xlsx.WorkSheet,
  colonne: number,
  ligne: number,
  derniere: number
): string | null {
  for (let c = colonne + 1; c <= derniere; c++) {
    const texte = texteCellule(feuille, c, ligne);
    if (texte !== "") return texte;
  }
  return null;
}

/**
 * Reads the identity block above the first table. The first occurrence of a
 * label wins, so the sheet's own header beats anything repeated further down.
 */
function lireEntete(
  feuille: xlsx.WorkSheet,
  bornes: xlsx.Range,
  jusqua: number
): EnteteFicheRecette {
  const brut = new Map<string, string>();
  for (let r = bornes.s.r; r < jusqua; r++) {
    for (let c = bornes.s.c; c <= bornes.e.c; c++) {
      const libelle = texteCellule(feuille, c, r);
      if (libelle === "") continue;
      const cle = normaliser(libelle);
      for (const { champ, exact, ...reste } of CHAMPS_ENTETE) {
        const prefixe = "prefixe" in reste ? reste.prefixe : undefined;
        const correspond =
          (exact as readonly string[]).includes(cle) ||
          (prefixe !== undefined && cle.startsWith(prefixe));
        if (!correspond || brut.has(champ)) continue;
        const valeur = valeurADroite(feuille, c, r, bornes.e.c);
        if (valeur !== null) brut.set(champ, valeur);
      }
      break; // only the leftmost cell of a row is a label
    }
  }

  const dateTexte = brut.get("date") ?? null;
  return {
    version: brut.get("version") ?? null,
    developpeur: brut.get("developpeur") ?? null,
    date: lireDate(dateTexte),
    dateTexte,
    designation: brut.get("designation") ?? null,
    codeArticle: brut.get("codeArticle") ?? null,
    saveurOrigine: brut.get("saveurOrigine") ?? null,
    marque: brut.get("marque") ?? null,
    descriptifModification: brut.get("descriptifModification") ?? null,
    raisonModification: brut.get("raisonModification") ?? null,
  };
}

/**
 * The table in force for one sheet: a modification form carries the superseded
 * version first and the new one second, and only the second one ships.
 */
function tableauEnVigueur(tableaux: TableauRecetteLu[]): TableauRecetteLu | null {
  const remplis = tableaux.filter((t) => t.lignes.length > 0);
  if (remplis.length === 0) return null;
  return remplis.find((t) => t.estNouvelleVersion) ?? remplis[0];
}

/**
 * Reads a recette workbook. Returns null when no sheet exposes a recognisable
 * header row — the caller must then degrade explicitly, never quietly.
 *
 * `buffer` must be the untouched .xlsx; it is re-read with `bookFiles: true` so
 * the form-control checkboxes stay reachable.
 */
export function lireFicheRecetteXlsx(buffer: ArrayBuffer): FicheRecetteLue | null {
  const classeur = xlsx.read(buffer, { type: "buffer", bookFiles: true });
  const anomalies: string[] = [];
  const cases = lireCasesACocher(classeur);

  const parOnglet: { onglet: string; tableaux: TableauRecetteLu[]; premiereEntete: number }[] = [];
  for (const onglet of classeur.SheetNames) {
    const feuille = classeur.Sheets[onglet];
    const bornes = feuille ? etendue(feuille) : null;
    if (!feuille || !bornes) continue;

    const tableaux: TableauRecetteLu[] = [];
    let premiereEntete = -1;
    for (let r = bornes.s.r; r <= bornes.e.r; r++) {
      const colonnes = colonnesDEntete(feuille, r, bornes.s.c, bornes.e.c);
      if (!colonnes) continue;
      if (premiereEntete < 0) premiereEntete = r;
      tableaux.push(lireTableau(feuille, onglet, r, colonnes, bornes, anomalies));
    }
    if (tableaux.length > 0) parOnglet.push({ onglet, tableaux, premiereEntete });
  }
  if (parOnglet.length === 0) return null;

  // Newest sheet wins: the version printed on the retained table, else the one
  // in the sheet's header block, else the sheet name (JDG names them "v.2").
  const candidats = parOnglet
    .map((o, index) => {
      const tableau = tableauEnVigueur(o.tableaux);
      const feuille = classeur.Sheets[o.onglet];
      const bornes = etendue(feuille);
      const entete = bornes ? lireEntete(feuille, bornes, o.premiereEntete) : null;
      const numero =
        numeroVersion(tableau?.intitule ?? null) ??
        numeroVersion(entete?.version ?? null) ??
        numeroVersion(o.onglet);
      return { ...o, tableau, entete, numero, index };
    })
    .filter((c) => c.tableau !== null && c.entete !== null);
  if (candidats.length === 0) return null;

  const retenu = candidats.reduce((meilleur, courant) =>
    (courant.numero ?? -1) > (meilleur.numero ?? -1) ? courant : meilleur
  );
  const tableau = retenu.tableau as TableauRecetteLu;

  const reference = /ENR-PRO-\d+/i.exec(
    classeur.SheetNames.map((n) => {
      const f = classeur.Sheets[n];
      const b = f ? etendue(f) : null;
      if (!b) return "";
      let entetes = "";
      for (let c = b.s.c; c <= b.e.c; c++) entetes += ` ${texteCellule(f, c, b.s.r)}`;
      return entetes;
    }).join(" ")
  )?.[0] ?? null;

  if (tableau.colonnes.demeter === undefined) {
    anomalies.push(
      `${tableau.onglet} : ce gabarit ne porte pas de colonne DEMETER — aucune matière n'est déclarée Demeter.`
    );
  }
  if (tableau.colonnes.equitable === undefined) {
    anomalies.push(
      `${tableau.onglet} : ce gabarit ne porte pas de colonne COMMERCE ÉQUITABLE.`
    );
  }

  const entete = retenu.entete as EnteteFicheRecette;
  if (/NON\s*FINALISE/i.test(entete.version ?? "")) {
    anomalies.push(
      `${tableau.onglet} : la fiche se déclare « ${(entete.version ?? "").trim()} » — recette non finalisée côté R&D.`
    );
  }

  return {
    reference,
    versionRetenue: etiquetteVersion(tableau.intitule, entete.version, tableau.onglet),
    entete,
    tableau,
    tousTableaux: parOnglet.flatMap((o) => o.tableaux),
    cases,
    incidenceEtiquetage: reponseCase(
      cases,
      tableau.onglet,
      QUESTION_INCIDENCE,
      OPTION_ETIQUETAGE
    ),
    anomalies,
  };
}
