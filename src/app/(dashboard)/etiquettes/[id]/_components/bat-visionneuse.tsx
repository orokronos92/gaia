"use client"

import { useRef, useState } from "react"
import { ImageOff, Loader2, Maximize2, Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

export interface FaceBatAffichable {
    /** Clé de stockage — le rendu la vérifie avant de servir quoi que ce soit. */
    cleS3: string
    nom: string
}

interface BatVisionneuseProps {
    faces: FaceBatAffichable[]
    /** Face imposée de l'extérieur — un clic sur une ligne de contrôle. */
    faceActive?: number
    onFaceChange?: (index: number) => void
}

const ZOOM_MIN = 1
const ZOOM_MAX = 6
const ZOOM_PAS = 0.5

/**
 * L'étiquette, à côté de la liste, pendant que Marie la parcourt.
 *
 * Elle passe son temps à regarder le BAT : le lui faire ouvrir ailleurs lui
 * fait perdre sa place à chaque ligne. Un volet accroché, et non une fenêtre
 * flottante — une fenêtre, elle la déplace, la redimensionne et finit par la
 * perdre derrière l'autre.
 *
 * Le rendu vient de poppler, côté serveur : aucune bibliothèque PDF dans le
 * navigateur, et surtout une image qui partage **exactement** le repère de nos
 * mesures. C'est ce qui permettra d'y surligner un mot au bon endroit.
 */
export function BatVisionneuse({ faces, faceActive, onFaceChange }: BatVisionneuseProps) {
    const [interne, setInterne] = useState(0)
    const [zoom, setZoom] = useState(1)
    const [origine, setOrigine] = useState({ x: 0, y: 0 })
    const [chargement, setChargement] = useState(true)
    const [erreur, setErreur] = useState(false)
    const glisse = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

    const index = faceActive ?? interne
    const face = faces[index]

    // Changer de face remet la loupe à zéro : garder un cadrage d'une face à
    // l'autre montrerait un coin arbitraire de la suivante. L'ajustement se
    // fait pendant le rendu et non dans un effet, sinon React affiche d'abord
    // l'ancien cadrage sur la nouvelle image avant de le corriger.
    const [precedent, setPrecedent] = useState(index)
    if (precedent !== index) {
        setPrecedent(index)
        setZoom(1)
        setOrigine({ x: 0, y: 0 })
        setChargement(true)
        setErreur(false)
    }

    const choisir = (i: number) => {
        setInterne(i)
        onFaceChange?.(i)
    }

    const zoomer = (delta: number) =>
        setZoom((z) => {
            const suivant = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta))
            if (suivant === ZOOM_MIN) setOrigine({ x: 0, y: 0 })
            return suivant
        })

    if (faces.length === 0) {
        return (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 text-center">
                <ImageOff className="mb-2 h-8 w-8 text-stone-300" />
                <p className="text-sm font-medium text-stone-500">Aucun BAT associé à ce produit</p>
                <p className="mt-1 text-xs text-stone-400">
                    Associez ses fichiers depuis la fiche pour les voir ici.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {faces.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                    {faces.map((f, i) => (
                        <button
                            key={f.cleS3}
                            onClick={() => choisir(i)}
                            title={f.nom}
                            className={cn(
                                "max-w-[14rem] truncate rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                                i === index
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : "border-stone-200 text-stone-500 hover:border-emerald-200 hover:bg-stone-50"
                            )}
                        >
                            {f.nom.replace(/\.(pdf|ai)$/i, "")}
                        </button>
                    ))}
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
                <div
                    className={cn(
                        "relative flex h-[68vh] items-start justify-center overflow-hidden",
                        zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                    )}
                    onPointerDown={(e) => {
                        if (zoom <= 1) return
                        glisse.current = { x: e.clientX, y: e.clientY, ox: origine.x, oy: origine.y }
                        e.currentTarget.setPointerCapture(e.pointerId)
                    }}
                    onPointerMove={(e) => {
                        const g = glisse.current
                        if (!g) return
                        setOrigine({ x: g.ox + (e.clientX - g.x), y: g.oy + (e.clientY - g.y) })
                    }}
                    onPointerUp={() => {
                        glisse.current = null
                    }}
                >
                    {chargement && !erreur && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
                        </div>
                    )}
                    {erreur ? (
                        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                            <ImageOff className="mb-2 h-8 w-8 text-stone-300" />
                            <p className="text-sm font-medium text-stone-500">Face illisible</p>
                            <p className="mt-1 text-xs text-stone-400">{face.nom}</p>
                        </div>
                    ) : (
                        // Le zoom porte la résolution : au-delà de 2×, on demande
                        // un rendu plus fin plutôt que d'étirer des pixels.
                        <img
                            key={`${face.cleS3}-${zoom > 2 ? 300 : 200}`}
                            src={`/api/bat/rendu?cle=${encodeURIComponent(face.cleS3)}&dpi=${zoom > 2 ? 300 : 200}`}
                            alt={face.nom}
                            draggable={false}
                            onLoad={() => setChargement(false)}
                            onError={() => {
                                setChargement(false)
                                setErreur(true)
                            }}
                            style={{
                                transform: `translate(${origine.x}px, ${origine.y}px) scale(${zoom})`,
                                transformOrigin: "top center",
                            }}
                            className="max-h-full w-auto select-none object-contain transition-transform duration-100"
                        />
                    )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-stone-200 bg-white px-3 py-2">
                    <p className="truncate text-[11px] text-stone-400" title={face.nom}>
                        {face.nom}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            onClick={() => zoomer(-ZOOM_PAS)}
                            disabled={zoom <= ZOOM_MIN}
                            className="rounded-lg border border-stone-200 p-1 text-stone-500 transition-colors hover:bg-stone-50 disabled:opacity-40"
                            aria-label="Réduire"
                        >
                            <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center text-[11px] font-semibold text-stone-500">
                            {zoom.toFixed(1)}×
                        </span>
                        <button
                            onClick={() => zoomer(ZOOM_PAS)}
                            disabled={zoom >= ZOOM_MAX}
                            className="rounded-lg border border-stone-200 p-1 text-stone-500 transition-colors hover:bg-stone-50 disabled:opacity-40"
                            aria-label="Agrandir"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => {
                                setZoom(1)
                                setOrigine({ x: 0, y: 0 })
                            }}
                            className="rounded-lg border border-stone-200 p-1 text-stone-500 transition-colors hover:bg-stone-50"
                            aria-label="Réinitialiser le cadrage"
                        >
                            <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
