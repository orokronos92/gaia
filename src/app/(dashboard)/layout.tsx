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
                    <div className="flex flex-1 flex-col sm:gap-4 sm:py-4 sm:pl-64 relative">
                        <Header />
                        <main className="flex-1 items-start gap-4 p-4 sm:px-8 sm:py-4 md:gap-8 max-w-7xl mx-auto w-full">
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
