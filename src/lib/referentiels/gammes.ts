/**
 * Rapprocher deux gammes qui n'en sont qu'une.
 *
 * Le champ était libre, et le catalogue en porte la trace : « LES GRANDS
 * CLASSIQUES » (89 produits) et « Grand classiques » (2), « LES ENGAGÉS » (10)
 * et « Les Engagés » (1). Ce sont des accidents de saisie, pas des gammes.
 *
 * Le référentiel les reprend tels quels — il doit d'abord dire la vérité du
 * catalogue — et signale ceux qui se ressemblent. **Il ne fusionne jamais de
 * lui-même** : « Les Militants » ressemble à « Les Engagés » pour qui connaît
 * l'histoire du renommage, et à rien du tout pour un algorithme. C'est une
 * question posée à la Qualité, pas une décision prise à sa place.
 */

/** Articles que le libellé porte ou non, sans que ce soit une autre gamme. */
const ARTICLES = /^(LES|LE|LA|L')\s*/;

/**
 * Forme de rapprochement : accents, casse, article de tête et pluriels retirés.
 *
 * « LES GRANDS CLASSIQUES » et « Grand classiques » se réduisent tous deux à
 * « GRAND CLASSIQUE ». « LES MILITANTS » donne « MILITANT » et ne rejoint rien —
 * c'est voulu : leur parenté est une décision métier, pas une ressemblance.
 */
export function formeRapprochement(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(ARTICLES, "")
    .split(" ")
    .map((mot) => (mot.length > 3 ? mot.replace(/S$/, "") : mot))
    .join(" ")
    .trim();
}

export interface GammeRapprochable {
  id: string;
  nom: string;
}

/**
 * Les groupes de gammes qui se réduisent à la même forme — donc au moins deux.
 * Une gamme seule de son espèce ne figure dans aucun groupe.
 */
export function doublonsProbables<T extends GammeRapprochable>(gammes: T[]): T[][] {
  const parForme = new Map<string, T[]>();
  for (const g of gammes) {
    const forme = formeRapprochement(g.nom);
    if (forme === "") continue;
    (parForme.get(forme) ?? parForme.set(forme, []).get(forme)!).push(g);
  }
  return [...parForme.values()].filter((groupe) => groupe.length > 1);
}
