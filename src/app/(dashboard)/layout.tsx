export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { NotificationProvider } from "@/components/providers/NotificationProvider"
import { AIChatAssistant } from "@/components/features/AIChatAssistant"
import { Toaster } from "@/components/ui/sonner"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <NotificationProvider>
            <div className="relative flex min-h-screen w-full bg-stone-50 dark:bg-stone-900">
                {/*
                  Les halos débordent volontairement du cadre : ils ont donc leur
                  propre cage qui les rogne. Le `overflow-hidden` était sur la
                  racine, où il annulait tout `position: sticky` de l'application
                  — un élément collant se serait fixé à ce conteneur, qui ne
                  défile pas, au lieu de la fenêtre.
                */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-[40%] -mt-[20%] h-[80%] w-[80%] rounded-full bg-emerald-600/10 blur-[120px]" />
                    <div className="absolute bottom-0 left-0 -ml-[20%] -mb-[30%] h-[60%] w-[50%] rounded-full bg-emerald-500/10 blur-[100px]" />
                </div>

                <div className="relative z-10 flex w-full">
                    <Sidebar />
                    <div className="relative flex min-w-0 flex-1 flex-col sm:gap-2 sm:pb-4 sm:pl-64">
                        <Header />
                        {/*
                          1280 px conviennent à une page qui se lit en colonne.
                          L'écran de contrôle, lui, met la checklist et le BAT
                          côte à côte : la même laisse le comprime alors qu'il
                          demande déjà 1600 px pour lui-même.

                          L'élargissement est donc demandé par la page, avec
                          `data-wide`, plutôt qu'accordé à toutes : aucune autre
                          n'est touchée, et un navigateur sans `:has()` retombe
                          sur la largeur d'aujourd'hui.

                          `min-w-0` est ce qui rend l'ensemble tenable : sans
                          lui, un enfant flex ne descend jamais sous la largeur
                          de son contenu, et un tableau large poussait la page
                          entière au-delà de la fenêtre. Avec, le tableau défile
                          chez lui et la page reste dans son cadre.

                          Il ne fixe plus une seconde laisse à 1600 px. Un écran
                          large gardait alors 600 px de marge vide de chaque
                          côté pendant que le tableau produits, qui en demande
                          1456, restait coupé et défilait. Une page qui se
                          déclare large prend la place disponible ; celles qui
                          veulent quand même une limite de lecture la posent
                          chez elles, comme le fait la fiche étiquette.
                        */}
                        <main className="min-w-0 flex-1 items-start gap-4 p-4 sm:px-8 sm:py-4 md:gap-8 max-w-7xl has-[[data-wide]]:max-w-none mx-auto w-full">
                            {children}
                        </main>
                    </div>
                </div>

                {/* Global Copilot Assistant UI */}
                <AIChatAssistant />
                <Toaster />
            </div>
        </NotificationProvider>
    )
}
