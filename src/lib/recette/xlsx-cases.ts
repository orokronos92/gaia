/**
 * Excel form-control checkboxes — the state a flattened sheet cannot carry.
 *
 * JDG's modification sheet (ENR-PRO-024) states "la modification a une incidence
 * sur : ETIQUETAGE / DLUO" with real Excel checkboxes. Those live in
 * `xl/ctrlProps/*.xml`, outside the cell grid: `sheet_to_json` drops them, so an
 * LLM reading the flattened text can only guess from the printed words. TA7372
 * was imported with `incidenceEtiquetage = true` while both boxes are unticked.
 *
 * SheetJS exposes the raw package parts under `bookFiles: true`. A control's
 * anchor gives its cell; its meaning is the printed label sitting to its right,
 * which is how the form is laid out — no new dependency, no inference.
 */

import * as xlsx from "xlsx";
import { adresse, etendue, normaliser, texteCellule } from "./xlsx-cellules";

/** How far right of a checkbox its printed label may sit. */
const PORTEE_ETIQUETTE = 3;

export interface CaseACocher {
  onglet: string;
  /** Anchor cell of the control, e.g. "C14". */
  ancre: string;
  /** Column-A text of the anchor row — the question the box answers. */
  question: string | null;
  /** Nearest printed text to the right — the option the box selects. */
  etiquette: string | null;
  cochee: boolean;
}

interface PartieZip {
  content?: Uint8Array | number[] | string;
}
type PaquetXlsx = Record<string, PartieZip | undefined>;

function paquet(classeur: xlsx.WorkBook): PaquetXlsx | null {
  const brut = (classeur as { files?: unknown }).files;
  return brut && typeof brut === "object" ? (brut as PaquetXlsx) : null;
}

function texteDePartie(partie: PartieZip | undefined): string | null {
  const contenu = partie?.content;
  if (contenu === undefined || contenu === null) return null;
  if (typeof contenu === "string") return contenu;
  const octets = contenu instanceof Uint8Array ? contenu : Uint8Array.from(contenu);
  return new TextDecoder("utf-8").decode(octets);
}

/** Resolves a relationship target against its part's folder ("../" walks up). */
function resoudreChemin(dossier: string, cible: string): string {
  const segments: string[] = [];
  for (const segment of `${dossier}/${cible}`.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }
  return segments.join("/");
}

/** Relationship id → target part path, resolved against the package root. */
function lireRelations(xml: string | null, dossier: string): Map<string, string> {
  const relations = new Map<string, string>();
  if (!xml) return relations;
  for (const balise of xml.matchAll(/<Relationship\b[^>]*\/?>/g)) {
    const id = /\bId="([^"]+)"/.exec(balise[0])?.[1];
    const cible = /\bTarget="([^"]+)"/.exec(balise[0])?.[1];
    if (!id || !cible) continue;
    relations.set(id, cible.startsWith("/") ? cible.slice(1) : resoudreChemin(dossier, cible));
  }
  return relations;
}

/** Sheet name → its part path, via workbook.xml and the workbook relationships. */
function partiesDesOnglets(parts: PaquetXlsx): Map<string, string> {
  const resultat = new Map<string, string>();
  const classeurXml = texteDePartie(parts["xl/workbook.xml"]);
  if (!classeurXml) return resultat;
  const relations = lireRelations(texteDePartie(parts["xl/_rels/workbook.xml.rels"]), "xl");
  for (const balise of classeurXml.matchAll(/<sheet\b[^>]*\/?>/g)) {
    const nom = /\bname="([^"]+)"/.exec(balise[0])?.[1];
    const id = /\br:id="([^"]+)"/.exec(balise[0])?.[1];
    const cible = id ? relations.get(id) : undefined;
    if (nom && cible) resultat.set(nom, cible);
  }
  return resultat;
}

/** Printed label nearest to the right of the anchor, within reach. */
function etiquetteADroite(
  feuille: xlsx.WorkSheet,
  colonne: number,
  ligne: number
): string | null {
  const bornes = etendue(feuille);
  const derniere = bornes ? bornes.e.c : colonne + PORTEE_ETIQUETTE;
  for (let c = colonne + 1; c <= Math.min(colonne + PORTEE_ETIQUETTE, derniere); c++) {
    const texte = texteCellule(feuille, c, ligne);
    if (texte !== "") return texte;
  }
  return null;
}

/**
 * Every checkbox of the workbook with its ticked state.
 *
 * Requires the workbook to have been read with `bookFiles: true`; without the
 * raw parts this returns an empty list rather than a wrong one — a caller then
 * reports "non renseigné", never "non".
 */
export function lireCasesACocher(classeur: xlsx.WorkBook): CaseACocher[] {
  const parts = paquet(classeur);
  if (!parts) return [];

  const cases: CaseACocher[] = [];
  for (const [onglet, cheminFeuille] of partiesDesOnglets(parts)) {
    const feuilleXml = texteDePartie(parts[cheminFeuille]);
    const feuille = classeur.Sheets[onglet];
    if (!feuilleXml || !feuille) continue;

    const dossier = cheminFeuille.slice(0, cheminFeuille.lastIndexOf("/"));
    const nomFichier = cheminFeuille.slice(cheminFeuille.lastIndexOf("/") + 1);
    const relations = lireRelations(
      texteDePartie(parts[`${dossier}/_rels/${nomFichier}.rels`]),
      dossier
    );

    const zoneControles = feuilleXml.slice(feuilleXml.indexOf("<controls>"));
    for (const bloc of zoneControles.split("<control ").slice(1)) {
      const id = /^[^>]*\br:id="([^"]+)"/.exec(bloc)?.[1];
      const colonne = /<(?:\w+:)?col>(\d+)<\//.exec(bloc)?.[1];
      const ligne = /<(?:\w+:)?row>(\d+)<\//.exec(bloc)?.[1];
      if (!id || colonne === undefined || ligne === undefined) continue;

      const proprietes = texteDePartie(parts[relations.get(id) ?? ""]);
      if (!proprietes || !/objectType="CheckBox"/.test(proprietes)) continue;

      const c = Number(colonne);
      const r = Number(ligne);
      cases.push({
        onglet,
        ancre: adresse(c, r),
        question: texteCellule(feuille, 0, r) || null,
        etiquette: etiquetteADroite(feuille, c, r),
        cochee: /checked="Checked"/.test(proprietes),
      });
    }
  }
  return cases;
}

/**
 * Answer of a checkbox group, e.g. "la modification a une incidence sur :
 * [ ] ETIQUETAGE  [ ] DLUO".
 *
 * Returns null when the form carries no such group, and — deliberately — when
 * the group exists but nobody ticked anything: a blank form is "non renseigné",
 * not "non". It only answers false when someone did tick a sibling option, which
 * is the one case where the absence of a tick means a real no.
 */
export function reponseCase(
  cases: CaseACocher[],
  onglet: string,
  debutQuestion: string,
  etiquetteAttendue: string
): boolean | null {
  const question = normaliser(debutQuestion);
  const attendue = normaliser(etiquetteAttendue);
  const groupe = cases.filter(
    (c) =>
      c.onglet === onglet &&
      c.question !== null &&
      normaliser(c.question).startsWith(question)
  );
  if (groupe.length === 0) return null;
  if (!groupe.some((c) => c.cochee)) return null;
  return groupe.some(
    (c) => c.cochee && c.etiquette !== null && normaliser(c.etiquette) === attendue
  );
}
