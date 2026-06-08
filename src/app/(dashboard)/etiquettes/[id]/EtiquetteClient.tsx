"use client"

import { useState } from "react"
import {
    FileText,
    CheckCircle2,
    AlertTriangle,
    Bot,
    FileCheck2,
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
    Copy
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { choisirAllegationAction, dupliquerFicheAction } from "@/app/actions/etiquettes"
import { useEditableSection, EditButtons, EditableText } from "@/components/etiquettes/editable-section"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { RecettePanel } from "@/components/recette/RecettePanel"
import { DossierComplementaire } from "@/components/recette/DossierComplementaire"
import { EmptyState } from "@/components/atoms/empty-state"
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent"

// --- Helper pour vérifier si un champ "vide" Excel contient une vraie valeur
const hasRealValue = (val: string | null | undefined) => {
    if (!val) return false;
    const clean = val.trim().toLowerCase();
    return !['/', 'aucun', 'néant', 'non', 'n/a', 'na', '', '-'].includes(clean);
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

export default function EtiquetteClient({ labelData, recette }: { labelData: any; recette: RecetteAgentOutput | null }) {
    // State
    const router = useRouter()
    const [auditingType, setAuditingType] = useState<string | null>(null)
    const [auditResult, setAuditResult] = useState<any>(null)
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
    const hasWfto = hasRealValue(labelData.phraseWftoFr);
    const hasTexteCom = hasRealValue(labelData.texteCommercialFr);
    const hasAllegationsPossibles =
        Array.isArray(labelData.allegationsPossibles) && labelData.allegationsPossibles.length > 0;
    const hasVigilance = hasAllergen || hasAllegation || hasAllegationsPossibles;
    const hasDegustation = !!labelData.degustation && (
        labelData.degustation.feuillesSechesAspect ||
        labelData.degustation.infusionParfum ||
        labelData.degustation.saveurBouche
    );

    // Fichiers BAT uploadés par Fabrice depuis Minio
    const pdfFiles: { url: string; name: string }[] = labelData.pdfFiles || [];

    // Pré-remplissage calculatrice (SPEC-03b §2) : on privilégie la liste QUID si
    // elle porte des %, sinon la liste extraite simplifiée (désignations seules).
    const ingredientsExtraits = /\d\s*%/.test(labelData.ingredientsFr ?? "")
        ? labelData.ingredientsFr
        : labelData.ingredientsSuggestion;

    const runAudit = async () => {
        setAuditingType('complet')

        const erreur = (description: string) =>
            setAuditResult({
                status: "WARNING",
                issues: [{ type: "API_ERROR", description, severity: "HIGH" }],
                summary: "Erreur technique lors de l'audit.",
            })

        try {
            // Single-fiche, synchronous audit — the route reloads the fiche, runs
            // Mistral + RAG, persists the controls and returns the report.
            const response = await fetch('/api/agents/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ficheIds: [labelData.id] }),
            })

            const data = await response.json()
            const report = data?.data?.[0]

            if (response.ok && report) {
                const controls = report.controls || []
                const issues = controls
                    .filter((c: any) => c.statut !== 'PASS' && c.statut !== 'SKIPPED')
                    .map((c: any) => ({
                        type: c.typeControle,
                        description:
                            (c.justification || '') +
                            (c.suggestionIa ? ` → Suggestion : ${c.suggestionIa}` : ''),
                        severity: c.statut === 'FAIL' ? 'HIGH' : 'MEDIUM',
                    }))
                setAuditResult({
                    status: report.overallStatus,
                    issues,
                    summary:
                        report.overallStatus === 'PASS'
                            ? `Conforme — ${controls.length} contrôle(s) vérifié(s), aucune anomalie.`
                            : `${issues.length} non-conformité(s) sur ${controls.length} contrôle(s).`,
                })
                router.refresh()
            } else {
                erreur(data?.error || "Impossible de joindre l'agent d'audit.")
            }
        } catch (err) {
            console.error(err)
            erreur("Erreur réseau lors de l'audit.")
        } finally {
            setAuditingType(null)
        }
    }

    const [isVisionAuditing, setIsVisionAuditing] = useState(false);
    const [visionResult, setVisionResult] = useState<any>(null);
    const [activeBatFile, setActiveBatFile] = useState<{ url: string; name: string } | null>(null);

    const selectBatFile = (file: { url: string; name: string }) => {
        setActiveBatFile(file);
        setVisionResult(null); // Reset résultat précédent
    };

    const runVisionAuditFromUrl = async (fileUrl: string) => {
        setIsVisionAuditing(true);
        setVisionResult(null);

        try {
            const fileRes = await fetch(fileUrl);
            const blob = await fileRes.blob();
            const file = new File([blob], fileUrl.split('/').pop() || 'bat.pdf', { type: blob.type });

            const formData = new FormData();
            formData.append('file', file);
            formData.append('etiquetteId', labelData.id);

            const response = await fetch('/api/agents/bat-vision', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setVisionResult(data.data);
            } else {
                setVisionResult({
                    status: "A_VERIFIER",
                    defautsDetectes: [
                        { type: "AUTRE", description: data.error || "Erreur lors de l'analyse Vision.", severity: "CRITIQUE" }
                    ],
                    conclusion: "Impossible de terminer l'analyse visuelle."
                });
            }
        } catch (err) {
            console.error(err);
            setVisionResult({
                status: "A_VERIFIER",
                defautsDetectes: [{ type: "AUTRE", description: "Erreur réseau lors de l'analyse.", severity: "CRITIQUE" }],
                conclusion: "Impossible de terminer l'analyse visuelle."
            });
        } finally {
            setIsVisionAuditing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4 max-w-[1600px] mx-auto pb-20">
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
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Dossier #{labelData.code || labelData.codePf}</span>
                        {labelData.codePf && <span className="text-stone-400">| Modele: {labelData.codePf}</span>}
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
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm">
                            {labelData.status}
                        </Badge>
                        <EditButtons section={titreSection} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-white border-stone-200 text-stone-600 font-medium">
                            Gamme: <span className="text-stone-900 ml-1">{labelData.gamme}</span>
                        </Badge>
                        {labelData.sousGamme && (
                            <Badge variant="outline" className="bg-white border-stone-200 text-stone-600 font-medium">
                                Sous-Gamme: <span className="text-stone-900 ml-1">{labelData.sousGamme}</span>
                            </Badge>
                        )}
                        <span className="text-stone-300 mx-1">•</span>
                        <span className="text-sm font-medium text-stone-500 flex items-center gap-1.5 border border-stone-100 bg-stone-50 px-2 py-0.5 rounded-md">
                            <Clock className="h-3.5 w-3.5" /> Modifié le {labelData.date ? new Date(labelData.date).toLocaleDateString('fr-FR') : 'N/A'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
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
                        Soumettre au Graphiste
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
                    <TabsTrigger value="pdf" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm transition-all text-stone-500 font-semibold whitespace-nowrap px-6 py-2">
                        <FileCheck2 className="w-4 h-4 mr-2" /> BAT & Fichiers
                    </TabsTrigger>
                </TabsList>

                {/* 1. DOSSIER PRODUIT (Merged Tab) */}
                <TabsContent value="dossier" className="mt-0 focus-visible:outline-none">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                        {/* LEFT COLUMN: Identity & Prep (The "Bento" Grid) */}
                        <div className="xl:col-span-5 space-y-6">

                            {/* Card: Identité & Origine */}
                            <Card className="border border-emerald-200/60 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden rounded-3xl">
                                <CardHeader className="bg-emerald-500/10 border-b border-emerald-100 pb-4">
                                    <CardTitle className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                                        <Badge variant="outline" className="p-1 h-7 w-7 rounded-lg bg-emerald-100 border-none flex items-center justify-center">
                                            <Globe2 className="h-4 w-4 text-emerald-700" />
                                        </Badge>
                                        Identité & Sourcing
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5">
                                    <div className="grid grid-cols-2 gap-3">
                                        <DataPoint icon={Leaf} label="Type de Thé" value={labelData.typeTheFr} />
                                        <DataPoint icon={Globe2} label="Origine" value={labelData.origine || "Non spécifiée"} />
                                        <DataPoint icon={Package} label="Conditionnement" value={labelData.conditionnement} />
                                        <DataPoint icon={AlignLeft} label="Poids Net" value={labelData.poidsNet} suffix="g" />
                                    </div>

                                    {labelData.mentionEcocert && (
                                        <div className="mt-4 p-3.5 bg-emerald-50 rounded-xl border border-emerald-100/50 flex items-start gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-0.5">Certification Active</p>
                                                <p className="text-sm font-semibold text-emerald-950">{labelData.mentionEcocert}</p>
                                            </div>
                                        </div>
                                    )}

                                    {(labelData.infoProducteur || labelData.typeProducteur || labelData.origineMpa) && (
                                        <div className="mt-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                                            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5"><Globe2 className="w-3 h-3" /> Détails Producteur & MPA</h4>
                                            <div className="space-y-2">
                                                {labelData.infoProducteur && <p className="text-xs text-stone-600"><span className="font-bold text-stone-800">Producteur:</span> {labelData.infoProducteur} {labelData.typeProducteur && `(${labelData.typeProducteur})`}</p>}
                                                {labelData.origineMpa && <p className="text-xs text-stone-600"><span className="font-bold text-stone-800">Origine MPA:</span> {labelData.origineMpa}</p>}
                                            </div>
                                        </div>
                                    )}

                                    {/* NOUVEAU: Données Brutes PMI Extensives */}
                                    {(labelData.techniqueRecolte || labelData.grade || labelData.volumineux !== null || labelData.epoqueRecolte) && (
                                        <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 grid grid-cols-2 gap-3">
                                            {labelData.epoqueRecolte && (
                                                <div>
                                                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Époque Récolte</p>
                                                    <p className="text-xs font-semibold text-blue-950">{labelData.epoqueRecolte}</p>
                                                </div>
                                            )}
                                            {labelData.techniqueRecolte && (
                                                <div>
                                                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Technique</p>
                                                    <p className="text-xs font-semibold text-blue-950">{labelData.techniqueRecolte}</p>
                                                </div>
                                            )}
                                            {labelData.grade && (
                                                <div>
                                                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Grade / Granulométrie</p>
                                                    <p className="text-xs font-semibold text-blue-950">{labelData.grade}</p>
                                                </div>
                                            )}
                                            {labelData.volumineux !== null && (
                                                <div>
                                                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Volumineux</p>
                                                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 uppercase border-none", labelData.volumineux ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800")}>
                                                        {labelData.volumineux ? "OUI" : "NON"}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {labelData.labelsMP && Array.isArray(labelData.labelsMP) && labelData.labelsMP.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {labelData.labelsMP.map((lbl: string, i: number) => (
                                                <Badge key={i} variant="outline" className="bg-white border-stone-200 text-[10px] text-stone-600 font-bold">{lbl}</Badge>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Card: Préparation */}
                            <Card className="border border-amber-200/60 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden rounded-3xl">
                                <CardHeader className="bg-amber-500/10 border-b border-amber-100 pb-4">
                                    <CardTitle className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                                        <Badge variant="outline" className="p-1 h-7 w-7 rounded-lg bg-orange-100 border-none flex items-center justify-center">
                                            <Coffee className="h-4 w-4 text-orange-700" />
                                        </Badge>
                                        Conseils de Préparation
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5">
                                    <div className="grid grid-cols-2 gap-3">
                                        <DataPoint icon={Clock} label="Infusion" value={labelData.tempsInfusion} suffix="min" />
                                        <DataPoint icon={Thermometer} label="Température" value={labelData.tempInfusion} suffix="°C" />
                                        <DataPoint icon={Coffee} label="Tasses / Cuillères" value={labelData.nbTasses} />
                                        <DataPoint icon={Info} label="Plusieurs Infusions" value={labelData.plusieursInfusions ? "Oui" : "Non"} />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card: Alertes Qualité — toujours visible, état vide explicite si rien à signaler */}
                            <Card className="border border-orange-200/60 bg-gradient-to-br from-white to-orange-50/30 shadow-sm overflow-hidden rounded-3xl relative">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                                        <ShieldAlert className="w-32 h-32 text-orange-900" />
                                    </div>
                                    <CardHeader className="bg-orange-50/50 border-b border-orange-100/50 pb-4 relative z-10">
                                        <CardTitle className="text-lg font-bold text-orange-950 flex items-center gap-2">
                                            <ShieldAlert className="h-5 w-5 text-orange-600" />
                                            Points de Vigilance Qualité
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-4 relative z-10">
                                        {!hasVigilance && (
                                            <EmptyState
                                                icon={ShieldAlert}
                                                label="Aucun allergène ni allégation renseigné pour ce produit."
                                            />
                                        )}
                                        {hasAllergen && (
                                            <div className="p-4 bg-white rounded-2xl border border-orange-200/60 shadow-[0_2px_10px_-4px_rgba(251,146,60,0.3)] flex items-start gap-3">
                                                <div className="bg-orange-100 p-1.5 rounded-lg">
                                                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-[11px] font-bold text-orange-800 uppercase tracking-widest mb-1">Allergènes Déclarés</h4>
                                                    <p className="text-sm font-semibold text-orange-950">{labelData.allergenes}</p>
                                                </div>
                                            </div>
                                        )}
                                        {hasAllegation && (
                                            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm flex items-start gap-3">
                                                <div className="bg-stone-100 p-1.5 rounded-lg">
                                                    <Info className="h-4 w-4 text-stone-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-1">Allégations de Santé</h4>
                                                    <p className="text-sm font-medium text-stone-800 italic">"{labelData.allegationsSanteFr}"</p>
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
                                </Card>
                        </div>

                        {/* RIGHT COLUMN: Texts & Translations */}
                        <div className="xl:col-span-7 space-y-6">

                            {/* Card: Déclarations Légales par Langue */}
                            <Card className="border border-blue-200/60 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden rounded-3xl flex flex-col">

                                {/* NOUVEAU: Grille Organoleptique (Notes de Dégustation) — toujours visible */}
                                {hasDegustation ? (
                                    <div className="bg-stone-50/50 border-b border-stone-100 p-6 flex flex-col gap-5">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                                                <Badge variant="outline" className="p-1 h-7 w-7 rounded-lg bg-pink-100 border-none flex items-center justify-center">
                                                    <Eye className="h-4 w-4 text-pink-700" />
                                                </Badge>
                                                Grille Organoleptique & Dégustation
                                            </h3>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-stone-500 uppercase">
                                                <span>{labelData.degustation.degustateur?.length ? labelData.degustation.degustateur.join(", ") : "Comité"}</span> •
                                                <span>{labelData.degustation.dateDegustation || "Date non précisée"}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* Feuilles Sèches */}
                                            <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-4 space-y-3">
                                                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5" /> Feuilles Sèches</h4>
                                                <div className="space-y-2">
                                                    {labelData.degustation.feuillesSechesAspect && (
                                                        <div><span className="text-[10px] font-bold text-stone-400 uppercase">Aspect</span><p className="text-sm text-stone-800 font-medium italic">{labelData.degustation.feuillesSechesAspect}</p></div>
                                                    )}
                                                    {labelData.degustation.feuillesSechesCouleur && (
                                                        <div><span className="text-[10px] font-bold text-stone-400 uppercase">Couleur</span><p className="text-sm text-stone-800 font-medium italic">{labelData.degustation.feuillesSechesCouleur}</p></div>
                                                    )}
                                                    {labelData.degustation.feuillesSechesSenteur && (
                                                        <div className="pt-1 border-t border-stone-100"><span className="text-[10px] font-bold text-pink-500 uppercase flex items-center gap-1"><Wind className="w-3 h-3" /> Senteur / Nez</span><p className="text-sm text-stone-800 font-medium italic">{labelData.degustation.feuillesSechesSenteur}</p></div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Feuilles Infusées */}
                                            <div className="bg-emerald-50/30 rounded-2xl border border-emerald-100/60 shadow-sm p-4 space-y-3">
                                                <h4 className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5" /> Feuilles Infusées</h4>
                                                <div className="space-y-2">
                                                    {labelData.degustation.feuillesInfuseesAspect && (
                                                        <div><span className="text-[10px] font-bold text-emerald-600/60 uppercase">Aspect</span><p className="text-sm text-emerald-950 font-medium italic">{labelData.degustation.feuillesInfuseesAspect}</p></div>
                                                    )}
                                                    {labelData.degustation.feuillesInfuseesCouleur && (
                                                        <div><span className="text-[10px] font-bold text-emerald-600/60 uppercase">Couleur</span><p className="text-sm text-emerald-950 font-medium italic">{labelData.degustation.feuillesInfuseesCouleur}</p></div>
                                                    )}
                                                    {labelData.degustation.feuillesInfuseesSenteur && (
                                                        <div className="pt-1 border-t border-emerald-200/50"><span className="text-[10px] font-bold text-pink-500 uppercase flex items-center gap-1"><Wind className="w-3 h-3" /> Senteur / Nez</span><p className="text-sm text-emerald-950 font-medium italic">{labelData.degustation.feuillesInfuseesSenteur}</p></div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Tasse / Résultat Final */}
                                            <div className="bg-amber-50/50 rounded-2xl border border-amber-200/60 shadow-sm p-4 space-y-3">
                                                <h4 className="text-xs font-bold text-amber-700/70 uppercase tracking-widest flex items-center gap-1.5"><Coffee className="w-3.5 h-3.5" /> En Tasse (Liqueur)</h4>
                                                <div className="space-y-2">
                                                    {labelData.degustation.infusionAspectCouleur && (
                                                        <div><span className="text-[10px] font-bold text-amber-700/60 uppercase">Aspect & Couleur</span><p className="text-sm text-amber-950 font-medium italic">{labelData.degustation.infusionAspectCouleur}</p></div>
                                                    )}
                                                    {labelData.degustation.infusionParfum && (
                                                        <div className="pt-1 border-t border-amber-200/50"><span className="text-[10px] font-bold text-amber-700/60 uppercase flex items-center gap-1"><Wind className="w-3 h-3" /> Parfum</span><p className="text-sm text-amber-950 font-medium italic">{labelData.degustation.infusionParfum}</p></div>
                                                    )}
                                                    {labelData.degustation.saveurBouche && (
                                                        <div className="pt-1 border-t border-amber-200/50 bg-amber-100/30 -mx-2 px-2 pb-1 rounded-lg"><span className="text-[10px] font-bold text-orange-600 uppercase flex items-center gap-1 pt-1"><Utensils className="w-3 h-3" /> Saveur en bouche</span><p className="text-sm text-amber-950 font-semibold italic">{labelData.degustation.saveurBouche}</p></div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-stone-50/50 border-b border-stone-100 p-6 flex flex-col gap-4">
                                        <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                                            <Badge variant="outline" className="p-1 h-7 w-7 rounded-lg bg-pink-100 border-none flex items-center justify-center">
                                                <Eye className="h-4 w-4 text-pink-700" />
                                            </Badge>
                                            Grille Organoleptique & Dégustation
                                        </h3>
                                        <EmptyState icon={Eye} label="Grille organoleptique non renseignée pour cette fiche." />
                                    </div>
                                )}

                                <CardHeader className="bg-blue-500/10 border-b border-blue-100 pb-4">
                                    <CardTitle className="text-lg font-bold text-emerald-950 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="p-1 h-7 w-7 rounded-lg bg-stone-200/50 border-none flex items-center justify-center">
                                                <Dna className="h-4 w-4 text-stone-700" />
                                            </Badge>
                                            Base Documentaire & Ingrédients
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 flex flex-col gap-6">

                                    {/* Textes Marketing */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold border-b border-stone-100 pb-2 text-stone-800 flex justify-between items-center">
                                            Textes Commerciaux
                                        </h3>
                                        <div className="grid gap-4">
                                            {hasTexteCom ? (
                                                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                                                    <Badge variant="outline" className="mb-2 bg-white text-[10px] text-stone-500 font-bold uppercase tracking-widest">Pitch Commercial FR</Badge>
                                                    <p className="text-sm text-stone-700 leading-relaxed">{labelData.texteCommercialFr}</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-stone-400 italic">Aucun texte commercial renseigné.</p>
                                            )}
                                        </div>

                                        {hasWfto && (
                                            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                                                <Badge variant="outline" className="mb-2 bg-white text-[10px] text-emerald-700 font-bold uppercase tracking-widest border-emerald-200">Mention WFTO</Badge>
                                                <p className="text-sm text-emerald-900 font-medium">{labelData.phraseWftoFr}</p>
                                            </div>
                                        )}

                                        {labelData.ingredientsSuggestion && (
                                            <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/50 shadow-[0_2px_15px_-3px_rgba(245,158,11,0.1)] relative">
                                                <div className="absolute top-4 right-4"><Bot className="w-5 h-5 text-amber-500/30" /></div>
                                                <Badge variant="outline" className="mb-3 bg-white text-[10px] text-amber-700 font-bold uppercase tracking-widest border-amber-200">Suggestion IA Ingrédients</Badge>
                                                <p className="text-sm text-amber-900 font-semibold leading-relaxed tracking-tight">{labelData.ingredientsSuggestion}</p>
                                                <p className="text-[10px] text-amber-600 font-medium mt-3 italic opacity-70">* Liste brute à transformer en formulation légale QUID</p>
                                            </div>
                                        )}

                                        {hasRealValue(labelData.declinaisons) ? (
                                            <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 flex items-start gap-3">
                                                <Package className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest mb-0.5">Déclinaisons Prévues</h4>
                                                    <p className="text-xs text-indigo-900 font-medium">{labelData.declinaisons}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1.5"><Package className="w-3 h-3" /> Déclinaisons Prévues</h4>
                                                <EmptyState label="Aucune déclinaison prévue renseignée." />
                                            </div>
                                        )}
                                    </div>

                                    {/* Traductions */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold border-b border-stone-100 pb-2 text-stone-800">
                                            Dénominations & Listes d'ingrédients
                                        </h3>
                                        <div className="grid gap-3">
                                            <LanguageRow lang="FR" sousDes={labelData.sousDesignationFr} ingredients={labelData.ingredientsFr} />
                                            {/* Les autres langues sont masquées pour le moment selon la demande */}

                                            {(!hasRealValue(labelData.ingredientsFr) && !hasRealValue(labelData.sousDesignationFr)) && (
                                                <div className="text-stone-400 font-medium text-sm text-center py-10 bg-stone-50/80 rounded-2xl border border-stone-200 border-dashed">
                                                    Aucune donnée d'ingrédient ou de sous-dénomination disponible en Français.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </CardContent>
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
                                        <EditButtons section={mentionsSection} />
                                    </CardTitle>
                                </CardHeader>
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
                            </Card>

                        </div>
                    </div>

                    {/* SPEC-03 §6 — bloc additif : champs complémentaires + arbitrages */}
                    <div className="mt-6">
                        <DossierComplementaire
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
                    <RecettePanel ficheId={labelData.id} produitId={labelData.produitId} recette={recette} ingredientsExtraits={ingredientsExtraits} />
                </TabsContent>

                {/* 2. AUDIT ZONE */}
                <TabsContent value="audit" className="mt-0 focus-visible:outline-none">
                    <Card className="border border-stone-200/60 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden min-h-[400px] rounded-3xl">
                        <CardHeader className="pb-4 flex flex-row items-center justify-between bg-stone-50/50 border-b border-stone-100">
                            <div>
                                <CardTitle className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                                    <Badge variant="outline" className="p-1 h-8 w-8 rounded-lg bg-emerald-100 border-none flex items-center justify-center">
                                        <Bot className="h-5 w-5 text-emerald-700" />
                                    </Badge>
                                    Audit de Conformité (Agent IA)
                                </CardTitle>
                                <CardDescription className="ml-10">
                                    Vérification algorithmique stricte du PRO-QHS-013 (QUID, Allergènes, Dénominations).
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-end mt-4 sm:mt-0">
                                <Button
                                    onClick={() => runAudit()}
                                    disabled={!!auditingType}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-700/20 rounded-xl font-bold px-6"
                                >
                                    {auditingType ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                    Lancer l&apos;audit
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            {!auditResult && !auditingType && (
                                <div className="flex flex-col items-center justify-center text-center h-48 opacity-70">
                                    <ShieldAlert className="h-16 w-16 text-stone-300 mb-4 stroke-[1.5]" />
                                    <p className="text-stone-600 font-medium text-lg">Aucun audit récent.</p>
                                    <p className="text-stone-400 text-sm mt-1">Cliquez sur "Lancer l'Audit" pour vérifier l'étiquette actuelle.</p>
                                </div>
                            )}

                            {auditResult && (
                                <div className="grid gap-6 animate-in fade-in zoom-in-95 duration-500 max-w-4xl mx-auto">
                                    <div className={cn(
                                        "p-6 rounded-3xl border-2 flex items-start gap-5 shadow-sm",
                                        auditResult.status === "PASS" ? "bg-emerald-50/50 border-emerald-200" :
                                            auditResult.status === "WARNING" ? "bg-orange-50/50 border-orange-200" :
                                                "bg-red-50/50 border-red-200"
                                    )}>
                                        {auditResult.status === "PASS" ? (
                                            <div className="h-14 w-14 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-200/50 text-emerald-600">
                                                <CheckCircle2 className="h-7 w-7" />
                                            </div>
                                        ) : (
                                            <div className="h-14 w-14 bg-orange-100 rounded-2xl flex items-center justify-center shrink-0 border border-orange-200/50 text-orange-600">
                                                <AlertTriangle className="h-7 w-7" />
                                            </div>
                                        )}
                                        <div className="mt-1">
                                            <h3 className={cn(
                                                "font-black text-2xl uppercase tracking-tight",
                                                auditResult.status === "PASS" ? "text-emerald-900" : "text-orange-950"
                                            )}>
                                                {auditResult.status === "PASS" ? "Conforme" : "Attention Requise"}
                                            </h3>
                                            <p className={cn("text-lg mt-2 font-medium leading-relaxed", auditResult.status === "PASS" ? "text-emerald-700" : "text-orange-800")}>
                                                {auditResult.summary}
                                            </p>
                                        </div>
                                    </div>

                                    {auditResult?.issues?.length > 0 && (
                                        <div className="space-y-4">
                                            <h4 className="font-extrabold text-stone-800 text-sm uppercase tracking-widest pl-2">Détails des Non-Conformités :</h4>
                                            {auditResult.issues.map((issue: any, i: number) => (
                                                <div key={i} className="flex gap-4 p-5 bg-white border border-stone-200/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="bg-orange-50 p-2 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center border border-orange-100 text-orange-500">
                                                        <AlertTriangle className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-stone-900 text-base flex items-center gap-3">
                                                            Règle: {issue.type}
                                                            <Badge variant="outline" className="text-[10px] px-2 py-0 border-orange-200 text-orange-700 bg-orange-50 font-bold uppercase">WARN</Badge>
                                                        </div>
                                                        <div className="text-sm text-stone-600 mt-2 font-medium leading-relaxed">{issue.description}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. BAT — Viewer intégré */}
                <TabsContent value="pdf" className="mt-0 focus-visible:outline-none">
                    {pdfFiles.length === 0 ? (
                        <Card className="border border-stone-200/60 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden rounded-3xl">
                            <CardContent className="p-16 flex flex-col items-center justify-center text-center">
                                <FileCheck2 className="h-16 w-16 text-stone-200 mb-5 stroke-[1.5]" />
                                <p className="text-stone-600 font-semibold text-lg">Aucun BAT reçu pour ce produit</p>
                                <p className="text-stone-400 text-sm mt-2 max-w-sm">
                                    Les fichiers BAT de Fabrice apparaissent ici automatiquement dès qu&apos;ils sont déposés dans Minio
                                    (dossier : <span className="font-mono text-emerald-600">{labelData.codePf?.toLowerCase()}</span>).
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                            {/* Colonne gauche : sélecteur de fichiers */}
                            <div className="xl:col-span-3 space-y-3">
                                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-widest px-1 mb-2">Fichiers BAT reçus</div>
                                {pdfFiles.map((file: { url: string; name: string }, idx: number) => {
                                    const isActive = (activeBatFile?.url ?? pdfFiles[0]?.url) === file.url;
                                    const isAi = file.name.toLowerCase().endsWith('.ai');
                                    const isPdf = file.name.toLowerCase().endsWith('.pdf');
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => selectBatFile(file)}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all",
                                                isActive
                                                    ? "bg-emerald-50 border-emerald-300 shadow-sm"
                                                    : "bg-white border-stone-200 hover:border-emerald-200 hover:bg-stone-50"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border font-bold text-[11px]",
                                                isAi ? "bg-orange-50 border-orange-200 text-orange-600" :
                                                isPdf ? "bg-red-50 border-red-200 text-red-600" :
                                                        "bg-stone-50 border-stone-200 text-stone-500"
                                            )}>
                                                {isAi ? "AI" : isPdf ? "PDF" : "FILE"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    "text-xs font-semibold truncate",
                                                    isActive ? "text-emerald-800" : "text-stone-700"
                                                )}>{file.name}</p>
                                                <p className="text-[10px] text-stone-400 mt-0.5">Minio • BAT</p>
                                            </div>
                                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                                        </button>
                                    );
                                })}

                                {/* Bouton analyse IA sur le fichier actif */}
                                {(() => {
                                    const activeFile = activeBatFile ?? pdfFiles[0];
                                    if (!activeFile?.name.toLowerCase().endsWith('.pdf')) return null;
                                    return (
                                        <Button
                                            onClick={() => runVisionAuditFromUrl(activeFile.url)}
                                            disabled={isVisionAuditing}
                                            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-sm py-5 shadow-sm shadow-emerald-700/20"
                                        >
                                            {isVisionAuditing ? (
                                                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analyse IA...</>
                                            ) : (
                                                <><Bot className="h-4 w-4 mr-2" />Analyser avec l&apos;IA</>
                                            )}
                                        </Button>
                                    );
                                })()}
                            </div>

                            {/* Colonne droite : viewer embarqué + résultat IA */}
                            <div className="xl:col-span-9 space-y-4">
                                {(() => {
                                    const activeFile = activeBatFile ?? pdfFiles[0];
                                    if (!activeFile) return null;
                                    const isPdf = activeFile.name.toLowerCase().endsWith('.pdf');
                                    const isImage = /\.(png|jpg|jpeg|webp)$/i.test(activeFile.name);

                                    return (
                                        <Card className="border border-stone-200/60 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden rounded-3xl">
                                            <CardHeader className="pb-3 border-b border-stone-100 bg-stone-50/50 flex flex-row items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileCheck2 className="h-4 w-4 text-emerald-600" />
                                                    <span className="text-sm font-semibold text-stone-800">{activeFile.name}</span>
                                                </div>
                                                <a
                                                    href={activeFile.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors"
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    Ouvrir dans un onglet
                                                </a>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                {isPdf ? (
                                                    <iframe
                                                        src={activeFile.url}
                                                        className="w-full border-0"
                                                        style={{ height: '700px' }}
                                                        title={activeFile.name}
                                                    />
                                                ) : isImage ? (
                                                    <div className="p-6 flex items-center justify-center bg-stone-50 min-h-[400px]">
                                                        <img
                                                            src={activeFile.url}
                                                            alt={activeFile.name}
                                                            className="max-w-full max-h-[650px] object-contain rounded-xl shadow-md"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-48 text-center p-8">
                                                        <FileCheck2 className="h-10 w-10 text-stone-300 mb-3" />
                                                        <p className="text-stone-500 font-medium text-sm">Prévisualisation non disponible pour ce format</p>
                                                        <a href={activeFile.url} target="_blank" rel="noopener noreferrer"
                                                            className="mt-3 text-emerald-600 font-semibold text-sm hover:underline">
                                                            Télécharger le fichier
                                                        </a>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })()}

                                {/* Résultat analyse IA */}
                                {(visionResult || isVisionAuditing) && (
                                    <Card className={cn(
                                        "border-2 flex flex-col shadow-sm overflow-hidden rounded-3xl",
                                        visionResult?.status === "CONFORME" ? "border-emerald-300/60 bg-emerald-50/20" :
                                            visionResult?.status === "NON_CONFORME" ? "border-red-200/60 bg-red-50/10" :
                                                "border-orange-200/60 bg-orange-50/10"
                                    )}>
                                        <CardHeader className={cn(
                                            "pb-4 border-b",
                                            visionResult?.status === "CONFORME" ? "border-emerald-100 bg-emerald-50/50" :
                                                visionResult?.status === "NON_CONFORME" ? "border-red-100 bg-red-50/30" :
                                                    "border-orange-100 bg-orange-50/30"
                                        )}>
                                            <CardTitle className="text-base font-bold flex items-center gap-3">
                                                {isVisionAuditing && !visionResult ? (
                                                    <><Loader2 className="h-4 w-4 animate-spin text-emerald-600" /><span className="text-stone-700">Analyse IA en cours...</span></>
                                                ) : visionResult?.status === "CONFORME" ? (
                                                    <><div className="h-8 w-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div><span className="text-emerald-900">BAT Conforme ✓</span></>
                                                ) : visionResult?.status === "NON_CONFORME" ? (
                                                    <><div className="h-8 w-8 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-red-600" /></div><span className="text-red-900">Défauts Détectés !</span></>
                                                ) : (
                                                    <><div className="h-8 w-8 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-orange-600" /></div><span className="text-orange-900">Vérification Manuelle Requise</span></>
                                                )}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            {visionResult && (
                                                <div className="flex flex-col gap-3">
                                                    <div className="p-3.5 bg-white rounded-xl border border-stone-100 shadow-sm">
                                                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Conclusion IA</p>
                                                        <p className="text-sm font-medium text-stone-800 leading-relaxed">{visionResult.conclusion}</p>
                                                    </div>
                                                    {visionResult.defautsDetectes?.length > 0 && (
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Défauts ({visionResult.defautsDetectes.length})</p>
                                                            {visionResult.defautsDetectes.map((defaut: any, i: number) => (
                                                                <div key={i} className={cn(
                                                                    "p-3 rounded-xl border flex gap-3",
                                                                    defaut.severity === "CRITIQUE" ? "bg-red-50/60 border-red-200/60" : "bg-orange-50/60 border-orange-200/60"
                                                                )}>
                                                                    <AlertTriangle className={cn("h-4 w-4 shrink-0 mt-0.5", defaut.severity === "CRITIQUE" ? "text-red-500" : "text-orange-500")} />
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-0.5">
                                                                            <Badge className={cn("text-[10px] font-bold uppercase px-1.5", defaut.severity === "CRITIQUE" ? "bg-red-100 text-red-700 border-red-200" : "bg-orange-100 text-orange-700 border-orange-200")}>{defaut.severity}</Badge>
                                                                            <span className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">{defaut.type}</span>
                                                                        </div>
                                                                        <p className="text-sm text-stone-700 leading-relaxed">{defaut.description}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {visionResult.defautsDetectes?.length === 0 && (
                                                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                                            <p className="text-sm font-semibold text-emerald-800">Aucun défaut détecté — BAT conforme.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}
                </TabsContent>

            </Tabs>
        </div>
    )
}
