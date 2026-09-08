"use client"

import type { RepereBat } from "@/lib/audit/visual/reperes"

/** Une zone du BAT, et le point de checklist qui l'a produite. */
export type ZoneBat = RepereBat & { pointId?: string }

interface ZoneProps {
    zone: ZoneBat
    /** Grossissement courant du plan — le trait doit s'en défendre (cf. infra). */
    zoom: number
    trait: string
    /** La zone du point cliqué, par opposition à celles restées en attente. */
    active: boolean
    onClic?: (pointId: string) => void
}

/**
 * Le cadre d'une zone mesurée.
 *
 * **Le trait se divise par le zoom.** Les zones vivent à l'intérieur du
 * `scale()` du plan : un trait de 2 px en devenait 5 à 2,5×, autour de mots qui
 * font parfois six pixels de haut — le cerne était plus épais que ce qu'il
 * désignait. L'étiquette de texte compensait déjà, le cadre non ; il le fait
 * maintenant, et son épaisseur perçue ne bouge plus d'un grossissement à
 * l'autre.
 *
 * **Le halo blanc double le trait.** Une couleur unique ne tient pas sur un
 * catalogue qui va du kraft clair à la contre-étiquette bordeaux. Le liseré
 * blanc posé derrière la couleur garantit le contraste quel que soit le fond,
 * comme le pointillé d'un logiciel de mise en page.
 */
export function Zone({ zone, zoom, trait, active, onClic }: ZoneProps) {
    const e = Math.max(0.4, (active ? 1.5 : 1) / zoom)
    const cliquable = Boolean(onClic && zone.pointId)

    return (
        <div
            style={{
                left: `${zone.x * 100}%`,
                top: `${zone.y * 100}%`,
                width: `${zone.largeur * 100}%`,
                height: `${zone.hauteur * 100}%`,
                outline: `${e}px ${active ? "solid" : "dashed"} ${trait}`,
                boxShadow: `0 0 0 ${e * 2}px rgba(255,255,255,.8)`,
                opacity: active ? 1 : 0.75,
            }}
            title={zone.libelle}
            onClick={cliquable ? () => onClic!(zone.pointId!) : undefined}
            className={cliquable ? "absolute cursor-pointer" : "pointer-events-none absolute"}
        >
            {/* Le libellé était un `title`, donc invisible : on voyait un cadre
                muet autour d'un mot, sans rien dans la liste qui y renvoie. */}
            {zone.libelle && (
                <span
                    style={{
                        fontSize: `${Math.max(3.5, 9 / zoom)}px`,
                        backgroundColor: trait,
                        padding: `${0.6 / zoom}px ${1.6 / zoom}px`,
                        borderRadius: `${1.5 / zoom}px`,
                        top: `-${1.5 / zoom}px`,
                        transform: "translateY(-100%)",
                    }}
                    className="pointer-events-none absolute left-0 whitespace-nowrap font-bold text-white"
                >
                    {zone.libelle}
                </span>
            )}
        </div>
    )
}
