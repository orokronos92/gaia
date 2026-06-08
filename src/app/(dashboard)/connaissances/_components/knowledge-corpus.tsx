"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Search,
  CheckCircle2,
  Layers,
  Inbox,
  Trash2,
  Loader2,
} from "lucide-react";
import { supprimerDocumentAction } from "@/app/actions/knowledge";
import type { KnowledgeDocumentSummary } from "@/db/queries/knowledge";

interface KnowledgeCorpusProps {
  documents: KnowledgeDocumentSummary[];
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Real "Corpus Actif" view: lists the documents actually present in the RAG
 * (data fetched server-side, passed as props). Client-side search only.
 */
export default function KnowledgeCorpus({ documents }: KnowledgeCorpusProps) {
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.documentName.toLowerCase().includes(q));
  }, [documents, query]);

  const supprimer = (documentName: string) => {
    if (
      !window.confirm(
        `Supprimer « ${documentName} » de la base de connaissances ? Cette action est irréversible.`
      )
    ) {
      return;
    }
    setDeleting(documentName);
    startTransition(async () => {
      try {
        await supprimerDocumentAction({ documentName });
        toast.success("Document supprimé du RAG.");
        router.refresh();
      } catch (e) {
        toast.error("Échec de la suppression.", {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setDeleting(null);
      }
    });
  };

  return (
    <Card className="h-full border-slate-200 shadow-sm flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-500" />
            Corpus Actif (
            <span className="text-emerald-600">{documents.length}</span>{" "}
            document{documents.length > 1 ? "s" : ""})
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un document..."
              className="pl-8 bg-slate-50 border-slate-200"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[432px] px-6">
          {documents.length === 0 ? (
            <EmptyState
              icon={<Inbox className="w-8 h-8 text-slate-300" />}
              title="Base de connaissances vide"
              description="Aucun document n'a encore été ingéré. Déposez un PDF, DOCX ou TXT via le panneau de gauche pour nourrir les agents IA."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="w-8 h-8 text-slate-300" />}
              title="Aucun résultat"
              description="Aucun document ne correspond à votre recherche."
            />
          ) : (
            <div className="space-y-4 pb-6">
              {filtered.map((doc) => (
                <div
                  key={doc.documentName}
                  className="group flex items-start justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 bg-emerald-50 rounded-lg text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 break-all">
                        {doc.documentName}
                      </h4>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge
                          variant="secondary"
                          className="bg-slate-100 text-slate-600 hover:bg-slate-200 gap-1"
                        >
                          <Layers className="w-3 h-3" />
                          {doc.chunkCount} chunk{doc.chunkCount > 1 ? "s" : ""}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          Ingéré le {dateFormatter.format(new Date(doc.ingestedAt))}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Supprimer ${doc.documentName}`}
                    onClick={() => supprimer(doc.documentName)}
                    disabled={deleting === doc.documentName}
                    className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                  >
                    {deleting === doc.documentName ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center h-[400px] gap-3">
      <div className="p-4 bg-slate-50 rounded-full">{icon}</div>
      <h4 className="font-semibold text-slate-700">{title}</h4>
      <p className="text-sm text-slate-400 max-w-xs">{description}</p>
    </div>
  );
}
