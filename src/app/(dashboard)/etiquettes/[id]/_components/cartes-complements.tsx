"use client"

import { ClipboardList, Languages, Plane, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BoutonRepli, useRepli } from "@/components/etiquettes/carte-repliable"
import type { ComplementsFiche } from "@/db/queries/fiche-complements"
import { cn } from "@/lib/utils"
import { NonRenseigne, hasRealValue } from "./champs-dossier"

type Valeur = string | boolean | null | undefined

interface Champ {
    label: string
    valeur: Valeur
    /** Toujours montré, même vide : c'est un champ qu'on s'attend à trouver. */
    attendu?: boolean
    /** Texte long : sur toute la largeur. */
    long?: boolean
}

const dateFr = (v: string | null) => (v ? new Date(v).toLocaleDateString("fr-FR") : null)

const present = (v: Valeur) => (typeof v === "boolean" ? true : hasRealValue(v ?? null))

function affiche(v: Valeur) {
    if (typeof v === "boolean") return v ? "Oui" : "Non"
    return present(v) ? v : <NonRenseigne />
}

/** Une grille de champs : ceux qui sont remplis, et ceux qu'on attend même vides. */
function Grille({ champs }: { champs: Champ[] }) {
    const visibles = champs.filter((c) => c.attendu || present(c.valeur))
    if (visibles.length === 0) return null
    return (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((c) => (
                <div key={c.label} className={cn(c.long && "sm:col-span-2 lg:col-span-3")}>
                    <dt className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{c.label}</dt>
                    <dd className={cn("text-sm text-stone-800", c.long ? "leading-relaxed whitespace-pre-line" : "font-medium")}>{affiche(c.valeur)}</dd>
                </div>
            ))}
        </dl>
    )
}

function Section({ titre, champs }: { titre: string; champs: Champ[] }) {
    if (!champs.some((c) => c.attendu || present(c.valeur))) return null
    return (
        <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-stone-500">{titre}</h4>
            <Grille champs={champs} />
        </div>
    )
}

/**
 * Une carte en lecture seule, repliable comme les autres. L'en-tête dit d'où
 * viennent les données : Marie ne les cherche pas à modifier ici.
 */
function CarteLecture({ cle, titre, icon: Icon, teinte, children }: { cle: string; titre: string; icon: LucideIcon; teinte: string; children: React.ReactNode }) {
    const repli = useRepli(cle)
    return (
        <Card className="border border-stone-200/70 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className={cn("border-b border-stone-100 pb-4", teinte)}>
                <CardTitle className="text-lg font-bold text-stone-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="p-1 h-7 w-7 rounded-lg bg-white/70 border-none flex items-center justify-center">
                            <Icon className="h-4 w-4 text-stone-600" />
                        </Badge>
                        {titre}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">base étiquettes · lecture seule</span>
                        <BoutonRepli ouvert={repli.ouvert} basculer={repli.basculer} vides={0} sansCompteur />
                    </div>
                </CardTitle>
            </CardHeader>
            {repli.ouvert && <CardContent className="p-5 space-y-5">{children}</CardContent>}
        </Card>
    )
}

interface CartesComplementsProps {
    complements: ComplementsFiche
}

/**
 * Étape 3 du branchement de la base étiquettes (2026-09-24) : traductions,
 * export, suivi de fabrication. Ces colonnes étaient importées et jamais
 * montrées. Elles s'affichent en lecture seule ; l'édition viendra quand on
 * saura qui les tient une fois l'Excel abandonné.
 */
export function CartesComplements({ complements }: CartesComplementsProps) {
    const { traductions: t, export: e, suivi: s } = complements
    const autres = t.autres.filter((a) => present(a.sousDesignation) || present(a.ingredients))
    const exportVide = !e.exportAnglais && ![e.codePfExport, e.refFacingExport, e.refContreExport, e.conditionnementExport, e.poidsNetOz, e.gammeExport, e.prioriteExport].some(present)

    return (
        <>
            <CarteLecture cle="traductions" titre="Traductions" icon={Languages} teinte="bg-teal-500/10">
                <Section
                    titre="Anglais"
                    champs={[
                        { label: "Dénomination", valeur: t.en.denomination, attendu: true },
                        { label: "Sous-dénomination", valeur: t.en.sousDesignation, attendu: true },
                        { label: "Type de thé", valeur: t.en.typeThe, attendu: true },
                        { label: "Origine", valeur: t.en.origine },
                        { label: "Mention d'origine", valeur: t.en.mentionOrigine },
                        { label: "Ancienne dénomination", valeur: t.en.denominationPrecedente },
                        { label: "Texte commercial", valeur: t.en.texteCommercial, attendu: true, long: true },
                        { label: "Texte commercial court", valeur: t.en.texteCommercialCourt, long: true },
                        { label: "Liste d'ingrédients", valeur: t.en.ingredients, attendu: true, long: true },
                        { label: "Allégations santé", valeur: t.en.allegations, long: true },
                        { label: "Mention WFTO", valeur: t.en.phraseWfto, long: true },
                        { label: "Mention Les Engagés", valeur: t.en.phraseEngages, long: true },
                        { label: "Texte de présentation", valeur: t.en.textePresentation, long: true },
                        { label: "Texte tube", valeur: t.en.texteTube, long: true },
                    ]}
                />
                {autres.length > 0 ? (
                    autres.map((a) => (
                        <Section
                            key={a.langue}
                            titre={{ DE: "Allemand", IT: "Italien", NL: "Néerlandais" }[a.langue]}
                            champs={[
                                { label: "Sous-dénomination", valeur: a.sousDesignation, attendu: true },
                                { label: "Liste d'ingrédients", valeur: a.ingredients, attendu: true, long: true },
                            ]}
                        />
                    ))
                ) : (
                    <p className="text-xs text-stone-400 italic">Allemand, italien, néerlandais : aucune traduction dans la base.</p>
                )}
            </CarteLecture>

            <CarteLecture cle="export" titre="Export" icon={Plane} teinte="bg-sky-500/10">
                {exportVide ? (
                    <p className="text-xs text-stone-400 italic">Pas d&apos;export anglais pour ce produit.</p>
                ) : (
                    <Grille
                        champs={[
                            { label: "Export anglais", valeur: e.exportAnglais, attendu: true },
                            { label: "Code PF export", valeur: e.codePfExport, attendu: true },
                            { label: "Réf. facing export", valeur: e.refFacingExport },
                            { label: "Réf. contre export", valeur: e.refContreExport },
                            { label: "Conditionnement export", valeur: e.conditionnementExport },
                            { label: "Poids net (oz)", valeur: e.poidsNetOz },
                            { label: "Gamme export", valeur: e.gammeExport },
                            { label: "Priorité export", valeur: e.prioriteExport },
                        ]}
                    />
                )}
            </CarteLecture>

            <CarteLecture cle="suivi" titre="Suivi de fabrication" icon={ClipboardList} teinte="bg-stone-500/10">
                <Section
                    titre="Étiquette"
                    champs={[
                        { label: "Prêt pour l'interne", valeur: s.pretPourInterne },
                        { label: "Étiquette finalisée", valeur: s.etiquetteFinalisee ?? null },
                        { label: "Contre finalisée", valeur: s.contreFinalisee ?? null },
                        { label: "Action", valeur: s.action },
                        { label: "Note", valeur: s.note },
                    ]}
                />
                <Section
                    titre="Impression"
                    champs={[
                        { label: "Imprimeur", valeur: s.imprimeur },
                        { label: "Envoi à l'imprimeur", valeur: dateFr(s.dateEnvoiImprimeur) },
                        { label: "Premier lot en V5", valeur: s.premierLotV5 },
                    ]}
                />
                <Section
                    titre="PMI"
                    champs={[
                        { label: "Libellé PMI", valeur: s.libellePmi },
                        { label: "PMI OK projet plantes", valeur: s.pmiOkProjetPlantes },
                        { label: "PMI F9 texte commercial", valeur: s.pmiF9TexteCommercial },
                        { label: "Date modif. PMI F9", valeur: dateFr(s.dateModificationPmiF9) },
                        { label: "Switch PMI", valeur: s.switchPmi },
                        { label: "MAJ langues PMI", valeur: s.majLanguesPmi },
                    ]}
                />
                <Section
                    titre="Clients"
                    champs={[
                        { label: "Sonnentor", valeur: s.sonnentor },
                        { label: "Biocoop", valeur: s.biocoop },
                    ]}
                />
                <Section
                    titre="Colonnes à confirmer par JDG"
                    champs={[
                        { label: "COND.", valeur: s.cond },
                        { label: "Priorité", valeur: s.priorite },
                    ]}
                />
                <Section
                    titre="Historique"
                    champs={[
                        { label: "Commentaires", valeur: s.commentaires, long: true },
                        { label: "Historique", valeur: s.historique, long: true },
                        { label: "Ancienne réf. facing", valeur: s.refFacingPrecedente },
                        { label: "Ancien texte commercial", valeur: s.ancienTexteCommercialFr, long: true },
                    ]}
                />
            </CarteLecture>
        </>
    )
}
