"use client";

import { useState } from "react";
import { UploadCloud, FileText, Loader2, FileSpreadsheet, FileIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ImportDossierArea() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [conflit, setConflit] = useState<{ codePf?: string; ficheExistanteId: string | null; files: File[] } | null>(null);
    const router = useRouter();

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await uploadFiles(files);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await uploadFiles(Array.from(e.target.files));
        }
    };

    const uploadFiles = async (files: File[], resolution?: "overwrite" | "new") => {
        const formData = new FormData();
        let validFileFound = false;

        files.forEach(file => {
            const isDoc = file.name.endsWith(".docx") || file.name.endsWith(".doc");
            const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
            const isPdf = file.name.endsWith(".pdf");

            if (isDoc) {
                formData.append("wordFile", file);
                validFileFound = true;
            } else if (isExcel) {
                formData.append("excelFile", file);
                validFileFound = true;
            } else if (isPdf) {
                formData.append("pdfFile", file);
                validFileFound = true;
            }
        });

        if (!validFileFound) {
            toast.error("Format non supporté", { description: "Formats acceptés : Word (.docx), Excel (.xlsx) ou PDF (.pdf)" });
            return;
        }

        if (resolution) formData.append("resolution", resolution);

        setIsUploading(true);

        try {
            const res = await fetch("/api/agents/import", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                let errorMessage = "Erreur lors de l'importation";
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    // La réponse n'est pas du JSON (ex: page HTML d'erreur Next.js)
                    errorMessage = `Erreur serveur (${res.status}). Vérifiez votre clé MISTRAL_API_KEY.`;
                }
                throw new Error(errorMessage);
            }

            const data = await res.json();

            // codePf déjà existant → on laisse Marie choisir (modale).
            if (data.conflict) {
                setConflit({ codePf: data.codePf, ficheExistanteId: data.ficheExistanteId ?? null, files });
                return;
            }

            toast.success("Importation réussie avec l'IA !", {
                description: `Produit ${data.data.codeArticle || "créé"} généré.`,
            });

            if (data.ficheId) {
                router.push(`/etiquettes/${data.ficheId}`);
            } else {
                router.push("/etiquettes");
            }
        } catch (error) {
            console.error("Upload Error:", error);
            toast.error("Erreur d'importation", {
                description: error instanceof Error ? error.message : "Erreur inconnue",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const ouvrirExistante = () => {
        if (conflit?.ficheExistanteId) router.push(`/etiquettes/${conflit.ficheExistanteId}`);
        setConflit(null);
    };
    const resoudre = (resolution: "overwrite" | "new") => {
        const files = conflit?.files ?? [];
        setConflit(null);
        void uploadFiles(files, resolution);
    };

    return (
        <>
        <Card className="bg-white/60 backdrop-blur-xl border-dashed border-2 border-emerald-200 shadow-sm overflow-hidden mb-6 transition-all hover:border-emerald-400">
            <CardContent className="p-0">
                <div
                    className={cn(
                        "relative flex flex-col items-center justify-center p-12 text-center transition-colors min-h-[200px]",
                        isDragging ? "bg-emerald-50" : "bg-transparent",
                        isUploading ? "opacity-50 pointer-events-none" : ""
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        multiple
                        accept=".doc,.docx,.xls,.xlsx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />

                    {isUploading ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-25"></div>
                                <div className="bg-emerald-100 p-4 rounded-full relative z-10">
                                    <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-emerald-900">Analyse IA en cours...</h3>
                                <p className="text-sm text-emerald-600/80 max-w-sm">
                                    Mistral analyse vos documents et extrait tous les champs nécessaires à la création du produit.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-emerald-50 p-4 rounded-full text-emerald-600 ring-1 ring-emerald-100/50 shadow-inner group-hover:scale-110 transition-transform">
                                <UploadCloud className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-emerald-900">
                                    Déposer les documents produit
                                </h3>
                                <p className="text-sm text-stone-500 max-w-sm">
                                    Glissez jusqu&apos;à 3 fichiers simultanément. Mistral extrait tous les champs automatiquement.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
                                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                    <FileText className="h-3.5 w-3.5" /> Fiche Tasting (.docx)
                                </span>
                                <span className="text-stone-300">+</span>
                                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                    <FileSpreadsheet className="h-3.5 w-3.5" /> Recette (.xlsx)
                                </span>
                                <span className="text-stone-300">+</span>
                                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                    <FileIcon className="h-3.5 w-3.5" /> Fiche Tech (.pdf)
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        {conflit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                    <h3 className="text-lg font-bold text-stone-900">Produit déjà existant</h3>
                    <p className="mt-2 text-sm text-stone-600">
                        Le code <span className="font-semibold">{conflit.codePf}</span> existe déjà.
                        Que veux-tu faire ?
                    </p>
                    <div className="mt-5 flex flex-col gap-2">
                        <Button
                            onClick={ouvrirExistante}
                            disabled={!conflit.ficheExistanteId}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
                        >
                            Ouvrir sa fiche
                        </Button>
                        <Button variant="outline" onClick={() => resoudre("overwrite")} className="rounded-xl">
                            Écraser la fiche existante
                        </Button>
                        <Button variant="outline" onClick={() => resoudre("new")} className="rounded-xl">
                            Créer une nouvelle fiche
                        </Button>
                        <p className="text-xs text-amber-700 leading-relaxed">
                            ⚠ La nouvelle fiche aura un <strong>titre vide</strong> — à remplir par sécurité (évite un doublon non identifié).
                        </p>
                        <Button variant="ghost" onClick={() => setConflit(null)} className="rounded-xl text-stone-500">
                            Annuler
                        </Button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
