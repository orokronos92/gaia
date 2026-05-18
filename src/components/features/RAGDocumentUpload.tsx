"use client";

import { useState } from "react";
import { UploadCloud, FileText, Loader2, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function RAGDocumentUpload() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

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

    const uploadFiles = async (files: File[]) => {
        const formData = new FormData();
        let validFileFound = false;

        files.forEach(file => {
            const isDoc = file.name.endsWith(".docx") || file.name.endsWith(".pdf") || file.name.endsWith(".txt");
            if (isDoc) {
                formData.append("file", file);
                validFileFound = true;
            }
        });

        if (!validFileFound) {
            toast.error("Format non supporté. Veuillez déposer un fichier PDF, DOCX ou TXT.");
            return;
        }

        setIsUploading(true);

        try {
            const res = await fetch("/api/knowledge/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Erreur serveur lors de l'ingestion.");
            }

            const data = await res.json();

            toast.success("Document ingéré avec succès !", {
                description: data.message || `Le document est maintenant disponible pour les agents IA.`,
            });

            // Allow time for the user to read the success message before potentially reloading or clearing
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error: any) {
            console.error("Upload Error:", error);
            toast.error("Erreur d'ingestion", {
                description: error.message || "Impossible d'insérer le document dans la base de connaissances.",
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div
            className={cn(
                "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group relative overflow-hidden",
                isDragging ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30" : "border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20",
                isUploading ? "opacity-70 pointer-events-none" : ""
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                onChange={handleFileChange}
                disabled={isUploading}
            />

            {isUploading ? (
                <div className="flex flex-col items-center gap-4 relative z-10 w-full">
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-25"></div>
                        <div className="bg-emerald-100 p-4 rounded-full relative z-10">
                            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-medium text-emerald-900 dark:text-emerald-50 mb-1">Vectorisation en cours...</h3>
                        <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">
                            Découpage par paragraphes et génération d'embeddings...
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 relative z-10 w-full">
                    <div className="p-4 bg-emerald-100 dark:bg-emerald-900/50 rounded-full mb-2 group-hover:scale-110 transition-transform">
                        <Brain className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="font-medium text-emerald-900 dark:text-emerald-50 mb-1">Glissez-déposez le fichier ici</h3>
                    <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70 mb-4">
                        Max 10 MB per file.
                    </p>
                    <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md z-30 relative pointer-events-none">
                        Parcourir les fichiers
                    </Button>
                </div>
            )}
        </div>
    );
}
