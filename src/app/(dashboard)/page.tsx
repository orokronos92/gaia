import { AlertTriangle, Clock, TrendingUp, Bell, CheckCircle2, Check } from "lucide-react"
import { db } from "@/db"
import { fichesEtiquettes, commandesImpression, controlesConformite } from "@/db/schema"

export default async function DashboardPage() {
    // Fetch live data for KPIs
    const fiches = await db.select().from(fichesEtiquettes);
    const commandes = await db.select().from(commandesImpression);
    const controles = await db.select().from(controlesConformite);

    const fichesEnAttente = fiches.filter(f => f.statut !== "ACTIVE" && f.statut !== "ARCHIVED").length;
    const alertesCritiques = controles.filter(c => c.statut === "FAIL").length;
    // We consider "Sent to printer" or "BAT received" as PDF to verify
    const pdfAVerifier = fiches.filter(f => f.statut === "SENT_TO_PRINTER" || f.statut === "BAT_RECEIVED").length;
    const commandesEnCours = commandes.length;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4 h-full">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-light tracking-tight text-emerald-950 dark:text-stone-50">
                    Dashboard de Suivi d'Étiquettes
                </h1>
                <p className="text-sm text-stone-500 font-medium mt-1">
                    Vue globale de l'activité Qualité & Graphisme (Données Live PostgreSQL)
                </p>
            </div>

            {/* KPI CARDS (Live Data) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">

                {/* 1. Fiches en Attente */}
                <div className="group rounded-2xl border-none bg-orange-100/90 backdrop-blur-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex items-center gap-4">
                    <div className="absolute right-0 top-0 -mr-4 -mt-4 w-24 h-24 bg-orange-200/50 rounded-full blur-2xl group-hover:bg-orange-300/50 transition-colors"></div>
                    <div className="text-4xl font-light text-orange-600">{fichesEnAttente}</div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-orange-950 leading-tight">Fiches en</span>
                        <span className="font-semibold text-orange-950 leading-tight">Attente</span>
                    </div>
                </div>

                {/* 2. Alertes Critiques */}
                <div className="group rounded-2xl border-none bg-red-100/90 backdrop-blur-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex items-center gap-4">
                    <div className="absolute right-0 top-0 -mr-4 -mt-4 w-24 h-24 bg-red-200/50 rounded-full blur-2xl group-hover:bg-red-300/50 transition-colors"></div>
                    <div className="text-4xl font-light text-red-600">{alertesCritiques}</div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-red-950 leading-tight">Alertes</span>
                        <span className="font-semibold text-red-950 leading-tight">Critiques</span>
                    </div>
                </div>

                {/* 3. PDF à Verifier */}
                <div className="group rounded-2xl border-none bg-emerald-100/90 backdrop-blur-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex items-center gap-4">
                    <div className="absolute right-0 top-0 -mr-4 -mt-4 w-24 h-24 bg-emerald-200/50 rounded-full blur-2xl group-hover:bg-emerald-300/50 transition-colors"></div>
                    <div className="text-4xl font-light text-emerald-600">{pdfAVerifier}</div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-emerald-950 leading-tight">PDF</span>
                        <span className="font-semibold text-emerald-950 leading-tight">à Vérifier</span>
                    </div>
                </div>

                {/* 4. Commandes en Cours */}
                <div className="group rounded-2xl border-none bg-amber-100/90 backdrop-blur-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex items-center gap-4">
                    <div className="absolute right-0 top-0 -mr-4 -mt-4 w-24 h-24 bg-amber-200/50 rounded-full blur-2xl group-hover:bg-amber-300/50 transition-colors"></div>
                    <div className="text-4xl font-light text-amber-600">{commandesEnCours}</div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-amber-950 leading-tight">Commandes</span>
                        <span className="font-semibold text-amber-950 leading-tight">en Cours</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">

                {/* MAIN CONTENT AREA: Étapes en Cours */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="rounded-2xl border border-stone-200/50 bg-white/60 backdrop-blur-xl shadow-xl shadow-stone-200/50 p-6">
                        <h2 className="text-xl font-medium text-emerald-950 mb-5">Étapes en Cours</h2>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100/50 rounded-xl group hover:shadow-sm transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-stone-800">Maté Fruité</span>
                                        <span className="text-xs text-stone-500 font-medium">Validation Qualité terminée</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-5 w-5 text-emerald-600" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-amber-50/50 border border-amber-100/50 rounded-xl group hover:shadow-sm transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-stone-800">Thé Vert Sencha</span>
                                        <span className="text-xs text-stone-500 font-medium">Attente retour fournisseur</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-5 w-5 text-stone-300" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100/50 rounded-xl group hover:shadow-sm transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-stone-800">Rooibos Vanille</span>
                                        <span className="text-xs text-stone-500 font-medium">En création graphique</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-5 w-5 text-stone-300" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SIDEBAR: Historique */}
                <div className="lg:col-span-1">
                    <div className="rounded-2xl border border-stone-200/50 bg-stone-50/80 backdrop-blur-xl shadow-lg shadow-stone-200/50 p-6 h-full">
                        <h2 className="text-lg font-medium text-emerald-950 mb-6 flex items-center gap-2">
                            <Bell className="h-4 w-4 text-emerald-600" />
                            Historique des Actions
                        </h2>

                        <div className="relative border-l-2 border-stone-200/60 ml-3 space-y-8 pl-6 pb-4">

                            <div className="relative">
                                <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-orange-500 ring-4 ring-stone-50" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-stone-400">Aujourd'hui à 10:45</span>
                                    <p className="text-sm text-stone-700 font-medium">Vérif PDF <span className="font-bold text-stone-900">Rooibos Vanille</span> assignée à Marie</p>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-stone-300 ring-4 ring-stone-50" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-stone-400">Hier</span>
                                    <p className="text-sm text-stone-600">Étiquette <span className="font-bold text-stone-800">Maté fruité</span> validée par Marie.</p>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-stone-50" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-stone-400">Hier à 14:00</span>
                                    <p className="text-sm text-stone-600">Import réussi de <span className="font-bold text-stone-800">Thé Vert Sencha</span> via AI Import Agent.</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
