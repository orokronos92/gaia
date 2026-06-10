import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Filter } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

import { db } from "@/db"
import { produits, fichesEtiquettes } from "@/db/schema"
import { eq, ilike, or } from "drizzle-orm"
import { ProductSearch } from "@/components/features/ProductSearch"
import { ProductsTableClient } from "./ProductsTableClient"

export default async function ProductsPage(
    props: {
        searchParams: Promise<{ [key: string]: string | string[] | undefined }>
    }
) {
    const searchParams = await props.searchParams;
    const q = typeof searchParams?.q === 'string' ? searchParams.q : "";

    // Construire la requête de base
    let query = db
        .select({
            id: produits.id,
            code: produits.codePf,
            name: produits.denominationFr,
            type: produits.typeTheFr,
            gamme: produits.gamme,
            status: fichesEtiquettes.statut,
            ficheId: fichesEtiquettes.id,
        })
        .from(produits)
        .leftJoin(fichesEtiquettes, eq(produits.id, fichesEtiquettes.produitId));

    // Ajouter le filtre de recherche si présent
    if (q) {
        query = query.where(
            or(
                ilike(produits.codePf, `%${q}%`),
                ilike(produits.denominationFr, `%${q}%`),
                ilike(produits.gamme, `%${q}%`)
            )
        ) as any;
    }

    const rawData = await query.orderBy(produits.creeLe);

    // Deduplicate in JS to prevent React Key collisions and duplicate visual rows
    const uniqueProductsMap = new Map();
    rawData.forEach(row => {
        if (!uniqueProductsMap.has(row.id)) {
            uniqueProductsMap.set(row.id, row);
        } else if (row.status !== "DRAFT" && uniqueProductsMap.get(row.id).status === "DRAFT") {
            // Keep the non-draft version if multiple fiches exist for the same product
            uniqueProductsMap.set(row.id, row);
        }
    });

    const data = Array.from(uniqueProductsMap.values());

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4 h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-emerald-950 dark:text-stone-50">
                        Référentiel Produits
                    </h1>
                    <p className="text-sm text-stone-500 font-medium mt-1">
                        Consultez et modifiez les recettes validées issues de la Base de Données
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button disabled variant="outline" className="gap-2 bg-white/60 backdrop-blur-md shadow-sm border-stone-200/50 rounded-full">
                        <Filter className="h-4 w-4 text-stone-500" />
                        Filtres Avancés
                    </Button>
                    <Link href="/etiquettes/nouveau">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-sm shadow-emerald-700/20 text-white rounded-full px-5">
                            <PlusCircle className="h-4 w-4" />
                            Nouveau Produit
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="rounded-2xl border-none bg-white/60 backdrop-blur-xl shadow-xl shadow-stone-200/50 dark:bg-stone-900/60 mt-4 overflow-hidden">
                <div className="p-5 border-b border-stone-200/50 flex items-center justify-between">
                    <ProductSearch />
                </div>
                <ProductsTableClient data={data} />
            </div>
        </div>
    )
}
