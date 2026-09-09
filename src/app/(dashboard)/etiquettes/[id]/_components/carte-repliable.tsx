"use client"

import { useSyncExternalStore } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Replier une carte du dossier produit.
 *
 * Le repli est **une aide à la navigation, pas une cachette** : tout est ouvert
 * par défaut, et l'en-tête replié annonce combien de champs restent vides. La
 * Qualité referme ce qu'elle a traité et voit d'un coup d'œil où est le travail
 * — refermer sans rien dire reviendrait à remasquer ce qu'on vient de rendre
 * visible.
 *
 * L'état suit la personne, pas la fiche : il est mémorisé par carte et vaut
 * pour tous les produits. Sans ça, replier une carte se défait au produit
 * suivant, et le geste ne sert à rien.
 */
const PREFIXE = "gaialabel.carte."

const ecouteurs = new Set<() => void>()

function abonner(prevenir: () => void): () => void {
    ecouteurs.add(prevenir)
    window.addEventListener("storage", prevenir)
    return () => {
        ecouteurs.delete(prevenir)
        window.removeEventListener("storage", prevenir)
    }
}

function replie(cle: string): boolean {
    try {
        return localStorage.getItem(PREFIXE + cle) === "1"
    } catch {
        // Navigation privée, stockage refusé : tout reste ouvert, ce qui est
        // exactement l'état par défaut voulu.
        return false
    }
}

export function useRepli(cle: string): { ouvert: boolean; basculer: () => void } {
    const ouvert = !useSyncExternalStore(
        abonner,
        () => replie(cle),
        () => false
    )
    const basculer = () => {
        try {
            localStorage.setItem(PREFIXE + cle, ouvert ? "1" : "0")
        } catch {}
        for (const prevenir of ecouteurs) prevenir()
    }
    return { ouvert, basculer }
}

/** Le nombre de champs vides d'une carte — la seule chose qu'un repli doit laisser voir. */
export function compterVides(valeurs: readonly (string | null | undefined | boolean)[]): number {
    return valeurs.filter((v) => {
        if (typeof v === "boolean") return false
        if (!v) return true
        const n = v.trim().toLowerCase()
        return ["", "/", "aucun", "néant", "non", "n/a", "na", "-"].includes(n)
    }).length
}

interface BoutonRepliProps {
    ouvert: boolean
    basculer: () => void
    vides: number
    /** Teinte du compteur, accordée à la carte. */
    ton?: string
}

export function BoutonRepli({ ouvert, basculer, vides, ton = "text-stone-400" }: BoutonRepliProps) {
    return (
        <button
            type="button"
            onClick={basculer}
            aria-expanded={ouvert}
            className="flex shrink-0 items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-white/60"
            title={ouvert ? "Replier" : "Déplier"}
        >
            <span className={cn("text-[11px] font-semibold tabular-nums", vides > 0 ? "text-amber-600" : ton)}>
                {vides > 0 ? `${vides} à renseigner` : "complet"}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", ton, !ouvert && "-rotate-90")} />
        </button>
    )
}
