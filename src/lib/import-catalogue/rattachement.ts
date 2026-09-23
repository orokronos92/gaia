/**
 * Links the sorted label PDFs (selection.csv) to the products they print.
 *
 * The workbook's references are the truth; guessing only comes after. In order:
 * 1. the exact facing/back reference of the workbook;
 * 2. the same reference in another version (the file is V5, the workbook says V6);
 * 3. the product code the sort decoded from the file name (Grands Crus carry no ET code);
 * 4. the product folder, as the old association did (one folder may serve
 *    several packagings of one tea: TA737 → TA7372, TA7376).
 * A file matched by an earlier rule is not offered to a later one.
 */

export type Methode = "reference_exacte" | "reference_autre_version" | "code_produit" | "dossier";

export interface FichierTrie {
  /** Relative path as sorted, with "\" separators. */
  chemin: string;
  codeEtiquette: string;
  version: string;
  role: string;
  codePf: string;
}

export interface ProduitReferences {
  id: string;
  codePf: string;
  refFacing: string | null;
  refContre: string | null;
}

export interface Lien {
  produitId: string;
  codePf: string;
  cleS3: string;
  dossier: string;
  nomFichier: string;
  version: string | null;
  role: string;
  methode: Methode;
  /** False for an older version when the product has the exact one for the same role. */
  actif: boolean;
}

export interface Rattachement {
  liens: Lien[];
  nonRattaches: FichierTrie[];
}

/** Same rule as `codeDeBase` in src/lib/utils/s3-client.ts, kept pure here. */
export function codeDeBase(code: string): string | null {
  const match = code.trim().toUpperCase().match(/^([A-Z]+)(\d{3})/);
  return match ? `${match[1]}${match[2]}` : null;
}

/** "ETBA501V5-" / "ETBA501V5 -" / "ETCTJ9202V6_" → the bare reference. */
export function normaliserReference(code: string): string {
  return code.toUpperCase().replace(/\s+/g, "").replace(/[-_]+$/, "");
}

/** A reference without its version: ETCVA6692V6N → ETCVA6692. */
export const sansVersion = (reference: string): string => reference.replace(/V\d+[A-Z]*$/, "");

export function cleS3(prefixe: string, chemin: string): string {
  return `${prefixe}/${chemin.replace(/\\/g, "/").normalize("NFC")}`;
}

function parties(chemin: string): { dossier: string; nomFichier: string } {
  const segments = chemin.replace(/\\/g, "/").normalize("NFC").split("/");
  return { nomFichier: segments[segments.length - 1], dossier: segments[segments.length - 2] ?? "" };
}

function indexer<T>(elements: readonly T[], cles: (e: T) => ReadonlyArray<string | null>): Map<string, T[]> {
  const index = new Map<string, T[]>();
  for (const e of elements) {
    for (const cle of new Set(cles(e))) if (cle) index.set(cle, [...(index.get(cle) ?? []), e]);
  }
  return index;
}

export function rattacher(fichiers: readonly FichierTrie[], produits: readonly ProduitReferences[], prefixe: string): Rattachement {
  const refs = (p: ProduitReferences) => [p.refFacing, p.refContre].map((r) => (r ? normaliserReference(r) : null));
  const parReference = indexer(produits, refs);
  const parBase = indexer(produits, (p) => refs(p).map((r) => (r ? sansVersion(r) : null)));
  const parCode = indexer(produits, (p) => [p.codePf]);
  const parDossier = indexer(produits, (p) => [codeDeBase(p.codePf)]);

  const liens: Lien[] = [];
  const nonRattaches: FichierTrie[] = [];
  for (const fichier of fichiers) {
    const reference = normaliserReference(fichier.codeEtiquette);
    const { dossier, nomFichier } = parties(fichier.chemin);
    const codeDossier = dossier.normalize("NFD").toUpperCase().match(/^[A-Z]+\d{3}/)?.[0] ?? null;
    const essais: Array<[Methode, ProduitReferences[] | undefined]> = [
      ["reference_exacte", reference ? parReference.get(reference) : undefined],
      ["reference_autre_version", reference ? parBase.get(sansVersion(reference)) : undefined],
      ["code_produit", fichier.codePf ? parCode.get(fichier.codePf.toUpperCase()) : undefined],
      ["dossier", codeDossier ? parDossier.get(codeDeBase(codeDossier) ?? "") : undefined],
    ];
    const trouve = essais.find(([, candidats]) => candidats && candidats.length > 0);
    if (!trouve) {
      nonRattaches.push(fichier);
      continue;
    }
    const [methode, candidats] = trouve;
    // A product with several fiches appears once per fiche: link it once.
    const uniques = [...new Map((candidats ?? []).map((p) => [p.id, p])).values()];
    for (const produit of uniques) {
      liens.push({
        produitId: produit.id, codePf: produit.codePf, cleS3: cleS3(prefixe, fichier.chemin), dossier, nomFichier,
        version: fichier.version ? `V${fichier.version}` : null, role: fichier.role, methode, actif: true,
      });
    }
  }

  // An older version stays listed but out of audits when the exact one is there.
  const exacts = new Set(liens.filter((l) => l.methode === "reference_exacte").map((l) => `${l.produitId}|${l.role}`));
  for (const lien of liens) {
    if (lien.methode === "reference_autre_version" && exacts.has(`${lien.produitId}|${lien.role}`)) lien.actif = false;
  }
  return { liens, nonRattaches };
}
