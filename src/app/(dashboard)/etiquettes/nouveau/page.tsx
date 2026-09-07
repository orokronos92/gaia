import { db } from "@/db";
import { produits } from "@/db/schema";
import { PRODUIT_ACTIF } from "@/db/queries/produits";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createFicheEtiquette } from "@/app/actions/etiquettes";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { ArrowLeft, Leaf } from "lucide-react";
import { ImportDossierArea } from "@/components/features/ImportDossierArea";

export default async function NouveauDossierPage() {
    // Récupérer la liste des produits disponibles
    const allProduits = await db.select().from(produits).where(PRODUIT_ACTIF).orderBy(produits.denominationFr);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4 max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-4">
                <Link href="/etiquettes">
                    <Button variant="ghost" size="icon" className="rounded-full shadow-sm">
                        <ArrowLeft className="h-5 w-5 text-stone-500" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-emerald-950 dark:text-stone-50">
                        Nouveau Dossier de Validation
                    </h1>
                    <p className="text-sm text-stone-500 font-medium mt-1">
                        Sélectionnez le produit pour lequel vous souhaitez créer ou réviser une étiquette
                    </p>
                </div>
            </div>

            <ImportDossierArea />

            <div className="flex items-center gap-4 mb-2">
                <div className="h-px bg-stone-200 flex-1"></div>
                <span className="text-sm text-stone-400 font-medium uppercase tracking-widest">OU</span>
                <div className="h-px bg-stone-200 flex-1"></div>
            </div>

            <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl overflow-hidden">
                <CardHeader className="border-b border-stone-100 bg-emerald-50/50">
                    <CardTitle className="text-emerald-800 text-lg flex items-center gap-2">
                        <Leaf className="h-5 w-5" />
                        Base de Produits
                    </CardTitle>
                    <CardDescription>
                        Choisissez un produit existant pour initialiser le pipeline de validation qualité.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[60vh]">
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {allProduits.map((p) => (
                                <form action={createFicheEtiquette} key={p.id}>
                                    <input type="hidden" name="produitId" value={p.id} />
                                    <button
                                        type="submit"
                                        className="w-full flex items-start flex-col text-left p-4 rounded-xl border border-stone-200/60 bg-white hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm group"
                                    >
                                        <div className="flex w-full items-center justify-between mb-2">
                                            <span className="font-semibold text-stone-800 group-hover:text-emerald-800 transition-colors">
                                                {p.denominationFr}
                                            </span>
                                            <span className="text-xs font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                                                {p.codePf}
                                            </span>
                                        </div>
                                        <div className="text-sm text-stone-500 line-clamp-1">
                                            Gamme: {p.gamme} • {p.typeTheFr}
                                        </div>
                                    </button>
                                </form>
                            ))}
                            {allProduits.length === 0 && (
                                <div className="col-span-full p-8 text-center text-stone-500">
                                    Aucun produit trouvé dans la base de données.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
