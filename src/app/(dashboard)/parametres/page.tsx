export default function SettingsPage() {
    return (
        <div className="rounded-2xl border-none bg-white/60 backdrop-blur-xl shadow-xl shadow-stone-200/50 p-8 dark:bg-stone-900/60">
            <h2 className="text-xl font-medium text-emerald-950 mb-6">Informations de l'entreprise</h2>

            <div className="space-y-5">
                <div className="grid gap-2">
                    <label className="text-sm font-medium text-stone-700">Nom de l'entité</label>
                    <input
                        type="text"
                        defaultValue="Les Jardins de Gaïa"
                        className="flex h-10 w-full rounded-lg border border-stone-200/50 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-stone-900"
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium text-stone-700">Charte graphique (Logo)</label>
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                            <span className="text-2xl font-bold text-emerald-700">G</span>
                        </div>
                        <button className="bg-white border border-stone-200/50 text-stone-600 px-4 py-2 rounded-lg text-sm font-medium hover:text-emerald-700 transition-colors shadow-sm">
                            Modifier le logo
                        </button>
                    </div>
                </div>

                <div className="grid gap-2 pt-4">
                    <h3 className="text-base font-medium text-stone-900">Variables Globales</h3>
                    <p className="text-sm text-stone-500 mb-2">Ces variables sont utilisées par le moteur de validation Qualité et les Agents IA (Mistral).</p>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-stone-200/50 bg-white/40">
                        <div>
                            <div className="font-medium text-stone-900">Seuil des traces d'ingrédients</div>
                            <div className="text-sm text-stone-500 mt-0.5">Valeur en % sous laquelle l'ingrédient n'apparaît pas sur l'étiquette finale.</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="number" defaultValue="0.05" step="0.01" className="w-20 text-center rounded-lg border border-stone-200/50 bg-white px-3 py-1.5 text-sm font-medium" />
                            <span className="text-stone-500 font-medium">%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-stone-200/50">
                <button className="px-4 py-2 rounded-lg text-stone-500 font-medium hover:bg-stone-100 transition-colors">
                    Annuler
                </button>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm shadow-emerald-700/20 transition-all">
                    Enregistrer les préférences
                </button>
            </div>
        </div>
    )
}
