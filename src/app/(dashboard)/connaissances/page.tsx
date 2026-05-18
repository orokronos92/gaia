import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UploadCloud, FileText, Trash2, Brain, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RAGDocumentUpload } from '@/components/features/RAGDocumentUpload';

export default function ConnaissancesPage() {
    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-emerald-900 dark:text-emerald-50">Cerveau IA & Base de Connaissances</h2>
                    <p className="text-muted-foreground mt-2">
                        Gérez les documents réglementaires, normes et procédures de l'entreprise.
                        Ces documents nourrissent les Agents IA pour l'audit et l'import de données.
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
                                Uploadez un PDF, DOCX ou TXT. L'IA l'analysera, le vectorisera et l'intégrera à sa base de connaissances active.
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
                                Au moment de l'audit d'une étiquette, l'IA viendra chercher ici les règles les plus récentes correspondantes aux ingrédients et allégations pour s'assurer d'avoir le contexte le plus juste.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Corpus View Area */}
                <div className="col-span-1 md:col-span-4 lg:col-span-4">
                    <Card className="h-full border-slate-200 shadow-sm flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-slate-500" />
                                    Corpus Actif (<span className="text-emerald-600">3</span> documents)
                                </CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                    <Input
                                        type="search"
                                        placeholder="Rechercher une règle..."
                                        className="pl-8 bg-slate-50 border-slate-200"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0">
                            <ScrollArea className="h-[432px] px-6">
                                <div className="space-y-4 pb-6">

                                    {/* Item 1 */}
                                    <div className="group flex items-start justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 p-2 bg-emerald-50 rounded-lg pr-2 text-emerald-600">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900">PRO-QHS-013 Procédure Étiquetage</h4>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                                    Procédure interne globale de vérification de l'étiquetage incluant QUID, règles d'arrondis et obligations DGCCRF.
                                                </p>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">Règlementaire</Badge>
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">DGCCRF</Badge>
                                                    <span className="text-xs text-slate-400 ml-2">Ingéré le 12/03/2026</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Item 2 */}
                                    <div className="group flex items-start justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 p-2 bg-emerald-50 rounded-lg pr-2 text-emerald-600">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900">Charte Étiquetage Demeter 2021</h4>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                                    Directives de positionnement du logo, tailles minimales et mentions obligatoires (ex: Agriculture biodynamique certifiée).
                                                </p>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">Labels</Badge>
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">Demeter</Badge>
                                                    <span className="text-xs text-slate-400 ml-2">Ingéré le 10/03/2026</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Item 3 */}
                                    <div className="group flex items-start justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 p-2 bg-emerald-50 rounded-lg pr-2 text-emerald-600">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900">Guide Info-tri CITEO Juillet 2022</h4>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                                    Règles sur le Triman et le cartouche Info-tri, dématérialisation possible selon les surfaces (20cm2, 40cm2).
                                                </p>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">Logistique</Badge>
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">CITEO</Badge>
                                                    <span className="text-xs text-slate-400 ml-2">Ingéré le 05/03/2026</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
