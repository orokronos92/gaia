"use client";

import { useState } from "react";
import { UploadCloud, FileText, Loader2, FileSpreadsheet, FileIcon, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Role = "degustation" | "recette" | "technique";
type StagedFiles = Record<Role, File | null>;

const VIDE: StagedFiles = { degustation: null, recette: null, technique: null };

const ROLES: { key: Role; label: string; icon: typeof FileText }[] = [
    { key: "degustation", label: "Fiche dégustation (Word)", icon: FileText },
    { key: "recette", label: "Fiche recette (Excel)", icon: FileSpreadsheet },
    { key: "technique", label: "Fiche technique (PDF)", icon: FileIcon },
];

function detectRole(file: File): Role | null {
    const n = file.name.toLowerCase();
    if (n.endsWith(".docx") || n.endsWith(".doc")) return "degustation";
    if (n.endsWith(".xlsx") || n.endsWith(".xls")) return "recette";
    if (n.endsWith(".pdf")) return "technique";
    return null;
}

export function ImportDossierArea() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [staged, setStaged] = useState<StagedFiles>(VIDE);
    const [conflit, setConflit] = useState<{ codePf?: string; ficheExistanteId: string | null; files: File[] } | null>(null);
    const router = useRouter();

    const hasStaged = !!(staged.degustation || staged.recette || staged.technique);

    // Staging : on met les fichiers en attente (un par rôle, remplace si re-déposé).
    // L'IA ne part PAS automatiquement — Marie lance l'analyse ensuite.
    const stageFiles = (files: File[]) => {
        const next = { ...staged };
        let added = false;
        for (const f of files) {
            const role = detectRole(f);
            if (role) { next[role] = f; added = true; }
        }
        if (!added) {
            toast.error("Format non supporté", { description: "Formats acceptés : Word (.docx), Excel (.xlsx) ou PDF (.pdf)" });
            return;
        }
        setStaged(next);
    };

    const removeSlot = (key: Role) => setStaged((prev) => ({ ...prev, [key]: null }));

    const lancer = () => {
        const files = [staged.degustation, staged.recette, staged.technique].filter((f): f is File => f != null);
        if (files.length === 0) {
            toast.error("Aucun document à analyser.");
            return;
        }
        void uploadFiles(files);
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) stageFiles(files);
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) stageFiles(Array.from(e.target.files));
        e.target.value = "";
    };

    const uploadFiles = async (files: File[], resolution?: "overwrite" | "new") => {
        const formData = new FormData();
        let validFileFound = false;

        files.forEach((file) => {
            const role = detectRole(file);
            if (role === "degustation") { formData.append("wordFile", file); validFileFound = true; }
            else if (role === "recette") { formData.append("excelFile", file); validFileFound = true; }
            else if (role === "technique") { formData.append("pdfFile", file); validFileFound = true; }
        });

        if (!validFileFound) {
            toast.error("Format non supporté", { description: "Formats acceptés : Word (.docx), Excel (.xlsx) ou PDF (.pdf)" });
            return;
        }

        if (resolution) formData.append("resolution", resolution);

        setIsUploading(true);
        try {
            const res = await fetch("/api/agents/import", { method: "POST", body: formData });

            if (!res.ok) {
                let errorMessage = "Erreur lors de l'importation";
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.error || errorMessage;
                } catch {
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

            if (data.ficheId) router.push(`/etiquettes/${data.ficheId}`);
            else router.push("/etiquettes");
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
                            "relative flex flex-col items-center justify-center p-10 text-center transition-colors min-h-[180px]",
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
                                        Mistral analyse vos documents et extrait tous les champs nécessaires.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <div className="bg-emerald-50 p-4 rounded-full text-emerald-600 ring-1 ring-emerald-100/50 shadow-inner">
                                    <UploadCloud className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-semibold text-emerald-900">Déposer les documents produit</h3>
                                    <p className="text-sm text-stone-500 max-w-sm">
                                        Word, Excel et/ou PDF — ils sont mis en attente. Vous lancez l&apos;analyse IA ensuite.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {!isUploading && hasStaged && (
                        <div className="border-t border-emerald-100 bg-emerald-50/30 p-5 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-stone-500">Documents en attente</h4>
                            {ROLES.map(({ key, label, icon: Icon }) => {
                                const file = staged[key];
                                return (
                                    <div
                                        key={key}
                                        className={cn(
                                            "flex items-center gap-3 rounded-xl border bg-white px-4 py-2.5",
                                            file ? "border-emerald-200" : "border-stone-100 opacity-60"
                                        )}
                                    >
                                        <Icon className={cn("h-4 w-4 shrink-0", file ? "text-emerald-600" : "text-stone-300")} />
                                        <div className="min-w-0 flex-1 text-left">
                                            <div className="text-sm font-medium text-stone-700">{label}</div>
                                            <div className="truncate text-xs text-stone-500">{file ? file.name : "—"}</div>
                                        </div>
                                        {file && (
                                            <button
                                                type="button"
                                                onClick={() => removeSlot(key)}
                                                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                                                title="Retirer"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                            <div className="flex justify-end gap-2 pt-1">
                                <Button variant="ghost" onClick={() => setStaged(VIDE)} className="rounded-xl text-stone-500">
                                    Tout retirer
                                </Button>
                                <Button onClick={lancer} className="rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700">
                                    Lancer l&apos;analyse IA
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {conflit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-stone-900">Produit déjà existant</h3>
                        <p className="mt-2 text-sm text-stone-600">
                            Le code <span className="font-semibold">{conflit.codePf}</span> existe déjà. Que veux-tu faire ?
                        </p>
                        <div className="mt-5 flex flex-col gap-2">
                            <Button
                                onClick={ouvrirExistante}
                                disabled={!conflit.ficheExistanteId}
                                className="rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                            >
                                Ouvrir sa fiche
                            </Button>
                            <Button variant="outline" onClick={() => resoudre("overwrite")} className="rounded-xl">
                                Écraser la fiche existante
                            </Button>
                            <Button variant="outline" onClick={() => resoudre("new")} className="rounded-xl">
                                Créer une nouvelle fiche
                            </Button>
                            <p className="text-xs leading-relaxed text-amber-700">
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
