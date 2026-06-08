import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UploadCloud, AlertCircle } from "lucide-react";
import { RAGDocumentUpload } from "@/components/features/RAGDocumentUpload";
import { listKnowledgeDocuments } from "@/db/queries/knowledge";
import KnowledgeCorpus from "./_components/knowledge-corpus";

export default async function ConnaissancesPage() {
  const documents = await listKnowledgeDocuments();

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-emerald-900 dark:text-emerald-50">
            Cerveau IA & Base de Connaissances
          </h2>
          <p className="text-muted-foreground mt-2">
            Gérez les documents réglementaires, normes et procédures de
            l&apos;entreprise. Ces documents nourrissent les Agents IA pour
            l&apos;audit et l&apos;import de données.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-7">
        {/* Upload & Context Area */}
        <div className="col-span-1 md:col-span-3 lg:col-span-3 space-y-6">
          <Card className="border-emerald-100 dark:border-emerald-900 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-emerald-600" />
                Ingérer un Document
              </CardTitle>
              <CardDescription>
                Uploadez un PDF, DOCX ou TXT. L&apos;IA l&apos;analysera, le
                vectorisera et l&apos;intégrera à sa base de connaissances
                active.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RAGDocumentUpload />
            </CardContent>
          </Card>

          <Card className="border-amber-100 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-900/10 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-800 dark:text-amber-500">
                <AlertCircle className="w-4 h-4" />
                Comment ça marche ?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-900/80 dark:text-amber-500/80 space-y-2">
              <p>
                Au moment de l&apos;audit d&apos;une étiquette, l&apos;IA viendra
                chercher ici les règles les plus récentes correspondantes aux
                ingrédients et allégations pour s&apos;assurer d&apos;avoir le
                contexte le plus juste.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Corpus View Area */}
        <div className="col-span-1 md:col-span-4 lg:col-span-4">
          <KnowledgeCorpus documents={documents} />
        </div>
      </div>
    </div>
  );
}
