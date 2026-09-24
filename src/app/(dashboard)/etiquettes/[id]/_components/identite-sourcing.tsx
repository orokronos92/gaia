import { Globe2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { EditableSection } from "@/components/etiquettes/editable-section"
import { cn } from "@/lib/utils"
import { ChampPmi, NonRenseigne, hasRealValue, valeurOu } from "./champs-dossier"

export interface IdentiteSourcingProps {
    section: EditableSection
    producteurJardin?: string | null
    infoProducteur?: string | null
    typeProducteur?: string | null
    origineMpa?: string | null
    fournisseur?: string | null
    floId?: string | null
    nomLatin?: string | null
    dateMiseMarche?: string | null
    epoqueRecolte?: string | null
    techniqueRecolte?: string | null
    grade?: string | null
    volumineux?: boolean | null
    estAromatise?: boolean | null
    labelsClient?: string[] | null
    labelsMP?: string[] | null
}

const SELECT = "w-full bg-transparent border-b border-emerald-300 text-xs font-semibold text-stone-800 focus:border-emerald-500 focus:outline-none"

function OuiNon({ valeur, oui = "bg-amber-100 text-amber-800" }: { valeur: boolean; oui?: string }) {
    return (
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 uppercase border-none", valeur ? oui : "bg-blue-100 text-blue-800")}>
            {valeur ? "OUI" : "NON"}
        </Badge>
    )
}

/**
 * Le bas de la carte Identité : producteur, sourcing, caractéristiques, labels.
 *
 * Il reprend ce que portait la carte « Données complémentaires & arbitrages »,
 * retirée le 2026-09-24 : un champ, un endroit. Le jardin et les labels
 * viennent de la base étiquettes (colonnes PRODUCTEUR/ JARDIN, AB, WFTO, D…) ;
 * le producteur détaillé, le FLO ID ou le nom latin, de la fiche descriptive
 * quand Marie en dépose une. Les deux sources s'affichent côte à côte, aucune
 * n'efface l'autre.
 */
export function IdentiteSourcing(p: IdentiteSourcingProps) {
    const { section } = p
    // Le producteur de la fiche descriptive n'est répété que s'il dit autre chose que le jardin.
    const producteurDistinct =
        hasRealValue(p.infoProducteur) && p.infoProducteur?.trim().toLowerCase() !== p.producteurJardin?.trim().toLowerCase()
    const labelsClient = Array.isArray(p.labelsClient) ? p.labelsClient : []
    const labelsMP = Array.isArray(p.labelsMP) ? p.labelsMP : []

    return (
        <>
            <div className="mt-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Globe2 className="w-3 h-3" /> Producteur & sourcing
                </h4>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <ChampPmi section={section} label="Jardin / producteur" field="producteurJardin" value={p.producteurJardin} tonLabel="text-stone-400" tonValeur="text-stone-800" />
                    <ChampPmi section={section} label="Origine MPA" field="origineMpa" value={p.origineMpa} tonLabel="text-stone-400" tonValeur="text-stone-800" />
                    <ChampPmi section={section} label="Fournisseur" field="fournisseur" value={p.fournisseur} tonLabel="text-stone-400" tonValeur="text-stone-800" />
                    <ChampPmi section={section} label="FLO ID" field="floId" value={p.floId} tonLabel="text-stone-400" tonValeur="text-stone-800" />
                    <ChampPmi section={section} label="Nom latin" field="nomLatin" value={p.nomLatin} tonLabel="text-stone-400" tonValeur="text-stone-800" />
                    <ChampPmi section={section} label="Mise en marché" field="dateMiseMarche" value={p.dateMiseMarche} tonLabel="text-stone-400" tonValeur="text-stone-800" />
                </div>
                {producteurDistinct && (
                    <p className="text-xs text-stone-600">
                        <span className="font-bold text-stone-800">Producteur (fiche descriptive) :</span> {p.infoProducteur}
                        {p.typeProducteur && ` (${p.typeProducteur})`}
                    </p>
                )}
            </div>

            <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <ChampPmi section={section} label="Époque Récolte" field="epoqueRecolte" value={p.epoqueRecolte} />
                <ChampPmi section={section} label="Technique" field="techniqueRecolte" value={p.techniqueRecolte} />
                <ChampPmi section={section} label="Grade / Granulométrie" field="grade" value={p.grade} />
                <div>
                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Aromatisé</p>
                    {section.editing ? (
                        <select value={section.draft.estAromatise ?? "false"} onChange={(e) => section.setField("estAromatise", e.target.value)} className={SELECT}>
                            <option value="true">Oui</option>
                            <option value="false">Non</option>
                        </select>
                    ) : (
                        <OuiNon valeur={!!p.estAromatise} oui="bg-violet-100 text-violet-800" />
                    )}
                </div>
                <div>
                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Volumineux</p>
                    {section.editing ? (
                        // Trois états, pas deux : vide veut dire « non renseigné »,
                        // ce qui n'est pas la même chose que « non ».
                        <select value={section.draft.volumineux ?? ""} onChange={(e) => section.setField("volumineux", e.target.value)} className={SELECT}>
                            <option value="">non renseigné</option>
                            <option value="true">Oui</option>
                            <option value="false">Non</option>
                        </select>
                    ) : p.volumineux === null || p.volumineux === undefined ? (
                        <p className="text-xs font-semibold text-blue-950"><NonRenseigne /></p>
                    ) : (
                        <OuiNon valeur={p.volumineux} />
                    )}
                </div>
            </div>

            {/* Taille de logo, pas de pastille : ces marques tiennent lieu des
                vrais logos en attendant les fichiers de JDG, et un label se
                repère de loin ou ne sert à rien. Ce sont ceux de la base
                étiquettes ; ceux de la matière première (fiche descriptive)
                suivent en petit quand il y en a. */}
            <div className="mt-4 space-y-2">
                <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Labels</span>
                <div className="flex flex-wrap items-center gap-3">
                    {section.editing ? (
                        <input
                            type="text"
                            value={section.draft.labelsClient ?? ""}
                            onChange={(e) => section.setField("labelsClient", e.target.value)}
                            placeholder="AB, WFTO, Demeter — séparés par des virgules"
                            className="min-w-[16rem] flex-1 bg-transparent border-b border-emerald-300 text-xs font-semibold text-stone-800 focus:border-emerald-500 focus:outline-none"
                        />
                    ) : labelsClient.length > 0 ? (
                        labelsClient.map((lbl) => (
                            <Badge key={lbl} variant="outline" className="rounded-2xl border-2 border-stone-300 bg-white px-8 py-5 text-3xl font-black tracking-wide text-stone-700 shadow-sm">{lbl}</Badge>
                        ))
                    ) : (
                        <span className="text-xs"><NonRenseigne /></span>
                    )}
                </div>
                {(section.editing || labelsMP.length > 0) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Labels matière première</span>
                        {section.editing ? (
                            <input
                                type="text"
                                value={section.draft.labelsMP ?? ""}
                                onChange={(e) => section.setField("labelsMP", e.target.value)}
                                placeholder="AB, FLO, MH — séparés par des virgules"
                                className="min-w-[16rem] flex-1 bg-transparent border-b border-emerald-300 text-xs font-semibold text-stone-800 focus:border-emerald-500 focus:outline-none"
                            />
                        ) : (
                            <span className="text-xs font-semibold text-stone-700">{valeurOu(labelsMP.join(", "))}</span>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
