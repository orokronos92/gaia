"use client"

import { useSyncExternalStore } from "react"

/**
 * Comment Marie veut voir les zones sur le BAT.
 *
 * Deux réglages, et une seule raison à leur existence : **l'étiquette a une
 * couleur, et nous n'en savons rien**. Un cerne ambre se perd sur un kraft, un
 * rouge sur une contre-étiquette bordeaux. Aucun choix par défaut n'est bon
 * partout, donc le choix lui revient — et il la suit d'une fiche à l'autre.
 */
export const COULEURS_REPERE = [
    { id: "rouge", libelle: "Rouge", trait: "#dc2626" },
    { id: "cyan", libelle: "Cyan", trait: "#0891b2" },
    { id: "magenta", libelle: "Magenta", trait: "#c026d3" },
    { id: "vert", libelle: "Vert", trait: "#4d7c0f" },
] as const

export type CouleurRepere = (typeof COULEURS_REPERE)[number]["id"]

/** Le rouge par défaut : c'est la couleur d'une chose à regarder. */
const COULEUR_DEFAUT: CouleurRepere = "rouge"

const CLE_COULEUR = "gaialabel.bat.couleur"
const CLE_CADRES = "gaialabel.bat.cadres"

export function traitDe(couleur: CouleurRepere): string {
    return (COULEURS_REPERE.find((c) => c.id === couleur) ?? COULEURS_REPERE[0]).trait
}

/**
 * Le stockage du navigateur, lu comme une source extérieure.
 *
 * Un `useEffect` qui recopie `localStorage` dans un état déclenche un second
 * rendu à chaque montage, et React le refuse désormais. `useSyncExternalStore`
 * dit la chose telle qu'elle est : la préférence ne nous appartient pas, on la
 * lit là où elle vit — avec une valeur de repli côté serveur, qui n'a pas de
 * stockage.
 */
const ecouteurs = new Set<() => void>()

function abonner(prevenir: () => void): () => void {
    ecouteurs.add(prevenir)
    window.addEventListener("storage", prevenir)
    return () => {
        ecouteurs.delete(prevenir)
        window.removeEventListener("storage", prevenir)
    }
}

function lire(cle: string): string | null {
    try {
        return localStorage.getItem(cle)
    } catch {
        // Navigation privée, stockage refusé : les valeurs par défaut font
        // l'affaire, elles ne survivent simplement pas à la page.
        return null
    }
}

function ecrire(cle: string, valeur: string): void {
    try {
        localStorage.setItem(cle, valeur)
    } catch {}
    for (const prevenir of ecouteurs) prevenir()
}

function couleurStockee(): CouleurRepere {
    const c = lire(CLE_COULEUR)
    return c && COULEURS_REPERE.some((x) => x.id === c) ? (c as CouleurRepere) : COULEUR_DEFAUT
}

export interface PreferencesBat {
    couleur: CouleurRepere
    setCouleur: (c: CouleurRepere) => void
    cadres: boolean
    setCadres: (v: boolean) => void
}

export function usePreferencesBat(): PreferencesBat {
    const couleur = useSyncExternalStore(abonner, couleurStockee, () => COULEUR_DEFAUT)
    const cadres = useSyncExternalStore(
        abonner,
        () => lire(CLE_CADRES) !== "0",
        () => true
    )

    return {
        couleur,
        setCouleur: (c) => ecrire(CLE_COULEUR, c),
        cadres,
        setCadres: (v) => ecrire(CLE_CADRES, v ? "1" : "0"),
    }
}
