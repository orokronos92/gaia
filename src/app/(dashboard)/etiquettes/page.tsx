import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusCircle, Search, Bot } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import Link from "next/link"

import { db } from "@/db"
import { fichesEtiquettes, produits } from "@/db/schema"
import { eq } from "drizzle-orm"

const columns = [
    { id: "quality", title: "À faire - Qualité" },
    { id: "design", title: "En création graphique" },
    { id: "bat", title: "En attente BAT" },
    { id: "reception", title: "Contrôle réception" },
]

export default async function KanbanPage() {

    const data = await db
        .select({
            id: fichesEtiquettes.id,
            title: produits.denominationFr,
            code: produits.codePf,
            column: fichesEtiquettes.statut,
            date: fichesEtiquettes.misAJourLe,
        })
        .from(fichesEtiquettes)
        .leftJoin(produits, eq(fichesEtiquettes.produitId, produits.id));

    const mappedCards = data.map(item => {
        let colId = "quality";
        if (item.column?.includes("DESIGN")) colId = "design";
        if (item.column?.includes("PRINTER") || item.column?.includes("BAT")) colId = "bat";
        if (item.column?.includes("RECE")) colId = "reception";

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
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                        <Input type="search" placeholder="Filtrer les cartes..." className="pl-9 bg-white/60 backdrop-blur-md border-stone-200/50 rounded-full w-64 shadow-sm" />
                    </div>
                    <Link href="/etiquettes/nouveau">
                        <Button variant="outline" className="bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm rounded-full px-5 flex items-center gap-2 font-medium">
                            <Bot className="h-4 w-4" />
                            Import IA
                        </Button>
                    </Link>
                    <Link href="/etiquettes/nouveau">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-sm shadow-emerald-700/20 text-white rounded-full px-5">
                            <PlusCircle className="h-4 w-4" />
                            Nouveau Dossier
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden pb-4">
                <div className="grid grid-cols-4 gap-4 h-full">
                    {columns.map((col) => {
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
