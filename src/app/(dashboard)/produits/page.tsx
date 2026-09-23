import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

import { db } from "@/db"
import { produits, fichesEtiquettes } from "@/db/schema"
import { and, eq, or, type SQL } from "drizzle-orm"
import { correspondRecherche, filtreCatalogue, type FiltreCatalogue } from "@/db/queries/produits"
import { FiltreCatalogueSelect } from "./FiltreCatalogueSelect"
import { FiltreGammeSelect } from "./FiltreGammeSelect"
import { ProductSearch } from "@/components/features/ProductSearch"
import { getChoixGammes } from "@/db/queries/gammes"
import { ProductsTableClient } from "./ProductsTableClient"

export default async function ProductsPage(
    props: {
        searchParams: Promise<{ [key: string]: string | string[] | undefined }>
    }
) {
    const searchParams = await props.searchParams;
    const q = typeof searchParams?.q === 'string' ? searchParams.q : "";
    const filtreBrut = typeof searchParams?.catalogue === 'string' ? searchParams.catalogue : "actifs";
    const filtre: FiltreCatalogue =
        filtreBrut === "retires" || filtreBrut === "tous" ? filtreBrut : "actifs";
    const choixGammes = await getChoixGammes();
    const gammeFiltre = typeof searchParams?.gamme === 'string' ? searchParams.gamme : "";
    const sousGammeFiltre = typeof searchParams?.sousGamme === 'string' ? searchParams.sousGamme : "";

    // Construire la requête de base
    let query = db
        .select({
            id: produits.id,
            code: produits.codePf,
            name: produits.denominationFr,
            type: produits.typeTheFr,
            gamme: produits.gamme,
            sousGamme: produits.sousGamme,
            status: fichesEtiquettes.statut,
            ficheId: fichesEtiquettes.id,
            retireLe: produits.retireLe,
        })
        .from(produits)
        .leftJoin(fichesEtiquettes, eq(produits.id, fichesEtiquettes.produitId));

    // Les produits archivés ne figurent plus au catalogue : ils vivent dans le
    // registre d'archives, pas ici.
    // La recherche libre et les deux filtres se cumulent : chercher « chimpanzé »
    // dans une gamme donnée doit rester possible.
    const conditions: SQL[] = [filtreCatalogue(filtre)];
    if (q) {
        conditions.push(
            or(
                correspondRecherche(produits.codePf, q),
                correspondRecherche(produits.denominationFr, q),
                correspondRecherche(produits.gamme, q),
                correspondRecherche(produits.sousGamme, q)
            )!
        );
    }
    if (gammeFiltre) conditions.push(eq(produits.gamme, gammeFiltre));
    if (sousGammeFiltre) conditions.push(eq(produits.sousGamme, sousGammeFiltre));
    query = query.where(and(...conditions)) as any;

    // By product code: a catalogue of a thousand rows is read by code, and the
    // creation order only reflected the order of the import.
    const rawData = await query.orderBy(produits.codePf);

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

    // Nombre de fiches par produit, pour l'avertissement de suppression.
    const nbFichesParProduit = new Map<string, number>();
    rawData.forEach(row => {
        if (row.ficheId) nbFichesParProduit.set(row.id, (nbFichesParProduit.get(row.id) ?? 0) + 1);
    });
    const dataAvecFiches = data.map(row => ({
        ...row,
        nbFiches: nbFichesParProduit.get(row.id) ?? 0,
        retire: row.retireLe !== null,
    }));

    // `data-wide` : le catalogue est un tableau, pas une colonne de lecture. Sa
    // laisse à 1280 px lui coupait la colonne d'actions — « Retirer du
    // catalogue » et « Supprimer » — pendant que l'écran gardait des marges
    // vides de chaque côté (décision 2026-09-10).
    return (
        <div data-wide className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4 h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-emerald-950 dark:text-stone-50">
                        Référentiel Produits
                    </h1>
                    <p className="text-sm text-stone-500 font-medium mt-1">
                        Consultez et modifiez les recettes validées issues de la Base de Données
                    </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <FiltreGammeSelect choix={choixGammes} gamme={gammeFiltre} sousGamme={sousGammeFiltre} />
                    <FiltreCatalogueSelect valeur={filtre} />
                    <Link href="/etiquettes/nouveau">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-sm shadow-emerald-700/20 text-white rounded-full px-5">
                            <PlusCircle className="h-4 w-4" />
                            Nouveau Produit
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="rounded-2xl border-none bg-white/60 backdrop-blur-xl shadow-xl shadow-stone-200/50 dark:bg-stone-900/60 mt-4">
                <div className="p-5 border-b border-stone-200/50 flex items-center justify-between">
                    <ProductSearch />
                </div>
                <ProductsTableClient data={dataAvecFiches} />
            </div>
        </div>
    )
}
