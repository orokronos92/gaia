"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BrainCircuit, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SupprimerProduit } from "@/components/produits/supprimer-produit";
import { RetraitCatalogue } from "@/components/produits/retrait-catalogue";
import { libelleStatut } from "@/lib/etiquettes/statuts";

interface ProductRow {
    id: string;
    code: string;
    name: string;
    type: string;
    gamme: string;
    status: string | null;
    ficheId: string | null;
    nbFiches?: number;
    retire?: boolean;
}

export function ProductsTableClient({ data }: { data: ProductRow[] }) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isAuditing, setIsAuditing] = useState(false);
    const router = useRouter();

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            // Select only those with an existing ficheId
            setSelectedIds(data.filter(p => p.ficheId !== null).map(p => p.ficheId!));
        } else {
            setSelectedIds([]);
        }
    };

    const toggleSelect = (ficheId: string | null, checked: boolean) => {
        if (!ficheId) return;
        if (checked) {
            setSelectedIds(prev => [...prev, ficheId]);
        } else {
            setSelectedIds(prev => prev.filter(id => id !== ficheId));
        }
    };

    const handleMassAudit = async () => {
        if (selectedIds.length === 0) return;
        setIsAuditing(true);
        toast.info(`Lancement de l'audit IA sur ${selectedIds.length} étiquettes...`);

        try {
            const res = await fetch("/api/agents/audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ficheIds: selectedIds, massAudit: true })
            });

            if (!res.ok) throw new Error("Erreur de lancement de l'audit");

            const result = await res.json();
            toast.success("Audit IA Terminé", { description: result.message || "Toutes les étiquettes sélectionnées ont été vérifiées." });
            setSelectedIds([]);
            router.refresh();
        } catch (error) {
            toast.error("Erreur", { description: "Impossible d'exécuter l'audit." });
        } finally {
            setIsAuditing(false);
        }
    };

    return (
        <div>
            {selectedIds.length > 0 && (
                <div className="bg-emerald-50 border-b border-emerald-100 p-3 flex items-center justify-between animate-in slide-in-from-top-2">
                    <span className="text-sm font-medium text-emerald-800">
                        {selectedIds.length} étiquette(s) sélectionnée(s)
                    </span>
                    <Button
                        size="sm"
                        onClick={handleMassAudit}
                        disabled={isAuditing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                        {isAuditing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
                        Lancer Mass Audit IA
                    </Button>
                </div>
            )}
            <Table>
                <TableHeader className="bg-stone-50/50 dark:bg-stone-800/20">
                    <TableRow className="border-stone-200/50 hover:bg-transparent">
                        <TableHead className="w-[50px]">
                            <Checkbox
                                checked={selectedIds.length > 0 && selectedIds.length === data.filter(p => p.ficheId).length}
                                onCheckedChange={toggleSelectAll}
                            />
                        </TableHead>
                        <TableHead className="w-[120px] font-medium text-stone-500">Code PF</TableHead>
                        <TableHead className="font-medium text-stone-500">Dénomination</TableHead>
                        <TableHead className="font-medium text-stone-500 hidden md:table-cell">Famille de texte</TableHead>
                        <TableHead className="font-medium text-stone-500">Gamme Origine</TableHead>
                        <TableHead className="font-medium text-stone-500">Statut Fiche</TableHead>
                        <TableHead className="text-right font-medium text-stone-500 w-[380px] whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((product) => (
                        <TableRow key={product.id} className="border-stone-200/50 hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors group">
                            <TableCell>
                                <Checkbox
                                    disabled={!product.ficheId}
                                    checked={product.ficheId ? selectedIds.includes(product.ficheId) : false}
                                    onCheckedChange={(checked) => toggleSelect(product.ficheId, !!checked)}
                                />
                            </TableCell>
                            <TableCell className="font-medium text-emerald-900 dark:text-emerald-400">{product.code}</TableCell>
                            <TableCell className="font-semibold text-stone-800 group-hover:text-emerald-700 transition-colors">{product.name}</TableCell>
                            <TableCell className="text-stone-500 hidden md:table-cell">{product.type}</TableCell>
                            <TableCell className="text-stone-600 dark:text-stone-300">{product.gamme}</TableCell>
                            <TableCell>
                                {product.status ? (
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "border-none px-2.5 py-1",
                                            product.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" :
                                                product.status === "DESIGN_IN_PROGRESS" ? "bg-orange-50 text-orange-700" :
                                                    "bg-stone-100 text-stone-600"
                                        )}
                                    >
                                        {libelleStatut(product.status)}
                                    </Badge>
                                ) : (
                                    <span className="text-xs text-stone-400 italic">Aucune fiche</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                    {product.ficheId ? (
                                        <Link href={`/etiquettes/${product.ficheId}`}>
                                            <Button variant="ghost" size="sm" className="text-emerald-600 font-medium hover:text-emerald-800 hover:bg-emerald-50 rounded-full transition-colors">Consulter Fiche</Button>
                                        </Link>
                                    ) : (
                                        <Button variant="ghost" size="sm" className="text-stone-400 hover:text-stone-600 rounded-full cursor-not-allowed disabled">
                                            Créer Fiche
                                        </Button>
                                    )}
                                    <RetraitCatalogue
                                        produitId={product.id}
                                        codePf={product.code}
                                        denomination={product.name}
                                        retire={!!product.retire}
                                        variante="ligne"
                                    />
                                    <SupprimerProduit
                                        produitId={product.id}
                                        codePf={product.code}
                                        denomination={product.name}
                                        nbFiches={product.nbFiches}
                                        variante="ligne"
                                    />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
