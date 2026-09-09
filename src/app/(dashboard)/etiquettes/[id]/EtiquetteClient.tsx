"use client"

import { useRef, useState } from "react"
import {
    CheckCircle2,
    AlertTriangle,
    Bot,
    ChevronRight,
    Loader2,
    Clock,
    Thermometer,
    Package,
    Globe2,
    Leaf,
    Coffee,
    AlignLeft,
    Info,
    ShieldAlert,
    ScrollText,
    Dna,
    Droplets,
    Eye,
    Wind,
    Utensils,
    FlaskConical,
    ArrowLeft,
    Copy,
    Save,
    History,
    MinusCircle
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { choisirAllegationAction, dupliquerFicheAction, sauvegarderVersionAction } from "@/app/actions/etiquettes"
import { useEditableSection, EditButtons, EditableText, type EditableSection } from "@/components/etiquettes/editable-section"
import { VersionsHistorique } from "@/components/etiquettes/versions-historique"
import { DocumentsSource, type DocumentSourceVue } from "./_components/documents-source"
import { SupprimerProduit } from "@/components/produits/supprimer-produit"
import { RetraitCatalogue } from "@/components/produits/retrait-catalogue"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { RecettePanel } from "@/components/recette/RecettePanel"
import { RecetteListeCards } from "./_components/recette-liste-cards"
import { StatutSelect } from "./_components/statut-select"
import { DossierComplementaire } from "@/components/recette/DossierComplementaire"
import { EmptyState } from "@/components/atoms/empty-state"
import { BoutonRepli, compterVides, useRepli } from "./_components/carte-repliable"
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent"
import { ControleEtiquette } from "./_components/controle-etiquette"
import type { AuditDeterministeResult } from "@/app/actions/audit"
import type { AuditVisuelTexteResult } from "@/app/actions/audit-visuel"
import { AuditSynthese, type SousResultatAudit } from "./_components/audit-synthese"
import { ReintegrerDocumentMenu } from "./_components/reintegrer-recette"
import type { RecetteCalculatorHandle } from "@/components/recette/RecetteCalculator"

// --- Helper pour vérifier si un champ "vide" Excel contient une vraie valeur
/**
 * Ce qu'on affiche à la place d'un champ vide.
 *
 * Un champ masqué quand il est vide n'existe pas : personne ne sait qu'il
 * existe, donc personne ne le remplit — et la structure de la page change d'un
 * produit à l'autre sans qu'on comprenne pourquoi. Le vide se dit.
 */
const NonRenseigne = () => (
    <span className="font-normal italic text-stone-400">non renseigné</span>
);

const valeurOu = (val: string | null | undefined) =>
    hasRealValue(val) ? val : <NonRenseigne />;

const hasRealValue = (val: string | null | undefined) => {
    if (!val) return false;
    const clean = val.trim().toLowerCase();
    return !['/', 'aucun', 'néant', 'non', 'n/a', 'na', '', '-'].includes(clean);
}

function DegField({ section, field, label, value }: { section: EditableSection, field: string, label: string, value: any }) {
    return (
        <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase">{label}</span>
            <EditableText section={section} field={field} value={value ?? null} placeholder="—" className="text-sm text-stone-800" />
        </div>
    )
}

/**
 * Un champ du dossier PMI : libellé court au-dessus, valeur en dessous.
 *
 * En lecture il dit « non renseigné » plutôt que de disparaître ; en édition il
 * devient une saisie. C'est le même geste que pour les champs déjà éditables —
 * le rendre visible sans le rendre saisissable ne faisait que la moitié du
 * chemin : Marie voyait ce qui manque sans pouvoir le combler.
 */
function ChampPmi({ label, field, value, section, tonLabel = "text-blue-500", tonValeur = "text-blue-950", placeholder }: {
    label: string
    field: string
    value: string | null | undefined
    section: EditableSection
    tonLabel?: string
    tonValeur?: string
    placeholder?: string
}) {
    return (
        <div>
            <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-0.5", tonLabel)}>{label}</p>
            {section.editing ? (
                <input
                    type="text"
                    value={section.draft[field] ?? ""}
                    onChange={(e) => section.setField(field, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-b border-emerald-300 text-xs font-semibold text-stone-800 focus:border-emerald-500 focus:outline-none"
                />
            ) : (
                <p className={cn("text-xs font-semibold", tonValeur)}>{valeurOu(value)}</p>
            )}
        </div>
    )
}

function DataPointEdit({ icon: Icon, label, field, value, suffix, section }: { icon: any, label: string, field: string, value: any, suffix?: string, section: EditableSection }) {
    if (!section.editing) {
        return <DataPoint icon={Icon} label={label} value={value} suffix={suffix} />
    }
    return (
        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-emerald-200">
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">{label}</div>
                <input
                    type="text"
                    value={section.draft[field] ?? ""}
                    onChange={(e) => section.setField(field, e.target.value)}
                    className="w-full text-sm font-medium text-stone-800 bg-transparent border-b border-emerald-300 focus:outline-none focus:border-emerald-500"
                />
            </div>
        </div>
    )
}

function DataPoint({ icon: Icon, label, value, suffix = "" }: { icon: any, label: string, value: any, suffix?: string }) {
    if (!value && value !== false && value !== 0) return null;
    return (
        <div className="flex items-center gap-3 p-3 bg-stone-50/80 rounded-xl border border-stone-100">
            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-stone-100/50 shrink-0">
                <Icon className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">{label}</div>
                <div className="text-sm font-medium text-stone-800 truncate">{value} {suffix}</div>
            </div>
        </div>
    )
}

function LanguageRow({ lang, sousDes, ingredients }: { lang: string, sousDes: string, ingredients: string }) {
    const showSousDes = hasRealValue(sousDes);
    const showIng = hasRealValue(ingredients);

    if (!showSousDes && !showIng) return null;

    return (
        <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-stone-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="font-bold text-sm text-emerald-800 bg-emerald-50 h-10 w-10 flex items-center justify-center rounded-xl border border-emerald-100 shrink-0">
                {lang}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
                {showSousDes && (
                    <div>
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">Sous-Dénomination</div>
                        <div className="text-sm font-semibold text-stone-800">{sousDes}</div>
                    </div>
                )}
                {showIng && (
                    <div>
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">Ingrédients (QUID)</div>
                        <div className="text-sm text-stone-600 leading-relaxed font-medium">{ingredients}</div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function EtiquetteClient({ labelData, recette, versions = [], documentsSource = [], nbFiches = 1 }: { labelData: any; recette: RecetteAgentOutput | null; versions?: any[]; documentsSource?: DocumentSourceVue[]; nbFiches?: number }) {
    // State
    const router = useRouter()
    const [syntheseDet, setSyntheseDet] = useState<SousResultatAudit | null>(null)
    const [syntheseVis, setSyntheseVis] = useState<SousResultatAudit | null>(null)
    // Full audit results lifted here so they survive tab switches (the tab content
    // unmounts on switch). Reset only when the user leaves the fiche (this client
    // unmounts) or relaunches an analysis. In-memory, no DB persistence.
    const [auditDetData, setAuditDetData] = useState<AuditDeterministeResult | null>(null)
    const [auditVisData, setAuditVisData] = useState<AuditVisuelTexteResult | null>(null)
    const [allegChoisie, setAllegChoisie] = useState<string | null>(labelData.allegationChoisie ?? null)
    const [allegSaving, setAllegSaving] = useState<string | null>(null)

    // Editable-fiche phase 2 — Mentions Légales (reference instance of the pattern).
    const mentionsSection = useEditableSection({
        table: "fiche",
        entityId: labelData.id,
        ficheId: labelData.id,
        champs: {
            mentionConservation: labelData.mentionConservation,
            mentionFabricant: labelData.mentionFabricant,
        },
    })

    // Editable title — produit field (denominationFr). Renames the product in place.
    const titreSection = useEditableSection({
        table: "produit",
        entityId: labelData.produitId,
        ficheId: labelData.id,
        champs: { denominationFr: labelData.title },
    })

    // Editable model reference — produit field (codePf), the authoritative product
    // identity across the app. Lets Marie replace the app-assigned IMP-… placeholder
    // with the real code (e.g. MT2806). Renames the product in place (all its fiches).
    const dossierSection = useEditableSection({
        table: "produit",
        entityId: labelData.produitId,
        ficheId: labelData.id,
        champs: { codePf: labelData.codePf, sousGamme: labelData.sousGamme },
    })

    // Editable label code — fiche field. Il identifie le BAT (ETCRA2372V6) et
    // n'était affiché nulle part : les 178 fiches du catalogue sont vides, donc
    // le point 15.1 réclame une saisie que l'écran ne permettait pas.
    const codeEtiquetteSection = useEditableSection({
        table: "fiche",
        entityId: labelData.id,
        ficheId: labelData.id,
        champs: { codeEtiquette: labelData.code },
    })

    // Déclinaisons prévues — champ produit, avec son propre bouton comme chaque
    // bloc éditable de la page.
    const declinaisonsSection = useEditableSection({
        table: "produit",
        entityId: labelData.produitId,
        ficheId: labelData.id,
        champs: { declinaisons: labelData.declinaisons },
    })

    // Le repli de chaque carte du dossier, et ce qu'il reste à renseigner
    // dedans : c'est la seule chose qu'une carte repliée doit continuer à dire.
    const cartes = {
        identite: {
            ...useRepli("identite"),
            vides: compterVides([
                labelData.typeTheFr, labelData.origine, labelData.conditionnement, labelData.poidsNet,
                labelData.mentionEcocert, labelData.infoProducteur, labelData.origineMpa,
                labelData.epoqueRecolte, labelData.techniqueRecolte, labelData.grade,
                Array.isArray(labelData.labelsMP) && labelData.labelsMP.length > 0 ? "x" : null,
            ]),
        },
        preparation: {
            ...useRepli("preparation"),
            vides: compterVides([labelData.tempsInfusion, labelData.tempInfusion, labelData.nbTasses]),
        },
        vigilance: {
            ...useRepli("vigilance"),
            vides: compterVides([labelData.allergenes, labelData.allegationsSanteFr]),
        },
        degustation: {
            ...useRepli("degustation"),
            vides: compterVides([
                labelData.degustation?.feuillesSechesAspect, labelData.degustation?.feuillesSechesCouleur,
                labelData.degustation?.feuillesSechesSenteur, labelData.degustation?.feuillesInfuseesAspect,
                labelData.degustation?.feuillesInfuseesCouleur, labelData.degustation?.feuillesInfuseesSenteur,
                labelData.degustation?.infusionAspectCouleur, labelData.degustation?.infusionParfum,
                labelData.degustation?.saveurBouche,
            ]),
        },
        documentaire: {
            ...useRepli("documentaire"),
            vides: compterVides([
                labelData.texteCommercialFr, labelData.phraseWftoFr,
                labelData.sousDesignationFr, labelData.declinaisons,
            ]),
        },
        mentions: {
            ...useRepli("mentions"),
            vides: compterVides([labelData.mentionConservation, labelData.mentionFabricant]),
        },
    }

    // Editable commercial texts (fiche fields).
    const textesSection = useEditableSection({
        table: "fiche",
        entityId: labelData.id,
        ficheId: labelData.id,
        champs: {
            texteCommercialFr: labelData.texteCommercialFr,
            phraseWftoFr: labelData.phraseWftoFr,
        },
    })

    // Editable identity (produit fields).
    const identiteSection = useEditableSection({
        table: "produit",
        entityId: labelData.produitId,
        ficheId: labelData.id,
        champs: {
            typeTheFr: labelData.typeTheFr,
            origine: labelData.origine,
            conditionnement: labelData.conditionnement,
            poidsNet: labelData.poidsNet,
            mentionEcocert: labelData.mentionEcocert,
            origineMpa: labelData.origineMpa,
            epoqueRecolte: labelData.epoqueRecolte,
            techniqueRecolte: labelData.techniqueRecolte,
            grade: labelData.grade,
            // Deux valeurs non textuelles, mises à plat pour le formulaire :
            // l'action serveur les reconvertit avant d'écrire.
            volumineux: labelData.volumineux === null || labelData.volumineux === undefined ? "" : String(labelData.volumineux),
            labelsMP: Array.isArray(labelData.labelsMP) ? labelData.labelsMP.join(", ") : "",
        },
    })

    // Editable preparation (produit fields).
    const prepSection = useEditableSection({
        table: "produit",
        entityId: labelData.produitId,
        ficheId: labelData.id,
        champs: {
            tempsInfusion: labelData.tempsInfusion,
            tempInfusion: labelData.tempInfusion,
            nbTasses: labelData.nbTasses,
        },
    })

    // Editable quality vigilance (fiche fields).
    const vigilanceSection = useEditableSection({
        table: "fiche",
        entityId: labelData.id,
        ficheId: labelData.id,
        champs: {
            allergenes: labelData.allergenes,
            allegationsSanteFr: labelData.allegationsSanteFr,
        },
    })

    // Editable ingredient list FR (fiche field).
    // Editable organoleptic grid (dégustation table — upserted if absent).
    const deg = labelData.degustation
    const degustationSection = useEditableSection({
        table: "degustation",
        entityId: deg?.id ?? null,
        produitId: labelData.produitId,
        ficheId: labelData.id,
        champs: {
            dateDegustation: deg?.dateDegustation ?? null,
            numeroDeLot: deg?.numeroDeLot ?? null,
            momentDegustation: deg?.momentDegustation ?? null,
            poidsInfuse: deg?.poidsInfuse ?? null,
            temperatureDegustation: deg?.temperatureDegustation ?? null,
            tempsDegustation: deg?.tempsDegustation ?? null,
            feuillesSechesAspect: deg?.feuillesSechesAspect ?? null,
            feuillesSechesCouleur: deg?.feuillesSechesCouleur ?? null,
            feuillesSechesSenteur: deg?.feuillesSechesSenteur ?? null,
            feuillesInfuseesAspect: deg?.feuillesInfuseesAspect ?? null,
            feuillesInfuseesCouleur: deg?.feuillesInfuseesCouleur ?? null,
            feuillesInfuseesSenteur: deg?.feuillesInfuseesSenteur ?? null,
            infusionAspectCouleur: deg?.infusionAspectCouleur ?? null,
            infusionParfum: deg?.infusionParfum ?? null,
            saveurBouche: deg?.saveurBouche ?? null,
        },
    })

    // Save the fiche's current state as a new version snapshot.
    const [savingVersion, setSavingVersion] = useState(false)
    const recetteRef = useRef<RecetteCalculatorHandle>(null)
    const sauvegarder = async () => {
        const resume = window.prompt(
            "Nom / note de cette version (optionnel) — ex. « avant changement règle additifs 2026 ». Annuler = ne pas sauvegarder.",
            ""
        )
        if (resume === null) return // annulé
        setSavingVersion(true)
        try {
            // Persist the recette first (if its tab is mounted) so the version
            // snapshot captures it. The fiche save proceeds either way (decision Q2).
            let recetteNote = ""
            if (recetteRef.current) {
                try {
                    const r = await recetteRef.current.persister()
                    recetteNote = r.saved
                        ? " Recette enregistrée."
                        : ` Recette non enregistrée : ${r.reason}.`
                } catch {
                    recetteNote = " Recette : échec d'enregistrement."
                }
            }
            const res = await sauvegarderVersionAction({ ficheId: labelData.id, resume })
            toast.success(`Version ${res.numeroVersion} enregistrée`, {
                description: "L'état complet de la fiche est archivé." + recetteNote,
            })
            router.refresh()
        } catch (e) {
            toast.error("Échec de l'enregistrement de la version", {
                description: e instanceof Error ? e.message : undefined,
            })
        } finally {
            setSavingVersion(false)
        }
    }

    // Duplicate this fiche into a brand-new product + fiche + recette.
    const [duplicating, setDuplicating] = useState(false)
    const dupliquer = async () => {
        const nouveauTitre = window.prompt("Titre de la nouvelle fiche :", labelData.title)
        if (!nouveauTitre || !nouveauTitre.trim()) return
        setDuplicating(true)
        try {
            const res = await dupliquerFicheAction({ ficheId: labelData.id, nouveauTitre: nouveauTitre.trim() })
            toast.success("Nouvelle fiche créée", { description: nouveauTitre.trim() })
            router.push(`/etiquettes/${res.nouvelleFicheId}`)
        } catch (e) {
            toast.error("Échec de la duplication", {
                description: e instanceof Error ? e.message : undefined,
            })
        } finally {
            setDuplicating(false)
        }
    }

    const choisirAllegation = async (opt: { libelle: string; nbTasses?: string }) => {
        setAllegSaving(opt.libelle)
        try {
            await choisirAllegationAction({
                ficheId: labelData.id,
                libelle: opt.libelle,
                nbTasses: opt.nbTasses ?? null,
            })
            setAllegChoisie(opt.libelle)
            toast.success("Allégation validée", { description: opt.libelle })
            router.refresh()
        } catch (e) {
            toast.error("Échec de l'enregistrement", {
                description: e instanceof Error ? e.message : undefined,
            })
        } finally {
            setAllegSaving(null)
        }
    }

    // Derived States
    const hasAllergen = hasRealValue(labelData.allergenes);
    const hasAllegation = hasRealValue(labelData.allegationsSanteFr);
    const hasAllegationsPossibles =
        Array.isArray(labelData.allegationsPossibles) && labelData.allegationsPossibles.length > 0;
    const hasVigilance = hasAllergen || hasAllegation || hasAllegationsPossibles;
    const hasDegustation = !!labelData.degustation && (
        labelData.degustation.feuillesSechesAspect ||
        labelData.degustation.infusionParfum ||
        labelData.degustation.saveurBouche
    );

    // Fichiers BAT uploadés par Fabrice depuis Minio
    const pdfFiles: { url: string; name: string; cleS3: string }[] = labelData.pdfFiles || [];

    // Pré-remplissage calculatrice (SPEC-03b §2) : on privilégie la liste QUID si
    // elle porte des %, sinon la liste extraite simplifiée (désignations seules).
    const ingredientsExtraits = /\d\s*%/.test(labelData.ingredientsFr ?? "")
        ? labelData.ingredientsFr
        : labelData.ingredientsSuggestion;


    return (
        // `data-wide` : cette page demande au layout de desserrer sa laisse de
        // 1280 px, sans quoi le `max-w-[1600px]` ci-dessous ne sert à rien.
        <div data-wide className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4 max-w-[1600px] mx-auto pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-stone-200/50 shadow-sm">
                <div className="flex flex-col gap-2">
                    <Link
                        href="/etiquettes"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-emerald-700 transition-colors w-fit -ml-1"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Retour au pipeline
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-stone-500 font-medium">
                        <Badge variant="outline" className="bg-stone-100 border-none text-stone-600 hover:bg-stone-200 cursor-pointer transition-colors">Étiquettes</Badge>
                        <ChevronRight className="h-3 w-3" />
                        {dossierSection.editing ? (
                            <span className="inline-flex items-center gap-1.5">
                                <span className="text-emerald-700/70">CodePF :</span>
                                <input
                                    type="text"
                                    value={dossierSection.draft.codePf ?? ""}
                                    onChange={(e) => dossierSection.setField("codePf", e.target.value)}
                                    placeholder="Code PF (ex. MT265)"
                                    className="bg-white rounded-md border border-emerald-300 px-2 py-0.5 text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 w-48"
                                />
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <span className="text-emerald-700/70">CodePF :</span>
                                <span className="font-mono font-semibold text-emerald-800">{labelData.codePf}</span>
                            </span>
                        )}
                        <EditButtons section={dossierSection} />
                        <ChevronRight className="h-3 w-3" />
                        {codeEtiquetteSection.editing ? (
                            <span className="inline-flex items-center gap-1.5">
                                <span className="text-stone-500">Code étiquette :</span>
                                <input
                                    type="text"
                                    value={codeEtiquetteSection.draft.codeEtiquette ?? ""}
                                    onChange={(e) => codeEtiquetteSection.setField("codeEtiquette", e.target.value.toUpperCase())}
                                    placeholder="ex. ETCRA2372V6"
                                    className="bg-white rounded-md border border-stone-300 px-2 py-0.5 text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300 w-52 font-mono"
                                />
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 bg-stone-100 px-2 py-0.5 rounded-md">
                                <span className="text-stone-500">Code étiquette :</span>
                                {labelData.code ? (
                                    <span className="font-mono font-semibold text-stone-700">{labelData.code}</span>
                                ) : (
                                    <span className="italic text-stone-400">non renseigné</span>
                                )}
                            </span>
                        )}
                        <EditButtons section={codeEtiquetteSection} />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {titreSection.editing ? (
                            <input
                                type="text"
                                value={titreSection.draft.denominationFr ?? ""}
                                onChange={(e) => titreSection.setField("denominationFr", e.target.value)}
                                placeholder="Titre du produit"
                                className="text-3xl font-bold tracking-tight text-emerald-950 bg-white rounded-xl border border-emerald-300 px-3 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-300 min-w-[20rem]"
                            />
                        ) : (
                            <h1 className="text-3xl font-bold tracking-tight text-emerald-950">
                                {labelData.title}
                            </h1>
                        )}
                        <StatutSelect ficheId={labelData.id} statut={labelData.status} />
                        <EditButtons section={titreSection} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-white border-stone-200 text-stone-600 font-medium">
                            Gamme: <span className="text-stone-900 ml-1">{labelData.gamme}</span>
                        </Badge>
                        <Badge variant="outline" className="bg-white border-stone-200 text-stone-600 font-medium">
                            Sous-Gamme:{" "}
                            {dossierSection.editing ? (
                                <input
                                    type="text"
                                    value={dossierSection.draft.sousGamme ?? ""}
                                    onChange={(e) => dossierSection.setField("sousGamme", e.target.value)}
                                    placeholder="sous-gamme"
                                    className="ml-1 w-32 bg-transparent border-b border-emerald-300 text-stone-900 focus:border-emerald-500 focus:outline-none"
                                />
                            ) : (
                                <span className="text-stone-900 ml-1">{valeurOu(labelData.sousGamme)}</span>
                            )}
                        </Badge>
                        <span className="text-stone-300 mx-1">•</span>
                        <span className="text-sm font-medium text-stone-500 flex items-center gap-1.5 border border-stone-100 bg-stone-50 px-2 py-0.5 rounded-md">
                            <Clock className="h-3.5 w-3.5" /> Modifié le {labelData.date ?? 'N/A'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <ReintegrerDocumentMenu ficheId={labelData.id} />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={sauvegarder}
                        disabled={savingVersion}
                        title="Archive l'état complet de la fiche comme une version (historique)"
                        className="bg-white hover:bg-stone-50 border-stone-200 shadow-sm rounded-xl font-medium"
                    >
                        {savingVersion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Sauvegarder
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={dupliquer}
                        disabled={duplicating}
                        className="bg-white hover:bg-stone-50 border-stone-200 shadow-sm rounded-xl font-medium"
                    >
                        {duplicating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                        Dupliquer
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-700/20 text-white rounded-xl font-medium">
                        Mettre à disposition
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="dossier" className="w-full">
                <TabsList className="bg-stone-100/80 p-1 w-full md:w-auto inline-flex rounded-2xl mb-6 border border-stone-200/60 shadow-inner">
                    <TabsTrigger value="dossier" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm transition-all text-stone-500 font-semibold whitespace-nowrap px-6 py-2">
                        <ScrollText className="w-4 h-4 mr-2" /> Dossier Produit
                    </TabsTrigger>
                    <TabsTrigger value="recette" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm transition-all text-stone-500 font-semibold whitespace-nowrap px-6 py-2">
                        <FlaskConical className="w-4 h-4 mr-2" /> Recette / QUID
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm transition-all text-stone-500 font-semibold whitespace-nowrap px-6 py-2">
                        <Bot className="w-4 h-4 mr-2" /> Audit IA
                    </TabsTrigger>

                    <TabsTrigger value="historique" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm transition-all text-stone-500 font-semibold whitespace-nowrap px-6 py-2">
                        <History className="w-4 h-4 mr-2" /> Historique
                        {versions.length > 0 && <span className="ml-2 text-[10px] bg-stone-200 text-stone-600 rounded-full px-1.5 py-0.5">{versions.length}</span>}
                    </TabsTrigger>
                </TabsList>

                {/* 1. DOSSIER PRODUIT (Merged Tab) */}
                <TabsContent value="dossier" className="mt-0 focus-visible:outline-none">
                    {/* Une seule colonne, un seul ordre de lecture.
                        Les deux colonnes du bento n'appariaient rien : elles
                        répartissaient pour remplir, laissaient le bas de page en
                        dents de scie, et personne ne savait s'il fallait lire en
                        colonnes ou en zigzag. */}
                    <div className="space-y-6">
                        <div className="space-y-6">

                            {/* Card: Identité & Origine */}
                            <Card className="border border-emerald-200/60 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden rounded-3xl">
                                <CardHeader className="bg-emerald-500/10 border-b border-emerald-100 pb-4">
                                    <CardTitle className="text-lg font-bold text-emerald-950 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="p-1 h-7 w-7 rounded-lg bg-emerald-100 border-none flex items-center justify-center">
                                                <Globe2 className="h-4 w-4 text-emerald-700" />
                                            </Badge>
                                            Identité & Sourcing
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <EditButtons section={identiteSection} />
                                            <BoutonRepli ouvert={cartes.identite.ouvert} basculer={cartes.identite.basculer} vides={cartes.identite.vides} ton="text-emerald-600/70" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                {cartes.identite.ouvert && (
                                <CardContent className="p-5">
                                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                        <DataPointEdit section={identiteSection} icon={Leaf} label="Type de Thé" field="typeTheFr" value={labelData.typeTheFr} />
                                        <DataPointEdit section={identiteSection} icon={Globe2} label="Origine" field="origine" value={labelData.origine || "Non spécifiée"} />
                                        <DataPointEdit section={identiteSection} icon={Package} label="Conditionnement" field="conditionnement" value={labelData.conditionnement} />
                                        <DataPointEdit section={identiteSection} icon={AlignLeft} label="Poids Net" field="poidsNet" value={labelData.poidsNet} suffix="g" />
                                    </div>

                                    {/* La coche verte AFFIRME une certification : sans valeur,
                                        l'encart reste neutre plutôt que de la suggérer. */}
                                    <div className={cn("mt-4 p-3.5 rounded-xl border flex items-start gap-3", hasRealValue(labelData.mentionEcocert) ? "bg-emerald-50 border-emerald-100/50" : "bg-stone-50 border-stone-100")}>
                                        {hasRealValue(labelData.mentionEcocert)
                                            ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                            : <MinusCircle className="h-5 w-5 text-stone-300 shrink-0 mt-0.5" />}
                                        <div>
                                            <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-0.5", hasRealValue(labelData.mentionEcocert) ? "text-emerald-800" : "text-stone-400")}>Certification Active</p>
                                            {identiteSection.editing ? (
                                                <input
                                                    type="text"
                                                    value={identiteSection.draft.mentionEcocert ?? ""}
                                                    onChange={(e) => identiteSection.setField("mentionEcocert", e.target.value)}
                                                    placeholder="ex. FR-BIO-01"
                                                    className="w-full bg-transparent border-b border-emerald-300 text-sm font-semibold text-stone-800 focus:border-emerald-500 focus:outline-none"
                                                />
                                            ) : (
                                                <p className={cn("text-sm font-semibold", hasRealValue(labelData.mentionEcocert) ? "text-emerald-950" : "text-stone-500")}>{valeurOu(labelData.mentionEcocert)}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                                            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5"><Globe2 className="w-3 h-3" /> Détails Producteur & MPA</h4>
                                            <div className="space-y-2">
                                                <p className="text-xs text-stone-600"><span className="font-bold text-stone-800">Producteur:</span> {valeurOu(labelData.infoProducteur)} {labelData.typeProducteur && `(${labelData.typeProducteur})`}</p>
                                                {identiteSection.editing ? (
                                                    <ChampPmi section={identiteSection} label="Origine MPA" field="origineMpa" value={labelData.origineMpa} tonLabel="text-stone-400" tonValeur="text-stone-700" />
                                                ) : (
                                                    <p className="text-xs text-stone-600"><span className="font-bold text-stone-800">Origine MPA:</span> {valeurOu(labelData.origineMpa)}</p>
                                                )}
                                            </div>
                                        </div>

                                    {/* NOUVEAU: Données Brutes PMI Extensives */}
                                    <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 grid grid-cols-2 gap-3 lg:grid-cols-4">
                                            <ChampPmi section={identiteSection} label="Époque Récolte" field="epoqueRecolte" value={labelData.epoqueRecolte} />
                                            <ChampPmi section={identiteSection} label="Technique" field="techniqueRecolte" value={labelData.techniqueRecolte} />
                                            <ChampPmi section={identiteSection} label="Grade / Granulométrie" field="grade" value={labelData.grade} />
                                            <div>
                                                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Volumineux</p>
                                                {identiteSection.editing ? (
                                                    // Trois états, pas deux : vide veut dire « non renseigné »,
                                                    // ce qui n'est pas la même chose que « non ».
                                                    <select
                                                        value={identiteSection.draft.volumineux ?? ""}
                                                        onChange={(e) => identiteSection.setField("volumineux", e.target.value)}
                                                        className="w-full bg-transparent border-b border-emerald-300 text-xs font-semibold text-stone-800 focus:border-emerald-500 focus:outline-none"
                                                    >
                                                        <option value="">non renseigné</option>
                                                        <option value="true">Oui</option>
                                                        <option value="false">Non</option>
                                                    </select>
                                                ) : labelData.volumineux === null || labelData.volumineux === undefined ? (
                                                    <p className="text-xs font-semibold text-blue-950"><NonRenseigne /></p>
                                                ) : (
                                                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 uppercase border-none", labelData.volumineux ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800")}>
                                                        {labelData.volumineux ? "OUI" : "NON"}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Labels matière première</span>
                                        {identiteSection.editing ? (
                                            <input
                                                type="text"
                                                value={identiteSection.draft.labelsMP ?? ""}
                                                onChange={(e) => identiteSection.setField("labelsMP", e.target.value)}
                                                placeholder="AB, FLO, MH — séparés par des virgules"
                                                className="min-w-[16rem] flex-1 bg-transparent border-b border-emerald-300 text-xs font-semibold text-stone-800 focus:border-emerald-500 focus:outline-none"
                                            />
                                        ) : Array.isArray(labelData.labelsMP) && labelData.labelsMP.length > 0 ? (
                                            labelData.labelsMP.map((lbl: string, i: number) => (
                                                <Badge key={i} variant="outline" className="bg-white border-stone-200 text-[10px] text-stone-600 font-bold">{lbl}</Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs"><NonRenseigne /></span>
                                        )}
                                    </div>
                                </CardContent>
                                )}
                            </Card>

                            {/* Card: Préparation */}
                            <Card className="border border-amber-200/60 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden rounded-3xl">
                                <CardHeader className="bg-amber-500/10 border-b border-amber-100 pb-4">
                                    <CardTitle className="text-lg font-bold text-emerald-950 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="p-1 h-7 w-7 rounded-lg bg-orange-100 border-none flex items-center justify-center">
                                                <Coffee className="h-4 w-4 text-orange-700" />
                                            </Badge>
                                            Conseils de Préparation
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <EditButtons section={prepSection} />
                                            <BoutonRepli ouvert={cartes.preparation.ouvert} basculer={cartes.preparation.basculer} vides={cartes.preparation.vides} ton="text-orange-600/70" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                {cartes.preparation.ouvert && (
                                <CardContent className="p-5">
                                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                        <DataPointEdit section={prepSection} icon={Clock} label="Infusion" field="tempsInfusion" value={labelData.tempsInfusion} suffix="min" />
                                        <DataPointEdit section={prepSection} icon={Thermometer} label="Température" field="tempInfusion" value={labelData.tempInfusion} suffix="°C" />
                                        <DataPointEdit section={prepSection} icon={Coffee} label="Tasses / Cuillères" field="nbTasses" value={labelData.nbTasses} />
                                        <DataPoint icon={Info} label="Plusieurs Infusions" value={labelData.plusieursInfusions ? "Oui" : "Non"} />
                                    </div>
                                </CardContent>
                                )}
                            </Card>

                            {/* Card: Alertes Qualité — toujours visible, état vide explicite si rien à signaler */}
                            <Card className="border border-orange-200/60 bg-gradient-to-br from-white to-orange-50/30 shadow-sm overflow-hidden rounded-3xl relative">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                                        <ShieldAlert className="w-32 h-32 text-orange-900" />
                                    </div>
                                    <CardHeader className="bg-orange-50/50 border-b border-orange-100/50 pb-4 relative z-10">
                                        <CardTitle className="text-lg font-bold text-orange-950 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <ShieldAlert className="h-5 w-5 text-orange-600" />
                                                Points de Vigilance Qualité
                                            </div>
                                            <div className="flex items-center gap-1">
                                            <EditButtons section={vigilanceSection} />
                                            <BoutonRepli ouvert={cartes.vigilance.ouvert} basculer={cartes.vigilance.basculer} vides={cartes.vigilance.vides} ton="text-orange-600/70" />
                                        </div>
                                        </CardTitle>
                                    </CardHeader>
                                    {cartes.vigilance.ouvert && (
                                    <CardContent className="p-5 space-y-4 relative z-10">
                                        {!vigilanceSection.editing && !hasVigilance && (
                                            <EmptyState
                                                icon={ShieldAlert}
                                                label="Aucun allergène ni allégation renseigné pour ce produit."
                                            />
                                        )}
                                        {(vigilanceSection.editing || hasAllergen) && (
                                            <div className="p-4 bg-white rounded-2xl border border-orange-200/60 shadow-[0_2px_10px_-4px_rgba(251,146,60,0.3)] flex items-start gap-3">
                                                <div className="bg-orange-100 p-1.5 rounded-lg">
                                                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[11px] font-bold text-orange-800 uppercase tracking-widest mb-1">Allergènes Déclarés</h4>
                                                    <EditableText section={vigilanceSection} field="allergenes" value={labelData.allergenes} placeholder="Aucun allergène déclaré." multiline className="text-sm font-semibold text-orange-950" />
                                                </div>
                                            </div>
                                        )}
                                        {(vigilanceSection.editing || hasAllegation) && (
                                            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm flex items-start gap-3">
                                                <div className="bg-stone-100 p-1.5 rounded-lg">
                                                    <Info className="h-4 w-4 text-stone-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-1">Allégations de Santé</h4>
                                                    <EditableText section={vigilanceSection} field="allegationsSanteFr" value={labelData.allegationsSanteFr} placeholder="Aucune allégation santé renseignée." multiline className="text-sm font-medium text-stone-800 italic" />
                                                </div>
                                            </div>
                                        )}
                                        {hasAllegationsPossibles && (
                                            <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 flex flex-col gap-3">
                                                <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Options d&apos;allégations extraites</h4>
                                                <div className="grid gap-2" role="radiogroup" aria-label="Allégation santé">
                                                    {labelData.allegationsPossibles.map((opt: any, i: number) => {
                                                        const selected = allegChoisie === opt.libelle;
                                                        const saving = allegSaving === opt.libelle;
                                                        return (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                role="radio"
                                                                aria-checked={selected}
                                                                disabled={!!allegSaving}
                                                                onClick={() => choisirAllegation(opt)}
                                                                className={cn(
                                                                    "w-full text-left p-3 rounded-xl border shadow-sm flex items-center justify-between transition-colors disabled:opacity-60",
                                                                    selected
                                                                        ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300"
                                                                        : "bg-white border-emerald-100 hover:border-emerald-300"
                                                                )}
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-bold text-emerald-950 uppercase tracking-tight">{opt.libelle}</p>
                                                                    <p className="text-xs text-emerald-600 font-medium">{opt.nbTasses}</p>
                                                                </div>
                                                                {saving ? (
                                                                    <Loader2 className="h-5 w-5 text-emerald-500 animate-spin shrink-0" />
                                                                ) : (
                                                                    <span className={cn(
                                                                        "h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                                                                        selected ? "border-emerald-500 bg-emerald-500" : "border-emerald-200"
                                                                    )}>
                                                                        {selected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                    )}
                                </Card>
                        </div>

                        {/* RIGHT COLUMN: Texts & Translations */}
                        <div className="space-y-6">

                            {/* Card: Déclarations Légales par Langue */}
                            <Card className="border border-blue-200/60 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden rounded-3xl flex flex-col">

                                {/* Grille Organoleptique (Dégustation) — éditable, toujours visible */}
                                <div className="bg-stone-50/50 border-b border-stone-100 p-6 flex flex-col gap-5">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                                            <Badge variant="outline" className="p-1 h-7 w-7 rounded-lg bg-pink-100 border-none flex items-center justify-center">
                                                <Eye className="h-4 w-4 text-pink-700" />
                                            </Badge>
                                            Grille Organoleptique & Dégustation
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            {!degustationSection.editing && deg && (
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-stone-500 uppercase">
                                                    <span>{deg.degustateur?.length ? deg.degustateur.join(", ") : "Comité"}</span> •
                                                    <span>{deg.dateDegustation || "Date non précisée"}</span>
                                                </div>
                                            )}
                                            <EditButtons section={degustationSection} />
                                            <BoutonRepli ouvert={cartes.degustation.ouvert} basculer={cartes.degustation.basculer} vides={cartes.degustation.vides} ton="text-pink-600/70" />
                                        </div>
                                    </div>
                                    {cartes.degustation.ouvert && (<>

                                    {degustationSection.editing ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="bg-white rounded-2xl border border-stone-200/60 p-4 space-y-2">
                                                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Feuilles Sèches</h4>
                                                    <DegField section={degustationSection} field="feuillesSechesAspect" label="Aspect" value={deg?.feuillesSechesAspect} />
                                                    <DegField section={degustationSection} field="feuillesSechesCouleur" label="Couleur" value={deg?.feuillesSechesCouleur} />
                                                    <DegField section={degustationSection} field="feuillesSechesSenteur" label="Senteur / Nez" value={deg?.feuillesSechesSenteur} />
                                                </div>
                                                <div className="bg-emerald-50/30 rounded-2xl border border-emerald-100/60 p-4 space-y-2">
                                                    <h4 className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest">Feuilles Infusées</h4>
                                                    <DegField section={degustationSection} field="feuillesInfuseesAspect" label="Aspect" value={deg?.feuillesInfuseesAspect} />
                                                    <DegField section={degustationSection} field="feuillesInfuseesCouleur" label="Couleur" value={deg?.feuillesInfuseesCouleur} />
                                                    <DegField section={degustationSection} field="feuillesInfuseesSenteur" label="Senteur / Nez" value={deg?.feuillesInfuseesSenteur} />
                                                </div>
                                                <div className="bg-amber-50/50 rounded-2xl border border-amber-200/60 p-4 space-y-2">
                                                    <h4 className="text-xs font-bold text-amber-700/70 uppercase tracking-widest">En Tasse (Liqueur)</h4>
                                                    <DegField section={degustationSection} field="infusionAspectCouleur" label="Aspect & Couleur" value={deg?.infusionAspectCouleur} />
                                                    <DegField section={degustationSection} field="infusionParfum" label="Parfum" value={deg?.infusionParfum} />
                                                    <DegField section={degustationSection} field="saveurBouche" label="Saveur en bouche" value={deg?.saveurBouche} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-white rounded-2xl border border-stone-200/60 p-4">
                                                <DegField section={degustationSection} field="dateDegustation" label="Date" value={deg?.dateDegustation} />
                                                <DegField section={degustationSection} field="momentDegustation" label="Moment" value={deg?.momentDegustation} />
                                                <DegField section={degustationSection} field="numeroDeLot" label="N° de lot" value={deg?.numeroDeLot} />
                                                <DegField section={degustationSection} field="poidsInfuse" label="Poids infusé" value={deg?.poidsInfuse} />
                                                <DegField section={degustationSection} field="temperatureDegustation" label="Température" value={deg?.temperatureDegustation} />
                                                <DegField section={degustationSection} field="tempsDegustation" label="Temps" value={deg?.tempsDegustation} />
                                            </div>
                                        </div>
                                    ) : !hasDegustation ? (
                                        <EmptyState icon={Eye} label="Grille organoleptique non renseignée pour cette fiche." />
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* Feuilles Sèches */}
                                            <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-4 space-y-3">
                                                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5" /> Feuilles Sèches</h4>
                                                <div className="space-y-2">
                                                    <div><span className="text-[10px] font-bold text-stone-400 uppercase">Aspect</span><p className="text-sm text-stone-800 font-medium italic">{valeurOu(labelData.degustation.feuillesSechesAspect)}</p></div>
                                                    <div><span className="text-[10px] font-bold text-stone-400 uppercase">Couleur</span><p className="text-sm text-stone-800 font-medium italic">{valeurOu(labelData.degustation.feuillesSechesCouleur)}</p></div>
                                                    <div className="pt-1 border-t border-stone-100"><span className="text-[10px] font-bold text-pink-500 uppercase flex items-center gap-1"><Wind className="w-3 h-3" /> Senteur / Nez</span><p className="text-sm text-stone-800 font-medium italic">{valeurOu(labelData.degustation.feuillesSechesSenteur)}</p></div>
                                                </div>
                                            </div>

                                            {/* Feuilles Infusées */}
                                            <div className="bg-emerald-50/30 rounded-2xl border border-emerald-100/60 shadow-sm p-4 space-y-3">
                                                <h4 className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5" /> Feuilles Infusées</h4>
                                                <div className="space-y-2">
                                                    <div><span className="text-[10px] font-bold text-emerald-600/60 uppercase">Aspect</span><p className="text-sm text-emerald-950 font-medium italic">{valeurOu(labelData.degustation.feuillesInfuseesAspect)}</p></div>
                                                    <div><span className="text-[10px] font-bold text-emerald-600/60 uppercase">Couleur</span><p className="text-sm text-emerald-950 font-medium italic">{valeurOu(labelData.degustation.feuillesInfuseesCouleur)}</p></div>
                                                    <div className="pt-1 border-t border-emerald-200/50"><span className="text-[10px] font-bold text-pink-500 uppercase flex items-center gap-1"><Wind className="w-3 h-3" /> Senteur / Nez</span><p className="text-sm text-emerald-950 font-medium italic">{valeurOu(labelData.degustation.feuillesInfuseesSenteur)}</p></div>
                                                </div>
                                            </div>

                                            {/* Tasse / Résultat Final */}
                                            <div className="bg-amber-50/50 rounded-2xl border border-amber-200/60 shadow-sm p-4 space-y-3">
                                                <h4 className="text-xs font-bold text-amber-700/70 uppercase tracking-widest flex items-center gap-1.5"><Coffee className="w-3.5 h-3.5" /> En Tasse (Liqueur)</h4>
                                                <div className="space-y-2">
                                                    <div><span className="text-[10px] font-bold text-amber-700/60 uppercase">Aspect & Couleur</span><p className="text-sm text-amber-950 font-medium italic">{valeurOu(labelData.degustation.infusionAspectCouleur)}</p></div>
                                                    <div className="pt-1 border-t border-amber-200/50"><span className="text-[10px] font-bold text-amber-700/60 uppercase flex items-center gap-1"><Wind className="w-3 h-3" /> Parfum</span><p className="text-sm text-amber-950 font-medium italic">{valeurOu(labelData.degustation.infusionParfum)}</p></div>
                                                    <div className="pt-1 border-t border-amber-200/50 bg-amber-100/30 -mx-2 px-2 pb-1 rounded-lg"><span className="text-[10px] font-bold text-orange-600 uppercase flex items-center gap-1 pt-1"><Utensils className="w-3 h-3" /> Saveur en bouche</span><p className="text-sm text-amber-950 font-semibold italic">{valeurOu(labelData.degustation.saveurBouche)}</p></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    </>)}
                                </div>

                                <CardHeader className="bg-blue-500/10 border-b border-blue-100 pb-4">
                                    <CardTitle className="text-lg font-bold text-emerald-950 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="p-1 h-7 w-7 rounded-lg bg-stone-200/50 border-none flex items-center justify-center">
                                                <Dna className="h-4 w-4 text-stone-700" />
                                            </Badge>
                                            Base Documentaire & Ingrédients
                                        </div>
                                        <BoutonRepli ouvert={cartes.documentaire.ouvert} basculer={cartes.documentaire.basculer} vides={cartes.documentaire.vides} />
                                    </CardTitle>
                                </CardHeader>
                                {cartes.documentaire.ouvert && (
                                <CardContent className="p-6 flex flex-col gap-6">

                                    {/* Textes Marketing */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold border-b border-stone-100 pb-2 text-stone-800 flex justify-between items-center">
                                            Textes Commerciaux
                                            <EditButtons section={textesSection} />
                                        </h3>
                                        <div className="grid gap-4">
                                            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                                                <Badge variant="outline" className="mb-2 bg-white text-[10px] text-stone-500 font-bold uppercase tracking-widest">Pitch Commercial FR</Badge>
                                                <EditableText
                                                    section={textesSection}
                                                    field="texteCommercialFr"
                                                    value={labelData.texteCommercialFr}
                                                    placeholder="Aucun texte commercial renseigné."
                                                    multiline
                                                    className="text-sm text-stone-700 leading-relaxed"
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                                            <Badge variant="outline" className="mb-2 bg-white text-[10px] text-emerald-700 font-bold uppercase tracking-widest border-emerald-200">Mention WFTO</Badge>
                                            <EditableText
                                                section={textesSection}
                                                field="phraseWftoFr"
                                                value={labelData.phraseWftoFr}
                                                placeholder="Aucune mention WFTO renseignée."
                                                multiline
                                                className="text-sm text-emerald-900 font-medium"
                                            />
                                        </div>

                                        {labelData.ingredientsSuggestion && (
                                            <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/50 shadow-[0_2px_15px_-3px_rgba(245,158,11,0.1)] relative">
                                                <div className="absolute top-4 right-4"><Bot className="w-5 h-5 text-amber-500/30" /></div>
                                                <Badge variant="outline" className="mb-3 bg-white text-[10px] text-amber-700 font-bold uppercase tracking-widest border-amber-200">Suggestion IA Ingrédients</Badge>
                                                <p className="text-sm text-amber-900 font-semibold leading-relaxed tracking-tight">{labelData.ingredientsSuggestion}</p>
                                                <p className="text-[10px] text-amber-600 font-medium mt-3 italic opacity-70">* Liste brute à transformer en formulation légale QUID</p>
                                            </div>
                                        )}

                                        <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 flex items-start gap-3">
                                            <Package className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest mb-0.5">Déclinaisons Prévues</h4>
                                                    <EditButtons section={declinaisonsSection} />
                                                </div>
                                                {declinaisonsSection.editing ? (
                                                    <input
                                                        type="text"
                                                        value={declinaisonsSection.draft.declinaisons ?? ""}
                                                        onChange={(e) => declinaisonsSection.setField("declinaisons", e.target.value)}
                                                        placeholder="ex. infusette cristal JDG courant 2026"
                                                        className="w-full bg-transparent border-b border-emerald-300 text-xs font-medium text-stone-800 focus:border-emerald-500 focus:outline-none"
                                                    />
                                                ) : (
                                                    <p className="text-xs text-indigo-900 font-medium">{valeurOu(labelData.declinaisons)}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dénominations & listes d'ingrédients — read-only,
                                        driven by the Recette / QUID tab (decision 2026-06). */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold border-b border-stone-100 pb-2 text-stone-800">
                                            Dénominations & Listes d'ingrédients
                                        </h3>
                                        <div className="grid gap-3">
                                            {/* Sous-dénomination FR only — the ingredient list now lives in the two derived cards below. */}
                                            <LanguageRow lang="FR" sousDes={labelData.sousDesignationFr} ingredients="" />
                                            <RecetteListeCards recette={recette} ingredientsFr={labelData.ingredientsFr} />
                                        </div>
                                    </div>

                                </CardContent>
                                )}
                            </Card>

                            {/* Card: Mentions Légales */}
                            <Card className="border border-indigo-200/60 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden rounded-3xl flex flex-col">
                                <CardHeader className="bg-indigo-500/10 border-b border-indigo-100 pb-4">
                                    <CardTitle className="text-lg font-bold text-indigo-950 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="p-1 h-7 w-7 rounded-lg bg-indigo-100 border-none flex items-center justify-center">
                                                <ScrollText className="h-4 w-4 text-indigo-700" />
                                            </Badge>
                                            Mentions Légales Obligatoires
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <EditButtons section={mentionsSection} />
                                            <BoutonRepli ouvert={cartes.mentions.ouvert} basculer={cartes.mentions.basculer} vides={cartes.mentions.vides} ton="text-indigo-600/70" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                {cartes.mentions.ouvert && (
                                <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/50">
                                    <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-100/80 shadow-sm">
                                        <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Thermometer className="w-3.5 h-3.5" /> Conservation</div>
                                        <EditableText
                                            section={mentionsSection}
                                            field="mentionConservation"
                                            value={labelData.mentionConservation}
                                            placeholder="A conserver dans un endroit sec, à l'abri de la lumière et de l'humidité."
                                            multiline
                                            className="text-sm font-semibold text-indigo-950 leading-snug"
                                        />
                                    </div>
                                    <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-100/80 shadow-sm">
                                        <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Fabricant</div>
                                        <EditableText
                                            section={mentionsSection}
                                            field="mentionFabricant"
                                            value={labelData.mentionFabricant}
                                            placeholder="LES JARDINS DE GAÏA - Z.A. 67600 Wittisheim - France"
                                            multiline
                                            className="text-sm font-semibold text-indigo-950 leading-snug"
                                        />
                                    </div>
                                </CardContent>
                                )}
                            </Card>

                        </div>
                    </div>

                    {/* SPEC-03 §6 — bloc additif : champs complémentaires + arbitrages */}
                    <div className="mt-6">
                        <DossierComplementaire
                            ficheId={labelData.id}
                            produitId={labelData.produitId}
                            degustationId={labelData.degustation?.id ?? null}
                            floId={labelData.floId}
                            nomLatin={labelData.nomLatin}
                            dateMiseMarche={labelData.dateMiseMarche}
                            labelsClient={labelData.labelsClient}
                            organismeCertificateur={labelData.organismeCertificateur}
                            estAromatise={labelData.estAromatise}
                            fournisseur={labelData.fournisseur}
                            producteurJardin={labelData.producteurJardin}
                            infoProducteur={labelData.infoProducteur}
                            typeProducteur={labelData.typeProducteur}
                            numeroDeLot={labelData.degustation?.numeroDeLot}
                            allegationChoisie={labelData.allegationChoisie}
                            nbTassesAllegation={labelData.nbTassesAllegation}
                        />
                    </div>
                </TabsContent>

                {/* RECETTE / QUID (SPEC-03) */}
                <TabsContent value="recette" className="mt-0 focus-visible:outline-none">
                    <RecettePanel ref={recetteRef} ficheId={labelData.id} produitId={labelData.produitId} recette={recette} ingredientsExtraits={ingredientsExtraits} />
                </TabsContent>

                {/* 2. AUDIT ZONE */}
                <TabsContent value="audit" className="mt-0 focus-visible:outline-none">
                  <div className="space-y-6">
                    <AuditSynthese donnees={syntheseDet} visuel={syntheseVis} />
                    {/* Un seul écran : la liste, l'étiquette à côté, et l'IA en
                        bouton plutôt qu'en second onglet qui disait la même chose. */}
                    <ControleEtiquette
                      ficheId={labelData.id}
                      faces={pdfFiles
                        .filter((f) => /\.pdf$/i.test(f.name))
                        .map((f) => ({ cleS3: f.cleS3, nom: f.name }))}
                      detData={auditDetData}
                      onDetData={setAuditDetData}
                      onDetResult={setSyntheseDet}
                      visData={auditVisData}
                      onVisData={setAuditVisData}
                      onVisResult={setSyntheseVis}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="historique" className="mt-0 focus-visible:outline-none">
                    <div className="space-y-6">
                        <DocumentsSource documents={documentsSource} />
                        <VersionsHistorique versions={versions} />
                        {/* Un produit supprimé garde sa fiche consultable, mais
                            plus aucune action : proposer « Supprimer » sur ce
                            qui est déjà supprimé ne peut mener qu'à une erreur. */}
                        {labelData.archiveLe ? (
                            <div className="rounded-2xl border border-stone-300 bg-stone-50 p-5">
                                <h3 className="text-sm font-bold text-stone-700">
                                    Produit supprimé de l&apos;application
                                </h3>
                                <p className="mt-1 text-xs text-stone-500">
                                    Supprimé le{" "}
                                    {new Date(labelData.archiveLe).toLocaleDateString("fr-FR")}
                                    {labelData.refArchive && (
                                        <> — conservé aux archives sous <span className="font-mono">{labelData.refArchive}</span></>
                                    )}
                                    {labelData.motifArchivage && <> · motif : « {labelData.motifArchivage} »</>}
                                    . Cette fiche reste consultable ; elle ne peut plus être modifiée
                                    depuis le catalogue.
                                </p>
                            </div>
                        ) : (
                            <>
                                <RetraitCatalogue
                                    produitId={labelData.produitId}
                                    codePf={labelData.codePf ?? ""}
                                    denomination={labelData.denominationFr ?? labelData.title ?? ""}
                                    retire={!!labelData.retireLe}
                                />
                                <SupprimerProduit
                                    produitId={labelData.produitId}
                                    codePf={labelData.codePf ?? ""}
                                    denomination={labelData.denominationFr ?? labelData.title ?? ""}
                                    nbFiches={nbFiches}
                                />
                            </>
                        )}
                    </div>
                </TabsContent>

            </Tabs>
        </div>
    )
}
