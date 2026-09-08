"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ImageOff, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { RepereBat } from "@/lib/audit/visual/reperes"
import { BatBarre } from "./bat-barre"
import { teinteDe, usePreferencesBat } from "./bat-preferences"
import { Zone, type ZoneBat } from "./bat-zone"

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
    /** Zones à montrer, en fractions de la face. Le serveur les a déjà converties. */
    reperes?: ZoneBat[]
    /**
     * Toutes les zones encore ouvertes, dessinées en trait pâle dès l'ouverture.
     * Sans elles, l'étiquette reste muette jusqu'au premier clic, et rien ne dit
     * à Marie qu'il y a quelque chose à y voir.
     */
    reperesFaibles?: ZoneBat[]
    /** Marie clique un cadre : le chemin liste → BAT existait, l'inverse non. */
    onZoneClic?: (pointId: string) => void
    /**
     * Compteur de demandes de cadrage. Recliquer la même ligne renvoie les
     * mêmes zones : sans ce jeton, rien ne distingue « Marie redemande à voir »
     * de « rien n'a bougé », et le volet reste là où elle l'avait laissé.
     */
    demandeCadrage?: number
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
export function BatVisionneuse({ faces, faceActive, onFaceChange, reperes, reperesFaibles, onZoneClic, demandeCadrage }: BatVisionneuseProps) {
    const [interne, setInterne] = useState(0)
    const vue = useRef<HTMLDivElement>(null)
    const plan = useRef<HTMLDivElement>(null)
    const [zoom, setZoom] = useState(1)
    const [origine, setOrigine] = useState({ x: 0, y: 0 })
    const [chargement, setChargement] = useState(true)
    const [erreur, setErreur] = useState(false)
    const glisse = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
    // Un déplacement du plan ne doit pas se terminer en clic sur la zone qui se
    // trouvait sous le doigt à l'arrivée.
    const deplace = useRef(false)
    const { couleur, setCouleur, cadres, setCadres } = usePreferencesBat()
    const { trait, texte: encre } = teinteDe(couleur)

    const index = faceActive ?? interne
    const face = faces[index]
    /**
     * La face dont l'image est effectivement affichée.
     *
     * Passé 2×, la visionneuse redemande un rendu plus fin : l'image se
     * remonte, et son `onLoad` repartait cadrer les repères. Redescendre sous
     * 2× repassait en 200 dpi, rechargeait, recadrait — le zoom se rétablissait
     * tout seul et ne redescendait plus jamais sous le grossissement calculé.
     * Le cadrage automatique n'appartient qu'à l'arrivée d'une NOUVELLE face.
     */
    const faceChargee = useRef<string | null>(null)
    const surLaFace = (reperes ?? []).filter((r) => r.face === index)
    // Une zone déjà mise en avant ne se redessine pas en pâle par-dessous.
    const enAvant = new Set(surLaFace.map((r) => `${r.x},${r.y},${r.largeur},${r.hauteur}`))
    const faibles = (reperesFaibles ?? []).filter(
        (r) => r.face === index && !enAvant.has(`${r.x},${r.y},${r.largeur},${r.hauteur}`)
    )
    const compte = (i: number) => (reperesFaibles ?? []).filter((r) => r.face === i).length

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

    /**
     * Amène les repères au centre, à un grossissement qui les rende lisibles.
     *
     * Le calcul se fait sur la taille NON transformée du plan : c'est elle qui
     * porte le repère des pourcentages renvoyés par le serveur. Mesurer l'image
     * déjà zoomée reviendrait à composer deux fois la même échelle.
     */
    const cadrer = useCallback((zones: RepereBat[]) => {
        const v = vue.current
        const p = plan.current
        if (!v || !p || zones.length === 0) return

        const L = p.offsetWidth
        const H = p.offsetHeight
        if (L === 0 || H === 0) return

        const x0 = Math.min(...zones.map((z) => z.x)) * L
        const y0 = Math.min(...zones.map((z) => z.y)) * H
        const x1 = Math.max(...zones.map((z) => z.x + z.largeur)) * L
        const y1 = Math.max(...zones.map((z) => z.y + z.hauteur)) * H

        const VL = v.clientWidth
        const VH = v.clientHeight
        // Une marge : coller le cadre aux bords ferait perdre le contexte autour.
        const s = Math.min(
            ZOOM_MAX,
            Math.max(1, Math.min((VL * 0.7) / Math.max(1, x1 - x0), (VH * 0.55) / Math.max(1, y1 - y0)))
        )
        const cx = (x0 + x1) / 2
        const cy = (y0 + y1) / 2

        // L'origine du grossissement est « en haut, au centre » : l'axe X se
        // mesure depuis le milieu du plan, l'axe Y depuis son sommet.
        setZoom(s)
        setOrigine({ x: -(cx - L / 2) * s, y: VH / 2 - cy * s })
    }, [])

    // Les repères arrivent d'un clic sur une ligne de contrôle. Le cadrage
    // mesure le DOM : sa place est dans un effet, pas dans le rendu. Le report
    // à la frame suivante laisse la mise en page se stabiliser avant de mesurer.
    const cles = surLaFace.map((r) => `${r.x},${r.y},${r.largeur},${r.hauteur}`).join("|")
    useEffect(() => {
        if (cles === "") return
        // `demandeCadrage` n'est pas lu ici : il n'est en dépendance que pour
        // relancer le cadrage quand Marie reclique la ligne déjà montrée.
        const t = requestAnimationFrame(() =>
            cadrer(cles.split("|").map((c) => {
                const [x, y, largeur, hauteur] = c.split(",").map(Number)
                return { face: 0, x, y, largeur, hauteur }
            }))
        )
        return () => cancelAnimationFrame(t)
    }, [cles, demandeCadrage, cadrer])

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
                            {compte(i) > 0 && (
                                <span className="ml-1.5 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-800">
                                    {compte(i)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
                <div
                    ref={vue}
                    className={cn(
                        "relative flex h-[clamp(18rem,42vh,26rem)] items-start justify-center overflow-hidden xl:h-[clamp(24rem,66vh,44rem)]",
                        zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                    )}
                    onPointerDown={(e) => {
                        deplace.current = false
                        if (zoom <= 1) return
                        glisse.current = { x: e.clientX, y: e.clientY, ox: origine.x, oy: origine.y }
                        e.currentTarget.setPointerCapture(e.pointerId)
                    }}
                    onPointerMove={(e) => {
                        const g = glisse.current
                        if (!g) return
                        if (Math.abs(e.clientX - g.x) + Math.abs(e.clientY - g.y) > 4) deplace.current = true
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
                        <div
                            ref={plan}
                            style={{
                                transform: `translate(${origine.x}px, ${origine.y}px) scale(${zoom})`,
                                transformOrigin: "top center",
                            }}
                            className="relative transition-transform duration-200"
                        >
                            <img
                                key={`${face.cleS3}-${zoom > 2 ? 300 : 200}`}
                                src={`/api/bat/rendu?cle=${encodeURIComponent(face.cleS3)}&dpi=${zoom > 2 ? 300 : 200}`}
                                alt={face.nom}
                                draggable={false}
                                onLoad={() => {
                                    setChargement(false)
                                    const nouvelleFace = faceChargee.current !== face.cleS3
                                    faceChargee.current = face.cleS3
                                    if (nouvelleFace && surLaFace.length > 0) {
                                        requestAnimationFrame(() => cadrer(surLaFace))
                                    }
                                }}
                                onError={() => {
                                    setChargement(false)
                                    setErreur(true)
                                }}
                                className="max-h-[clamp(18rem,42vh,26rem)] w-auto select-none object-contain xl:max-h-[clamp(24rem,66vh,44rem)]"
                            />
                            {cadres && faibles.map((r, i) => (
                                <Zone
                                    key={`faible-${i}`}
                                    zone={r}
                                    zoom={zoom}
                                    trait={trait}
                                    encre={encre}
                                    active={false}
                                    onClic={onZoneClic ? (id) => { if (!deplace.current) onZoneClic(id) } : undefined}
                                />
                            ))}
                            {cadres && surLaFace.map((r, i) => (
                                <Zone
                                    key={`${r.libelle ?? "zone"}-${i}`}
                                    zone={r}
                                    zoom={zoom}
                                    trait={trait}
                                    encre={encre}
                                    active
                                    onClic={onZoneClic ? (id) => { if (!deplace.current) onZoneClic(id) } : undefined}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <BatBarre
                    nomFace={face.nom}
                    zoom={zoom}
                    zoomMin={ZOOM_MIN}
                    zoomMax={ZOOM_MAX}
                    onZoom={(sens) => zoomer(sens * ZOOM_PAS)}
                    onReinitialiser={() => {
                        setZoom(1)
                        setOrigine({ x: 0, y: 0 })
                    }}
                    cadres={cadres}
                    onCadres={setCadres}
                    nbZones={faibles.length + surLaFace.length}
                    couleur={couleur}
                    onCouleur={setCouleur}
                />
            </div>
        </div>
    )
}
