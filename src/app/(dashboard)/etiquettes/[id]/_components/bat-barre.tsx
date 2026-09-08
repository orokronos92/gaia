"use client"

import { Eye, EyeOff, Maximize2, Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { COULEURS_REPERE, type CouleurRepere } from "./bat-preferences"

interface BatBarreProps {
    nomFace: string
    zoom: number
    zoomMin: number
    zoomMax: number
    onZoom: (delta: number) => void
    onReinitialiser: () => void
    cadres: boolean
    onCadres: (v: boolean) => void
    /** Nombre de zones que le BAT porte — inutile d'offrir de les cacher s'il n'y en a pas. */
    nbZones: number
    couleur: CouleurRepere
    onCouleur: (c: CouleurRepere) => void
}

const BOUTON = "rounded-lg border border-stone-200 p-1 text-stone-500 transition-colors hover:bg-stone-50 disabled:opacity-40"

/** La barre du volet : ce qu'on regarde, comment, et à quelle échelle. */
export function BatBarre({
    nomFace,
    zoom,
    zoomMin,
    zoomMax,
    onZoom,
    onReinitialiser,
    cadres,
    onCadres,
    nbZones,
    couleur,
    onCouleur,
}: BatBarreProps) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-white px-3 py-2">
            <p className="min-w-0 flex-1 truncate text-[11px] text-stone-400" title={nomFace}>
                {nomFace}
            </p>

            {nbZones > 0 && (
                <div className="flex shrink-0 items-center gap-1.5">
                    {/* Voir l'étiquette telle qu'elle est imprimée, sans rien
                        par-dessus : c'est parfois la seule façon de juger. */}
                    <button
                        onClick={() => onCadres(!cadres)}
                        title={cadres ? "Masquer les repères" : "Afficher les repères"}
                        aria-pressed={cadres}
                        className={cn(
                            BOUTON,
                            "inline-flex items-center gap-1 px-1.5 text-[11px] font-semibold",
                            cadres && "border-stone-300 bg-stone-100 text-stone-700"
                        )}
                    >
                        {cadres ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {nbZones}
                    </button>

                    <div className="flex items-center gap-1 rounded-lg border border-stone-200 px-1 py-0.5">
                        {COULEURS_REPERE.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => onCouleur(c.id)}
                                title={`Repères en ${c.libelle.toLowerCase()}`}
                                aria-pressed={couleur === c.id}
                                style={{ backgroundColor: c.trait }}
                                className={cn(
                                    "h-3.5 w-3.5 rounded-full transition-transform",
                                    couleur === c.id
                                        ? "scale-110 ring-2 ring-stone-400 ring-offset-1"
                                        : "opacity-60 hover:opacity-100"
                                )}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => onZoom(-1)} disabled={zoom <= zoomMin} className={BOUTON} aria-label="Réduire">
                    <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center text-[11px] font-semibold text-stone-500">{zoom.toFixed(1)}×</span>
                <button onClick={() => onZoom(1)} disabled={zoom >= zoomMax} className={BOUTON} aria-label="Agrandir">
                    <Plus className="h-3.5 w-3.5" />
                </button>
                <button onClick={onReinitialiser} className={BOUTON} aria-label="Réinitialiser le cadrage">
                    <Maximize2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    )
}
