/**
 * Structure du code article et du GENCODE — MOP-PRO-029 v.2 (JDG, 26/01/2023).
 *
 * Couche pure : elle décrit ce que dit la procédure, sans juger. Les verdicts
 * sont rendus par les contrôles déterministes, comme partout ailleurs dans
 * l'audit.
 *
 * Un code produit fini s'écrit `<famille alpha><n° article, 3 chiffres><conditionnement>`,
 * éventuellement suivi de lettres (§2.1.4 : façonnage, export, Terra Madre,
 * variantes). Le dernier chiffre n'est PAS un numéro de version — c'est un
 * format d'emballage, et c'est ce qui distingue TB4016 (50 g) de TB4017 (1 kg).
 */

/** §2.1.3 — Définition du type de conditionnement pour les produits finis. */
export interface Conditionnement {
  code: string;
  libelle: string;
  /** Poids net attendu, en grammes. */
  poidsG?: number;
  /** Certains codes couvrent une plage plutôt qu'une valeur (§2.1.3). */
  minG?: number;
  maxG?: number;
}

export const CONDITIONNEMENTS: Conditionnement[] = [
  { code: "1", libelle: "1,5 kg vrac", poidsG: 1500 },
  { code: "2", libelle: "100 g ou poids ≥ 80 g", minG: 80 },
  { code: "3", libelle: "1 kg Malongo", poidsG: 1000 },
  { code: "4", libelle: "250 g", poidsG: 250 },
  { code: "5", libelle: "500 g", poidsG: 500 },
  { code: "6", libelle: "50 g ou poids < 80 g", maxG: 79 },
  { code: "7", libelle: "1 kg Jardins de Gaïa", poidsG: 1000 },
];

/** §2.1.2 — Définition du code : la tranche du n° d'article dit le type de produit. */
export const TRANCHES_ARTICLE: { min: number; max: number; libelle: string }[] = [
  { min: 100, max: 199, libelle: "tisane de fruit, honeybush, lapacho nature ou maté" },
  { min: 200, max: 299, libelle: "maté fruité, rooibos ou lapacho vanille" },
  { min: 300, max: 399, libelle: "maté pour négoce" },
  { min: 400, max: 499, libelle: "lapacho agrumes" },
  { min: 600, max: 699, libelle: "thé aromatisé ou mélangé fait avec du thé vert" },
  { min: 700, max: 799, libelle: "thé aromatisé ou mélangé fait avec du thé noir" },
  { min: 800, max: 899, libelle: "thé aromatisé ou mélangé à façon" },
];

export interface CodeArticleDecompose {
  /** Préfixe alphabétique : TA, TH, MT… */
  famille: string;
  /** Numéro d'article sur trois chiffres. */
  article: string;
  /** Chiffre de conditionnement, absent sur les codes historiques. */
  conditionnement: string | null;
  /** Lettres de fin : façonnage, export, variante (§2.1.4). */
  extension: string | null;
}

/** Découpe un codePf selon §2.1. Retourne null si la forme n'est pas reconnue. */
export function decomposerCodeArticle(codePf: string): CodeArticleDecompose | null {
  const m = codePf.trim().toUpperCase().match(/^([A-Z]+)(\d{3})(\d)?([A-Z]+)?$/);
  if (!m) return null;
  return {
    famille: m[1],
    article: m[2],
    conditionnement: m[3] ?? null,
    extension: m[4] ?? null,
  };
}

export function conditionnementParCode(code: string): Conditionnement | undefined {
  return CONDITIONNEMENTS.find((c) => c.code === code);
}

export function trancheArticle(article: string): { libelle: string } | undefined {
  const n = Number(article);
  return TRANCHES_ARTICLE.find((t) => n >= t.min && n <= t.max);
}

/**
 * Poids net en grammes, depuis le champ libre `poidsNet` (varchar).
 * Accepte « 100 », « 100 g », « 1,5 kg », « 1.5kg ». Retourne null si la valeur
 * n'est pas une masse — « 3 pièces » par exemple.
 */
export function poidsEnGrammes(poidsNet: string | null | undefined): number | null {
  if (!poidsNet) return null;
  const m = poidsNet.trim().toLowerCase().replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(kg|g)?$/);
  if (!m) return null;
  const valeur = Number(m[1]);
  if (!Number.isFinite(valeur)) return null;
  // Sans unité, une valeur ≤ 10 est lue en kg (« 1 » = 1 kg, « 1.5 » = 1,5 kg) :
  // aucun thé JDG ne se conditionne en dessous de 30 g, et le catalogue ne porte
  // que des grammages ≥ 30 ou des kilos écrits sans unité.
  const unite = m[2] ?? (valeur <= 10 ? "kg" : "g");
  return unite === "kg" ? valeur * 1000 : valeur;
}

/** Le conditionnement attendu couvre-t-il ce poids ? */
export function poidsCoherent(cond: Conditionnement, grammes: number): boolean {
  if (cond.poidsG !== undefined) return Math.abs(grammes - cond.poidsG) < 0.5;
  if (cond.minG !== undefined) return grammes >= cond.minG;
  if (cond.maxG !== undefined) return grammes <= cond.maxG;
  return false;
}

/**
 * §3 — GENCODE. Deux générations coexistent dans le catalogue :
 *
 *   récent  35 | 8281 | famille (2) | article (3) | conditionnement (1) | clé
 *   ancien  35 | 8281 | famille (2) | article (4, zéro à gauche)        | clé
 *
 * Le second n'est pas documenté mais représente une part du catalogue (tisanes
 * historiques sans chiffre de conditionnement). On décode les deux et on retient
 * celui qui concorde avec le code produit — sinon le format récent, qui est la
 * référence écrite.
 */
export interface GencodeDecompose {
  pays: string;
  fabricant: string;
  famille: string;
  article: string;
  conditionnement: string | null;
  cle: string;
  format: "recent" | "historique";
}

export function decomposerGencode(
  ean: string | null | undefined,
  codeArticle?: string | null
): GencodeDecompose | null {
  if (!ean || !/^\d{13}$/.test(ean.trim())) return null;
  const e = ean.trim();

  const recent: GencodeDecompose = {
    pays: e.slice(0, 2),
    fabricant: e.slice(2, 6),
    famille: e.slice(6, 8),
    article: e.slice(8, 11),
    conditionnement: e.slice(11, 12),
    cle: e.slice(12),
    format: "recent",
  };
  const historique: GencodeDecompose = {
    pays: e.slice(0, 2),
    fabricant: e.slice(2, 6),
    famille: e.slice(6, 8),
    article: String(Number(e.slice(8, 12))).padStart(3, "0"),
    conditionnement: null,
    cle: e.slice(12),
    format: "historique",
  };

  if (codeArticle && historique.article === codeArticle && recent.article !== codeArticle) {
    return historique;
  }
  return recent;
}

/** Clé de contrôle EAN-13 (norme GS1) : 1-3-1-3… sur les douze premiers chiffres. */
export function cleEan13(douzeChiffres: string): string {
  const somme = [...douzeChiffres].reduce(
    (s, d, i) => s + Number(d) * (i % 2 === 0 ? 1 : 3),
    0
  );
  return String((10 - (somme % 10)) % 10);
}

/** §3 — codes constants attendus sur tout GENCODE Jardins de Gaïa. */
export const GENCODE_PAYS = "35";
export const GENCODE_FABRICANT = "8281";
