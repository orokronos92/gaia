/**
 * The four product catalogues of JDG's base, one per workbook sheet (migration
 * 0030). JDG — teas and infusions — is where the controls are built first; the
 * others are in the base and get their own fiche one at a time.
 */
export const CATALOGUES = ["JDG", "TERRA_MADRE", "INFUSETTES_PAGES", "INFUSETTES_COUNTRY_FARM"] as const;
export type Catalogue = (typeof CATALOGUES)[number];

export const CATALOGUE_PAR_DEFAUT: Catalogue = "JDG";

export const LIBELLE_CATALOGUE: Record<Catalogue, string> = {
  JDG: "Jardins de Gaïa — thés et infusions",
  TERRA_MADRE: "Terra Madre — épices",
  INFUSETTES_PAGES: "Infusettes Pages",
  INFUSETTES_COUNTRY_FARM: "Infusettes Country Farm",
};

/** A search parameter → a known catalogue, JDG otherwise. */
export function lireCatalogue(valeur: string | string[] | undefined): Catalogue {
  return typeof valeur === "string" && (CATALOGUES as readonly string[]).includes(valeur) ? (valeur as Catalogue) : CATALOGUE_PAR_DEFAUT;
}
