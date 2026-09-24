import type { FaceAFace } from "@/lib/audit/visual/face-a-face"

interface FaceAFaceTableProps {
    donnees: FaceAFace
}

/**
 * Le face-à-face d'une carte en écart : mesuré contre exigé, ou fiche contre
 * étiquette — seulement les lignes qui divergent. Les lignes conformes sont
 * comptées, pas listées.
 */
export function FaceAFaceTable({ donnees }: FaceAFaceTableProps) {
    const { colonnes, contexte, lignes, conformes = 0 } = donnees
    return (
        <div className="mt-2 rounded-xl border border-stone-200 overflow-hidden">
            {contexte && <p className="bg-stone-50 px-3 py-1.5 text-[11px] text-stone-500 border-b border-stone-100">{contexte}</p>}
            <div className="grid grid-cols-[1fr_1fr_1fr] bg-stone-50 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                <span className="px-3 py-1.5">{colonnes.element}</span>
                <span className="px-3 py-1.5 border-l border-stone-200">{colonnes.gauche}</span>
                <span className="px-3 py-1.5 border-l border-stone-200">{colonnes.droite}</span>
            </div>
            {lignes.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr] border-t border-stone-100 text-xs leading-snug">
                    <span className="px-3 py-1.5 text-stone-800">{l.element}</span>
                    <span className="px-3 py-1.5 border-l border-stone-100 font-medium text-red-700">
                        {l.gauche}
                        {l.detail && <span className="block text-[10px] font-normal text-stone-500">{l.detail}</span>}
                    </span>
                    <span className="px-3 py-1.5 border-l border-stone-100 text-stone-700">{l.droite}</span>
                </div>
            ))}
            {conformes > 0 && (
                <p className="border-t border-stone-100 px-3 py-1 text-[10px] text-stone-400">
                    {conformes} autre{conformes > 1 ? "s" : ""} élément{conformes > 1 ? "s" : ""} conforme{conformes > 1 ? "s" : ""}
                </p>
            )}
        </div>
    )
}
