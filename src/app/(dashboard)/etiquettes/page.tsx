import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import Link from "next/link"

import { db } from "@/db"
import { fichesEtiquettes, produits } from "@/db/schema"
import { and, eq, ilike, or } from "drizzle-orm"
import { PRODUIT_ACTIF } from "@/db/queries/produits"
import { ProductSearch } from "@/components/features/ProductSearch"

const columns = [
    { id: "quality", title: "À faire - Qualité" },
    { id: "design", title: "En création graphique" },
    { id: "bat", title: "En attente BAT" },
    { id: "reception", title: "Contrôle réception" },
    { id: "retire", title: "Plus produites" },
]

/**
 * Explicit status → column map. It used to be keyword matching with a default
 * of "quality", so ACTIVE and ARCHIVED — finished work — landed in Marie's
 * "à faire" column alongside real work in progress.
 */
const COLONNE_PAR_STATUT: Record<string, string> = {
    DRAFT: "quality",
    QUALITY_REVIEW: "quality",
    QUALITY_VALIDATED: "quality",
    DESIGN_IN_PROGRESS: "design",
    DESIGN_REVIEW: "design",
    DESIGN_VALIDATED: "design",
    SENT_TO_PRINTER: "bat",
    BAT_RECEIVED: "bat",
    BAT_VALIDATED: "bat",
    PRINTING: "reception",
    RECEIVED: "reception",
    RECEPTION_CONTROLLED: "reception",
    ACTIVE: "actif",
    ARCHIVED: "retire",
}

// Marie only tracks Qualité + Graphisme for now (post-demo request). The BAT and
// réception stages still exist as label statuses; we just don't surface their
// columns. Re-enable = add the ids back here, the grid adapts to the count.
const VISIBLE_COLUMN_IDS: string[] = ["quality", "design"]

/** Withdrawn labels are shown on demand only — they are not pending work. */
const COLONNE_RETIREES = "retire"

// Tailwind needs static class names (JIT can't see grid-cols-${n}).
const GRID_COLS: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
}

export default async function KanbanPage(
    props: {
        searchParams: Promise<{ [key: string]: string | string[] | undefined }>
    }
) {
    const searchParams = await props.searchParams;
    const q = typeof searchParams?.q === "string" ? searchParams.q : "";

    const base = db
        .select({
            id: fichesEtiquettes.id,
            title: produits.denominationFr,
            code: produits.codePf,
            column: fichesEtiquettes.statut,
            date: fichesEtiquettes.misAJourLe,
        })
        .from(fichesEtiquettes)
        .innerJoin(produits, eq(fichesEtiquettes.produitId, produits.id));

    // Case-insensitive substring search across code / name / gamme (mirrors the produits filter).
    // Une fiche dont le produit est archivé n'a plus rien à faire dans le pipeline.
    const data = await base.where(
        q
            ? and(
                  PRODUIT_ACTIF,
                  or(
                      ilike(produits.codePf, `%${q}%`),
                      ilike(produits.denominationFr, `%${q}%`),
                      ilike(produits.gamme, `%${q}%`)
                  )
              )
            : PRODUIT_ACTIF
    );

    // ?retirees=1 adds the withdrawn column so Marie can find a label and put it
    // back in the catalogue — the status dropdown does the rest, at no cost.
    const afficherRetirees = searchParams?.retirees === "1";
    const idsVisibles = afficherRetirees ? [...VISIBLE_COLUMN_IDS, COLONNE_RETIREES] : VISIBLE_COLUMN_IDS;
    const visibleColumns = columns.filter(col => idsVisibles.includes(col.id));

    const mappedCards = data.map(item => {
        const colId = COLONNE_PAR_STATUT[item.column ?? ""] ?? "quality";

        return {
            id: item.id,
            title: `${item.title} (${item.code})`,
            column: colId,
            date: item.date ? new Date(item.date).toLocaleDateString("fr-FR") : "Récent",
            tags: ["Live DB"],
        }
    });

    return (
        <div className="flex h-[calc(100vh-8rem)] flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-emerald-950 dark:text-stone-50">
                        Pipeline Étiquettes
                    </h1>
                    <p className="text-sm text-stone-500 font-medium mt-1">
                        Suivez l'avancement Qualité, Graphisme jusqu'à l'Impression
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ProductSearch />
                    <Link
                        href={afficherRetirees ? "/etiquettes" : "/etiquettes?retirees=1"}
                        className="text-sm font-medium text-stone-500 hover:text-emerald-700 transition-colors whitespace-nowrap px-3"
                    >
                        {afficherRetirees ? "Masquer les étiquettes plus produites" : "Voir les étiquettes plus produites"}
                    </Link>
                    <Link href="/etiquettes/nouveau">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-sm shadow-emerald-700/20 text-white rounded-full px-5">
                            <PlusCircle className="h-4 w-4" />
                            Nouveau Produit
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden pb-4">
                <div className={cn("grid gap-4 h-full", GRID_COLS[visibleColumns.length] ?? "grid-cols-4")}>
                    {visibleColumns.map((col) => {
                        const colCards = mappedCards.filter(c => c.column === col.id);
                        return (
                            <div key={col.id} className="h-full min-h-0 flex flex-col gap-4 rounded-3xl bg-white/40 backdrop-blur-md border border-stone-200/50 dark:bg-stone-900/40 p-5 shadow-xl shadow-stone-200/30">
                                <div className="flex items-center justify-between font-medium text-emerald-950 dark:text-emerald-100">
                                    <h3 className="text-sm tracking-wide font-semibold truncate mr-2">{col.title}</h3>
                                    <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold shadow-sm text-emerald-700 border border-emerald-100 dark:bg-stone-800">
                                        {colCards.length}
                                    </span>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ScrollArea className="h-full -mx-2 px-2">
                                        <div className="flex flex-col gap-3 pb-4 pr-3">
                                            {colCards.map(card => (
                                                <Link key={card.id} href={`/etiquettes/${card.id}`} className="block">
                                                    <div className="group rounded-2xl border border-stone-200/60 bg-white/80 p-4 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 dark:bg-stone-950/80 cursor-pointer h-full flex flex-col">
                                                        <h4 className="font-semibold text-stone-800 group-hover:text-emerald-700 transition-colors mb-2.5 line-clamp-2">{card.title}</h4>
                                                        <div className="flex flex-wrap gap-2 mb-4">
                                                            {card.tags.map(tag => (
                                                                <Badge key={tag} variant="outline" className={cn(
                                                                    "text-[10px] px-2 py-0 font-medium border-none bg-emerald-50 text-emerald-700"
                                                                )}>
                                                                    {tag}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs font-medium text-stone-500 mt-auto pt-2 border-t border-stone-100">
                                                            <span>{card.date}</span>
                                                            <div className="flex -space-x-2">
                                                                <div className="h-6 w-6 rounded-full border-2 border-white bg-emerald-100 text-[9px] flex items-center justify-center text-emerald-700 font-bold dark:border-stone-950 shadow-sm">
                                                                    MQ
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}

                                            {/* Drop area indicator */}
                                            <div className="mt-4 h-24 shrink-0 rounded-2xl border-2 border-dashed border-stone-200/60 bg-stone-50/30 flex items-center justify-center text-stone-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                Déposer ici
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    )
}
