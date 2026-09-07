import { FileSpreadsheet, FileText, FileType2 } from "lucide-react"

export interface DocumentSourceVue {
    id: string
    nomOrigine: string
    type: "DEGUSTATION_DOCX" | "DEGUSTATION_PDF" | "RECETTE_XLSX"
    tailleOctets: number
    importeLe: string
    /** Short-lived signed link — the source bucket is private. */
    lien: string
}

const LIBELLES: Record<DocumentSourceVue["type"], { texte: string; Icone: typeof FileText }> = {
    DEGUSTATION_DOCX: { texte: "Fiche dégustation", Icone: FileText },
    DEGUSTATION_PDF: { texte: "Fiche dégustation (PDF)", Icone: FileType2 },
    RECETTE_XLSX: { texte: "Fiche recette", Icone: FileSpreadsheet },
}

function poids(octets: number): string {
    if (octets < 1024) return `${octets} o`
    if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`
    return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

/**
 * The documents a fiche's data was extracted from. Before this, only the file
 * name survived an import — when a value looked wrong there was nothing left to
 * go back to.
 */
export function DocumentsSource({ documents }: { documents: DocumentSourceVue[] }) {
    return (
        <div className="bg-white border border-stone-200/70 rounded-2xl shadow-sm p-5 space-y-4">
            <div>
                <h3 className="text-sm font-bold text-stone-800">Documents source</h3>
                <p className="text-xs text-stone-400">
                    Les fichiers dont les données de cette fiche ont été extraites.
                </p>
            </div>

            {documents.length === 0 ? (
                <p className="text-sm text-stone-500 py-4 text-center">
                    Aucun document archivé pour cette fiche. Les imports antérieurs au 7 septembre 2026
                    n&apos;étaient pas conservés.
                </p>
            ) : (
                <ul className="space-y-2">
                    {documents.map((d) => {
                        const { texte, Icone } = LIBELLES[d.type]
                        return (
                            <li key={d.id}>
                                <a
                                    href={d.lien}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-xl border border-stone-200/70 bg-stone-50/60 hover:bg-white hover:border-emerald-200 transition-colors"
                                >
                                    <Icone className="h-5 w-5 text-stone-400 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium text-stone-800 truncate">
                                            {d.nomOrigine}
                                        </div>
                                        <div className="text-xs text-stone-400">
                                            {texte} · {poids(d.tailleOctets)} · importé le {d.importeLe}
                                        </div>
                                    </div>
                                </a>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
